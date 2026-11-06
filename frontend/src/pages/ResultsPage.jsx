import { useState } from "react";
import DataTable from "../components/DataTable.jsx";
import "./ResultsPage.css";

const G = 9.80665;
const AXIS_NAMES = { ax: "Longitudinal ax", ay: "Transverse ay", az: "Vertical az" };
const UNITS = [["ms2", "m/s²"], ["g", "g"]];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function ResultsPage({ result }) {
  const [unit, setUnit] = useState("ms2");
  const fmt = (v) => (unit === "g" ? (v / G).toFixed(3) : v.toFixed(2));
  const unitLabel = unit === "g" ? "g" : "m/s²";

  const basis = result.basis;
  const conditionsCount = basis?.conditions?.length ?? 0;
  const calculatedAt = result.calculated_at
    ? new Date(result.calculated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "";

  const columns = [
    { key: "axis", label: "Axis", render: (r) => AXIS_NAMES[r.axis] ?? r.axis },
    { key: "value", label: `Max acceleration (${unitLabel})`, align: "right", render: (r) => fmt(r.value) },
    { key: "condition", label: "Load case" },
    { key: "sea_state", label: "Sea condition", render: (r) => r.sea_state || "–" },
    { key: "heading_deg", label: "Heading (°)", align: "right" },
    { key: "period_s", label: "Period (s)", align: "right" },
  ];

  return (
    <section className="card results" aria-labelledby="results-title">
      <div className="card__head">
        <div className="card__title">
          <h2 id="results-title" className="h2" tabIndex={-1}>
            4. Results{result.point_name ? `: ${result.point_name}` : ""}
          </h2>
          <span className="muted">From {plural(result.files_used?.length ?? 0, "RAO file")}</span>
        </div>
        <fieldset className="seg">
          <legend className="sr-only">Units</legend>
          {UNITS.map(([id, label]) => (
            <label key={id} className={`seg__opt ${unit === id ? "is-on" : ""}`}>
              <input type="radio" name="unit" className="sr-only" checked={unit === id} onChange={() => setUnit(id)} />
              {label}
            </label>
          ))}
        </fieldset>
      </div>

      {basis && (
        <p className="results__lead">
          Maximum acceleration per axis, across {plural(conditionsCount, "load case")}, {plural(basis.headings_count, "heading")} and all frequencies. Each value shows the case that governs it.
        </p>
      )}

      <DataTable
        caption={`Maximum acceleration per axis in ${unitLabel}`}
        columns={columns}
        rows={result.results}
        rowKey="axis"
        rowHeader="axis"
      />

      {basis && (
        <dl className="summary">
          <div><dt>Load cases</dt><dd>{basis.conditions.join(", ")}</dd></div>
          <div><dt>Headings</dt><dd>{basis.headings_count}</dd></div>
          <div><dt>Frequencies</dt><dd>{basis.frequency_min} to {basis.frequency_max} rad/s</dd></div>
          {calculatedAt && <div><dt>Calculated</dt><dd>{calculatedAt}</dd></div>}
        </dl>
      )}
    </section>
  );
}
