export const SHIP = { length: 330, breadth: 61, depth: 32, waterline: 20 };

export const LANDMARKS = {
  flare: { x: 301.5, base: { y: 6.5, z: 31.8 }, top: { y: 3.5, z: 131.8 } },
  aftCrane: { x: 150.3, y: -29.0, z: 52.6 },
  fwdCrane: { x: 232.5, y: -29.0, z: 54.2 },
  helideck: { x: -17.4, y: 11.4, z: 45.5 },
  accommodation: { x: 39.4, y: 0.0, z: 57.1 },
  riserBalcony: { aft: 115.6, fwd: 236.0, y: 30.6, upper: 30.0, lower: 3.9 },
};

const { flare: FLARE, aftCrane: AFT_CRANE, fwdCrane: FWD_CRANE, helideck: HELI, accommodation: ACCOM, riserBalcony: RISER } = LANDMARKS;
const HELI_R = HELI.y + 1.1;
const ACCOM_W = 24;
const ACCOM_AFT = ACCOM.x - ACCOM_W / 2;

const C = {
  hull: "#2F5D8C",
  boot: "#1F2933",
  deck: "#9A3F2E",
  yellow: "#E8B500",
  yellowDark: "#B98F00",
  white: "#F4F6F8",
  grey: "#C3CBD3",
  greyDark: "#8A96A3",
  roof: "#B23A2E",
  heli: "#3F7D4E",
  orange: "#F36F21",
  glass: "#5B7896",
  line: "#14202C",
};

const MODULES = [
  { x: 52, w: 30, h: 14, vessel: false },
  { x: 84, w: 26, h: 18, vessel: false },
  { x: 112, w: 28, h: 13, vessel: true },
  { x: 142, w: 24, h: 17, vessel: false },
  { x: 168, w: 28, h: 15, vessel: true },
  { x: 198, w: 26, h: 19, vessel: false },
  { x: 226, w: 28, h: 14, vessel: false },
  { x: 256, w: 30, h: 16, vessel: true },
];
const BALCONY = Array.from({ length: 18 }, (_, i) => RISER.aft + ((RISER.fwd - RISER.aft) * i) / 17);
const RACK_POSTS = Array.from({ length: 33 }, (_, i) => 46 + i * 8);

const pts = (list) => list.map(([x, y]) => `${x},${y}`).join(" ");

function Box({ x, y, w, h, fill, rx, stroke = C.line }) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={0.25} />;
}

function Line({ x1, y1, x2, y2, color, width = 0.35, dash }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} />;
}

function Shape({ points, fill, width = 0.3 }) {
  return <polygon points={pts(points)} fill={fill} stroke={C.line} strokeWidth={width} strokeLinejoin="round" />;
}

function Label({ x, y, size = 4, anchor = "middle", bold, children }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={bold ? 700 : 400} textAnchor={anchor} fill="var(--ink)">
      {children}
    </text>
  );
}

function Waterline({ from, to }) {
  return <Line x1={from} y1={-SHIP.waterline} x2={to} y2={-SHIP.waterline} color="var(--ship-wl)" width={0.5} dash="3 2" />;
}

function Origin() {
  return <circle cx={0} cy={0} r={1.6} fill="var(--ship-pt)" stroke="var(--ink)" strokeWidth={0.4} />;
}

function Crane({ x, heel, boomX, boomZ, color = C.yellow, dark = C.yellowDark }) {
  return (
    <g>
      <Box x={x - 2} y={-(heel - 3)} w={4} h={heel - 3 - SHIP.depth} fill={color} />
      <Box x={x - 3.5} y={-(heel + 1)} w={7} h={4} fill={color} />
      <Line x1={x} y1={-heel} x2={boomX} y2={-boomZ} color={color} width={1.4} />
      <Line x1={x} y1={-(heel + 5)} x2={boomX} y2={-boomZ} color={dark} width={0.4} />
      <Line x1={x} y1={-(heel + 1)} x2={x} y2={-(heel + 5)} color={dark} width={0.6} />
    </g>
  );
}

