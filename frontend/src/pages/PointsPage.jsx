import { useMemo, useState } from "react";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import Alert from "../components/Alert.jsx";
import DataTable, { CellInput } from "../components/DataTable.jsx";
import Ship3D from "../components/Ship3D.jsx";

const CONDITIONS = ["Full load", "Ballast", "Intermediate 1", "Intermediate 2", "Fully Loaded", "Transit"];
const PARAMETERS = ["LCG", "TCG", "KG"];
const AXES = ["x", "y", "z"];

const toNumber = (v) => (v.trim() === "" ? NaN : Number(v));

export default function PointsPage({ theme }) {
  const [points, setPoints] = useState([
    { key: 1, id: "P-01", description: "Crane pedestal, port side", x: "152.0", y: "18.5", z: "34.0" },
  ]);
  const [params, setParams] = useState(() =>
    Object.fromEntries(PARAMETERS.map((p) => [p, Object.fromEntries(CONDITIONS.map((c) => [c, ""]))])),
  );

  const updatePoint = (key, field, value) =>
    setPoints((list) => list.map((p) => (p.key === key ? { ...p, [field]: value } : p)));
  const addPoint = () =>
    setPoints((list) => {
      const key = Math.max(0, ...list.map((p) => p.key)) + 1;
      return [...list, { key, id: `P-${String(key).padStart(2, "0")}`, description: "", x: "", y: "", z: "" }];
    });
  const removePoint = (key) => setPoints((list) => list.filter((p) => p.key !== key));
  const updateParam = (param, cond, value) =>
    setParams((all) => ({ ...all, [param]: { ...all[param], [cond]: value } }));

  const errors = useMemo(() => points.flatMap((p) => [
    ...(p.id.trim() ? [] : [{ field: `pt-${p.key}-id`, text: "Enter an ID" }]),
    ...AXES.filter((a) => !Number.isFinite(toNumber(p[a])))
      .map((a) => ({ field: `pt-${p.key}-${a}`, text: `${p.id || "New point"}: enter a valid ${a.toUpperCase()} coordinate` })),
  ]), [points]);
  const noDescription = points.filter((p) => !p.description.trim()).length;
  const invalid = new Set(errors.map((e) => e.field));

  const shipPoints = useMemo(
    () => points.map((p) => ({ id: p.id || "?", x: toNumber(p.x), y: toNumber(p.y), z: toNumber(p.z) })),
    [points],
  );
  const valid = points.length - new Set(errors.map((e) => e.field.split("-")[1])).size;

  const pointColumns = [
    {
      key: "id", label: "ID", width: 96,
      render: (p) => <CellInput id={`pt-${p.key}-id`} label="Point ID" value={p.id} invalid={invalid.has(`pt-${p.key}-id`)} onChange={(v) => updatePoint(p.key, "id", v)} />,
    },
    {
      key: "description", label: "Description",
      render: (p) => <CellInput label={`${p.id} description`} value={p.description} warn={!p.description.trim()} onChange={(v) => updatePoint(p.key, "description", v)} />,
    },
    ...AXES.map((a) => ({
      key: a, label: `${a.toUpperCase()} (m)`, align: "right", width: 112,
      render: (p) => (
        <CellInput id={`pt-${p.key}-${a}`} numeric label={`${p.id} ${a.toUpperCase()} in metres`} value={p[a]} invalid={invalid.has(`pt-${p.key}-${a}`)} onChange={(v) => updatePoint(p.key, a, v)} />
      ),
    })),
    {
      key: "actions", label: "Actions", hidden: true, width: 104,
      render: (p) => <Button variant="outline" aria-label={`Delete ${p.id}`} onClick={() => removePoint(p.key)}>Delete</Button>,
    },
  ];

  const paramColumns = [
    { key: "param", label: "Parameter", render: (r) => `${r.param} (m)` },
    ...CONDITIONS.map((c) => ({
      key: c, label: c, align: "right",
      render: (r) => <CellInput numeric label={`${r.param} in metres, ${c}`} value={params[r.param][c]} onChange={(v) => updateParam(r.param, c, v)} />,
    })),
  ];

  return (
    <>
      <div className="page-head">
        <h1 className="h1">Define points</h1>
        <p className="lead">Enter the locations where you need design accelerations. Coordinates use the system confirmed in step 2, in metres. The 3D view updates as you type.</p>
      </div>

      {errors.length > 0 && (
        <Alert type="error" title="One or more fields needs attention before you continue">
          <ul>
            {errors.map((e) => <li key={e.field}><a href={`#${e.field}`}>{e.text}</a></li>)}
          </ul>
        </Alert>
      )}
      {noDescription > 0 && (
        <Alert type="warning" title={`${noDescription} point${noDescription > 1 ? "s have" : " has"} no description`}>
          <span>Descriptions are optional. You can calculate without them.</span>
        </Alert>
      )}

      <div className="split">
        <Card className="split-main" title="Calculation points" actions={<Button variant="outline" onClick={addPoint}>Add point</Button>}>
          <DataTable caption="Points to evaluate, editable" columns={pointColumns} rows={points} rowKey="key" />
        </Card>
        <Card as="aside" className="split-side" title="Ready to calculate">
          <p className="muted" style={{ margin: 0 }}>
            {valid} of {points.length} point{points.length === 1 ? "" : "s"} ready.
            {errors.length > 0 ? " Fix the fields above to include the others." : ""}
          </p>
          <Button to="/results">Calculate envelope</Button>
          <Button to="/conditions" variant="outline">Back to conditions</Button>
        </Card>
      </div>

      <Card title="Parameters per loading condition">
        <DataTable
          caption="LCG, TCG and KG per loading condition, editable"
          columns={paramColumns}
          rows={PARAMETERS.map((param) => ({ param }))}
          rowKey="param"
          rowHeader="param"
        />
      </Card>

      <Card title="3D view">
        <Ship3D theme={theme} points={shipPoints} highlight={points[0]?.id} />
      </Card>
    </>
  );
}
