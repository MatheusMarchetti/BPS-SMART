/**
 * BPS SMART engine contract: the single source of truth between the frontend
 * and backend teams. Change this file first (via PR to `dev`, approved by both
 * teams), then implement.
 *
 * Contract version 2.0.0. It replaces the HTTP API (contract/openapi.yaml,
 * /api/v1): nothing is sent to a server any more. The backend is C++ compiled
 * to WebAssembly with Emscripten, and every file is processed inside the
 * user's browser.
 *
 * Delivery
 *   The backend build (backend/CMakeLists.txt) produces two static files:
 *     frontend/public/wasm/bps_engine.js    ES module, default export below
 *     frontend/public/wasm/bps_engine.wasm  loaded by bps_engine.js
 *   Vite serves and copies `public/` as is, so the page loads `/wasm/bps_engine.js`.
 *   Both are build outputs (gitignored), never edited by hand.
 *
 * Flow
 *   1. As soon as the user adds RAO files, the frontend reads them ONE BY ONE:
 *      readRaoFile(name, bytes) parses the file and keeps it in the engine's
 *      memory under a file_id. The UI shows each file's load case and sea state.
 *   2. When the user clicks Calculate, calculateEnvelope(request) receives only
 *      the form data: the file_ids, LCG/TCG/KG per load case and the point.
 *      File contents are never sent again.
 *   3. When the user removes a file, releaseRaoFile(file_id) frees it.
 *
 * Calling convention
 *   - Every function is synchronous and returns a JSON string. The shapes of the
 *     parsed values are the interfaces below. JSON keeps the WebAssembly
 *     boundary small, and the same strings are checked by the native C++ tests.
 *   - File contents go in as raw bytes (Uint8Array). The engine validates the
 *     extension, size, UTF-8 encoding and RAO format itself.
 *   - Only frontend/src/services/api.js calls the engine. UI code uses api.js.
 *
 * Change rules
 *   - Frontend and engine always ship in the same deployment. Still, prefer
 *     additive changes (new functions, new optional fields), so that work in
 *     progress on the other team's branch keeps working against the mock.
 *   - Breaking changes bump the MAJOR of this contract version and of VERSION.
 *   - Keep frontend/src/services/mock.js and backend/tests/test_engine.cpp in sync.
 */

// ---------------------------------------------------------------------------
// RAO file format (what readRaoFile accepts)
// ---------------------------------------------------------------------------
//
//   RAO TABLE: 1           (1=Hs<=2.5, 2=2.5<Hs<=4.5, 3=Hs>4.5m)    -> sea_state "Hs<=2.5"
//   Loading Condition: 2   (1=LCMIN, 2=LCINT1, 3=LCINT2, 4=LCMAX)    -> load_case "LCINT1"
//
//   DIRECTION (deg):    15.00                       one block per wave heading
//   Applied Roll damping in perc of critical:     1.20
//   Freq     Surge Sway Heave Roll Pitch Yaw  Surge Sway Heave Roll Pitch Yaw
//   [rad/s]  m     m    m     deg  deg   deg  deg   deg  deg   deg  deg   deg
//   0.100    0.968 0.258 1.000 0.020 ...      270.18 ...      (13 values per row)
//
// - Amplitudes are per metre of wave amplitude (m/m, deg/m); then 6 phases.
// - Rotations and phases may be given in rad if the units line says so.
// - "Load case:" / "Sea condition:" are accepted instead of the two headers.
// - Several files may share a load case (e.g. one file per sea state).
// - RAOs are taken to be at the centre of gravity of their loading condition.

/** Returned by getHealth(). Proves the module loaded and runs. */
export interface Health {
  status: "ok";
}

/** Returned by getVersion(). Fixed when the engine is built. */
export interface Version {
  /** `${semver}+${commit}`, e.g. "0.2.0+a1b2c3d" */
  version: string;
  /** From the VERSION file, e.g. "0.2.0" */
  semver: string;
  /** Short commit hash (VERCEL_GIT_COMMIT_SHA or git), or "unknown" */
  commit: string;
}

