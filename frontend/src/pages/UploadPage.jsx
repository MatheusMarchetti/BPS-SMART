import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../components/Alert.jsx";
import Button from "../components/Button.jsx";
import Card from "../components/Card.jsx";
import DataTable from "../components/DataTable.jsx";
import ErrorSummary from "../components/ErrorSummary.jsx";
import Field from "../components/Field.jsx";
import FileDrop from "../components/FileDrop.jsx";
import Note from "../components/Note.jsx";
import PageHead from "../components/PageHead.jsx";
import SummaryList from "../components/SummaryList.jsx";
import Tag from "../components/Tag.jsx";
import { useAnalysis } from "../state/AnalysisContext.jsx";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const range = (f) => (f.freqMin == null ? "–" : `${f.freqMin.toFixed(2)} to ${f.freqMax.toFixed(2)}`);

export default function UploadPage() {
  const a = useAnalysis();
  const navigate = useNavigate();
  const [shown, setErrors] = useState([]);
  const stillWrong = new Set(a.filesErrors().map((e) => e.field));
  const errors = shown.filter((e) => stillWrong.has(e.field));
  const [failure, setFailure] = useState("");

  const bad = a.files.filter((f) => f.status !== "ok");
  const seaStates = new Set(a.okFiles.map((f) => f.seaState).filter(Boolean));

  async function onFiles(list) {
    setFailure(await a.addFiles(list));
    setErrors([]);
  }

  function onContinue() {
    const found = a.filesErrors();
    setErrors(found);
    if (!found.length) navigate("/conditions");
  }

  const columns = [
    { key: "name", label: "File", render: (f) => <span className="cell-wrap">{f.file.name}</span> },
    { key: "status", label: "Status", render: (f) => (f.status === "ok" ? <Tag type="ok">Read</Tag> : <Tag type="bad">Error</Tag>) },
    { key: "loadCase", label: "Load case", render: (f) => (f.status === "ok" ? f.loadCase : <span className="cell-error">{f.error || "Could not read this file"}</span>) },
    { key: "seaState", label: "Sea condition", render: (f) => (f.status === "ok" ? f.seaState || "–" : "") },
    { key: "headings", label: "Headings", align: "right", render: (f) => (f.status === "ok" ? f.headings ?? "–" : "") },
    { key: "freq", label: "Frequencies (rad/s)", align: "right", render: (f) => (f.status === "ok" ? range(f) : "") },
    { key: "actions", label: "Actions", hidden: true, align: "right", render: (f) => <Button variant="outline" aria-label={`Remove ${f.file.name}`} onClick={() => a.removeFile(f.id)}>Remove</Button> },
  ];

  return (
    <>
      <PageHead
        title="Upload RAO files"
        lead="Add the RAO files of every load case. Each file is read on this computer as soon as you add it, and nothing is sent to a server. A file with an error is skipped and never blocks the others."
      />

      {!a.online && (
        <Alert type="error" title="Could not start BPS SMART">
          <p>The calculation engine could not be loaded in this browser. Reload the page. If the problem continues, contact the BPS SMART team.</p>
        </Alert>
      )}
      <ErrorSummary errors={errors} focusKey={shown} />
      {failure && <Alert type="error" title="Something went wrong"><p>{failure}</p></Alert>}

      <div className="split">
        <div className="split-main stack">
          <Card title="FPSO unit">
            <Field
              as="select"
              id="unit"
              label="Unit being calculated"
              className="field--narrow"
              hint={a.units.length ? "The unit name goes on the results." : "No units available yet. You can calculate without one."}
              value={a.unitId}
              disabled={!a.units.length}
              onChange={(e) => a.setUnitId(e.target.value)}
            >
              <option value="">Select the unit</option>
              {a.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Field>
          </Card>

          <Card title="Add files">
            <FileDrop accept={a.accept} disabled={!a.online || a.reading} busy={a.reading} invalid={errors.length > 0} onFiles={onFiles} />
            <p role="status" aria-live="polite" className="sr-only">{a.reading ? "Reading the files." : ""}</p>
          </Card>

          <Card title="Files in this analysis">
            {a.files.length ? (
              <DataTable caption={`RAO files added, ${a.okFiles.length} read and ${bad.length} with an error`} columns={columns} rows={a.files} stack />
            ) : (
              <p className="muted">No files yet.</p>
            )}
          </Card>
        </div>

        <aside className="split-side stack" aria-label="Summary">
          <Card title="Summary">
            <SummaryList
              items={[
                { label: "RAO files read", value: a.okFiles.length },
                { label: "Load cases found", value: a.loadCases.length },
                { label: "Sea conditions", value: seaStates.size },
                { label: "Files with errors", value: bad.length, tone: bad.length ? "bad" : undefined },
              ]}
            />
            <p role="status" className="muted">
              {a.okFiles.length
                ? `${plural(a.okFiles.length, "file")} ready.${bad.length ? ` ${plural(bad.length, "file")} with an error will be skipped.` : ""}`
                : "Add the RAO files to continue."}
            </p>
            <Button disabled={a.reading} onClick={onContinue}>Continue to conditions</Button>
          </Card>
          <Note title="How results are calculated">
            The envelope is the largest RAO response across every frequency, heading, RAO table and load case. It is not an MPM calculation.
          </Note>
        </aside>
      </div>
    </>
  );
}