function FlareTower({ at, base = FLARE.base.y, top = FLARE.top.y }) {
  const z0 = FLARE.base.z;
  const z1 = FLARE.top.z;
  const half = (z) => base + ((top - base) * (z - z0)) / (z1 - z0);
  const rungs = [];
  for (let z = z0; z < z1 - 0.1; z += 8) {
    const zn = Math.min(z + 8, z1);
    rungs.push(
      <g key={z}>
        <Line x1={at - half(z)} y1={-z} x2={at + half(zn)} y2={-zn} color={C.greyDark} width={0.25} />
        <Line x1={at + half(z)} y1={-z} x2={at - half(zn)} y2={-zn} color={C.greyDark} width={0.25} />
        <Line x1={at - half(z)} y1={-z} x2={at + half(z)} y2={-z} color={C.greyDark} width={0.25} />
      </g>,
    );
  }
  return (
    <g>
      <Line x1={at - base} y1={-z0} x2={at - top} y2={-z1} color={C.grey} width={0.6} />
      <Line x1={at + base} y1={-z0} x2={at + top} y2={-z1} color={C.grey} width={0.6} />
      {rungs}
      <Box x={at - top - 0.6} y={-(z1 + 2.5)} w={top * 2 + 1.2} h={2.5} fill={C.yellow} />
      <path d={`M${at - 0.9},${-(z1 + 2.5)} q0.9,-5 0.9,-8 q1.3,3.5 0.9,8 z`} fill={C.orange} />
    </g>
  );
}

function RiserHidden() {
  return (
    <g>
      <Line x1={RISER.aft} y1={-RISER.upper} x2={RISER.fwd} y2={-RISER.upper} color={C.greyDark} width={0.5} dash="2 1.5" />
      <Line x1={RISER.aft} y1={-RISER.lower} x2={RISER.fwd} y2={-RISER.lower} color={C.greyDark} width={0.5} dash="2 1.5" />
      {BALCONY.map((x) => <Line key={x} x1={x} y1={-RISER.upper} x2={x} y2={-RISER.lower} color={C.greyDark} width={0.3} dash="1.5 1.5" />)}
    </g>
  );
}

function RiserSection({ side }) {
  const edge = SHIP.breadth / 2;
  const [a, b] = side < 0 ? [-edge - 5, -edge] : [edge, edge + 5];
  return (
    <g>
      <Box x={a} y={-(RISER.upper + 1)} w={b - a} h={9} fill={C.grey} />
      <Box x={a} y={-(RISER.lower + 1)} w={b - a} h={2} fill={C.grey} />
      <Line x1={(a + b) / 2} y1={-(RISER.upper - 8)} x2={(a + b) / 2} y2={-(RISER.lower + 1)} color={C.greyDark} width={0.6} />
    </g>
  );
}

function Accommodation({ x, w }) {
  const wall = ACCOM.z - 2;
  const rows = [];
  for (let z = SHIP.depth + 4; z + 3.5 < wall; z += 5) rows.push(z);
  return (
    <g>
      <Box x={x} y={-wall} w={w} h={wall - SHIP.depth} fill={C.white} />
      {rows.map((z) => <Box key={z} x={x + 2} y={-(z + 2.2)} w={w - 4} h={1.6} fill={C.glass} stroke="none" />)}
      <Box x={x - 2} y={-ACCOM.z} w={w + 4} h={2} fill={C.roof} />
    </g>
  );
}

function Mast({ at }) {
  const z = ACCOM.z;
  return (
    <g>
      <Box x={at - 4} y={-(z + 14)} w={8} h={14} fill={C.white} />
      <Box x={at - 5} y={-(z + 16)} w={10} h={2} fill={C.roof} />
      <Line x1={at} y1={-(z + 16)} x2={at} y2={-(z + 27)} color={C.line} width={0.5} />
      <Line x1={at - 3} y1={-(z + 23)} x2={at + 3} y2={-(z + 23)} color={C.line} width={0.4} />
    </g>
  );
}

function HelideckSlab({ at, struts }) {
  return (
    <g>
      {struts.map(([x1, x2, z2]) => (
        <Line key={x1} x1={x1} y1={-(HELI.z - 2)} x2={x2} y2={-z2} color={C.greyDark} width={0.8} />
      ))}
      <Shape
        points={[[at - HELI_R, -HELI.z], [at + HELI_R, -HELI.z], [at + HELI_R - 2, -(HELI.z - 2)], [at - HELI_R + 2, -(HELI.z - 2)]]}
        fill={C.heli}
      />
    </g>
  );
}

