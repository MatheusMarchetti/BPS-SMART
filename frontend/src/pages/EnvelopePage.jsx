import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Alert from "../components/Alert.jsx";
import DataTable, { CellInput } from "../components/DataTable.jsx";
import ResultsPage from "./ResultsPage.jsx";
import { calculateEnvelope, getHealth, getLimits, readRaoHeaders } from "../services/api.js";
import "./EnvelopePage.css";

const AXES = [
  { key: "x", label: "X (m)", hint: "Longitudinal" },
  { key: "y", label: "Y (m)", hint: "Transverse" },
  { key: "z", label: "Z (m)", hint: "Vertical" },
];
const PARAMS = [
  { key: "lcg", label: "LCG (m)" },
  { key: "tcg", label: "TCG (m)" },
  { key: "kg", label: "KG (m)" },
];
const EMPTY_PARAMS = { lcg: "", tcg: "", kg: "" };

const isNumber = (v) => v.trim() !== "" && Number.isFinite(Number(v));
const slug = (text) => text.replace(/[^a-zA-Z0-9]+/g, "-");

export default function EnvelopePage() {
  const inputRef = useRef(null);
  const nextId = useRef(1);
  const [online, setOnline] = useState(true);
  const [accept, setAccept] = useState("");
  const [files, setFiles] = useState([]);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [params, setParams] = useState({});
  const [point, setPoint] = useState({ name: "", x: "", y: "", z: "" });
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    getHealth().then(() => setOnline(true)).catch(() => setOnline(false));
    getLimits().then((l) => setAccept(l.allowed_extensions.join(","))).catch(() => setAccept(""));
  }, []);

  const loadCases = useMemo(() => {
    const groups = new Map();
    files.filter((f) => f.status === "ok").forEach((f) => {
      if (!groups.has(f.loadCase)) groups.set(f.loadCase, []);
      groups.get(f.loadCase).push(f);
    });
    return [...groups].map(([name, list]) => ({ name, files: list }));
  }, [files]);

  async function addFiles(list) {
    const names = new Set(files.map((f) => f.file.name));
    const incoming = [...list].filter((f) => !names.has(f.name));
    if (!incoming.length) return;
    setReading(true);
    try {
      const { results } = await readRaoHeaders(incoming);
      const added = incoming.map((file) => {
        const r = results.find((x) => x.name === file.name) ?? {};
        return {
          id: nextId.current++,
          file,
          status: r.status ?? "error",
          loadCase: r.load_case ?? "",
          seaState: r.sea_state ?? "",
          error: r.error ?? "",
        };
      });
      setFiles((current) => [...current, ...added]);
      setParams((current) => {
        const next = { ...current };
        added.filter((f) => f.status === "ok").forEach((f) => {
          if (!next[f.loadCase]) next[f.loadCase] = { ...EMPTY_PARAMS };
        });
        return next;
      });
    } catch (err) {
      setFailure(`Could not read the files: ${err.message}`);
    } finally {
      setReading(false);
    }
  }

  const removeFile = (id) => setFiles((current) => current.filter((f) => f.id !== id));
  const updatePoint = (field, value) => setPoint((p) => ({ ...p, [field]: value }));
  const updateParam = (loadCase, key, value) =>
    setParams((all) => ({ ...all, [loadCase]: { ...all[loadCase], [key]: value } }));

  function validate() {
    const found = [];
    if (!loadCases.length) found.push({ field: "rao-select", text: "Add at least one valid RAO file" });
    loadCases.forEach((lc) => {
      PARAMS.forEach((p) => {
        if (!isNumber(params[lc.name]?.[p.key] ?? "")) {
          found.push({ field: `lc-${slug(lc.name)}-${p.key}`, text: `${lc.name}: enter the ${p.key.toUpperCase()}` });
        }
      });
    });
    AXES.forEach((a) => {
      if (!isNumber(point[a.key])) found.push({ field: `pt-${a.key}`, text: `Enter a number for point ${a.key.toUpperCase()}` });
    });
    return found;
  }

  async function onSubmit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFailure("");
    if (found.length) {
      document.getElementById("form-errors")?.focus();
      return;
    }
    setBusy(true);
    try {
      const data = await calculateEnvelope({
        files: loadCases.flatMap((lc) => lc.files.map((f) => f.file)),
        loadCases: loadCases.map((lc) => ({ name: lc.name, ...params[lc.name] })),
        ...point,
        pointName: point.name.trim(),
      });
      setResult(data);
      requestAnimationFrame(() => document.getElementById("results-title")?.focus());
    } catch (err) {
      setFailure(err.message);
    } finally {
      setBusy(false);
    }
  }

  const invalid = new Set(errors.map((e) => e.field));

  const loadCaseColumns = [
    { key: "name", label: "Load case" },
    { key: "files", label: "RAO files", align: "right", render: (lc) => lc.files.length },
    ...PARAMS.map((p) => ({
      key: p.key,
      label: p.label,
      align: "right",
      render: (lc) => {
        const id = `lc-${slug(lc.name)}-${p.key}`;
        return (
          <CellInput
            id={id}
            numeric
            label={`${p.label} for ${lc.name}`}
            invalid={invalid.has(id)}
            value={params[lc.name]?.[p.key] ?? ""}
            onChange={(v) => updateParam(lc.name, p.key, v)}
          />
        );
      },
    })),
  ];

  return (
    <>
      <div className="page-head">
        <h1 className="h1">Acceleration envelope</h1>
        <p className="lead">Upload the RAO files, enter the LCG, TCG and KG of each load case and the point, then calculate. The result is the largest acceleration on each axis across every load case, heading and period in the files.</p>
      </div>

      {!online && (
        <Alert type="error" title="Could not connect to BPS SMART">
          <p>The server is not responding. Try again in a few minutes. If the problem continues, contact the BPS SMART team.</p>
        </Alert>
      )}

      {errors.length > 0 && (
        <div id="form-errors" tabIndex={-1}>
          <Alert type="error" title="Check these fields before calculating">
            <ul>
              {errors.map((e) => <li key={e.field}><a href={`#${e.field}`}>{e.text}</a></li>)}
            </ul>
          </Alert>
        </div>
      )}

      <form className="env" noValidate onSubmit={onSubmit}>
        <Card title="1. RAO files">
          <div
            className={`env__drop ${dragging ? "is-dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          >
            <p className="env__drop-title">Drag the RAO files here or select them</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={accept || undefined}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
            <Button
              id="rao-select"
              variant="outline"
              disabled={!online || reading}
              aria-invalid={invalid.has("rao-select") || undefined}
              onClick={() => inputRef.current.click()}
            >
              {reading ? "Reading files…" : "Select files"}
            </Button>
          </div>
          <p role="status" aria-live="polite" className="sr-only">{reading ? "Reading the file headers." : ""}</p>

          {files.length > 0 ? (
            <ul className="env__files" aria-label="Selected RAO files">
              {files.map((f) => (
                <li key={f.id}>
                  <span className="env__file">
                    <strong>{f.file.name}</strong>
                    {f.status === "ok"
                      ? <span className="muted">Load case {f.loadCase}{f.seaState ? ` · Sea condition ${f.seaState}` : ""}</span>
                      : <span className="env__file-error">{f.error || "Could not read this file"}</span>}
                  </span>
                  <Button variant="outline" aria-label={`Remove ${f.file.name}`} onClick={() => removeFile(f.id)}>Remove</Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted env__empty">No files selected.</p>
          )}
        </Card>

        <Card title="2. Load cases">
          {loadCases.length > 0 ? (
            <>
              <p className="muted env__hint">Load cases found in the file headers. Enter the centre of gravity of each one, from the ship origin.</p>
              <DataTable
                caption="LCG, TCG and KG per load case, editable"
                columns={loadCaseColumns}
                rows={loadCases}
                rowKey="name"
                rowHeader="name"
              />
            </>
          ) : (
            <p className="muted env__empty">Load cases appear here after you add the RAO files.</p>
          )}
        </Card>

        <Card title="3. Point">
          <p className="muted env__hint">Coordinates from the ship origin, in metres.</p>
          <div className="env__field">
            <label htmlFor="pt-name">Point name <span className="muted">(optional)</span></label>
            <input id="pt-name" className="env__input" value={point.name} onChange={(e) => updatePoint("name", e.target.value)} />
          </div>

          <div className="env__xyz">
            {AXES.map((a) => (
              <div className="env__field" key={a.key}>
                <label htmlFor={`pt-${a.key}`}>{a.label}</label>
                <input
                  id={`pt-${a.key}`}
                  className={`env__input is-num ${invalid.has(`pt-${a.key}`) ? "is-invalid" : ""}`}
                  inputMode="decimal"
                  required
                  aria-invalid={invalid.has(`pt-${a.key}`) || undefined}
                  aria-describedby={`pt-${a.key}-hint`}
                  value={point[a.key]}
                  onChange={(e) => updatePoint(a.key, e.target.value)}
                />
                <span id={`pt-${a.key}-hint`} className="muted">{a.hint}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="env__submit">
          <Button type="submit" disabled={busy || reading || !online}>{busy ? "Calculating…" : "Calculate envelope"}</Button>
          <p role="status" aria-live="polite" className="muted">{busy ? "Calculating, please wait." : ""}</p>
        </div>
      </form>

      {failure && (
        <Alert type="error" title="Something went wrong">
          <p>{failure}</p>
        </Alert>
      )}

      {result && <ResultsPage result={result} />}
    </>
  );
}
