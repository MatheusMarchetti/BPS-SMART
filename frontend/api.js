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
