// The ONLY module that talks to the network. UI code imports from here.
import { API_BASE_URL, USE_MOCK } from "./config.js";
import * as mock from "./mock.js";

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response (e.g. platform error page)
  }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export function getLimits() {
  return USE_MOCK ? mock.getLimits() : request("/api/v1/limits");
}

export function getHealth() {
  return USE_MOCK ? mock.getHealth() : request("/api/v1/health");
}

export function getVersion() {
  return USE_MOCK ? mock.getVersion() : request("/api/v1/version");
}

/** @param {File[]} files */
export function uploadFiles(files) {
  if (USE_MOCK) return mock.uploadFiles(files);
  const form = new FormData();
  for (const f of files) form.append("files", f, f.name);
  return request("/api/v1/files", { method: "POST", body: form });
}

export function readRaoHeaders(files) {
  if (USE_MOCK) return mock.readRaoHeaders(files);
  const form = new FormData();
  for (const f of files) form.append("files", f, f.name);
  return request("/api/v1/rao/headers", { method: "POST", body: form });
}

export function calculateEnvelope({ files, loadCases, x, y, z, pointName }) {
  if (USE_MOCK) return mock.calculateEnvelope({ files, loadCases, x, y, z, pointName });
  const form = new FormData();
  for (const f of files) form.append("files", f, f.name);
  form.append(
    "load_cases",
    JSON.stringify(loadCases.map((lc) => ({
      load_case: lc.name,
      lcg: Number(lc.lcg),
      tcg: Number(lc.tcg),
      kg: Number(lc.kg),
    }))),
  );
  form.append("x", x);
  form.append("y", y);
  form.append("z", z);
  if (pointName) form.append("point_name", pointName);
  return request("/api/v1/envelope", { method: "POST", body: form });
}
