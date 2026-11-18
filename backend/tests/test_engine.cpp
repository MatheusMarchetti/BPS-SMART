// Contract-level tests for the engine, built and run natively:
//   cmake --preset native && cmake --build --preset native && ctest --preset native
//
// Usage: bps_tests <tests/data dir>
// Set BPS_RAO_SAMPLES to a folder of real RAO tables to also check them (they
// are client data and are not committed).
//
// Add or adjust a test whenever the contract changes.
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <regex>
#include <sstream>
#include <string>

#include "bps/engine.hpp"
#include "bps/envelope.hpp"
#include "bps/json.hpp"
#include "bps/rao.hpp"
#include "bps/version.hpp"

namespace fs = std::filesystem;

namespace {

int failures = 0;
fs::path data_dir;

#define CHECK(cond)                                                                       \
    do {                                                                                  \
        if (!(cond)) {                                                                    \
            ++failures;                                                                   \
            std::fprintf(stderr, "%s:%d: CHECK(%s)\n", __FILE__, __LINE__, #cond);       \
        }                                                                                 \
    } while (0)

#define CHECK_EQ(actual, expected)                                                        \
    do {                                                                                  \
        const std::string a_ = (actual), e_ = (expected);                                 \
        if (a_ != e_) {                                                                   \
            ++failures;                                                                   \
            std::fprintf(stderr, "%s:%d: %s\n  expected: %s\n  actual:   %s\n", __FILE__, \
                         __LINE__, #actual, e_.c_str(), a_.c_str());                      \
        }                                                                                 \
    } while (0)

#define CHECK_NEAR(actual, expected, tol)                                                 \
    do {                                                                                  \
        const double a_ = (actual), e_ = (expected);                                      \
        if (!(std::abs(a_ - e_) <= (tol))) {                                              \
            ++failures;                                                                   \
            std::fprintf(stderr, "%s:%d: %s = %.9g, expected %.9g\n", __FILE__, __LINE__, \
                         #actual, a_, e_);                                                \
        }                                                                                 \
    } while (0)

constexpr double kPi = 3.14159265358979323846;
constexpr double kDeg = kPi / 180.0;

std::string read_file(const fs::path& p) {
    std::ifstream in(p, std::ios::binary);
    std::ostringstream s;
    s << in.rdbuf();
    return s.str();
}

std::string fixture() { return read_file(data_dir / "synthetic_LCINT1_table1.txt"); }

// Expects a RaoFormatError whose message contains `needle`.
void check_format_error(const std::string& text, const std::string& needle) {
    try {
        bps::parse_rao(text);
        ++failures;
        std::fprintf(stderr, "expected RaoFormatError containing '%s'\n", needle.c_str());
    } catch (const bps::RaoFormatError& e) {
        if (std::string(e.what()).find(needle) == std::string::npos) {
            ++failures;
            std::fprintf(stderr, "error '%s' does not contain '%s'\n", e.what(), needle.c_str());
        }
    }
}

const std::string kHeader =
    "RAO TABLE: 1 (1=Hs<=2.5)\nLoading Condition: 2 (1=LCMIN, 2=LCINT1)\n";
const std::string kColumns =
    "Freq\tSurge\tSway\tHeave\tRoll\tPitch\tYaw\tSurge\tSway\tHeave\tRoll\tPitch\tYaw\n";
const std::string kUnitsDeg = "[rad/s]\tm\tm\tm\tdeg\tdeg\tdeg\tdeg\tdeg\tdeg\tdeg\tdeg\tdeg\n";

// ---- Basic endpoints ---------------------------------------------------------

void test_health_limits_version() {
    CHECK_EQ(bps::health_json(), R"({"status":"ok"})");
    CHECK_EQ(bps::limits_json(), R"({"allowed_extensions":[".txt"],"max_file_bytes":33554432})");

    const std::string v = bps::version_json();
    std::smatch m;
    const std::regex shape(R"re(\{"version":"([^"]+)","semver":"(\d+\.\d+\.\d+)","commit":"([0-9A-Za-z]{1,7}|unknown)"\})re");
    CHECK(std::regex_match(v, m, shape));
    if (m.size() == 4) CHECK_EQ(m[1].str(), m[2].str() + "+" + m[3].str());
}

void test_check_file() {
    CHECK_EQ(bps::check_file_json("a.TXT", 100), "");
    CHECK_EQ(bps::check_file_json("C:\\dir\\a.pdf", 100),
             R"({"name":"a.pdf","status":"error","error":"Unsupported file type"})");
    CHECK_EQ(bps::check_file_json("big.txt", 40.0 * 1024 * 1024),
             R"j({"name":"big.txt","status":"error","error":"File too large (max 33554432 bytes)"})j");
}

// ---- JSON --------------------------------------------------------------------

void test_json() {
    const auto v = bps::json::parse(R"( {"a":[1,-2.5e1,true,null],"s":"x\"\u00e9\ud83d\ude00","o":{}} )");
    CHECK(v.is_object());
    CHECK(v.find("a") && v.find("a")->array.size() == 4);
    CHECK_NEAR(v.find("a")->array[1].number, -25, 0);
    CHECK_EQ(v.find("s")->string, "x\"\xC3\xA9\xF0\x9F\x98\x80");
    CHECK(v.find("missing") == nullptr);

    for (const char* bad : {"", "{", "[1,]", "{\"a\" 1}", "01x", "\"\\ud800\"", "[1] 2"}) {
        bool threw = false;
        try {
            bps::json::parse(bad);
        } catch (const bps::json::ParseError&) {
            threw = true;
        }
        CHECK(threw);
    }

    std::string out;
    bps::json::append_string(out, "q\"\\\n\x01");
    CHECK_EQ(out, R"("q\"\\\n\u0001")");
    out.clear();
    bps::json::append_number(out, -0.0);
    bps::json::append_number(out, NAN);
    CHECK_EQ(out, "0null");
}

// ---- RAO parsing -------------------------------------------------------------

void test_parse_fixture() {
    const bps::RaoFile f = bps::parse_rao(fixture());
    CHECK_EQ(f.load_case, "LCINT1");
    CHECK_EQ(f.sea_state, "Hs<=2.5");
    CHECK(f.directions.size() == 2);
    CHECK(f.frequency_count() == 3);
    CHECK_NEAR(f.frequency_min(), 0.5, 0);
    CHECK_NEAR(f.frequency_max(), 2.0, 0);
    if (f.directions.size() == 2) {
        const auto& d = f.directions[1];
        CHECK_NEAR(d.heading_deg, 90, 0);
        CHECK_NEAR(d.roll_damping_pct, 2.5, 0);
        CHECK_NEAR(d.rows[1].amplitude[bps::Roll], 2 * kDeg, 1e-12);  // deg -> rad
        CHECK_NEAR(d.rows[1].phase[bps::Roll], 270 * kDeg, 1e-12);
    }
}

void test_parse_crlf_and_rad_units() {
    std::string text = kHeader + "DIRECTION (deg): 45\r\n" + kColumns +
                       "[rad/s]\tm\tm\tm\trad\trad\trad\trad\trad\trad\trad\trad\trad\r\n" +
                       "1.0\t0\t0\t0\t0.5\t0\t0\t0\t0\t0\t3.14\t0\t0\r\n";
    const bps::RaoFile f = bps::parse_rao(text);
    CHECK_NEAR(f.directions.at(0).rows.at(0).amplitude[bps::Roll], 0.5, 0);
    CHECK_NEAR(f.directions.at(0).rows.at(0).phase[bps::Roll], 3.14, 0);
}

void test_legend_fallbacks() {
    const bps::RaoFile f = bps::parse_rao("Loading Condition: 7 (1=LCMIN)\nDIRECTION (deg): 0\n1 0 0 1 0 0 0 0 0 0 0 0 0\n");
    CHECK_EQ(f.load_case, "7");
    CHECK_EQ(f.sea_state, "");
    const bps::RaoFile g = bps::parse_rao("Load case: Ballast\nSea condition: Hs 2 m\nDIRECTION (deg): 0\n1 0 0 1 0 0 0 0 0 0 0 0 0\n");
    CHECK_EQ(g.load_case, "Ballast");
    CHECK_EQ(g.sea_state, "Hs 2 m");
}

void test_parse_errors() {
    const std::string row = "1.0\t0\t0\t1\t0\t0\t0\t0\t0\t0\t0\t0\t0\n";
    check_format_error("DIRECTION (deg): 0\n" + row, "Loading Condition");
    check_format_error(kHeader, "No DIRECTION blocks");
    check_format_error(kHeader + row, "Line 3: data found before the first DIRECTION");
    check_format_error(kHeader + "DIRECTION (deg): 0\n1.0 0 0\n", "Line 4: expected 13 values");
    check_format_error(kHeader + "DIRECTION (deg): 0\n" + kColumns + kUnitsDeg, "has no data rows");
    check_format_error(kHeader + "DIRECTION (deg): 0\n0 0 0 1 0 0 0 0 0 0 0 0 0\n", "frequency must be greater than 0");
    check_format_error(kHeader + "DIRECTION (deg): 0\n1 -1 0 1 0 0 0 0 0 0 0 0 0\n", "cannot be negative");
    check_format_error(kHeader + "DIRECTION (deg): 0\n1 x 0 1 0 0 0 0 0 0 0 0 0\n", "'x' is not a number");
    check_format_error(kHeader + "DIRECTION (deg): 0\nFreq Heave Surge Sway Roll Pitch Yaw Surge Sway Heave Roll Pitch Yaw\n",
                       "unexpected columns");
    check_format_error(kHeader + "DIRECTION (deg): 0\n[Hz] m m m deg deg deg deg deg deg deg deg deg\n", "rad/s");
}

// ---- Kinematics --------------------------------------------------------------

bps::RaoRow make_row(double omega, std::array<double, 6> amp, std::array<double, 6> phase_deg) {
    bps::RaoRow r;
    r.omega = omega;
    r.amplitude = amp;
    for (int k = 0; k < 6; ++k) r.phase[k] = phase_deg[k] * kDeg;
    return r;
}

void test_acceleration_kinematics() {
    // Pure heave: az = w^2 * A everywhere.
    auto a = bps::acceleration_amplitudes(make_row(2.0, {0, 0, 1.5, 0, 0, 0}, {}), {10, 5, 3});
    CHECK_NEAR(a[0], 0, 1e-12);
    CHECK_NEAR(a[1], 0, 1e-12);
    CHECK_NEAR(a[2], 6.0, 1e-12);

    // Pitch 0.01 rad at lever arm rx = 20 m, rz = 5 m: az = w^2*0.01*20, ax = w^2*0.01*5.
    a = bps::acceleration_amplitudes(make_row(1.0, {0, 0, 0, 0, 0.01, 0}, {}), {20, 0, 5});
    CHECK_NEAR(a[0], 0.05, 1e-12);
    CHECK_NEAR(a[2], 0.20, 1e-12);

    // Roll 0.02 rad, ry = 10, rz = -4: ay = |-roll*rz| = 0.08, az = roll*ry = 0.2.
    a = bps::acceleration_amplitudes(make_row(1.0, {0, 0, 0, 0.02, 0, 0}, {}), {0, 10, -4});
    CHECK_NEAR(a[1], 0.08, 1e-12);
    CHECK_NEAR(a[2], 0.20, 1e-12);

    // Phases matter: heave 1 at 0 deg cancels pitch*rx when pitch is 0.1 rad at 0 deg
    // and rx = 10 (uz = heave - pitch*rx = 0). At 180 deg they add up (2).
    a = bps::acceleration_amplitudes(make_row(1.0, {0, 0, 1, 0, 0.1, 0}, {0, 0, 0, 0, 0, 0}), {10, 0, 0});
    CHECK_NEAR(a[2], 0.0, 1e-12);
    a = bps::acceleration_amplitudes(make_row(1.0, {0, 0, 1, 0, 0.1, 0}, {0, 0, 0, 0, 180, 0}), {10, 0, 0});
    CHECK_NEAR(a[2], 2.0, 1e-12);

    // Yaw 0.01 rad, rx = 30, ry = -2: ax = |-yaw*ry| = 0.02, ay = yaw*rx = 0.3.
    a = bps::acceleration_amplitudes(make_row(1.0, {0, 0, 0, 0, 0, 0.01}, {}), {30, -2, 0});
    CHECK_NEAR(a[0], 0.02, 1e-12);
    CHECK_NEAR(a[1], 0.30, 1e-12);
}

// ---- Engine (JSON boundary, stateful flow) -------------------------------------

void test_engine_flow() {
    bps::Engine engine;

    // 1. Files are read one by one, as soon as they are added.
    const std::string ok = engine.read_rao_file_json("dir/LCINT1_T1.txt", fixture());
    CHECK_EQ(ok, R"({"name":"LCINT1_T1.txt","status":"ok","file_id":1,"load_case":"LCINT1","sea_state":"Hs<=2.5",)"
                 R"("headings_count":2,"frequency_count":3,"frequency_min":0.5,"frequency_max":2})");
    CHECK_EQ(engine.read_rao_file_json("x.exe", "MZ"), R"({"name":"x.exe","status":"error","error":"Unsupported file type"})");
    CHECK_EQ(engine.read_rao_file_json("latin1.txt", "caf\xE9"),
             R"({"name":"latin1.txt","status":"error","error":"File is not valid UTF-8 text"})");
    CHECK_EQ(engine.read_rao_file_json("notes.txt", "hello"),
             R"({"name":"notes.txt","status":"error","error":"Not a valid RAO file. Missing the 'Loading Condition' header"})");
    CHECK(engine.file_count() == 1);  // failed files are not stored

    // A BOM is accepted.
    const std::string bom = engine.read_rao_file_json("bom.txt", "\xEF\xBB\xBF" + fixture());
    CHECK(bom.find(R"("status":"ok","file_id":2)") != std::string::npos);

    // 2. Calculate sends only the form data. Point at the CoG: no lever arm.
    const std::string request =
        R"({"file_ids":[1],"load_cases":[{"load_case":"LCINT1","lcg":"100","tcg":0,"kg":12.5}],)"
        R"("point":{"x":100,"y":"0","z":12.5},"point_name":"Crane"})";
    const std::string res = engine.calculate_envelope_json(request);
    const auto v = bps::json::parse(res);
    CHECK(v.find("error") == nullptr);
    CHECK_EQ(v.find("point_name") ? v.find("point_name")->string : "", "Crane");
    CHECK(v.find("files_used") && v.find("files_used")->array.size() == 1);
    const auto* basis = v.find("basis");
    CHECK(basis && basis->find("headings_count")->number == 2);
    CHECK(basis && basis->find("conditions")->array.at(0).string == "LCINT1");
    CHECK(basis && basis->find("frequency_min")->number == 0.5 && basis->find("frequency_max")->number == 2);
    CHECK(v.find("calculated_at") && std::regex_match(v.find("calculated_at")->string,
                                                      std::regex(R"(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)")));
    const auto* results = v.find("results");
    CHECK(results && results->array.size() == 3);
    if (results && results->array.size() == 3) {
        // ax: surge 0.25 at w=2, heading 90 -> 4*0.25 = 1
        const auto& ax = results->array[0];
        CHECK_EQ(ax.find("axis")->string, "ax");
        CHECK_NEAR(ax.find("value")->number, 1.0, 1e-9);
        CHECK_NEAR(ax.find("heading_deg")->number, 90, 0);
        CHECK_NEAR(ax.find("period_s")->number, 3.14, 0);
        CHECK_EQ(ax.find("condition")->string, "LCINT1");
        CHECK_EQ(ax.find("sea_state")->string, "Hs<=2.5");
        // ay: sway 0.5 at w=1, heading 90
        CHECK_NEAR(results->array[1].find("value")->number, 0.5, 1e-9);
        CHECK_NEAR(results->array[1].find("period_s")->number, 6.28, 0);
        // az: heave 1 at w=2, heading 0 -> 4
        CHECK_NEAR(results->array[2].find("value")->number, 4.0, 1e-9);
        CHECK_NEAR(results->array[2].find("heading_deg")->number, 0, 0);
    }

    // Lever arm: 10 m to port of the CoG adds roll (2 deg at w=1, 270 deg phase) to az.
    const std::string side = engine.calculate_envelope_json(
        R"({"file_ids":[1],"load_cases":[{"load_case":"LCINT1","lcg":100,"tcg":0,"kg":12.5}],"point":{"x":100,"y":10,"z":12.5}})");
    const auto sv = bps::json::parse(side);
    CHECK_NEAR(sv.find("results")->array.at(2).find("value")->number, 4.0, 1e-9);  // heave at w=2 still governs
    CHECK_EQ(sv.find("point_name")->string, "");

    // Validation errors are returned as {"error": ...}.
    CHECK_EQ(engine.calculate_envelope_json("not json").substr(0, 22), R"({"error":"Invalid JSON)");
    CHECK_EQ(engine.calculate_envelope_json(R"({"file_ids":[],"point":{"x":0,"y":0,"z":0}})"),
             R"({"error":"Add at least one RAO file"})");
    CHECK_EQ(engine.calculate_envelope_json(R"({"file_ids":[1],"load_cases":[],"point":{"x":0,"y":0,"z":0}})"),
             R"({"error":"Enter the LCG, TCG and KG of load case LCINT1"})");
    CHECK_EQ(engine.calculate_envelope_json(
                 R"({"file_ids":[1],"load_cases":[{"load_case":"LCINT1","lcg":"","tcg":0,"kg":0}],"point":{"x":0,"y":0,"z":0}})"),
             R"({"error":"LCINT1: enter numbers for LCG, TCG and KG"})");
    CHECK_EQ(engine.calculate_envelope_json(
                 R"({"file_ids":[1],"load_cases":[{"load_case":"LCINT1","lcg":0,"tcg":0,"kg":0}],"point":{"x":0,"y":"a","z":0}})"),
             R"({"error":"Enter numbers for the point X, Y and Z"})");

    // 3. Released files can no longer be used.
    CHECK_EQ(engine.release_rao_file_json(1), R"({"released":true})");
    CHECK_EQ(engine.release_rao_file_json(1), R"({"released":false})");
    CHECK_EQ(engine.calculate_envelope_json(request),
             R"({"error":"A selected RAO file is no longer loaded. Remove it and add it again."})");
}

// ---- Real samples (optional) -----------------------------------------------------

void test_real_samples() {
    const char* dir = std::getenv("BPS_RAO_SAMPLES");
    if (!dir || !*dir) {
        std::printf("BPS_RAO_SAMPLES not set: skipping the real RAO tables\n");
        return;
    }
    bps::Engine engine;
    std::string ids, load_cases;
    std::size_t n = 0;
    for (const auto& entry : fs::directory_iterator(dir)) {
        if (entry.path().extension() != ".txt") continue;
        const std::string name = entry.path().filename().string();
        const std::string out = engine.read_rao_file_json(name, read_file(entry.path()));
        const auto v = bps::json::parse(out);
        CHECK(v.find("status") && v.find("status")->string == "ok");
        if (!v.find("file_id")) {
            std::fprintf(stderr, "%s: %s\n", name.c_str(), out.c_str());
            continue;
        }
        CHECK(v.find("headings_count")->number == 19);
        std::printf("  %s -> %s / %s, %g frequencies\n", name.c_str(), v.find("load_case")->string.c_str(),
                    v.find("sea_state")->string.c_str(), v.find("frequency_count")->number);
        ids += (n++ ? "," : "") + std::to_string(static_cast<int>(v.find("file_id")->number));
    }
    for (const char* lc : {"LCMIN", "LCINT1", "LCINT2", "LCMAX"}) {
        load_cases += std::string(load_cases.empty() ? "" : ",") + R"({"load_case":")" + lc + R"(","lcg":150,"tcg":0,"kg":18})";
    }
    const std::string res = engine.calculate_envelope_json(R"({"file_ids":[)" + ids + R"(],"load_cases":[)" + load_cases +
                                                           R"(],"point":{"x":200,"y":20,"z":40}})");
    CHECK(res.find("\"error\"") == std::string::npos);
    std::printf("  envelope: %s\n", res.c_str());
}

}  // namespace

int main(int argc, char** argv) {
    data_dir = argc > 1 ? fs::path(argv[1]) : fs::path("tests/data");

    test_health_limits_version();
    test_check_file();
    test_json();
    test_parse_fixture();
    test_parse_crlf_and_rad_units();
    test_legend_fallbacks();
    test_parse_errors();
    test_acceleration_kinematics();
    test_engine_flow();
    test_real_samples();

    if (failures) {
        std::fprintf(stderr, "%d check(s) failed\n", failures);
        return 1;
    }
    std::printf("All engine tests passed (version %s+%s)\n", BPS_SEMVER, BPS_COMMIT);
    return 0;
}
