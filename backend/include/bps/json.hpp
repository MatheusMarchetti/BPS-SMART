// Minimal JSON support for the engine boundary: a writer for results and a
// small parser for the calculateEnvelope request. No external dependencies.
#pragma once

#include <map>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

namespace bps::json {

// ---- Writing -----------------------------------------------------------------

// Appends `s` as a quoted JSON string.
void append_string(std::string& out, std::string_view s);
// Appends a number with up to `precision` significant digits ("null" if not finite).
void append_number(std::string& out, double value, int precision = 10);
std::string error_object(std::string_view message);  // {"error":"..."}

// ---- Parsing -----------------------------------------------------------------

struct ParseError : std::runtime_error {
    using std::runtime_error::runtime_error;
};

struct Value {
    enum class Type { Null, Bool, Number, String, Array, Object };

    Type type = Type::Null;
    bool boolean = false;
    double number = 0;
    std::string string;
    std::vector<Value> array;
    std::map<std::string, Value, std::less<>> object;

    bool is_number() const { return type == Type::Number; }
    bool is_string() const { return type == Type::String; }
    bool is_array() const { return type == Type::Array; }
    bool is_object() const { return type == Type::Object; }

    // Object member, or nullptr when absent (or when this is not an object).
    const Value* find(std::string_view key) const;
};

// Throws ParseError on invalid JSON.
Value parse(std::string_view text);

}  // namespace bps::json
