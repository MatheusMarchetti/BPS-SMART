// Runtime configuration.
//
// USE_MOCK
//   Default: true when served by a local static server on port 8080
//   (frontend-only development), false everywhere else (Vercel, etc.).
//   Override with the URL query parameter ?mock=1 or ?mock=0.
//
// API_BASE_URL
//   "" = same origin (Vercel: frontend and /api share a domain).
//   Locally on port 8080 with ?mock=0, it points to the Flask dev server.

const params = new URLSearchParams(location.search);
const isLocalStatic =
  ["localhost", "127.0.0.1"].includes(location.hostname) && location.port === "8080";

export const USE_MOCK = params.has("mock") ? params.get("mock") !== "0" : isLocalStatic;

export const API_BASE_URL = isLocalStatic ? "http://127.0.0.1:5000" : "";
