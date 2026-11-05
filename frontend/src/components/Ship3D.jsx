import { useMemo, useState } from "react";
import "./Ship3D.css";

const PALETTE = {
  light: { line: "#0E2D52", ink: "#0E2D52", red: "#B23A2E", navy: "#0E2D52", deck: "#6E8B63", mod: "#C9D1DB", modTop: "#E9EDF2", acc: "#FFFFFF", yel: "#E0A800", pt: "#F36F21", x: "#B54708", y: "#0E5A9C", z: "#1E5B37", tagBg: "#0E2D52", tagInk: "#FFFFFF" },
  dark: { line: "#0A1A2E", ink: "#E8EEF5", red: "#C4523F", navy: "#2E5A8A", deck: "#5E7A55", mod: "#C9D1DB", modTop: "#E6EBF0", acc: "#F2F4F7", yel: "#F2B705", pt: "#F7A066", x: "#F7A066", y: "#8FB8E8", z: "#A6EBC9", tagBg: "#E8EEF5", tagInk: "#0A1A2E" },
};

const VIEWS = [
  { id: "iso", label: "Isometric" },
  { id: "side", label: "Side" },
  { id: "plan", label: "Plan" },
];

const HULL = [[0, -29], [292, -29], [322, -14], [330, 0], [322, 14], [292, 29], [0, 29]];
const DECK_Z = 32;

function buildScene(view, yawDeg, C, points, highlight) {
  const elev = view === "plan" ? 90 : view === "side" ? 0 : 26;
  const yw = (yawDeg * Math.PI) / 180;
  const el = (elev * Math.PI) / 180;
  const s = view === "iso" ? 1.7 : 2.1;
  const cx = 400;
  const cy = view === "plan" ? 200 : 250;

  const rot = (X, Y) => {
    const x = X - 165;
    return [x * Math.cos(yw) - Y * Math.sin(yw), x * Math.sin(yw) + Y * Math.cos(yw)];
  };
  const proj = (X, Y, Z) => {
    const [xr, yr] = rot(X, Y);
    return [cx + s * xr, cy - s * ((Z - 30) * Math.cos(el) + yr * Math.sin(el))];
  };
  const toPts = (arr) => arr.map(([X, Y, Z]) => proj(X, Y, Z).map((n) => n.toFixed(1)).join(",")).join(" ");
  const depth = (arr) => arr.reduce((t, [X, Y]) => t + rot(X, Y)[1], 0) / arr.length;
  const quad = (a, b, z0, z1, fill) => {
    const q = [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]];
    return { d: depth(q), pts: toPts(q), fill };
  };
  const top = (c, z, fill) => {
    const q = c.map(([X, Y]) => [X, Y, z]);
    return { d: depth(q), pts: toPts(q), fill };
  };

  const sides = [];
  HULL.forEach((a, i) => {
    const b = HULL[(i + 1) % HULL.length];
    sides.push(quad(a, b, 0, 13, C.red));
    sides.push(quad(a, b, 13, DECK_Z, C.navy));
  });
  sides.sort((m, n) => n.d - m.d);
  const faces = [top(HULL, 0, C.red), ...sides, top(HULL, DECK_Z, C.deck)];

  const blocks = [];
  const box = (x0, x1, y0, y1, z0, z1, side, cap) => {
    const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const fs = c.map((a, i) => quad(a, c[(i + 1) % 4], z0, z1, side)).sort((m, n) => n.d - m.d);
    blocks.push({ d: depth(c.map(([X, Y]) => [X, Y, z0])), fs: [...fs, top(c, z1, cap)] });
  };
  box(4, 34, -22, 22, DECK_Z, 62, C.acc, C.modTop);
  box(10, 28, -14, 14, 62, 66, C.mod, C.yel);
  [[60, 95], [105, 140], [170, 205], [215, 250]].forEach(([a, b], i) => {
    box(a, b, -24, -2, DECK_Z, i % 2 ? 46 : 42, C.mod, C.modTop);
    box(a, b, 2, 24, DECK_Z, i % 2 ? 42 : 47, C.mod, C.modTop);
  });
  blocks.sort((m, n) => n.d - m.d).forEach((b) => faces.push(...b.fs));

  const seg = (A, B, color, w) => {
    const a = proj(...A);
    const b = proj(...B);
    return { x1: a[0], y1: a[1], x2: b[0], y2: b[1], color, w };
  };
  const lines = [
    seg([300, 0, DECK_Z], [300, 0, 95], C.ink, 4),
    seg([300, 0, 95], [315, 0, 110], C.ink, 3),
    seg([152, 18.5, DECK_Z], [152, 18.5, 48], C.yel, 5),
    seg([152, 18.5, 48], [190, 26, 70], C.yel, 3),
    seg([280, -18, DECK_Z], [280, -18, 44], C.yel, 5),
    seg([280, -18, 44], [245, -24, 60], C.yel, 3),
  ];

  const o = proj(0, 0, 0);
  const axes = [[60, 0, 0, "X", C.x], [0, 60, 0, "Y", C.y], [0, 0, 50, "Z", C.z]]
    .filter(([, , , l]) => !(view === "side" && l === "Y") && !(view === "plan" && l === "Z"))
    .map(([X, Y, Z, label, color]) => {
      const e = proj(X, Y, Z);
      const t = proj(X * 1.3, Y * 1.3, Z * 1.3);
      return { x1: o[0], y1: o[1], x2: e[0], y2: e[1], tx: t[0], ty: t[1] + 5, label, color };
    });

  const pts = points
    .filter((p) => [p.x, p.y, p.z].every((v) => Number.isFinite(v)))
    .map((p) => {
      const [u, v] = proj(p.x, p.y, p.z);
      const [du, dv] = proj(p.x, p.y, DECK_Z);
      return { id: p.id, u, v, du, dv, ring: p.id === highlight };
    });

  return { faces, lines, axes, pts };
}

