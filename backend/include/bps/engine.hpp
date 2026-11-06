// Engine boundary: validation, per-file error isolation, the store of parsed
// RAO files, and JSON in/out. bindings.cpp exposes it to the browser; tests
// call it natively. Every *_json function returns a JSON document whose shape
// is defined in contract/engine.d.ts.
//
// Flow (see the contract):
//   1. readRaoFile(name, bytes) as soon as the user adds a file, one at a time.
//      The file is parsed once and kept in memory under a file_id.
//   2. calculateEnvelope(request) when the user clicks Calculate. The request
//      carries only the form data (file_ids, LCG/TCG/KG per load case, point).
//   3. releaseRaoFile(file_id) when the user removes a file.
#pragma once

#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <string_view>

#include "bps/rao.hpp"

namespace bps {

inline constexpr std::string_view kAllowedExtensions[] = {".txt"};
// Per file. RAO tables are ~0.3 MB; this only guards the browser's memory.
inline constexpr std::uint64_t kMaxFileBytes = 32ull * 1024 * 1024;

// Strips any directory part of a file name; "unnamed" if nothing is left.
std::string display_name(std::string_view raw);
bool has_allowed_extension(std::string_view name);
bool is_valid_utf8(std::string_view bytes);

// Error message for what can be decided from the name and size alone, before
// the file is read; nullopt if the file may be read.
std::optional<std::string> check_file(std::string_view name, std::uint64_t size_bytes);

std::string health_json();
std::string limits_json();
std::string version_json();
// "" if the file may be read, else a RaoFileResult with status "error".
std::string check_file_json(std::string_view name, double size_bytes);

class Engine {
public:
    // Validates, parses and stores one file. Returns a RaoFileResult. Never throws.
    std::string read_rao_file_json(std::string_view name, std::string_view bytes);
    // Returns {"released":true|false}.
    std::string release_rao_file_json(int file_id);
    // Returns an EnvelopeResult, or {"error":"..."}. Never throws.
    std::string calculate_envelope_json(std::string_view request_json) const;

    std::size_t file_count() const { return files_.size(); }

private:
    struct Stored {
        std::string name;
        RaoFile rao;
    };
    std::map<int, Stored> files_;
    int next_id_ = 1;
};

}  // namespace bps
