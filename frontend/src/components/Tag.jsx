import "./Tag.css";

const ICONS = {
  ok: <path d="M5 12l5 5 9-10" />,
  warn: <><path d="M12 7v6" /><path d="M12 17h.01" /></>,
  bad: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
};

export default function Tag({ type = "ok", children }) {
  return (
    <span className={`tag tag--${type}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        {ICONS[type]}
      </svg>
      {children}
    </span>
  );
}