export default function Ship3D({ theme = "light", points = [], highlight }) {
  const [view, setView] = useState("iso");
  const [yaw, setYaw] = useState(-30);
  const C = PALETTE[theme] ?? PALETTE.light;
  const yawDeg = view === "iso" ? yaw : 0;
  const scene = useMemo(() => buildScene(view, yawDeg, C, points, highlight), [view, yawDeg, C, points, highlight]);
  const viewLabel = VIEWS.find((v) => v.id === view).label.toLowerCase();
  const shown = scene.pts.map((p) => p.id).join(", ") || "no points";

  return (
    <div className="ship3d">
      <div className="ship3d__controls">
        <div role="group" aria-label="View" className="ship3d__group">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className="ship3d__btn" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Rotate" className="ship3d__group">
          <button type="button" className="ship3d__btn" disabled={view !== "iso"} onClick={() => setYaw((y) => y - 45)}>Rotate left</button>
          <button type="button" className="ship3d__btn" disabled={view !== "iso"} onClick={() => setYaw((y) => y + 45)}>Rotate right</button>
        </div>
      </div>

      <svg viewBox="0 0 800 400" width="100%" role="img" className="ship3d__svg" aria-label={`3D schematic of the FPSO, ${viewLabel} view, showing ${shown}.${highlight ? ` ${highlight} is highlighted.` : ""}`}>
        {scene.faces.map((f, i) => (
          <polygon key={i} points={f.pts} fill={f.fill} stroke={C.line} strokeWidth="1" strokeLinejoin="round" />
        ))}
        {scene.lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={l.w} strokeLinecap="round" />
        ))}
        {scene.axes.map((a) => (
          <g key={a.label}>
            <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={a.color} strokeWidth="3" strokeLinecap="round" />
            <text x={a.tx} y={a.ty} fill={a.color} fontSize="16" fontWeight="700" textAnchor="middle">{a.label}</text>
          </g>
        ))}
        {scene.pts.map((p) => (
          <g key={p.id}>
            <line x1={p.u} y1={p.v} x2={p.du} y2={p.dv} stroke={C.ink} strokeWidth="1.5" strokeDasharray="4 4" />
            {p.ring && <circle cx={p.u} cy={p.v} r="14" fill="none" stroke={C.ink} strokeWidth="2.5" />}
            <circle cx={p.u} cy={p.v} r="7" fill={C.pt} stroke={C.ink} strokeWidth="2" />
            <rect x={p.u + 12} y={p.v - 34} width="46" height="22" rx="11" fill={C.tagBg} />
            <text x={p.u + 35} y={p.v - 18} fill={C.tagInk} fontSize="14" fontWeight="700" textAnchor="middle">{p.id}</text>
          </g>
        ))}
      </svg>

      <p className="muted ship3d__note">
        Schematic FPSO, not to scale. Origin at AP, baseline, centreline. Dashed lines drop each point to main deck level. The points table is the text alternative.
      </p>
    </div>
  );
}
