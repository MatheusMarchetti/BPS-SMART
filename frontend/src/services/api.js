// The ONLY module that talks to the processing engine. UI code imports from here.
//
// The engine is C++ compiled to WebAssembly (contract/engine.d.ts). It runs in
// this browser tab: files are never uploaded anywhere.
//
// Flow:
//   readRaoHeaders(files)  as soon as files are added: each file is read and
//                          parsed by the engine, one by one, and kept there.
//   calculateEnvelope(...) on Calculate: sends only the form data (file ids,
//                          LCG/TCG/KG per load case, point), not the files.
//   forgetRaoFile(file)    when a file is removed.
import { ENGINE_URL, USE_MOCK } from "./config.js";
import * as mock from "./mock.js";

let enginePromise = null;

/** Loads and instantiates the WebAssembly module once. */
function loadEngine() {
  enginePromise ??= import(/* @vite-ignore */ ENGINE_URL)
    .then((module) => module.default())
    .catch((err) => {
      enginePromise = null; // allow a retry
      throw new Error(`Could not load the processing engine (${err.message})`);
    });
  return enginePromise;
}

// File -> { engine, id } for files already read by the engine. The engine
// instance is kept so that files are read again if the module was reloaded.
const loaded = new WeakMap();

const nextTick = () => new Promise((resolve) => setTimeout(resolve));

export async function getLimits() {
  if (USE_MOCK) return mock.getLimits();
  return JSON.parse((await loadEngine()).getLimits());
}

export async function getHealth() {
  if (USE_MOCK) return mock.getHealth();
  return JSON.parse((await loadEngine()).getHealth());
}

export async function getVersion() {
  if (USE_MOCK) return mock.getVersion();
  return JSON.parse((await loadEngine()).getVersion());
}

/** Reads one file into the engine. Never throws: errors become status "error". */
async function readOne(engine, file) {
  const rejected = engine.checkFile(file.name, file.size);
  if (rejected) return JSON.parse(rejected);

  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { name: file.name, status: "error", error: "File could not be read" };
  }
  let result;
  try {
    result = JSON.parse(engine.readRaoFile(file.name, bytes));
  } catch {
    enginePromise = null; // the module aborted (e.g. out of memory): reload it next time
    return { name: file.name, status: "error", error: "Could not read this file" };
  }
  if (result.status === "ok") loaded.set(file, { engine, id: result.file_id });
  return result;
}

/**
 * Reads RAO files as soon as they are added, one at a time.
 * Calls onResult(file, result) after each file, so the page can show it at once.
 * One result per file; a bad file never fails the batch.
 * @param {File[]} files
 * @param {(file: File, result: object) => void} [onResult]
 * @returns {Promise<{results: object[]}>}
 */
export async function readRaoHeaders(files, onResult) {
  if (USE_MOCK) return mock.readRaoHeaders(files, onResult);
  const engine = await loadEngine();
  const results = [];
  for (const file of files) {
    const result = await readOne(engine, file);
    results.push(result);
    onResult?.(file, result);
    await nextTick(); // let the page repaint between files
  }
  return { results };
}

/** Frees a file the user removed. */
export function forgetRaoFile(file) {
  if (USE_MOCK) return;
  const entry = loaded.get(file);
  loaded.delete(file);
  if (entry) entry.engine.releaseRaoFile(entry.id);
}

/**
 * Calculates the acceleration envelope at a point. Sends only the form data:
 * the files were read when they were added.
 * @param {{files: File[], loadCases: {name: string, lcg: string, tcg: string, kg: string}[],
 *          x: string, y: string, z: string, pointName?: string}} input
 */
export async function calculateEnvelope({ files, loadCases, x, y, z, pointName }) {
  if (USE_MOCK) return mock.calculateEnvelope({ files, loadCases, x, y, z, pointName });
  if (!files.length) throw new Error("Add at least one RAO file");

  const engine = await loadEngine();
  const fileIds = [];
  for (const file of files) {
    let entry = loaded.get(file);
    if (!entry || entry.engine !== engine) {
      // Not read yet, or the engine was reloaded since: read it now.
      const result = await readOne(engine, file);
      if (result.status !== "ok") throw new Error(`${result.name}: ${result.error}`);
      entry = loaded.get(file);
    }
    fileIds.push(entry.id);
  }

  const request = {
    file_ids: fileIds,
    load_cases: loadCases.map((lc) => ({ load_case: lc.name, lcg: lc.lcg, tcg: lc.tcg, kg: lc.kg })),
    point: { x, y, z },
    point_name: pointName || "",
  };
  let result;
  try {
    result = JSON.parse(engine.calculateEnvelope(JSON.stringify(request)));
  } catch {
    enginePromise = null;
    throw new Error("The calculation failed");
  }
  if (result.error) throw new Error(result.error);
  return result;
}

/**
 * Legacy name used by the (unrouted) UploadPage prototype: reads the files
 * like readRaoHeaders.
 */
export function uploadFiles(files) {
  return readRaoHeaders(files);
}
