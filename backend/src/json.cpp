#include "bps/json.hpp"

#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstdlib>

namespace bps::json {

void append_string(std::string& out, std::string_view s) {
    out += '"';
    for (const char ch : s) {
        const auto c = static_cast<unsigned char>(ch);
        switch (c) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if (c < 0x20) {
                    char buf[8];
                    std::snprintf(buf, sizeof buf, "\\u%04x", c);
                    out += buf;
                } else {
                    out += ch;
                }
        }
    }
    out += '"';
}

void append_number(std::string& out, double value, int precision) {
    if (!std::isfinite(value)) {
        out += "null";
        return;
    }
    if (value == 0) value = 0;  // no "-0"
    char buf[32];
    std::snprintf(buf, sizeof buf, "%.*g", precision, value);
    out += buf;
}

std::string error_object(std::string_view message) {
    std::string out = "{\"error\":";
    append_string(out, message);
    out += '}';
    return out;
}

const Value* Value::find(std::string_view key) const {
    if (type != Type::Object) return nullptr;
    const auto it = object.find(key);
    return it == object.end() ? nullptr : &it->second;
}

namespace {

constexpr int kMaxDepth = 64;

class Parser {
public:
    explicit Parser(std::string_view text) : s_(text) {}

    Value parse_document() {
        Value v = parse_value(0);
        skip_ws();
        if (pos_ != s_.size()) fail("unexpected trailing characters");
        return v;
    }

private:
    std::string_view s_;
    std::size_t pos_ = 0;

    [[noreturn]] void fail(const char* what) const {
        throw ParseError(std::string("Invalid JSON at offset ") + std::to_string(pos_) + ": " + what);
    }

    void skip_ws() {
        while (pos_ < s_.size() && (s_[pos_] == ' ' || s_[pos_] == '\t' || s_[pos_] == '\n' || s_[pos_] == '\r')) ++pos_;
    }

    bool consume(std::string_view word) {
        if (s_.substr(pos_, word.size()) != word) return false;
        pos_ += word.size();
        return true;
    }

    Value parse_value(int depth) {
        if (depth > kMaxDepth) fail("nested too deeply");
        skip_ws();
        if (pos_ >= s_.size()) fail("unexpected end");
        Value v;
        const char c = s_[pos_];
        if (c == '{') {
            v.type = Value::Type::Object;
            ++pos_;
            skip_ws();
            if (pos_ < s_.size() && s_[pos_] == '}') { ++pos_; return v; }
            while (true) {
                skip_ws();
                if (pos_ >= s_.size() || s_[pos_] != '"') fail("expected a key");
                std::string key = parse_string();
                skip_ws();
                if (pos_ >= s_.size() || s_[pos_] != ':') fail("expected ':'");
                ++pos_;
                v.object[std::move(key)] = parse_value(depth + 1);
                skip_ws();
                if (pos_ < s_.size() && s_[pos_] == ',') { ++pos_; continue; }
                if (pos_ < s_.size() && s_[pos_] == '}') { ++pos_; return v; }
                fail("expected ',' or '}'");
            }
        }
        if (c == '[') {
            v.type = Value::Type::Array;
            ++pos_;
            skip_ws();
            if (pos_ < s_.size() && s_[pos_] == ']') { ++pos_; return v; }
            while (true) {
                v.array.push_back(parse_value(depth + 1));
                skip_ws();
                if (pos_ < s_.size() && s_[pos_] == ',') { ++pos_; continue; }
                if (pos_ < s_.size() && s_[pos_] == ']') { ++pos_; return v; }
                fail("expected ',' or ']'");
            }
        }
        if (c == '"') {
            v.type = Value::Type::String;
            v.string = parse_string();
            return v;
        }
        if (consume("true")) { v.type = Value::Type::Bool; v.boolean = true; return v; }
        if (consume("false")) { v.type = Value::Type::Bool; return v; }
        if (consume("null")) return v;
        if (c == '-' || (c >= '0' && c <= '9')) {
            v.type = Value::Type::Number;
            v.number = parse_number();
            return v;
        }
        fail("unexpected character");
    }

