// Fake engine that follows contract/engine.d.ts, so the UI can be built
// without the WebAssembly module. It reads the same RAO headers as the engine
// and returns the same shapes, but the envelope values are made up.
// Edit freely to simulate latency, errors, large batches, etc.
// If it drifts from the contract, fix it to match the contract.

const LIMITS = { allowed_extensions: [".txt"], max_file_bytes: 32 * 1024 * 1024 };
const LATENCY_MS = 150; // per file, and for the calculation

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getLimits() {
  await delay(50);
  return structuredClone(LIMITS);
}

export async function getHealth() {
  await delay(50);
  return { status: "ok" };
}

export async function getVersion() {
  await delay(50);
  return { version: "0.0.0+mock", semver: "0.0.0", commit: "mock" };
}

// "2   (1=LCMIN, 2=LCINT1)" -> "LCINT1", like the engine.
function resolveLegend(raw) {
  const [, value, legend] = raw.trim().match(/^([^(]*)(?:\(([^)]*)\))?/) ?? [];
  const v = (value ?? "").trim();
  for (const entry of (legend ?? "").split(",")) {
    const [k, label] = entry.split("=");
    if (label !== undefined && k.trim() === v) return label.trim();
  }
  return v;
}

const headerValue = (text, pattern) => {
  const line = text.split(/\r?\n/).find((l) => pattern.test(l.trim()));
  return line ? resolveLegend(line.slice(line.search(/[:=]/) + 1)) : null;
};

async function readOne(f) {
  const name = f.name.split(/[\\/]/).pop() || "unnamed";
  if (!LIMITS.allowed_extensions.some((ext) => name.toLowerCase().endsWith(ext))) {
    return { name, status: "error", error: "Unsupported file type" };
  }
  if (f.size > LIMITS.max_file_bytes) {
    return { name, status: "error", error: `File too large (max ${LIMITS.max_file_bytes} bytes)` };
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await f.arrayBuffer());
  } catch {
    return { name, status: "error", error: "File is not valid UTF-8 text" };
  }
  const loadCase = headerValue(text, /^(loading condition|load case)\s*[:=]/i);
  if (!loadCase) {
    return { name, status: "error", error: "Not a valid RAO file. Missing the 'Loading Condition' header" };
  }
  const headings = (text.match(/^\s*DIRECTION/gim) ?? []).length;
  return {
    name,
    status: "ok",
    file_id: 0,
    load_case: loadCase,
    sea_state: headerValue(text, /^(rao table|sea condition|sea state)\s*[:=]/i) ?? "",
    headings_count: headings,
    frequency_count: 156,
    frequency_min: 0.1,
    frequency_max: 1.65,
  };
}

/** @param {File[]} files @param {(file: File, result: object) => void} [onResult] */
export async function readRaoHeaders(files, onResult) {
  const results = [];
  for (const f of files) {
    await delay(LATENCY_MS);
    const result = await readOne(f);
    results.push(result);
    onResult?.(f, result);
  }
  return { results };
}

export async function calculateEnvelope({ files, loadCases, x, y, z, pointName }) {
  await delay(LATENCY_MS);
  if (!files.length) throw new Error("Add at least one RAO file");
  const names = loadCases.map((lc) => lc.name);
  const r = Math.hypot(Number(x) - 150, Number(y), Number(z) - 20);
  const base = 1 + r / 100;
  const last = names[names.length - 1];
  return {
    point_name: pointName || "",
    point: { x: Number(x), y: Number(y), z: Number(z) },
    files_used: files.map((f) => f.name),
    basis: {
      conditions: names,
      headings_count: 19,
      frequency_min: 0.1,
      frequency_max: 1.7,
    },
    calculated_at: new Date().toISOString(),
    results: [
      { axis: "ax", value: +(0.09 * base).toFixed(4), condition: names[0], sea_state: "Hs<=2.5", file: files[0].name, heading_deg: 82.5, period_s: 6.98, frequency_rad_s: 0.9 },
      { axis: "ay", value: +(0.3 * base).toFixed(4), condition: last, sea_state: "Hs>4.5m", file: files[files.length - 1].name, heading_deg: 60, period_s: 16.11, frequency_rad_s: 0.39 },
      { axis: "az", value: +(0.4 * base).toFixed(4), condition: last, sea_state: "2.5<Hs<=4.5", file: files[files.length - 1].name, heading_deg: 307.5, period_s: 16.11, frequency_rad_s: 0.39 },
    ],
  };
}

/** Legacy name used by the (unrouted) UploadPage prototype. */
export function uploadFiles(files) {
  return readRaoHeaders(files);
}