const SIDE_HULL = [[1, 0], [318, 0], [328, -8], [334, -32], [-3, -32], [-3, -14], [1, -6]];
const PLAN_HULL = [[-3, 30.5], [292, 30.5], [318, 21], [332, 8.4], [335, 0], [332, -8.4], [318, -21], [292, -30.5], [-3, -30.5]];
const PLAN_DECK = [[0, 28.5], [292, 28.5], [316, 19], [329, 7.4], [331, 0], [329, -7.4], [316, -19], [292, -28.5], [0, -28.5]];
const TRANSVERSE_HULL = [[-30.5, -32], [30.5, -32], [30.5, -6], [24.5, 0], [-24.5, 0], [-30.5, -6]];
const TANK_LINE = [[-28, -30], [28, -30], [28, -4], [23, -2.2], [-23, -2.2], [-28, -4]];

function PaintedHull({ id, points, deckY = -32, width = 360, from = -10 }) {
  return (
    <g>
      <clipPath id={id}><polygon points={pts(points)} /></clipPath>
      <Shape points={points} fill={C.hull} width={0.4} />
      <g clipPath={`url(#${id})`}>
        <rect x={from} y={-13} width={width} height={14} fill={C.boot} />
        <rect x={from} y={deckY} width={width} height={1.6} fill={C.deck} />
      </g>
      <Shape points={points} fill="none" width={0.4} />
    </g>
  );
}

export function SideView({ uid }) {
  return (
    <g>
      <PaintedHull id={`${uid}-side`} points={SIDE_HULL} />
      <RiserHidden />
      <Box x={44} y={-38} w={262} h={2} fill={C.grey} />
      {RACK_POSTS.map((x) => <Line key={x} x1={x} y1={-32} x2={x} y2={-36} color={C.greyDark} width={0.4} />)}
      {MODULES.map((m) => (
        <g key={m.x}>
          <Box x={m.x} y={-(32 + m.h)} w={m.w} h={m.h} fill={C.yellow} />
          {[5, 10, 15].filter((lev) => lev < m.h).map((lev) => (
            <Line key={lev} x1={m.x} y1={-(32 + lev)} x2={m.x + m.w} y2={-(32 + lev)} color={C.yellowDark} width={0.4} />
          ))}
          <Box x={m.x + 2} y={-(32 + m.h + 3)} w={m.w * 0.35} h={3} fill={C.white} />
          {m.vessel && <Box x={m.x + m.w * 0.55} y={-(32 + m.h + 5)} w={4} h={5} rx={2} fill={C.white} />}
        </g>
      ))}
      {[[100, 62], [186, 60], [240, 58]].map(([x, h]) => <Box key={x} x={x} y={-h} w={2.4} h={h - 45} fill={C.white} />)}
      <Crane x={AFT_CRANE.x} heel={AFT_CRANE.z} boomX={AFT_CRANE.x + 36} boomZ={80} />
      <Crane x={FWD_CRANE.x} heel={FWD_CRANE.z} boomX={FWD_CRANE.x - 31} boomZ={76} />
      <Accommodation x={ACCOM_AFT} w={ACCOM_W} />
      <Mast at={ACCOM.x} />
      {[ACCOM_AFT - 14, ACCOM_AFT - 8].map((x) => <Box key={x} x={x} y={-42} w={5} h={3} rx={1.5} fill={C.orange} />)}
      <HelideckSlab at={HELI.x} struts={[[HELI.x - HELI_R + 4, -3, 26], [HELI.x + HELI_R - 2, 2, 32]]} />
      <FlareTower at={FLARE.x} base={2} top={0.8} />
      <Waterline from={-25} to={345} />
      <Label x={338} y={-21.2} anchor="end">WL</Label>
      <Line x1={165} y1={4} x2={165} y2={-140} color="var(--ink)" width={0.4} dash="4 2" />
      <Label x={167} y={-136} size={5} anchor="start" bold>A</Label>
      <Origin />
      <Line x1={0} y1={0} x2={30} y2={0} color="var(--ship-axis)" width={0.9} />
      <Line x1={0} y1={0} x2={0} y2={-30} color="var(--ship-axis)" width={0.9} />
      <Label x={33} y={1.5} size={5} anchor="start" bold>X</Label>
      <Label x={-1.6} y={-33} size={5} bold>Z</Label>
      <Label x={-2} y={7}>Origin</Label>
      <Line x1={0} y1={10} x2={330} y2={10} color="var(--ink)" width={0.3} />
      <Label x={165} y={15.5} size={4.5}>≈ 330 m (example)</Label>
      <Label x={HELI.x} y={-56}>AFT</Label>
      <Label x={326} y={-100}>BOW</Label>
    </g>
  );
}

