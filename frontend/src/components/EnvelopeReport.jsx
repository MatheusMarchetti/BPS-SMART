import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import logo from "../assets/SBM_OFFSHORE_LOGO.webp";
import { getVersion } from "../services/api.js";
import { AXIS_NAMES, G } from "../state/AnalysisContext.jsx";
import ShipSvg, { viewById } from "./ShipSvg.jsx";
import "./EnvelopeReport.css";

const DATE_FORMAT = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };

const formatDate = (date) => (date ? new Date(date).toLocaleString("en-GB", DATE_FORMAT) : "");

function formatCoord(value) {
  const decimals = (String(value).split(".")[1] ?? "").length;
  const text = Math.abs(value).toFixed(Math.max(2, decimals));
  return value < 0 ? `−${text}` : text;
}

function side(y) {
  if (y > 0) return "port";
  if (y < 0) return "starboard";
  return "centreline";
}

function Header({ unitName, pointName }) {
  return (
    <header className="rpt-head">
      <img className="rpt-head__logo" src={logo} alt="SBM Offshore" width="75" height="40" />
      <div className="rpt-head__title">
        <p className="rpt-head__app">BPS SMART</p>
        <p className="rpt-head__doc">Acceleration envelope summary</p>
      </div>
      <dl className="rpt-head__meta">
        {unitName && (
          <div>
            <dt>FPSO unit</dt>
            <dd>{unitName}</dd>
          </div>
        )}
        <div>
          <dt>Point</dt>
          <dd>{pointName}</dd>
        </div>
      </dl>
    </header>
  );
}

function Footer({ version, generatedAt, page }) {
  return (
    <footer className="rpt-foot">
      <span>{`BPS SMART${version ? ` ${version}` : ""} · Generated ${formatDate(generatedAt)}`}</span>
      <span>{`Page ${page}`}</span>
    </footer>
  );
}

function Figure({ uid, viewId, number, coords, name, caption, className = "" }) {
  return (
    <figure className={`rpt-fig ${className}`.trim()}>
      <ShipSvg
        view={viewById(viewId)}
        uid={`${uid}-${viewId}`}
        coords={coords}
        name={name}
        titleId={`${uid}-${viewId}-title`}
      />
      <figcaption><b>{`Figure ${number}.`}</b> {caption}</figcaption>
    </figure>
  );
}

