import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { calculateEnvelope, forgetRaoFile, getHealth, getLimits, getUnits, readRaoHeaders } from "../services/api.js";

export const PARAMS = [
  { key: "lcg", label: "LCG (m)" },
  { key: "tcg", label: "TCG (m)" },
  { key: "kg", label: "KG (m)" },
];

export const AXES = [
  { key: "x", label: "X (m)", hint: "Longitudinal, forward is positive" },
  { key: "y", label: "Y (m)", hint: "Transverse, port is positive" },
  { key: "z", label: "Z (m)", hint: "Vertical, up is positive" },
];

export const STEPS = [
  { path: "/", label: "Upload RAO files" },
  { path: "/conditions", label: "Review conditions" },
  { path: "/point", label: "Define point" },
  { path: "/results", label: "Envelope results" },
];

const EMPTY_PARAMS = { lcg: "", tcg: "", kg: "" };

export const toNumberText = (v) => String(v ?? "").trim().replace(",", ".");
export const isNumber = (v) => toNumberText(v) !== "" && Number.isFinite(Number(toNumberText(v)));
export const slug = (text) => text.replace(/[^a-zA-Z0-9]+/g, "-");

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const nextId = useRef(1);
  const [online, setOnline] = useState(true);
  const [accept, setAccept] = useState("");
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [files, setFiles] = useState([]);
  const [reading, setReading] = useState(false);
  const [params, setParams] = useState({});
  const [point, setPoint] = useState({ name: "", x: "", y: "", z: "" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getHealth().then(() => setOnline(true)).catch(() => setOnline(false));
    getLimits().then((l) => setAccept(l.allowed_extensions.join(","))).catch(() => setAccept(""));
    getUnits().then(setUnits).catch(() => setUnits([]));
  }, []);

  const okFiles = useMemo(() => files.filter((f) => f.status === "ok"), [files]);

  const loadCases = useMemo(() => {
    const groups = new Map();
    okFiles.forEach((f) => {
      if (!groups.has(f.loadCase)) groups.set(f.loadCase, []);
      groups.get(f.loadCase).push(f);
    });
    return [...groups].map(([name, list]) => ({
      name,
      files: list,
      seaStates: [...new Set(list.map((f) => f.seaState).filter(Boolean))],
    }));
  }, [okFiles]);

  const unit = units.find((u) => u.id === unitId) ?? null;

  const addFiles = useCallback(async (list) => {
    const names = new Set(files.map((f) => f.file.name));
    const incoming = [...list].filter((f) => !names.has(f.name));
    if (!incoming.length) return "";
    setReading(true);
    setResult(null);
    try {
      await readRaoHeaders(incoming, (file, r) => {
        const entry = {
          id: nextId.current++,
          file,
          status: r.status ?? "error",
          loadCase: r.load_case ?? "",
          seaState: r.sea_state ?? "",
          headings: r.headings_count ?? null,
          freqMin: r.frequency_min ?? null,
          freqMax: r.frequency_max ?? null,
          error: r.error ?? "",
        };
        setFiles((current) => [...current, entry]);
        if (entry.status === "ok") {
          setParams((current) =>
            current[entry.loadCase] ? current : { ...current, [entry.loadCase]: { ...EMPTY_PARAMS } });
        }
      });
      return "";
    } catch (err) {
      return `Could not read the files: ${err.message}`;
    } finally {
      setReading(false);
    }
  }, [files]);

  const removeFile = useCallback((id) => {
    const removed = files.find((f) => f.id === id);
    if (removed) forgetRaoFile(removed.file);
    setFiles((current) => current.filter((f) => f.id !== id));
    setResult(null);
  }, [files]);

  const updateParam = useCallback((loadCase, key, value) => {
    setParams((all) => ({ ...all, [loadCase]: { ...all[loadCase], [key]: value } }));
    setResult(null);
  }, []);

  const updatePoint = useCallback((field, value) => {
    setPoint((p) => ({ ...p, [field]: value }));
    setResult(null);
  }, []);

  const filesErrors = () =>
    okFiles.length ? [] : [{ field: "rao-select", text: "Add at least one valid RAO file" }];

  const conditionErrors = () =>
    loadCases.flatMap((lc) =>
      PARAMS.filter((p) => !isNumber(params[lc.name]?.[p.key])).map((p) => ({
        field: `lc-${slug(lc.name)}-${p.key}`,
        text: `${lc.name}: enter the ${p.key.toUpperCase()}`,
      })));

  const pointErrors = () =>
    AXES.filter((a) => !isNumber(point[a.key])).map((a) => ({
      field: `pt-${a.key}`,
      text: `Enter a number for point ${a.key.toUpperCase()}`,
    }));

  const reached = [
    true,
    filesErrors().length === 0,
    filesErrors().length === 0 && conditionErrors().length === 0,
    Boolean(result),
  ];

  async function calculate() {
    setBusy(true);
    try {
      const data = await calculateEnvelope({
        files: okFiles.map((f) => f.file),
        loadCases: loadCases.map((lc) => ({
          name: lc.name,
          lcg: toNumberText(params[lc.name].lcg),
          tcg: toNumberText(params[lc.name].tcg),
          kg: toNumberText(params[lc.name].kg),
        })),
        x: toNumberText(point.x),
        y: toNumberText(point.y),
        z: toNumberText(point.z),
        pointName: point.name.trim(),
      });
      setResult(data);
      return "";
    } catch (err) {
      return err.message;
    } finally {
      setBusy(false);
    }
  }

  const value = {
    online, accept, units, unit, unitId, setUnitId,
    files, okFiles, reading, addFiles, removeFile,
    loadCases, params, updateParam,
    point, updatePoint,
    result, busy, calculate,
    filesErrors, conditionErrors, pointErrors, reached,
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}
