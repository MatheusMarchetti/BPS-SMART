#include "bps/rao.hpp"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <limits>
#include <optional>

namespace bps {
namespace {

constexpr double kPi = 3.14159265358979323846;
constexpr double kDegToRad = kPi / 180.0;
constexpr std::size_t kColumns = 13;  // freq + 6 amplitudes + 6 phases
constexpr std::string_view kColumnNames[kColumns] = {
    "freq", "surge", "sway", "heave", "roll", "pitch", "yaw",
    "surge", "sway", "heave", "roll", "pitch", "yaw"};

bool is_space(char c) { return c == ' ' || c == '\t' || c == '\r' || c == '\v' || c == '\f'; }

std::string_view trim(std::string_view s) {
    while (!s.empty() && is_space(s.front())) s.remove_prefix(1);
    while (!s.empty() && is_space(s.back())) s.remove_suffix(1);
    return s;
}

std::string lower(std::string_view s) {
    std::string out(s);
    for (char& c : out) {
        if (c >= 'A' && c <= 'Z') c = static_cast<char>(c - 'A' + 'a');
    }
    return out;
}

bool starts_with_ci(std::string_view s, std::string_view prefix) {
    return s.size() >= prefix.size() && lower(s.substr(0, prefix.size())) == prefix;
}

std::vector<std::string_view> split_ws(std::string_view s) {
    std::vector<std::string_view> out;
    std::size_t i = 0;
    while (i < s.size()) {
        while (i < s.size() && is_space(s[i])) ++i;
        const std::size_t start = i;
        while (i < s.size() && !is_space(s[i])) ++i;
        if (i > start) out.push_back(s.substr(start, i - start));
    }
    return out;
}

std::optional<double> to_number(std::string_view token) {
    if (token.empty() || token.size() > 64) return std::nullopt;
    const std::string buf(token);
    char* end = nullptr;
    const double v = std::strtod(buf.c_str(), &end);
    if (end != buf.c_str() + buf.size() || !std::isfinite(v)) return std::nullopt;
    return v;
}

bool looks_numeric(std::string_view token) {
    if (token.empty()) return false;
    const char c = token.front();
    return (c >= '0' && c <= '9') || c == '-' || c == '+' || c == '.';
}

std::string line_prefix(std::size_t line_no) { return "Line " + std::to_string(line_no) + ": "; }

// "2   (1=LCMIN, 2=LCINT1, 3=LCINT2, 4=LCMAX)" -> "LCINT1".
// Without a legend entry for the value, returns the value itself.
std::string resolve_legend(std::string_view value_part) {
    std::string_view value = trim(value_part);
    std::string_view legend;
    if (const auto open = value.find('('); open != std::string_view::npos) {
        const auto close = value.find(')', open);
        legend = value.substr(open + 1, close == std::string_view::npos ? std::string_view::npos : close - open - 1);
        value = trim(value.substr(0, open));
    }
    if (!legend.empty()) {
        std::size_t start = 0;
        while (start <= legend.size()) {
            auto comma = legend.find(',', start);
            if (comma == std::string_view::npos) comma = legend.size();
            const std::string_view entry = trim(legend.substr(start, comma - start));
            if (const auto eq = entry.find('='); eq != std::string_view::npos) {
                if (trim(entry.substr(0, eq)) == value) return std::string(trim(entry.substr(eq + 1)));
            }
            start = comma + 1;
        }
    }
    return std::string(value);
}

// Value after the first ':' (or '='), or nullopt if the line has neither.
std::optional<std::string_view> value_after_colon(std::string_view line) {
    const auto pos = line.find_first_of(":=");
    if (pos == std::string_view::npos) return std::nullopt;
    return line.substr(pos + 1);
}

struct Units {
    double rotation = kDegToRad;  // amplitude factor for roll/pitch/yaw
    double phase = kDegToRad;
};

double angle_unit(std::string_view token, std::size_t line_no) {
    const std::string u = lower(token);
    if (u == "deg" || u == "[deg]" || u == "deg/m") return kDegToRad;
    if (u == "rad" || u == "[rad]" || u == "rad/m") return 1.0;
    throw RaoFormatError(line_prefix(line_no) + "unknown angle unit '" + std::string(token) + "' (use deg or rad)");
}

}  // namespace

std::size_t RaoFile::frequency_count() const {
    std::size_t n = 0;
    for (const auto& d : directions) n = std::max(n, d.rows.size());
    return n;
}

double RaoFile::frequency_min() const {
    double v = std::numeric_limits<double>::infinity();
    for (const auto& d : directions)
        for (const auto& r : d.rows) v = std::min(v, r.omega);
    return v;
}

double RaoFile::frequency_max() const {
    double v = 0;
    for (const auto& d : directions)
        for (const auto& r : d.rows) v = std::max(v, r.omega);
    return v;
}

RaoFile parse_rao(std::string_view text) {
    RaoFile file;
    Units units;
    bool have_load_case = false;

    std::size_t line_no = 0;
    std::size_t pos = 0;
    while (pos <= text.size()) {
        auto eol = text.find('\n', pos);
        if (eol == std::string_view::npos) eol = text.size();
        const std::string_view line = trim(text.substr(pos, eol - pos));
        pos = eol + 1;
        ++line_no;
        if (line.empty()) continue;

        const auto tokens = split_ws(line);

        // Data row: starts with a number.
        if (looks_numeric(tokens.front())) {
            if (file.directions.empty()) {
                throw RaoFormatError(line_prefix(line_no) + "data found before the first DIRECTION line");
            }
            if (tokens.size() != kColumns) {
                throw RaoFormatError(line_prefix(line_no) + "expected 13 values (frequency, 6 amplitudes, 6 phases), found " +
                                     std::to_string(tokens.size()));
            }
            RaoRow row;
            std::array<double, kColumns> v{};
            for (std::size_t i = 0; i < kColumns; ++i) {
                const auto n = to_number(tokens[i]);
                if (!n) throw RaoFormatError(line_prefix(line_no) + "'" + std::string(tokens[i]) + "' is not a number");
                v[i] = *n;
            }
            row.omega = v[0];
            if (row.omega <= 0) throw RaoFormatError(line_prefix(line_no) + "frequency must be greater than 0");
            for (int k = 0; k < 6; ++k) {
                const double amp = v[1 + k];
                if (amp < 0) throw RaoFormatError(line_prefix(line_no) + "amplitudes cannot be negative");
                row.amplitude[k] = k >= Roll ? amp * units.rotation : amp;
                row.phase[k] = v[7 + k] * units.phase;
            }
            file.directions.back().rows.push_back(row);
            continue;
        }

        const std::string head = lower(line);

        if (starts_with_ci(line, "direction")) {
            const auto value = value_after_colon(line);
            const auto heading = value ? to_number(trim(*value)) : std::nullopt;
            if (!heading) throw RaoFormatError(line_prefix(line_no) + "DIRECTION has no numeric heading");
            RaoDirection d;
            d.heading_deg = head.find("(rad") != std::string::npos ? *heading / kDegToRad : *heading;
            file.directions.push_back(std::move(d));
            continue;
        }
        if (head.find("roll damping") != std::string::npos) {
            const auto value = value_after_colon(line);
            if (const auto pct = value ? to_number(trim(*value)) : std::nullopt; pct && !file.directions.empty()) {
                file.directions.back().roll_damping_pct = *pct;
            }
            continue;
        }
        if (starts_with_ci(line, "loading condition") || starts_with_ci(line, "load case")) {
            if (const auto value = value_after_colon(line)) {
                file.load_case = resolve_legend(*value);
                have_load_case = !file.load_case.empty();
            }
            continue;
        }
        if (starts_with_ci(line, "rao table") || starts_with_ci(line, "sea condition") || starts_with_ci(line, "sea state")) {
            if (const auto value = value_after_colon(line)) file.sea_state = resolve_legend(*value);
            continue;
        }
        if (starts_with_ci(line, "freq")) {  // column names
            bool matches = tokens.size() == kColumns;
            for (std::size_t i = 0; matches && i < kColumns; ++i) matches = lower(tokens[i]) == kColumnNames[i];
            if (!matches) {
                throw RaoFormatError(line_prefix(line_no) +
                                     "unexpected columns; expected Freq, Surge..Yaw amplitudes, Surge..Yaw phases");
            }
            continue;
        }
        if (line.front() == '[') {  // units
            if (tokens.size() != kColumns) {
                throw RaoFormatError(line_prefix(line_no) + "the units line must have 13 entries");
            }
            if (lower(tokens[0]) != "[rad/s]") {
                throw RaoFormatError(line_prefix(line_no) + "frequency must be in rad/s");
            }
            units.rotation = angle_unit(tokens[Roll + 1], line_no);
            if (angle_unit(tokens[Pitch + 1], line_no) != units.rotation ||
                angle_unit(tokens[Yaw + 1], line_no) != units.rotation) {
                throw RaoFormatError(line_prefix(line_no) + "roll, pitch and yaw must use the same unit");
            }
            units.phase = angle_unit(tokens[7], line_no);
            for (std::size_t i = 8; i < kColumns; ++i) {
                if (angle_unit(tokens[i], line_no) != units.phase) {
                    throw RaoFormatError(line_prefix(line_no) + "all phases must use the same unit");
                }
            }
            continue;
        }
        // Anything else (banners, notes) is ignored.
    }

    if (!have_load_case) throw RaoFormatError("Missing the 'Loading Condition' header");
    if (file.directions.empty()) throw RaoFormatError("No DIRECTION blocks found");
    for (const auto& d : file.directions) {
        if (d.rows.empty()) {
            char buf[64];
            std::snprintf(buf, sizeof buf, "%g", d.heading_deg);
            throw RaoFormatError(std::string("DIRECTION ") + buf + " deg has no data rows");
        }
    }
    return file;
}

}  // namespace bps
