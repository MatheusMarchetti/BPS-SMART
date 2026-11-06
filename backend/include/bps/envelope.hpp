// Acceleration envelope at a point: the backend team's main calculation.
//
// For each RAO row (load case, heading, frequency), the complex motion of the
// point P is the rigid-body motion of the centre of gravity G plus the rotation
// times the lever arm r = P - G, with G = (LCG, TCG, KG) of that load case:
//
//   uP = u + theta x r
//   uP_x = surge + pitch*rz - yaw*ry
//   uP_y = sway  + yaw*rx   - roll*rz
//   uP_z = heave + roll*ry  - pitch*rx
//
// where each DOF is the complex amplitude A*exp(i*phase). The acceleration
// amplitude is omega^2 * |uP| per axis, in m/s^2 per metre of wave amplitude.
// The envelope is the maximum per axis over every file, heading and frequency.
//
// Assumptions (to confirm with the RAO provider):
//   - RAOs are given at the centre of gravity of each loading condition.
//   - Axes are right-handed (x forward, y to port, z up), rotations follow the
//     right-hand rule, and all phases use the same lead/lag convention.
//   - Pure kinematic acceleration: no gravity component from roll/pitch.
#pragma once

#include <array>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>

#include "bps/rao.hpp"

namespace bps {

struct EnvelopeError : std::runtime_error {
    using std::runtime_error::runtime_error;
};

struct Vec3 {
    double x = 0, y = 0, z = 0;
};

struct CentreOfGravity {
    double lcg = 0, tcg = 0, kg = 0;
};

struct NamedRao {
    std::string name;  // file name, for files_used
    const RaoFile* rao = nullptr;
};

struct AxisPeak {
    double value = -1;  // m/s^2 per m of wave amplitude
    std::string load_case;
    std::string sea_state;
    std::string file_name;
    double heading_deg = 0;
    double omega = 0;  // rad/s
};

struct Envelope {
    std::array<AxisPeak, 3> peaks;  // ax, ay, az
    std::vector<std::string> conditions;  // load cases used, in file order
    std::vector<std::string> files_used;
    std::size_t headings_count = 0;  // distinct headings across the files
    double frequency_min = 0, frequency_max = 0;
};

// Complex amplitude of the acceleration at `point` for one RAO row, per axis.
std::array<double, 3> acceleration_amplitudes(const RaoRow& row, const Vec3& lever_arm);

// Throws EnvelopeError when a file's load case has no centre of gravity.
Envelope compute_envelope(const std::vector<NamedRao>& files,
                          const std::map<std::string, CentreOfGravity, std::less<>>& cogs,
                          const Vec3& point);

}  // namespace bps
