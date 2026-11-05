import "./Alert.css";

const ICONS = {
  error: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v6" strokeLinecap="round" />
      <circle cx="12" cy="16.75" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  warning: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 3l9.5 17h-19z" strokeLinejoin="round" />
      <path d="M12 9.5v4.5" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
};

export default function Alert({ type = "error", title, children }) {
  return (
    <div className={`alert alert--${type}`} role={type === "error" ? "alert" : "status"}>
      {ICONS[type]}
      <div className="alert__body">
        <span className="alert__title">{title}</span>
        {children}
      </div>
    </div>
  );
}