export default function EnvelopeReport({ result, unitName, loadCases, lead, generatedAt }) {
  const uid = useId().replace(/:/g, "");
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion()
      .then((v) => setVersion(`v${v.version}`))
      .catch(() => setVersion(""));
  }, []);

  const name = result.point_name || "Point";
  const { x, y, z } = result.point;
  const basis = result.basis;
  const header = <Header unitName={unitName} pointName={name} />;

  return createPortal(
    <div className="rpt" lang="en">
      <section className="rpt-page">
        {header}
        <div>
          <h1 className="rpt-h1">{`Acceleration envelope: ${name}`}</h1>
          <p className="rpt-lead">{lead}</p>
        </div>

        <section>
          <h2 className="rpt-h2"><span className="rpt-num">1</span>Point coordinates</h2>
          <dl className="rpt-coords">
            <div><dt>Point name</dt><dd>{name}</dd></div>
            <div><dt>X (m)</dt><dd>{formatCoord(x)}</dd></div>
            <div><dt>Y (m)</dt><dd>{formatCoord(y)}</dd></div>
            <div><dt>Z (m)</dt><dd>{formatCoord(z)}</dd></div>
          </dl>
          <p className="rpt-hint">From the ship origin: X from stern to bow, Y positive to port, Z up from the keel.</p>
        </section>

        <section>
          <h2 className="rpt-h2"><span className="rpt-num">2</span>Design accelerations</h2>
          <table className="rpt-table rpt-table--acc">
            <caption>Table 1. Maximum acceleration per axis, with the governing case. RAO based, per metre of wave amplitude.</caption>
            <thead>
              <tr>
                <th scope="col">Axis</th>
                <th scope="col" className="rpt-n">Max (m/s²)</th>
                <th scope="col" className="rpt-n">Max (g)</th>
                <th scope="col">Load case</th>
                <th scope="col">Sea condition</th>
                <th scope="col" className="rpt-n">Heading (°)</th>
                <th scope="col" className="rpt-n">Period (s)</th>
                <th scope="col" className="rpt-n">Freq. (rad/s)</th>
                <th scope="col">RAO file</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r) => (
                <tr key={r.axis}>
                  <th scope="row">{AXIS_NAMES[r.axis] ?? r.axis}</th>
                  <td className="rpt-n"><strong>{r.value.toFixed(2)}</strong></td>
                  <td className="rpt-n">{(r.value / G).toFixed(3)}</td>
                  <td>{r.condition}</td>
                  <td>{r.sea_state || "–"}</td>
                  <td className="rpt-n">{r.heading_deg}</td>
                  <td className="rpt-n">{r.period_s.toFixed(2)}</td>
                  <td className="rpt-n">{r.frequency_rad_s.toFixed(2)}</td>
                  <td className="rpt-file">{r.file}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="rpt-h2"><span className="rpt-num">3</span>Point location</h2>
          <Figure
            uid={uid}
            viewId="side"
            number={1}
            coords={result.point}
            name={name}
            caption={`Side view from starboard, point ${name} at X ${x} m, Z ${z} m. Schematic, not to scale.`}
          />
        </section>

        <section className="rpt-note">
          <p>
            <strong>Method.</strong> The envelope is the largest RAO response across every frequency, heading, RAO table and load case. It is not an MPM (most probable maximum) calculation. Files were read and calculated in the browser; none were sent to a server.
          </p>
        </section>

        <Footer version={version} generatedAt={generatedAt} page={1} />
      </section>

      <section className="rpt-page">
        {header}
        <section>
          <h2 className="rpt-h2"><span className="rpt-num">3</span>Point location (continued)</h2>
          <Figure
            uid={uid}
            viewId="plan"
            number={2}
            coords={result.point}
            name={name}
            caption={`Plan view from above, point at X ${x} m, Y ${y} m (${side(y)}). Schematic, not to scale.`}
          />
          <div className="rpt-split">
            <Figure
              uid={uid}
              viewId="stern"
              number={3}
              coords={result.point}
              name={name}
              caption={`Stern view looking forward, point at Y ${y} m, Z ${z} m.`}
            />
            <div>
              <h2 className="rpt-h2"><span className="rpt-num">4</span>Calculation basis</h2>
              <dl className="rpt-basis">
                {unitName && (<><dt>FPSO unit</dt><dd>{unitName}</dd></>)}
                <dt>Load cases</dt><dd>{basis.conditions.length}</dd>
                <dt>RAO files used</dt><dd>{result.files_used.length}</dd>
                <dt>Wave headings</dt><dd>{basis.headings_count}</dd>
                <dt>Frequencies</dt><dd>{`${basis.frequency_min} to ${basis.frequency_max} rad/s`}</dd>
                {result.calculated_at && (<><dt>Calculated</dt><dd>{formatDate(result.calculated_at)}</dd></>)}
                {version && (<><dt>Engine version</dt><dd>{version}</dd></>)}
              </dl>
            </div>
          </div>
        </section>

        <section>
          <table className="rpt-table rpt-table--cg">
            <caption>Table 2. Centre of gravity per load case, from the ship origin.</caption>
            <thead>
              <tr>
                <th scope="col">Load case</th>
                <th scope="col" className="rpt-n">LCG (m)</th>
                <th scope="col" className="rpt-n">TCG (m)</th>
                <th scope="col" className="rpt-n">KG (m)</th>
                <th scope="col" className="rpt-n">RAO files</th>
              </tr>
            </thead>
            <tbody>
              {loadCases.map((lc) => (
                <tr key={lc.name}>
                  <th scope="row">{lc.name}</th>
                  <td className="rpt-n">{lc.lcg}</td>
                  <td className="rpt-n">{lc.tcg}</td>
                  <td className="rpt-n">{lc.kg}</td>
                  <td className="rpt-n">{lc.files}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="rpt-h3">RAO files</h3>
          <ul className="rpt-files">
            {result.files_used.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </section>

        <Footer version={version} generatedAt={generatedAt} page={2} />
      </section>
    </div>,
    document.body,
  );
}