export function PlanView() {
  return (
    <g>
      <Shape points={PLAN_HULL} fill={C.hull} width={0.4} />
      <Shape points={PLAN_DECK} fill={C.deck} width={0.25} />
      <Box x={RISER.aft} y={-28.5} w={RISER.fwd - RISER.aft} h={3.5} fill={C.grey} />
      {BALCONY.map((x) => <Box key={x} x={x - 2} y={-RISER.y - 3.5} w={4} h={3.5} fill={C.greyDark} />)}
      <Box x={44} y={-2} w={262} h={4} fill={C.grey} />
      {MODULES.map((m) => [[-25, -4], [4, 25]].map(([y0, y1]) => (
        <g key={`${m.x}${y0}`}>
          <Box x={m.x} y={-y1} w={m.w} h={y1 - y0} fill={C.yellow} />
          <Line x1={m.x + m.w / 2} y1={-y1} x2={m.x + m.w / 2} y2={-y0} color={C.yellowDark} width={0.4} />
          <circle cx={m.x + m.w * 0.3} cy={-(y0 + y1) / 2} r={2.2} fill={C.white} stroke={C.line} strokeWidth={0.25} />
        </g>
      )))}
      {[[AFT_CRANE, 36], [FWD_CRANE, -31]].map(([c, reach]) => (
        <g key={c.x}>
          <circle cx={c.x} cy={-c.y} r={3.4} fill={C.yellow} stroke={C.line} strokeWidth={0.3} />
          <Line x1={c.x} y1={-c.y} x2={c.x + reach} y2={-c.y - Math.sign(c.y) * 3} color={C.yellow} width={1.4} />
        </g>
      ))}
      <Box x={ACCOM_AFT - 2} y={-22} w={ACCOM_W + 4} h={44} fill={C.roof} />
      <Box x={ACCOM.x - 5} y={-ACCOM.y - 5} w={10} h={10} fill={C.white} />
      {[-24, 24].map((y) => <Box key={y} x={ACCOM_AFT - 14} y={-y - 1.5} w={10} h={3} rx={1.5} fill={C.orange} />)}
      <Shape
        points={Array.from({ length: 8 }, (_, i) => {
          const a = Math.PI / 8 + (i * Math.PI) / 4;
          const r = HELI_R / Math.cos(Math.PI / 8);
          return [HELI.x + r * Math.cos(a), r * Math.sin(a)];
        })}
        fill={C.heli}
      />
      <circle cx={HELI.x} cy={0} r={HELI_R * 0.65} fill="none" stroke="#F2C94C" strokeWidth={0.9} />
      <text x={HELI.x} y={3} fontSize={8} fontWeight={700} textAnchor="middle" fill={C.white}>H</text>
      <Box x={FLARE.x - 2} y={-2} w={4} h={4} fill={C.grey} />
      <circle cx={FLARE.x} cy={0} r={1} fill={C.orange} />
      <Origin />
      <Line x1={0} y1={0} x2={0} y2={-24} color="var(--ship-axis)" width={0.9} />
      <Line x1={0} y1={0} x2={24} y2={0} color="var(--ship-axis)" width={0.9} />
      <Label x={3} y={-20} size={5} anchor="start" bold>Y</Label>
      <Line x1={345} y1={-30.5} x2={345} y2={30.5} color="var(--ink)" width={0.3} />
      <Label x={350} y={1.5} size={4.5} anchor="start">≈ 61 m</Label>
      <Label x={170} y={-40}>PORT, riser balcony</Label>
      <Label x={160} y={39}>STBD</Label>
    </g>
  );
}

