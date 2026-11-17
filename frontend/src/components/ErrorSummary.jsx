import { useEffect, useRef } from "react";
import Alert from "./Alert.jsx";

export default function ErrorSummary({ errors, focusKey }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
  }, [focusKey]);

  if (!errors.length) return null;
  const title = errors.length === 1 ? "Fix 1 field to continue" : `Fix ${errors.length} fields to continue`;
  return (
    <div ref={ref} tabIndex={-1} className="error-summary">
      <Alert type="error" title={title}>
        <ul>
          {errors.map((e) => <li key={e.field}><a href={`#${e.field}`}>{e.text}</a></li>)}
        </ul>
      </Alert>
    </div>
  );
}
