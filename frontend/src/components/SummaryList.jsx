export default function SummaryList({ items }) {
  return (
    <dl className="summary">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd className={item.tone === "bad" ? "summary__bad" : undefined}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