export function SternView({ uid }) {
  return (
    <g>
      <PaintedHull id={`${uid}-stern`} points={TRANSVERSE_HULL} width={80} from={-40} />
      <FlareTower at={0} base={2} top={0.8} />
      <Crane x={-FWD_CRANE.y} heel={FWD_CRANE.z} boomX={-FWD_CRANE.y - 9} boomZ={FWD_CRANE.z + 22} color={C.yellowDark} dark={C.line} />
      <Crane x={-AFT_CRANE.y} heel={AFT_CRANE.z} boomX={-AFT_CRANE.y + 4} boomZ={AFT_CRANE.z + 24} />
      <Box x={-26} y={-51} w={22} h={19} fill={C.yellowDark} />
      <Box x={4} y={-49} w={22} h={17} fill={C.yellowDark} />
      <RiserSection side={-1} />
      <Accommodation x={-22} w={44} />
      <Mast at={-ACCOM.y} />
      {[-29, 24].map((x) => <Box key={x} x={x} y={-44} w={5} h={3} rx={1.5} fill={C.orange} />)}
      <HelideckSlab at={0} struts={[[-HELI_R + 2, -8, 32], [HELI_R - 2, 8, 32]]} />
      <Waterline from={-45} to={45} />
      <Origin />
      <Line x1={0} y1={0} x2={0} y2={-14} color="var(--ship-axis)" width={0.8} />
      <Line x1={0} y1={0} x2={-14} y2={0} color="var(--ship-axis)" width={0.8} />
      <Label x={1.5} y={-12} anchor="start" bold>Z</Label>
      <Label x={-17} y={1.5} bold>Y</Label>
      <Label x={-40} y={-36} size={3.6} anchor="start">PORT, riser balcony</Label>
      <Label x={44} y={-36} size={3.6} anchor="end">STBD</Label>
      <Line x1={-30.5} y1={7} x2={30.5} y2={7} color="var(--ink)" width={0.3} />
      <Label x={0} y={12} size={3.6}>≈ 61 m</Label>
    </g>
  );
}

export function SectionView({ uid }) {
  return (
    <g>
      <PaintedHull id={`${uid}-section`} points={TRANSVERSE_HULL} width={80} from={-40} deckY={-33.6} />
      <Shape points={TANK_LINE} fill="var(--card)" />
      <Line x1={0} y1={-2.2} x2={0} y2={-30} color={C.greyDark} width={0.4} dash="1.5 1" />
      <Box x={-30.5} y={-33.6} w={61} h={1.6} fill={C.deck} />
      <Box x={-2} y={-38} w={4} h={2} fill={C.grey} />
      <Line x1={0} y1={-33.6} x2={0} y2={-36} color={C.greyDark} width={0.5} />
      {[[-25, -4, 15], [4, 25, 17]].map(([a, b, h]) => (
        <g key={a}>
          <Box x={a} y={-(33.6 + h)} w={b - a} h={h} fill={C.yellow} />
          {[5, 10, 15].filter((lev) => lev < h).map((lev) => (
            <Line key={lev} x1={a} y1={-(33.6 + lev)} x2={b} y2={-(33.6 + lev)} color={C.yellowDark} width={0.4} />
          ))}
          <Box x={a + 3} y={-(33.6 + h + 5)} w={5} h={5} rx={2.5} fill={C.white} />
        </g>
      ))}
      <RiserSection side={-1} />
      <Waterline from={-45} to={45} />
      <Label x={44} y={-21} size={3.2} anchor="end">WL</Label>
      <Origin />
      <Line x1={-30.5} y1={6} x2={30.5} y2={6} color="var(--ink)" width={0.3} />
      <Label x={0} y={11} size={3.6}>≈ 61 m</Label>
      <Line x1={36.5} y1={0} x2={36.5} y2={-32} color="var(--ink)" width={0.3} />
      <Label x={38.5} y={-12} size={3.6} anchor="start">≈ 32 m</Label>
      <Label x={-46} y={-56} size={3.6} anchor="start">PORT, riser balcony</Label>
      <Label x={44} y={-56} size={3.6} anchor="end">STBD</Label>
    </g>
  );
}
