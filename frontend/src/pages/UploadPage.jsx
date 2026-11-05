import { useEffect, useRef, useState } from "react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Alert from "../components/Alert.jsx";
import DataTable from "../components/DataTable.jsx";
import { getHealth, getLimits, uploadFiles } from "../services/api.js";
import "./UploadPage.css";

const columns = [
  { key: "name", label: "File" },
  {
    key: "status",
    label: "Status",
    render: (r) => <span className={`tag tag--${r.status === "ok" ? "ok" : "bad"}`}>{r.status === "ok" ? "Read" : "Error"}</span>,
  },
  {
    key: "detail",
    label: "Details",
    render: (r) => (r.status === "ok"
      ? `${r.stats?.lines ?? "–"} lines · ${r.stats?.words ?? "–"} words`
      : <span className="upload__err">{r.error || "error"}</span>),
  },
];

export default function UploadPage() {
  const inputRef = useRef(null);
  const [limits, setLimits] = useState(null);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    getHealth()
      .then(() => setOnline(true))
      .catch(() => setOnline(false));
  }, []);

  useEffect(() => {
    getLimits()
      .then(setLimits)
      .catch((err) => setStatus(`Could not load limits: ${err.message}`));
  }, []);

  async function send(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    setBusy(true);
    setStatus("Uploading…");
    try {
      const { results: res } = await uploadFiles(files);
      setResults(res);
      const ok = res.filter((r) => r.status === "ok").length;
      setStatus(`${ok} of ${res.length} file(s) read. Files with errors are skipped.`);
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    send(event.dataTransfer.files);
  }

  const accept = limits?.allowed_extensions.join(",");
  const okCount = results.filter((r) => r.status === "ok").length;
  const errCount = results.length - okCount;

  return (
    <>
      <div className="page-head">
        <h1 className="h1">Upload RAO files</h1>
        <p className="lead">
          Add every RAO file for the unit. BPS SMART reads each file and detects its loading condition, wave headings and frequencies. A file with errors is skipped and never blocks the rest.
        </p>
      </div>

      <div className="split">
        <div className="split-main stack">
          {!online && (
            <Alert type="error" title="Could not connect to BPS SMART">
              <p>The server is not responding. Try again in a few minutes. If the problem continues, contact the BPS SMART team.</p>
            </Alert>
          )}

          <Card title="Add files">
            <div
              className={`upload__drop ${dragging ? "is-dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
                <path d="M14 3v5h5" />
                <path d="M12 17v-6" />
                <path d="M9.5 13.5L12 11l2.5 2.5" />
              </svg>
              <div className="upload__text">
                <p className="upload__title">Drag RAO files here or select them from your computer</p>
                <p id="upload-limits" className="muted">
                  {limits
                    ? `Accepted formats: ${limits.allowed_extensions.join(", ")}`
                    : "Loading limits…"}
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={accept}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => { send(e.target.files); e.target.value = ""; }}
              />
              <Button aria-describedby="upload-limits" disabled={busy || !online} onClick={() => inputRef.current.click()}>
                {busy ? "Uploading…" : "Select files"}
              </Button>
            </div>
            <p role="status" aria-live="polite" className="muted upload__status">{status}</p>
          </Card>

          <Card title="Files in this analysis">
            {results.length
              ? <DataTable caption="Uploaded files and their status" columns={columns} rows={results} rowKey="name" />
              : <p className="muted upload__empty">No files yet.</p>}
          </Card>
        </div>

        <aside className="split-side stack" aria-label="Summary">
          <Card title="Summary">
            <dl className="summary">
              <div><dt>Files uploaded</dt><dd>{results.length}</dd></div>
              <div><dt>Files read</dt><dd>{okCount}</dd></div>
              <div><dt>Files with errors</dt><dd>{errCount}</dd></div>
            </dl>
            <Button to="/conditions">Continue to conditions</Button>
          </Card>
          <section className="note" aria-labelledby="calc-note">
            <h2 id="calc-note">How results are calculated</h2>
            <p>Results are the envelope of RAO responses across every frequency, heading and loading condition. They are not an MPM calculation.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
