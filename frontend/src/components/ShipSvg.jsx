import { PlanView, SectionView, SideView, SternView } from "./shipViews.jsx";

export const VIEWS = [
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

export const viewById = (id) => VIEWS.find((v) => v.id === id);

function labelOnLeft(view, u) {
  const [x0, , width] = view.viewBox.split(" ").map(Number);
  return u > x0 + width * 0.6;
}

export default function ShipSvg({ view, uid, coords, name, className, titleId, describedBy }) {
  const hasPoint = coords && Object.values(coords).every(Number.isFinite);
  const [u, v] = hasPoint ? view.place(coords) : [0, 0];
  const left = labelOnLeft(view, u);
  const { Drawing } = view;

  return (
    <svg viewBox={view.viewBox} className={className} role="img" aria-labelledby={titleId} aria-describedby={describedBy}>
      <title id={titleId}>{`Schematic FPSO, not to scale. ${view.describe}`}</title>
      <Drawing uid={uid} />
      {hasPoint && (
        <g transform={`translate(${u} ${v})`}>
          {view.id === "side" && (
            <line x1={0} y1={0} x2={0} y2={coords.z - 32} stroke="var(--ink)" strokeWidth={0.5} strokeDasharray="2 1.5" />
          )}
          <circle r={4} fill="var(--ship-ring, none)" stroke="var(--ink)" strokeWidth={0.8} />
          <circle r={2.2} fill="var(--ship-pt)" stroke="var(--ink)" strokeWidth={0.6} />
          <text
            x={left ? -5 : 5}
            y={-4}
            textAnchor={left ? "end" : "start"}
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
  );
}
