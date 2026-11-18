#include "bps/engine.hpp"

#include <cmath>
#include <cstdlib>
#include <ctime>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "bps/envelope.hpp"
#include "bps/json.hpp"
#include "bps/version.hpp"  // generated at build time by cmake/GenerateVersion.cmake

namespace bps {
namespace {

using json::append_number;
using json::append_string;

char ascii_lower(char c) { return (c >= 'A' && c <= 'Z') ? static_cast<char>(c - 'A' + 'a') : c; }

bool ends_with_ci(std::string_view s, std::string_view suffix) {
    if (suffix.size() > s.size()) return false;
    const auto tail = s.substr(s.size() - suffix.size());
    for (std::size_t i = 0; i < suffix.size(); ++i) {
        if (ascii_lower(tail[i]) != ascii_lower(suffix[i])) return false;
    }
    return true;
}

constexpr std::string_view kUtf8Bom = "\xEF\xBB\xBF";
constexpr double kTwoPi = 6.28318530717958647692;

std::string file_error_json(std::string_view name, std::string_view message) {
    std::string out = "{\"name\":";
    append_string(out, name);
    out += ",\"status\":\"error\",\"error\":";
    append_string(out, message);
    out += '}';
    return out;
}

double round_to(double v, double step) { return std::round(v / step) * step; }

std::string utc_now_iso() {
    const std::time_t now = std::time(nullptr);
    const std::tm* t = std::gmtime(&now);
    if (!t) return "";
    char buf[32];
    std::strftime(buf, sizeof buf, "%Y-%m-%dT%H:%M:%SZ", t);
    return buf;
}

// Reads a finite number from a JSON number or numeric string ("12.5").
std::optional<double> number_field(const json::Value& obj, std::string_view key) {
    const json::Value* v = obj.find(key);
    if (!v) return std::nullopt;
    if (v->is_number()) return std::isfinite(v->number) ? std::optional<double>(v->number) : std::nullopt;
    if (v->is_string() && !v->string.empty()) {
        char* end = nullptr;
        const double d = std::strtod(v->string.c_str(), &end);
        if (end == v->string.c_str() + v->string.size() && std::isfinite(d)) return d;
    }
    return std::nullopt;
}

}  // namespace

std::string display_name(std::string_view raw) {
    const auto slash = raw.find_last_of("/\\");
    if (slash != std::string_view::npos) raw.remove_prefix(slash + 1);
    return raw.empty() ? std::string("unnamed") : std::string(raw);
}

bool has_allowed_extension(std::string_view name) {
    for (const auto ext : kAllowedExtensions) {
        if (ends_with_ci(name, ext)) return true;
    }
    return false;
}

bool is_valid_utf8(std::string_view s) {
    std::size_t i = 0;
    const std::size_t n = s.size();
    while (i < n) {
        const auto c = static_cast<unsigned char>(s[i]);
        if (c < 0x80) {
            ++i;
            continue;
        }
        std::size_t len;
        std::uint32_t cp;
        if ((c & 0xE0) == 0xC0) {
            len = 2;
            cp = c & 0x1F;
        } else if ((c & 0xF0) == 0xE0) {
            len = 3;
            cp = c & 0x0F;
        } else if ((c & 0xF8) == 0xF0) {
            len = 4;
            cp = c & 0x07;
        } else {
            return false;
        }
        if (n - i < len) return false;
        for (std::size_t k = 1; k < len; ++k) {
            const auto cc = static_cast<unsigned char>(s[i + k]);
            if ((cc & 0xC0) != 0x80) return false;
            cp = (cp << 6) | (cc & 0x3F);
        }
        const bool overlong = (len == 2 && cp < 0x80) || (len == 3 && cp < 0x800) || (len == 4 && cp < 0x10000);
        const bool surrogate = cp >= 0xD800 && cp <= 0xDFFF;
        if (overlong || surrogate || cp > 0x10FFFF) return false;
        i += len;
    }
    return true;
}

std::optional<std::string> check_file(std::string_view name, std::uint64_t size_bytes) {
    if (!has_allowed_extension(display_name(name))) return std::string("Unsupported file type");
    if (size_bytes > kMaxFileBytes) return "File too large (max " + std::to_string(kMaxFileBytes) + " bytes)";
    return std::nullopt;
}

std::string health_json() { return "{\"status\":\"ok\"}"; }

std::string limits_json() {
    std::string out = "{\"allowed_extensions\":[";
    bool first = true;
    for (const auto ext : kAllowedExtensions) {
        if (!first) out += ',';
        first = false;
        append_string(out, ext);
    }
    out += "],\"max_file_bytes\":" + std::to_string(kMaxFileBytes) + '}';
    return out;
}

std::string version_json() {
    std::string out = "{\"version\":";
    append_string(out, BPS_SEMVER "+" BPS_COMMIT);
    out += ",\"semver\":";
    append_string(out, BPS_SEMVER);
    out += ",\"commit\":";
    append_string(out, BPS_COMMIT);
    out += '}';
    return out;
}

std::string check_file_json(std::string_view name, double size_bytes) {
    const auto size = size_bytes > 0 ? static_cast<std::uint64_t>(size_bytes) : 0;
    const auto problem = check_file(name, size);
    return problem ? file_error_json(display_name(name), *problem) : std::string();
}

std::string Engine::read_rao_file_json(std::string_view raw_name, std::string_view bytes) {
    const std::string name = display_name(raw_name);
    if (const auto problem = check_file(raw_name, bytes.size())) return file_error_json(name, *problem);
    if (!is_valid_utf8(bytes)) return file_error_json(name, "File is not valid UTF-8 text");
    if (bytes.substr(0, kUtf8Bom.size()) == kUtf8Bom) bytes.remove_prefix(kUtf8Bom.size());

    RaoFile rao;
    try {
        rao = parse_rao(bytes);
    } catch (const RaoFormatError& e) {
        return file_error_json(name, std::string("Not a valid RAO file. ") + e.what());
    } catch (...) {  // one bad file never sinks the batch
        return file_error_json(name, "Could not read this file");
    }

    const int id = next_id_++;
    std::string out = "{\"name\":";
    append_string(out, name);
    out += ",\"status\":\"ok\",\"file_id\":" + std::to_string(id) + ",\"load_case\":";
    append_string(out, rao.load_case);
    out += ",\"sea_state\":";
    append_string(out, rao.sea_state);
    out += ",\"headings_count\":" + std::to_string(rao.directions.size());
    out += ",\"frequency_count\":" + std::to_string(rao.frequency_count());
    out += ",\"frequency_min\":";
    append_number(out, rao.frequency_min());
    out += ",\"frequency_max\":";
    append_number(out, rao.frequency_max());
    out += '}';

    files_.emplace(id, Stored{name, std::move(rao)});
    return out;
}

std::string Engine::release_rao_file_json(int file_id) {
    return files_.erase(file_id) ? "{\"released\":true}" : "{\"released\":false}";
}

std::string Engine::calculate_envelope_json(std::string_view request_json) const {
    try {
        const json::Value req = json::parse(request_json);
        if (!req.is_object()) return json::error_object("The request must be a JSON object");

        // Files, by id.
        const json::Value* ids = req.find("file_ids");
        if (!ids || !ids->is_array() || ids->array.empty()) return json::error_object("Add at least one RAO file");
        std::vector<NamedRao> files;
        for (const auto& v : ids->array) {
            const auto it = v.is_number() ? files_.find(static_cast<int>(v.number)) : files_.end();
            if (it == files_.end()) {
                return json::error_object("A selected RAO file is no longer loaded. Remove it and add it again.");
            }
            files.push_back({it->second.name, &it->second.rao});
        }

        // Centre of gravity per load case.
        std::map<std::string, CentreOfGravity, std::less<>> cogs;
        if (const json::Value* lcs = req.find("load_cases"); lcs && lcs->is_array()) {
            for (const auto& lc : lcs->array) {
                const json::Value* name = lc.find("load_case");
                if (!name || !name->is_string()) return json::error_object("Each load case needs a name");
                const auto lcg = number_field(lc, "lcg");
                const auto tcg = number_field(lc, "tcg");
                const auto kg = number_field(lc, "kg");
                if (!lcg || !tcg || !kg) {
                    return json::error_object(name->string + ": enter numbers for LCG, TCG and KG");
                }
                cogs[name->string] = {*lcg, *tcg, *kg};
            }
        }

        // Point.
        const json::Value* pt = req.find("point");
        const auto x = pt ? number_field(*pt, "x") : std::nullopt;
        const auto y = pt ? number_field(*pt, "y") : std::nullopt;
        const auto z = pt ? number_field(*pt, "z") : std::nullopt;
        if (!x || !y || !z) return json::error_object("Enter numbers for the point X, Y and Z");
        std::string point_name;
        if (const json::Value* n = req.find("point_name"); n && n->is_string()) point_name = n->string;

        const Envelope env = compute_envelope(files, cogs, {*x, *y, *z});

        std::string out = "{\"point_name\":";
        append_string(out, point_name);
        out += ",\"point\":{\"x\":";
        append_number(out, *x);
        out += ",\"y\":";
        append_number(out, *y);
        out += ",\"z\":";
        append_number(out, *z);
        out += "},\"files_used\":[";
        for (std::size_t i = 0; i < env.files_used.size(); ++i) {
            if (i) out += ',';
            append_string(out, env.files_used[i]);
        }
        out += "],\"basis\":{\"conditions\":[";
        for (std::size_t i = 0; i < env.conditions.size(); ++i) {
            if (i) out += ',';
            append_string(out, env.conditions[i]);
        }
        out += "],\"headings_count\":" + std::to_string(env.headings_count) + ",\"frequency_min\":";
        append_number(out, env.frequency_min);
        out += ",\"frequency_max\":";
        append_number(out, env.frequency_max);
        out += "},\"calculated_at\":";
        append_string(out, utc_now_iso());
        out += ",\"results\":[";
        static constexpr const char* kAxes[] = {"ax", "ay", "az"};
        for (int a = 0; a < 3; ++a) {
            const AxisPeak& p = env.peaks[a];
            if (a) out += ',';
            out += "{\"axis\":\"";
            out += kAxes[a];
            out += "\",\"value\":";
            append_number(out, p.value, 6);
            out += ",\"condition\":";
            append_string(out, p.load_case);
            out += ",\"sea_state\":";
            append_string(out, p.sea_state);
            out += ",\"file\":";
            append_string(out, p.file_name);
            out += ",\"heading_deg\":";
            append_number(out, round_to(p.heading_deg, 0.01));
            out += ",\"period_s\":";
            append_number(out, round_to(kTwoPi / p.omega, 0.01));
            out += ",\"frequency_rad_s\":";
            append_number(out, p.omega);
            out += '}';
        }
        out += "]}";
        return out;
    } catch (const json::ParseError& e) {
        return json::error_object(e.what());
    } catch (const EnvelopeError& e) {
        return json::error_object(e.what());
    } catch (...) {
        return json::error_object("The calculation failed");
    }
}

}  // namespace bps
