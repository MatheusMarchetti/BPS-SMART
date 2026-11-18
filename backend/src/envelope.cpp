#include "bps/envelope.hpp"

#include <algorithm>
#include <cmath>
#include <complex>
#include <limits>

namespace bps {

std::array<double, 3> acceleration_amplitudes(const RaoRow& row, const Vec3& r) {
    std::array<std::complex<double>, 6> c;
    for (int k = 0; k < 6; ++k) c[k] = std::polar(row.amplitude[k], row.phase[k]);

    const std::complex<double> ux = c[Surge] + c[Pitch] * r.z - c[Yaw] * r.y;
    const std::complex<double> uy = c[Sway] + c[Yaw] * r.x - c[Roll] * r.z;
    const std::complex<double> uz = c[Heave] + c[Roll] * r.y - c[Pitch] * r.x;

    const double w2 = row.omega * row.omega;
    return {w2 * std::abs(ux), w2 * std::abs(uy), w2 * std::abs(uz)};
}

Envelope compute_envelope(const std::vector<NamedRao>& files,
                          const std::map<std::string, CentreOfGravity, std::less<>>& cogs,
                          const Vec3& point) {
    if (files.empty()) throw EnvelopeError("Add at least one RAO file");

    Envelope env;
    std::vector<double> headings;
    env.frequency_min = std::numeric_limits<double>::infinity();

    for (const auto& f : files) {
        const RaoFile& rao = *f.rao;
        const auto cog = cogs.find(rao.load_case);
        if (cog == cogs.end()) {
            throw EnvelopeError("Enter the LCG, TCG and KG of load case " + rao.load_case);
        }
        const Vec3 r{point.x - cog->second.lcg, point.y - cog->second.tcg, point.z - cog->second.kg};

        env.files_used.push_back(f.name);
        if (std::find(env.conditions.begin(), env.conditions.end(), rao.load_case) == env.conditions.end()) {
            env.conditions.push_back(rao.load_case);
        }

        for (const auto& dir : rao.directions) {
            if (std::none_of(headings.begin(), headings.end(),
                             [&](double h) { return std::abs(h - dir.heading_deg) < 1e-6; })) {
                headings.push_back(dir.heading_deg);
            }
            for (const auto& row : dir.rows) {
                env.frequency_min = std::min(env.frequency_min, row.omega);
                env.frequency_max = std::max(env.frequency_max, row.omega);
                const auto acc = acceleration_amplitudes(row, r);
                for (int axis = 0; axis < 3; ++axis) {
                    AxisPeak& peak = env.peaks[axis];
                    if (acc[axis] > peak.value) {
                        peak.value = acc[axis];
                        peak.load_case = rao.load_case;
                        peak.sea_state = rao.sea_state;
                        peak.file_name = f.name;
                        peak.heading_deg = dir.heading_deg;
                        peak.omega = row.omega;
                    }
                }
            }
        }
    }
    env.headings_count = headings.size();
    return env;
}

}  // namespace bps
