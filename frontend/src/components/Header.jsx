import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";
import Logo from "./Logo.jsx";
import "./Header.css";

const LINKS = [
  { to: "/", label: "Acceleration envelope" },
];

export default function Header({ theme, onToggleTheme }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    const focusables = () => [...panel.querySelectorAll("a, button")];
    focusables()[0]?.focus();

    function onKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function onPointer(event) {
      if (!panel.contains(event.target) && !buttonRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const nav = (
    <ul className="hdr__links">
      {LINKS.map((l) => (
        <li key={l.to}>
          <NavLink end to={l.to} onClick={() => setOpen(false)}>{l.label}</NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <header className="hdr">
      <div className="wrap hdr__bar">
        <Link to="/" className="hdr__brand">
          <Logo theme={theme} />
          <span className="hdr__divider" aria-hidden="true" />
          <span className="hdr__name">
            <span className="hdr__title">BPS SMART</span>
            <span className="muted hdr__sub">Structural Motion & Acceleration Response Tool</span>
          </span>
        </Link>

        <div className="hdr__desktop">
          <nav aria-label="Main">{nav}</nav>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>

        <button
          ref={buttonRef}
          type="button"
          className="hdr__menu-btn"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          <span>{open ? "Close" : "Menu"}</span>
        </button>
      </div>

      <div className={`hdr__scrim ${open ? "is-open" : ""}`} aria-hidden="true" />
      <div
        id="mobile-menu"
        ref={panelRef}
        className={`hdr__panel ${open ? "is-open" : ""}`}
        hidden={!open}
      >
        <nav aria-label="Main">{nav}</nav>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
