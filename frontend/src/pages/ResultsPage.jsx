import { useState } from "react";
import { Navigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import DataTable from "../components/DataTable.jsx";
import Note from "../components/Note.jsx";
import PageHead from "../components/PageHead.jsx";
import SegmentedControl from "../components/SegmentedControl.jsx";
import ShipPreview from "../components/ShipPreview.jsx";
import SummaryList from "../components/SummaryList.jsx";
import { useAnalysis } from "../state/AnalysisContext.jsx";

const G = 9.80665;
const AXIS_NAMES = { ax: "Longitudinal ax", ay: "Transverse ay", az: "Vertical az" };
const UNITS = [{ value: "ms2", label: "m/s²" }, { value: "g", label: "g" }];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function ResultsPage() {
  const a = useAnalysis();
  const [unit, setUnit] = useState("ms2");

  if (!a.result) return <Navigate to="/" replace />;

  const result = a.result;
  const basis = result.basis;
  const fmt = (v) => (unit === "g" ? (v / G).toFixed(3) : v.toFixed(2));
  const unitLabel = unit === "g" ? "g" : "m/s²";
  const name = result.point_name || "Point";
  const calculatedAt = result.calculated_at
    ? new Date(result.calculated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "";

  const columns = [
    { key: "axis", label: "Axis", render: (r) => AXIS_NAMES[r.axis] ?? r.axis },
    { key: "value", label: `Max acceleration (${unitLabel})`, align: "right", render: (r) => <strong>{fmt(r.value)}</strong> },
    { key: "condition", label: "Load case" },
    { key: "sea_state", label: "Sea condition", render: (r) => r.sea_state || "–" },
    { key: "heading_deg", label: "Heading (°)", align: "right" },
    { key: "period_s", label: "Period (s)", align: "right", render: (r) => r.period_s.toFixed(2) },
    { key: "frequency_rad_s", label: "Frequency (rad/s)", align: "right", render: (r) => r.frequency_rad_s.toFixed(2) },
    { key: "file", label: "RAO file", render: (r) => <span className="cell-wrap">{r.file}</span> },
  ];

  const point = { name, x: String(result.point.x), y: String(result.point.y), z: String(result.point.z) };

  return (
    <>
      <PageHead
        title={`Envelope results: ${name}`}
        lead={`Largest acceleration on each axis across ${plural(basis.conditions.length, "load case")}, ${plural(basis.headings_count, "heading")} and all frequencies. Each value shows the case that governs it.`}
        actions={<Button variant="outline" to="/point">Change point</Button>}
      />

      <Card
        title="Design accelerations"
        meta={a.unit ? a.unit.name : undefined}
        actions={<SegmentedControl legend="Units" name="unit" options={UNITS} value={unit} onChange={setUnit} />}
      >
        <DataTable caption={`Maximum acceleration per axis in ${unitLabel}, with the governing case`} columns={columns} rows={result.results} rowKey="axis" rowHeader="axis" stack />
        <p className="muted">Values are RAO based, per metre of wave amplitude.</p>
      </Card>

      <div className="split">
        <Card className="split-main" title="Point location" meta={`X ${point.x}, Y ${point.y}, Z ${point.z} m`}>
          <ShipPreview point={point} />
        </Card>
        <aside className="split-side stack" aria-label="Calculation basis">
          <Card title="Calculation basis">
            <SummaryList
              items={[
                ...(a.unit ? [{ label: "FPSO unit", value: a.unit.name }] : []),
                { label: "Load cases", value: basis.conditions.join(", ") },
                { label: "RAO files used", value: result.files_used.length },
                { label: "Wave headings", value: basis.headings_count },
                { label: "Frequencies", value: `${basis.frequency_min} to ${basis.frequency_max} rad/s` },
                ...(calculatedAt ? [{ label: "Calculated", value: calculatedAt }] : []),
              ]}
            />
          </Card>
          <Note title="How results are calculated">
            The envelope is the largest RAO response across every frequency, heading, RAO table and load case. It is not an MPM calculation.
          </Note>
        </aside>
      </div>
    </>
  );
}
