import { useId } from "react";
import "./Field.css";

export default function Field({ id, label, optional = false, hint, error, numeric = false, as = "input", className = "", children, ...rest }) {
  const auto = useId();
  const fieldId = id ?? auto;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const cls = ["field__control", numeric && "is-num", error && "is-invalid"].filter(Boolean).join(" ");
  const Control = as;
  const control = (
    <Control
      id={fieldId}
      className={cls}
      inputMode={numeric ? "decimal" : undefined}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      {...rest}
    >
      {children}
    </Control>
  );

  return (
    <div className={`field ${className}`.trim()}>
      <label htmlFor={fieldId}>
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {as === "select" ? <span className="field__select">{control}</span> : control}
      {error && <span id={errorId} className="field__error">{error}</span>}
      {hint && <span id={hintId} className="muted">{hint}</span>}
    </div>
  );
}
