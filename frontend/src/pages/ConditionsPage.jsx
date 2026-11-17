import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import DataTable, { CellInput } from "../components/DataTable.jsx";
import ErrorSummary from "../components/ErrorSummary.jsx";
import Note from "../components/Note.jsx";
import PageHead from "../components/PageHead.jsx";
import SummaryList from "../components/SummaryList.jsx";
import { PARAMS, slug, useAnalysis } from "../state/AnalysisContext.jsx";

export default function ConditionsPage() {
  const a = useAnalysis();
  const navigate = useNavigate();
  const [shown, setErrors] = useState([]);
  const stillWrong = new Set(a.conditionErrors().map((e) => e.field));
  const errors = shown.filter((e) => stillWrong.has(e.field));

  if (!a.reached[1]) return <Navigate to="/" replace />;

  const invalid = new Set(errors.map((e) => e.field));
  const missing = a.conditionErrors().length;

  function onContinue() {
    const found = a.conditionErrors();
    setErrors(found);
    if (!found.length) navigate("/point");
  }

  const columns = [
    { key: "name", label: "Load case" },
    { key: "sea", label: "Sea conditions", render: (lc) => lc.seaStates.join(", ") || "–" },
    { key: "files", label: "RAO files", align: "right", render: (lc) => lc.files.length },
    ...PARAMS.map((p) => ({
      key: p.key,
      label: p.label,
      align: "right",
      width: "128px",
      render: (lc) => {
        const id = `lc-${slug(lc.name)}-${p.key}`;
        return (
          <CellInput
            id={id}
            numeric
            label={`${p.label} for ${lc.name}`}
            invalid={invalid.has(id)}
            value={a.params[lc.name]?.[p.key] ?? ""}
            onChange={(v) => a.updateParam(lc.name, p.key, v)}
          />
        );
      },
    })),
  ];

  return (
    <>
      <PageHead
        title="Review conditions"
        lead="The load cases and sea conditions come from the file headers. Enter the centre of gravity of each load case, from the ship origin, in metres. The RAOs are taken at this point."
      />
      <ErrorSummary errors={errors} focusKey={shown} />

      <div className="split">
        <div className="split-main stack">
          <Card title="Load cases">
            <DataTable caption="Load cases found in the RAO files, with editable centre of gravity in metres" columns={columns} rows={a.loadCases} rowKey="name" rowHeader="name" stack />
            <p className="muted">Every load case needs LCG, TCG and KG. Sea conditions are kept to trace the governing case.</p>
          </Card>
          <Card title="Coordinate system">
            <p className="muted">Wrong axes are the most common source of error. Confirm these match the motion analysis report.</p>
            <dl className="facts">
              <div><dt className="muted">Origin</dt><dd>Ship origin of the motion report</dd></div>
              <div><dt className="muted">Axes</dt><dd>X forward, Y to port, Z up</dd></div>
              <div><dt className="muted">Units</dt><dd>Metres, degrees, rad/s</dd></div>
            </dl>
          </Card>
        </div>

        <aside className="split-side stack" aria-label="Summary">
          <Card title="Summary">
            <SummaryList
              items={[
                { label: "Load cases", value: a.loadCases.length },
                { label: "RAO files", value: a.okFiles.length },
                { label: "Fields to fill", value: missing, tone: missing ? "bad" : undefined },
              ]}
            />
            <Button onClick={onContinue}>Continue to point</Button>
            <Button variant="outline" to="/">Back to files</Button>
          </Card>
          <Note title="Where these values come from">
            LCG, TCG and KG are in the loading conditions table of the motion analysis report.
          </Note>
        </aside>
      </div>
    </>
  );
}
