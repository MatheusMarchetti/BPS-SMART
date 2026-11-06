import "./DataTable.css";

export default function DataTable({ caption, columns, rows, rowKey = "id", rowHeader, stack = false }) {
  const role = (name) => (stack ? name : undefined);
  return (
    <div className="dt-scroll">
      <table className={stack ? "dt dt--stack" : "dt"} role={role("table")}>
        <caption className="sr-only">{caption}</caption>
        <thead role={role("rowgroup")}>
          <tr role={role("row")}>
            {columns.map((c) => (
              <th key={c.key} scope="col" role={role("columnheader")} className={c.align === "right" ? "is-right" : undefined} style={c.width ? { width: c.width } : undefined}>
                {c.hidden ? <span className="sr-only">{c.label}</span> : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody role={role("rowgroup")}>
          {rows.map((row) => (
            <tr key={row[rowKey]} role={role("row")}>
              {columns.map((c) => {
                const content = c.render ? c.render(row) : row[c.key];
                const cls = c.align === "right" ? "is-right" : undefined;
                return c.key === rowHeader
                  ? <th key={c.key} scope="row" role={role("rowheader")} className={cls}>{content}</th>
                  : <td key={c.key} role={role("cell")} data-label={c.label} className={cls}>{content}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CellInput({ label, value, onChange, numeric = false, invalid = false, warn = false, id }) {
  const cls = ["dt-input", numeric && "is-num", invalid && "is-invalid", warn && "is-warn"].filter(Boolean).join(" ");
  return (
    <input
      id={id}
      className={cls}
      aria-label={label}
      aria-invalid={invalid || undefined}
      inputMode={numeric ? "decimal" : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
