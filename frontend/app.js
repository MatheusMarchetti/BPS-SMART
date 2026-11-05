// UI logic. Never call fetch() here — use api.js.
import { getLimits, getVersion, uploadFiles } from "./api.js";
import { USE_MOCK } from "./config.js";

const form = document.getElementById("upload-form");
const input = document.getElementById("file-input");
const button = document.getElementById("upload-btn");
const selection = document.getElementById("selection");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

/** Escape server-provided strings before inserting them into the DOM. */
export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function setBusy(busy) {
  button.disabled = busy || input.files.length === 0;
  input.disabled = busy;
}

function renderResults(results) {
  resultsEl.innerHTML = results.map((r) => {
    if (r.status === "ok") {
      const s = r.stats || {};
      return `<li>
        <strong>${esc(r.name)}</strong> — <span class="ok">ok</span>
        <div class="hint">${esc(s.lines)} lines · ${esc(s.words)} words · ${esc(s.chars)} chars</div>
        ${r.preview ? `<pre>${esc(r.preview)}</pre>` : ""}
      </li>`;
    }
    return `<li><strong>${esc(r.name)}</strong> — <span class="error">${esc(r.error || "error")}</span></li>`;
  }).join("");
}

input.addEventListener("change", () => {
  const n = input.files.length;
  selection.textContent = n === 0
    ? "No files selected."
    : `${n} file${n > 1 ? "s" : ""} selected: ${[...input.files].map((f) => f.name).join(", ")}`;
  button.disabled = n === 0;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (input.files.length === 0) return;
  setBusy(true);
  statusEl.textContent = "Uploading…";
  resultsEl.innerHTML = "";
  try {
    const { results } = await uploadFiles([...input.files]);
    renderResults(results);
    statusEl.textContent = `Processed ${results.length} file(s).`;
  } catch (err) {
    statusEl.textContent = `Upload failed: ${err.message}`;
  } finally {
    setBusy(false);
  }
});

async function init() {
  document.getElementById("mock-badge").hidden = !USE_MOCK;
  getVersion()
    .then((v) => { document.getElementById("version").textContent = `v${v.version}`; })
    .catch(() => { document.getElementById("version").textContent = "version: unavailable"; });
  try {
    const limits = await getLimits();
    input.accept = limits.allowed_extensions.join(",");
    selection.textContent += ` Allowed: ${limits.allowed_extensions.join(", ")} · max ${(limits.max_request_bytes / 1048576).toFixed(1)} MB per upload.`;
  } catch (err) {
    statusEl.textContent = `Could not load limits: ${err.message}`;
  }
}

init();
