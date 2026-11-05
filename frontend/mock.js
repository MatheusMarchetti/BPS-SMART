// Fake backend that follows contract/openapi.yaml.
// Edit freely to simulate latency, errors, large batches, etc.
// If it drifts from the spec, fix it to match the spec.

const LIMITS = { allowed_extensions: [".txt"], max_request_bytes: 4 * 1024 * 1024 };
const LATENCY_MS = 400;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getLimits() {
  await delay(50);
  return structuredClone(LIMITS);
}

export async function getVersion() {
  await delay(50);
  return { version: "0.0.0+mock", semver: "0.0.0", commit: "mock" };
}

/** @param {File[]} files */
export async function uploadFiles(files) {
  await delay(LATENCY_MS);
  if (!files.length) throw new Error("No files provided (field name: 'files')");
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > LIMITS.max_request_bytes) {
    throw new Error(`Request too large (max ${LIMITS.max_request_bytes} bytes)`);
  }

  const results = [];
  for (const f of files) {
    if (!LIMITS.allowed_extensions.some((ext) => f.name.toLowerCase().endsWith(ext))) {
      results.push({ name: f.name, status: "error", error: "Unsupported file type" });
      continue;
    }
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(await f.arrayBuffer());
    } catch {
      results.push({ name: f.name, status: "error", error: "File is not valid UTF-8 text" });
      continue;
    }
    const preview = text.length > 200 ? text.slice(0, 200) + "…" : text;
    results.push({
      name: f.name,
      status: "ok",
      stats: {
        lines: text.split(/\r\n|\r|\n/).length - (/(\r\n|\r|\n)$/.test(text) || text === "" ? 1 : 0),
        words: text.split(/\s+/).filter(Boolean).length,
        chars: text.length,
      },
      preview,
    });
  }
  return { results };
}
