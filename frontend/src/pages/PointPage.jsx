import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Alert from "../components/Alert.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import ErrorSummary from "../components/ErrorSummary.jsx";
import Field from "../components/Field.jsx";
import PageHead from "../components/PageHead.jsx";
import ShipPreview from "../components/ShipPreview.jsx";
import SummaryList from "../components/SummaryList.jsx";
import { AXES, useAnalysis } from "../state/AnalysisContext.jsx";

export default function PointPage() {
  const a = useAnalysis();
  const navigate = useNavigate();
  const [shown, setErrors] = useState([]);
  const stillWrong = new Set(a.pointErrors().map((e) => e.field));
  const errors = shown.filter((e) => stillWrong.has(e.field));
  const [failure, setFailure] = useState("");

  if (!a.reached[2]) return <Navigate to={a.reached[1] ? "/conditions" : "/"} replace />;

  const errorFor = Object.fromEntries(errors.map((e) => [e.field, e.text]));
  const headings = Math.max(0, ...a.okFiles.map((f) => f.headings ?? 0));

  async function onCalculate(event) {
    event.preventDefault();
    const found = a.pointErrors();
    setErrors(found);
    setFailure("");
    if (found.length) return;
    const message = await a.calculate();
    if (message) setFailure(message);
    else navigate("/results");
  }

  return (
    <>
      <PageHead title="Define point" lead="Enter where you need the design accelerations, from the ship origin, in metres. The ship preview follows as you type." />
      <ErrorSummary errors={errors} focusKey={shown} />
      {failure && <Alert type="error" title="Could not calculate"><p>{failure}</p></Alert>}

      <form className="split" noValidate onSubmit={onCalculate}>
        <div className="split-main stack">
          <Card title="Point">
            <Field id="pt-name" label="Point name" optional className="field--narrow" value={a.point.name} onChange={(e) => a.updatePoint("name", e.target.value)} />
            <div className="xyz">
              {AXES.map((ax) => (
                <Field
                  key={ax.key}
                  id={`pt-${ax.key}`}
                  label={ax.label}
                  numeric
                  required
                  hint={ax.hint}
                  error={errorFor[`pt-${ax.key}`]}
                  value={a.point[ax.key]}
                  onChange={(e) => a.updatePoint(ax.key, e.target.value)}
                />
              ))}
            </div>
          </Card>
          <Card>
            <ShipPreview point={a.point} />
          </Card>
        </div>

        <aside className="split-side stack" aria-label="Calculate">
          <Card title="Ready to calculate">
            <SummaryList
              items={[
                { label: "Load cases", value: a.loadCases.map((lc) => lc.name).join(", ") },
                { label: "RAO files", value: a.okFiles.length },
                { label: "Wave headings", value: headings || "–" },
              ]}
            />
            <Button type="submit" disabled={a.busy || !a.online}>{a.busy ? "Calculating…" : "Calculate envelope"}</Button>
            <Button variant="outline" to="/conditions">Back to conditions</Button>
            <p role="status" aria-live="polite" className="muted">{a.busy ? "Calculating, please wait." : ""}</p>
          </Card>
        </aside>
      </form>
    </>
  );
}
