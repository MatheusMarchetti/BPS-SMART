import { useState } from "react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Alert from "../components/Alert.jsx";
import DataTable from "../components/DataTable.jsx";

const SAMPLE = [
  { id: "c1", name: "Full load", file: "RAO_full_load.txt", headings: 24, check: "ok" },
  { id: "c2", name: "Ballast", file: "RAO_ballast.txt", headings: 24, check: "ok" },
  { id: "c3", name: "Intermediate", file: "RAO_intermediate.txt", headings: 24, check: "name" },
];

export default function ConditionsPage() {
  const [included, setIncluded] = useState(() => new Set(SAMPLE.map((c) => c.id)));

  const toggle = (id) => setIncluded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const columns = [
    {
      key: "include",
      label: "Include",
      render: (c) => (
        <input type="checkbox" className="chk" id={`inc-${c.id}`} checked={included.has(c.id)} onChange={() => toggle(c.id)} />
      ),
    },
    { key: "name", label: "Condition", render: (c) => <label htmlFor={`inc-${c.id}`}><strong>{c.name}</strong></label> },
    { key: "file", label: "Source file" },
    { key: "draft", label: "Draft (m)", align: "right", render: () => "[from file]" },
    { key: "headings", label: "Headings", align: "right" },
    {
      key: "check",
      label: "Check",
      render: (c) => <span className={`tag tag--${c.check === "ok" ? "ok" : "bad"}`}>{c.check === "ok" ? "Complete" : "Check name"}</span>,
    },
  ];

  return (
    <>
      <div className="page-head">
        <h1 className="h1">Review loading conditions</h1>
        <p className="lead">These conditions were detected from the file contents. Check them and the coordinate system before you continue. Only the included conditions go into the envelope.</p>
      </div>

      <div className="split">
        <div className="split-main stack">
          <Card title="Detected conditions" meta="Sample data">
            <DataTable caption="Loading conditions detected in the uploaded files" columns={columns} rows={SAMPLE} />
            <Alert type="error" title="Intermediate">
              The condition name was inferred from the file name, not the file header. Confirm it is correct.
            </Alert>
          </Card>

          <Card title="Coordinate system">
            <p className="muted" style={{ margin: 0 }}>Wrong axes are the most common source of error. Confirm these match the motion analysis report.</p>
            <dl className="summary">
              <div><dt>Origin</dt><dd>Aft perpendicular, baseline, centreline</dd></div>
              <div><dt>Axes</dt><dd>X forward, Y to port, Z up</dd></div>
              <div><dt>RAO reference point</dt><dd>[X, Y, Z from file]</dd></div>
              <div><dt>Units</dt><dd>Metres, degrees, rad/s</dd></div>
            </dl>
          </Card>
        </div>

        <aside className="split-side stack" aria-label="Summary">
          <Card title="Summary">
            <dl className="summary">
              <div><dt>Conditions included</dt><dd>{included.size} of {SAMPLE.length}</dd></div>
              <div><dt>Items to check</dt><dd>1</dd></div>
            </dl>
            <Button to="/points">Continue to points</Button>
            <Button to="/" variant="outline">Back to files</Button>
          </Card>
        </aside>
      </div>
    </>
  );
}