/** Returned by getLimits(). The UI must read these instead of hardcoding them. */
export interface Limits {
  /** Lower-case, with the dot, e.g. [".txt"] */
  allowed_extensions: string[];
  /** Maximum size of ONE file, in bytes. */
  max_file_bytes: number;
}

/** Returned by readRaoFile() (and by checkFile() when a file is rejected). */
export type RaoFileResult =
  | {
      /** File name without any directory part */
      name: string;
      status: "ok";
      /** Handle for calculateEnvelope / releaseRaoFile. Valid while the module lives. */
      file_id: number;
      /** e.g. "LCINT1" */
      load_case: string;
      /** e.g. "Hs<=2.5"; "" when the file has no sea state header */
      sea_state: string;
      headings_count: number;
      frequency_count: number;
      /** rad/s */
      frequency_min: number;
      frequency_max: number;
    }
  | {
      name: string;
      status: "error";
      /**
       * Human-readable reason, e.g.
       *   "Unsupported file type"
       *   "File too large (max <max_file_bytes> bytes)"
       *   "File is not valid UTF-8 text"
       *   "Not a valid RAO file. Line 12: expected 13 values (...), found 9"
       * api.js may add "File could not be read" when the browser cannot read a file.
       */
      error: string;
    };

/** Input of calculateEnvelope(), sent as JSON. Only the form data. */
export interface EnvelopeRequest {
  /** From readRaoFile. All of them go into the envelope. */
  file_ids: number[];
  /**
   * Centre of gravity of each load case, from the ship origin, in metres.
   * Every load case of the selected files must be present. Numbers or numeric strings.
   */
  load_cases: { load_case: string; lcg: number | string; tcg: number | string; kg: number | string }[];
  /** The point, from the ship origin, in metres (x forward, y to port, z up). */
  point: { x: number | string; y: number | string; z: number | string };
  point_name?: string;
}

/** One axis of the envelope: the largest value and the case that governs it. */
export interface AxisResult {
  axis: "ax" | "ay" | "az";
  /**
   * Largest acceleration amplitude over every file, heading and frequency,
   * in m/s² per metre of wave amplitude (RAO-based, not an MPM).
   */
  value: number;
  /** Governing load case */
  condition: string;
  /** Governing sea state ("" if unknown) */
  sea_state: string;
  /** Governing file name */
  file: string;
  heading_deg: number;
  /** 2π / frequency, rounded to 0.01 s */
  period_s: number;
  frequency_rad_s: number;
}

/** Returned by calculateEnvelope() on success. */
export interface EnvelopeResult {
  point_name: string;
  point: { x: number; y: number; z: number };
  files_used: string[];
  basis: {
    /** Load cases used, in file order */
    conditions: string[];
    /** Distinct headings across the files */
    headings_count: number;
    /** rad/s */
    frequency_min: number;
    frequency_max: number;
  };
  /** ISO 8601, UTC */
  calculated_at: string;
  /** Always ax, ay, az in this order */
  results: AxisResult[];
}

/** Returned by calculateEnvelope() when the request cannot be calculated. */
export interface EngineError {
  /** e.g. "Enter the LCG, TCG and KG of load case LCINT1" */
  error: string;
}

/** What the module instance exposes. Each function returns JSON (see above). */
export interface BpsEngine {
  /** JSON Health */
  getHealth(): string;
  /** JSON Version */
  getVersion(): string;
  /** JSON Limits */
  getLimits(): string;
  /**
   * Cheap check from name and size only, so huge or wrong-type files are
   * rejected before the browser reads them into memory.
   * Returns "" if the file may be read, else a JSON RaoFileResult with status "error".
   */
  checkFile(name: string, sizeBytes: number): string;
  /** Validates, parses and stores one RAO file. Strips a UTF-8 BOM. JSON RaoFileResult. */
  readRaoFile(name: string, bytes: Uint8Array): string;
  /** Frees a stored file. JSON {released: boolean}. */
  releaseRaoFile(fileId: number): string;
  /** request: JSON EnvelopeRequest. Returns JSON EnvelopeResult or EngineError. */
  calculateEnvelope(request: string): string;
}

/** Default export of bps_engine.js. Resolves once the .wasm is compiled. */
export default function createBpsEngine(moduleOverrides?: object): Promise<BpsEngine>;
