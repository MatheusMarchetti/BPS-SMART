import { useId, useRef, useState } from "react";
import { PlanView, SectionView, SideView, SternView } from "./shipViews.jsx";
import "./ShipPreview.css";

const VIEWS = [
  {
    id: "side",
    label: "Side",
    viewBox: "-40 -160 400 178",
    Drawing: SideView,
    place: (p) => [p.x, -p.z],
    describe: "Side view from starboard: stern and helideck on the left, bow and flare on the right.",
  },
  {
    id: "plan",
    label: "Plan",
    viewBox: "-40 -46 410 94",
    Drawing: PlanView,
    place: (p) => [p.x, -p.y],
    describe: "Plan view from above: stern on the left, port side at the top.",
  },
  {
    id: "stern",
    label: "Stern",
    viewBox: "-50 -160 100 176",
    Drawing: SternView,
    place: (p) => [-p.y, -p.z],
    describe: "Stern view looking forward: port on the left, starboard on the right.",
  },
  {
    id: "section",
    label: "Section A-A",
    viewBox: "-50 -64 100 80",
    Drawing: SectionView,
    place: (p) => [-p.y, -p.z],
    describe: "Midship section A-A: port on the left, starboard on the right.",
  },
];

const toNumber = (v) => (String(v).trim() === "" ? NaN : Number(v));

export default function ShipPreview({ point }) {
  const uid = useId().replace(/:/g, "");
  const tabRefs = useRef([]);
  const [active, setActive] = useState(0);

  const coords = { x: toNumber(point.x), y: toNumber(point.y), z: toNumber(point.z) };
  const hasPoint = Object.values(coords).every(Number.isFinite);
  const name = point.name.trim() || "Point";
  const summary = hasPoint
    ? `${name} at X ${coords.x} m, Y ${coords.y} m, Z ${coords.z} m.`
    : "Fill X, Y and Z to see the point on the ship.";

  function onKeyDown(event) {
    const last = VIEWS.length - 1;
    const next = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  const view = VIEWS[active];
  const [u, v] = hasPoint ? view.place(coords) : [0, 0];
  const { Drawing } = view;

  return (
    <div className="ship-preview">
      <h3 className="ship-preview__title" id={`${uid}-title`}>Ship preview</h3>

      <div role="tablist" aria-labelledby={`${uid}-title`} className="ship-preview__tabs" onKeyDown={onKeyDown}>
        {VIEWS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={i === active}
            aria-controls={`${uid}-panel`}
            tabIndex={i === active ? 0 : -1}
            className="ship-preview__tab"
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${view.id}`} tabIndex={0} className="ship-preview__panel">
        <svg
          viewBox={view.viewBox}
          className={`ship-preview__svg ship-preview__svg--${view.id}`}
          role="img"
          aria-labelledby={`${uid}-svg-title`}
          aria-describedby={`${uid}-summary`}
        >
          <title id={`${uid}-svg-title`}>{`Schematic FPSO, not to scale. ${view.describe}`}</title>
          <Drawing uid={uid} />
          {hasPoint && (
            <g transform={`translate(${u} ${v})`}>
              {view.id === "side" && (
                <line x1={0} y1={0} x2={0} y2={coords.z - 32} stroke="var(--ink)" strokeWidth={0.5} strokeDasharray="2 1.5" />
              )}
              <circle r={4} fill="none" stroke="var(--ink)" strokeWidth={0.8} />
              <circle r={2.2} fill="var(--ship-pt)" stroke="var(--ink)" strokeWidth={0.6} />
              <text
                x={5}
                y={-4}
                fontSize={4.5}
                fontWeight={700}
                fill="var(--ink)"
                stroke="var(--tint)"
                strokeWidth={1.2}
                paintOrder="stroke"
              >
                {name}
              </text>
            </g>
          )}
        </svg>
      </div>

      <p id={`${uid}-summary`} className="muted ship-preview__note">{summary}</p>
    </div>
  );
}
