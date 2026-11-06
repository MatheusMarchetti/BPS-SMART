export const SHIP = { length: 330, breadth: 58, depth: 32, waterline: 20 };

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
const BALCONY = Array.from({ length: 16 }, (_, i) => 118 + i * 7);
const RACK_POSTS = Array.from({ length: 33 }, (_, i) => 46 + i * 8);
const WINDOW_ROWS = [36, 41, 46, 51, 56];

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

function Crane({ x, boomX, boomZ }) {
  return (
    <g>
      <Box x={x - 2} y={-54} w={4} h={22} fill={C.yellow} />
      <Box x={x - 3.5} y={-58} w={7} h={4} fill={C.yellow} />
      <Line x1={x} y1={-57} x2={boomX} y2={-boomZ} color={C.yellow} width={1.4} />
      <Line x1={x} y1={-62} x2={boomX} y2={-boomZ} color={C.yellowDark} width={0.4} />
      <Line x1={x} y1={-58} x2={x} y2={-62} color={C.yellowDark} width={0.6} />
    </g>
  );
}

function FlareTower({ x }) {
  const rungs = [];
  for (let z = 32; z < 114; z += 8) {
    const at = (h) => (h - 32) / 86;
    const [a, b] = [x - 5 + 4 * at(z), x + 5 - 4 * at(z)];
    const [a2, b2] = [x - 5 + 4 * at(z + 8), x + 5 - 4 * at(z + 8)];
    rungs.push(
      <g key={z}>
        <Line x1={a} y1={-z} x2={b2} y2={-(z + 8)} color={C.greyDark} />
        <Line x1={b} y1={-z} x2={a2} y2={-(z + 8)} color={C.greyDark} />
        <Line x1={a} y1={-z} x2={b} y2={-z} color={C.greyDark} />
      </g>,
    );
  }
  return (
    <g>
      <Line x1={x - 5} y1={-32} x2={x - 1} y2={-118} color={C.grey} width={0.9} />
      <Line x1={x + 5} y1={-32} x2={x + 1} y2={-118} color={C.grey} width={0.9} />
      {rungs}
      <Box x={x - 3} y={-121} w={6} h={3} fill={C.yellow} />
      <path d={`M${x - 1.5},-121 q1.5,-6 1.5,-9 q2,4 1.5,9 z`} fill={C.orange} />
    </g>
  );
}

function Accommodation({ x, w }) {
  return (
    <g>
      <Box x={x} y={-62} w={w} h={30} fill={C.white} />
      {WINDOW_ROWS.map((z) => <Box key={z} x={x + 2} y={-(z + 2.2)} w={w - 4} h={1.6} fill={C.glass} stroke="none" />)}
      <Box x={x - 2} y={-64} w={w + 4} h={2} fill={C.roof} />
    </g>
  );
}

const SIDE_HULL = [[1, 0], [318, 0], [328, -8], [334, -32], [-3, -32], [-3, -14], [1, -6]];
const PLAN_HULL = [[-3, 29], [292, 29], [318, 20], [332, 8], [335, 0], [332, -8], [318, -20], [292, -29], [-3, -29]];
const PLAN_DECK = [[0, 27], [292, 27], [316, 18], [329, 7], [331, 0], [329, -7], [316, -18], [292, -27], [0, -27]];
const TRANSVERSE_HULL = [[-29, -32], [29, -32], [29, -6], [23, 0], [-23, 0], [-29, -6]];
const TANK_LINE = [[-26.5, -30], [26.5, -30], [26.5, -4], [21.5, -2.2], [-21.5, -2.2], [-26.5, -4]];

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
      {BALCONY.map((x) => (
        <g key={x}>
          <Box x={x} y={-31} w={4} h={9} fill={C.grey} />
          <Line x1={x + 2} y1={-22} x2={x + 2} y2={-12} color={C.greyDark} width={0.6} />
        </g>
      ))}
      <Box x={116} y={-32.5} w={110} h={1.5} fill={C.greyDark} />
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
      <Crane x={124} boomX={160} boomZ={80} />
      <Crane x={236} boomX={205} boomZ={74} />
      <Accommodation x={8} w={32} />
      <Box x={18} y={-78} w={8} h={14} fill={C.white} />
      <Box x={17} y={-80} w={10} h={2} fill={C.roof} />
      <Line x1={22} y1={-80} x2={22} y2={-90} color={C.line} width={0.5} />
      <Line x1={19} y1={-86} x2={25} y2={-86} color={C.line} width={0.4} />
      {[40, 46].map((x) => <Box key={x} x={x} y={-42} w={5} h={3} rx={1.5} fill={C.orange} />)}
      <Shape points={[[-16, -66], [16, -66], [14, -64], [-14, -64]]} fill={C.heli} />
      <Line x1={-12} y1={-64} x2={2} y2={-40} color={C.greyDark} width={0.8} />
      <Line x1={6} y1={-64} x2={8} y2={-62} color={C.greyDark} width={0.8} />
      <FlareTower x={314} />
      <Waterline from={-25} to={345} />
      <Label x={338} y={-21.2} anchor="end">WL</Label>
      <Line x1={165} y1={4} x2={165} y2={-128} color="var(--ink)" width={0.4} dash="4 2" />
      <Label x={167} y={-124} size={5} anchor="start" bold>A</Label>
      <Origin />
      <Line x1={0} y1={0} x2={30} y2={0} color="var(--ship-axis)" width={0.9} />
      <Line x1={0} y1={0} x2={0} y2={-30} color="var(--ship-axis)" width={0.9} />
      <Label x={33} y={1.5} size={5} anchor="start" bold>X</Label>
      <Label x={-1.6} y={-33} size={5} bold>Z</Label>
      <Label x={-2} y={7}>Origin</Label>
      <Line x1={0} y1={10} x2={330} y2={10} color="var(--ink)" width={0.3} />
      <Label x={165} y={15.5} size={4.5}>≈ 330 m (example)</Label>
      <Label x={18} y={-96}>AFT</Label>
      <Label x={324} y={-126}>BOW</Label>
    </g>
  );
}

