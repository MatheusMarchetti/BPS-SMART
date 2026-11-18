// RAO file reader.
//
// Reads the tabulated RAO text files (one file per loading condition and RAO
// table / sea state), e.g. INT1_RAO_Table1_A1.txt:
//
//   *************************************************************
//   RAO TABLE: 1           (1=Hs<=2.5, 2=2.5<Hs<=4.5, 3=Hs>4.5m)
//   Loading Condition: 2   (1=LCMIN, 2=LCINT1, 3=LCINT2, 4=LCMAX)
//    *************************************************************
//
//   DIRECTION (deg):    15.00
//   Applied Roll damping in perc of critical:     1.20
//   Freq     Surge Sway Heave Roll Pitch Yaw  Surge Sway Heave Roll Pitch Yaw
//   [rad/s]  m     m    m     deg  deg   deg  deg   deg  deg   deg  deg   deg
//   0.100    0.968 0.258 1.000 0.020 0.057 0.021 270.18 267.59 360.00 273.82 89.86 179.45
//   ...                                          (one DIRECTION block per heading)
//
// Columns: wave frequency, 6 amplitudes per metre of wave amplitude
// (translations in m/m, rotations in deg/m), then 6 phases in degrees.
// The "[...]" units line is honoured: rotations and phases may also be in rad.
// The header values are mapped through their legends: "Loading Condition: 2"
// becomes load case "LCINT1", "RAO TABLE: 1" becomes sea state "Hs<=2.5".
#pragma once

#include <array>
#include <cstddef>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

namespace bps {

struct RaoFormatError : std::runtime_error {
    using std::runtime_error::runtime_error;
};

// Degrees of freedom, in column order.
enum Dof { Surge = 0, Sway, Heave, Roll, Pitch, Yaw };

struct RaoRow {
    double omega = 0;                  // wave frequency, rad/s
    std::array<double, 6> amplitude{}; // m/m for surge/sway/heave, rad/m for roll/pitch/yaw
    std::array<double, 6> phase{};     // rad
};

struct RaoDirection {
    double heading_deg = 0;
    double roll_damping_pct = -1;  // -1 when not given
    std::vector<RaoRow> rows;
};

struct RaoFile {
    std::string load_case;  // e.g. "LCINT1"
    std::string sea_state;  // e.g. "Hs<=2.5"; empty when not given
    std::vector<RaoDirection> directions;

    std::size_t frequency_count() const;  // largest number of rows in one direction
    double frequency_min() const;
    double frequency_max() const;
};

// Parses a whole file. Throws RaoFormatError with a user-facing message
// (including the line number) when the file does not follow the format.
RaoFile parse_rao(std::string_view text);

}  // namespace bps
