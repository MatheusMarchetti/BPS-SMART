export default function SegmentedControl({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="seg">
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={`seg__opt ${value === o.value ? "is-on" : ""}`}>
          <input type="radio" name={name} className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