export function PlanView() {
  return (
    <g>
      <Shape points={PLAN_HULL} fill={C.hull} width={0.4} />
      <Shape points={PLAN_DECK} fill={C.deck} width={0.25} />
      <Box x={116} y={25} w={110} h={4} fill={C.grey} />
      {BALCONY.map((x) => <Box key={x} x={x} y={29} w={4} h={4} fill={C.greyDark} />)}
      <Box x={44} y={-2} w={262} h={4} fill={C.grey} />
      {MODULES.map((m) => [[-25, -4], [4, 25]].map(([y0, y1]) => (
        <g key={`${m.x}${y0}`}>
          <Box x={m.x} y={-y1} w={m.w} h={y1 - y0} fill={C.yellow} />
          <Line x1={m.x + m.w / 2} y1={-y1} x2={m.x + m.w / 2} y2={-y0} color={C.yellowDark} width={0.4} />
          <circle cx={m.x + m.w * 0.3} cy={-(y0 + y1) / 2} r={2.2} fill={C.white} stroke={C.line} strokeWidth={0.25} />
        </g>
      )))}
      {[[124, 23, 160, 27], [236, -23, 205, -27]].map(([x, y, bx, by]) => (
        <g key={x}>
          <circle cx={x} cy={-y} r={3.4} fill={C.yellow} stroke={C.line} strokeWidth={0.3} />
          <Line x1={x} y1={-y} x2={bx} y2={-by} color={C.yellow} width={1.4} />
        </g>
      ))}
      <Box x={6} y={-22} w={36} h={44} fill={C.roof} />
      <Box x={17} y={-5} w={10} h={10} fill={C.white} />
      {[-24, 24].map((y) => <Box key={y} x={38} y={-y - 1.5} w={10} h={3} rx={1.5} fill={C.orange} />)}
      <Shape
        points={Array.from({ length: 8 }, (_, i) => {
          const a = Math.PI / 8 + (i * Math.PI) / 4;
          return [-2 + 16 * Math.cos(a), 16 * Math.sin(a)];
        })}
        fill={C.heli}
      />
      <circle cx={-2} cy={0} r={10} fill="none" stroke="#F2C94C" strokeWidth={0.9} />
      <text x={-2} y={3} fontSize={8} fontWeight={700} textAnchor="middle" fill={C.white}>H</text>
      <Box x={309} y={-5} w={10} h={10} fill={C.grey} />
      <circle cx={314} cy={0} r={2} fill={C.orange} />
      <Origin />
      <Line x1={0} y1={0} x2={0} y2={-24} color="var(--ship-axis)" width={0.9} />
      <Line x1={0} y1={0} x2={24} y2={0} color="var(--ship-axis)" width={0.9} />
      <Label x={3} y={-20} size={5} anchor="start" bold>Y</Label>
      <Line x1={345} y1={-29} x2={345} y2={29} color="var(--ink)" width={0.3} />
      <Label x={350} y={1.5} size={4.5} anchor="start">≈ 58 m</Label>
      <Label x={160} y={-36}>PORT (+Y)</Label>
      <Label x={170} y={40}>STARBOARD, riser balcony</Label>
    </g>
  );
}