    double parse_number() {
        const std::size_t start = pos_;
        if (s_[pos_] == '-') ++pos_;
        auto digits = [&] {
            const std::size_t d = pos_;
            while (pos_ < s_.size() && s_[pos_] >= '0' && s_[pos_] <= '9') ++pos_;
            if (pos_ == d) fail("expected a digit");
        };
        digits();
        if (pos_ < s_.size() && s_[pos_] == '.') { ++pos_; digits(); }
        if (pos_ < s_.size() && (s_[pos_] == 'e' || s_[pos_] == 'E')) {
            ++pos_;
            if (pos_ < s_.size() && (s_[pos_] == '+' || s_[pos_] == '-')) ++pos_;
            digits();
        }
        const std::string token(s_.substr(start, pos_ - start));
        return std::strtod(token.c_str(), nullptr);
    }

    unsigned parse_hex4() {
        if (s_.size() - pos_ < 4) fail("truncated \\u escape");
        unsigned v = 0;
        for (int i = 0; i < 4; ++i) {
            const char h = s_[pos_++];
            v <<= 4;
            if (h >= '0' && h <= '9') v |= static_cast<unsigned>(h - '0');
            else if (h >= 'a' && h <= 'f') v |= static_cast<unsigned>(h - 'a' + 10);
            else if (h >= 'A' && h <= 'F') v |= static_cast<unsigned>(h - 'A' + 10);
            else fail("bad \\u escape");
        }
        return v;
    }

    static void append_utf8(std::string& out, std::uint32_t cp) {
        if (cp < 0x80) {
            out += static_cast<char>(cp);
        } else if (cp < 0x800) {
            out += static_cast<char>(0xC0 | (cp >> 6));
            out += static_cast<char>(0x80 | (cp & 0x3F));
        } else if (cp < 0x10000) {
            out += static_cast<char>(0xE0 | (cp >> 12));
            out += static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
            out += static_cast<char>(0x80 | (cp & 0x3F));
        } else {
            out += static_cast<char>(0xF0 | (cp >> 18));
            out += static_cast<char>(0x80 | ((cp >> 12) & 0x3F));
            out += static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
            out += static_cast<char>(0x80 | (cp & 0x3F));
        }
    }

    std::string parse_string() {
        ++pos_;  // opening quote
        std::string out;
        while (true) {
            if (pos_ >= s_.size()) fail("unterminated string");
            const char c = s_[pos_++];
            if (c == '"') return out;
            if (static_cast<unsigned char>(c) < 0x20) fail("control character in string");
            if (c != '\\') { out += c; continue; }
            if (pos_ >= s_.size()) fail("unterminated escape");
            const char e = s_[pos_++];
            switch (e) {
                case '"': out += '"'; break;
                case '\\': out += '\\'; break;
                case '/': out += '/'; break;
                case 'b': out += '\b'; break;
                case 'f': out += '\f'; break;
                case 'n': out += '\n'; break;
                case 'r': out += '\r'; break;
                case 't': out += '\t'; break;
                case 'u': {
                    std::uint32_t cp = parse_hex4();
                    if (cp >= 0xD800 && cp <= 0xDBFF) {  // surrogate pair
                        if (!consume("\\u")) fail("lone surrogate");
                        const unsigned lo = parse_hex4();
                        if (lo < 0xDC00 || lo > 0xDFFF) fail("bad surrogate pair");
                        cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00);
                    } else if (cp >= 0xDC00 && cp <= 0xDFFF) {
                        fail("lone surrogate");
                    }
                    append_utf8(out, cp);
                    break;
                }
                default: fail("bad escape");
            }
        }
    }
};

}  // namespace

Value parse(std::string_view text) { return Parser(text).parse_document(); }

}  // namespace bps::json
