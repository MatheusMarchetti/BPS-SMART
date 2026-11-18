// JavaScript surface of the WebAssembly module (Emscripten embind).
//
// Must match `BpsEngine` in contract/engine.d.ts. Keep it thin: logic belongs
// in engine.cpp, rao.cpp and envelope.cpp, which are also built and tested natively.
#include <emscripten/bind.h>

#include <string>

#include "bps/engine.hpp"

namespace {

// One engine per module instance: it holds the RAO files read so far.
bps::Engine& engine() {
    static bps::Engine instance;
    return instance;
}

// JS numbers arrive as double (File.size can exceed 2^32).
std::string check_file(const std::string& name, double size_bytes) { return bps::check_file_json(name, size_bytes); }

// embind accepts a Uint8Array / ArrayBuffer for std::string and copies the raw
// bytes into the WebAssembly heap, so no text decoding happens in JS.
std::string read_rao_file(const std::string& name, const std::string& bytes) {
    return engine().read_rao_file_json(name, bytes);
}

std::string release_rao_file(int file_id) { return engine().release_rao_file_json(file_id); }

std::string calculate_envelope(const std::string& request_json) {
    return engine().calculate_envelope_json(request_json);
}

}  // namespace

EMSCRIPTEN_BINDINGS(bps_engine) {
    emscripten::function("getHealth", &bps::health_json);
    emscripten::function("getVersion", &bps::version_json);
    emscripten::function("getLimits", &bps::limits_json);
    emscripten::function("checkFile", &check_file);
    emscripten::function("readRaoFile", &read_rao_file);
    emscripten::function("releaseRaoFile", &release_rao_file);
    emscripten::function("calculateEnvelope", &calculate_envelope);
}