export function SternView({ uid }) {
  return (
    <g>
      <PaintedHull id={`${uid}-stern`} points={TRANSVERSE_HULL} width={80} from={-40} />
      <Line x1={-3} y1={-40} x2={-1} y2={-118} color={C.grey} width={0.8} />
      <Line x1={3} y1={-40} x2={1} y2={-118} color={C.grey} width={0.8} />
      <Box x={-3} y={-121} w={6} h={3} fill={C.yellow} />
      <path d="M-1.5,-121 q1.5,-6 1.5,-9 q2,4 1.5,9 z" fill={C.orange} />
      <Box x={-25} y={-76} w={4} h={22} fill={C.yellowDark} />
      <Line x1={-23} y1={-74} x2={-30} y2={-80} color={C.yellowDark} width={1.2} />
      <Box x={21} y={-74} w={4} h={20} fill={C.yellowDark} />
      <Line x1={23} y1={-72} x2={31} y2={-78} color={C.yellowDark} width={1.2} />
      <Box x={-26} y={-51} w={22} h={19} fill={C.yellowDark} />
      <Box x={4} y={-49} w={22} h={17} fill={C.yellowDark} />
      <Box x={29} y={-32} w={4} h={10} fill={C.grey} />
      <Line x1={31} y1={-22} x2={31} y2={-10} color={C.greyDark} width={0.6} />
      <Accommodation x={-22} w={44} />
      <Box x={-5} y={-78} w={10} h={14} fill={C.white} />
      <Box x={-6} y={-80} w={12} h={2} fill={C.roof} />
      <Line x1={0} y1={-80} x2={0} y2={-92} color={C.line} width={0.5} />
      <Line x1={-3} y1={-88} x2={3} y2={-88} color={C.line} width={0.4} />
      {[-29, 24].map((x) => <Box key={x} x={x} y={-44} w={5} h={3} rx={1.5} fill={C.orange} />)}
      <Box x={-16} y={-66} w={32} h={2} fill={C.heli} />
      <Line x1={-14} y1={-64} x2={-8} y2={-36} color={C.greyDark} width={0.8} />
      <Line x1={14} y1={-64} x2={8} y2={-36} color={C.greyDark} width={0.8} />
      <Waterline from={-45} to={45} />
      <Origin />
      <Line x1={0} y1={0} x2={0} y2={-14} color="var(--ship-axis)" width={0.8} />
      <Line x1={0} y1={0} x2={-14} y2={0} color="var(--ship-axis)" width={0.8} />
      <Label x={1.5} y={-12} anchor="start" bold>Z</Label>
      <Label x={-17} y={1.5} bold>Y</Label>
      <Label x={-40} y={-36} size={3.6} anchor="start">PORT</Label>
      <Label x={44} y={-36} size={3.6} anchor="end">STBD</Label>
      <Line x1={-29} y1={7} x2={29} y2={7} color="var(--ink)" width={0.3} />
      <Label x={0} y={12} size={3.6}>≈ 58 m</Label>
    </g>
  );
}

export function SectionView({ uid }) {
  return (
    <g>
      <PaintedHull id={`${uid}-section`} points={TRANSVERSE_HULL} width={80} from={-40} deckY={-33.6} />
      <Shape points={TANK_LINE} fill="var(--card)" />
      <Line x1={0} y1={-2.2} x2={0} y2={-30} color={C.greyDark} width={0.4} dash="1.5 1" />
      <Label x={-13} y={-16} size={3.2}>Cargo tank P</Label>
      <Label x={13} y={-16} size={3.2}>Cargo tank S</Label>
      <Box x={-29} y={-33.6} w={58} h={1.6} fill={C.deck} />
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
      <Box x={29} y={-33} w={5} h={11} fill={C.grey} />
      <Line x1={31.5} y1={-22} x2={31.5} y2={-8} color={C.greyDark} width={0.6} />
      <Waterline from={-45} to={45} />
      <Label x={44} y={-21} size={3.2} anchor="end">WL</Label>
      <Origin />
      <Line x1={-29} y1={6} x2={29} y2={6} color="var(--ink)" width={0.3} />
      <Label x={0} y={11} size={3.6}>≈ 58 m</Label>
      <Line x1={-34} y1={0} x2={-34} y2={-32} color="var(--ink)" width={0.3} />
      <Label x={-36} y={-16} size={3.6} anchor="end">≈ 32 m</Label>
      <Label x={-40} y={-56} size={3.6} anchor="start">PORT</Label>
      <Label x={44} y={-56} size={3.6} anchor="end">STBD, riser balcony</Label>
    </g>
  );
}
