import { NavLink } from "react-router-dom";
import "./Stepper.css";

export const STEPS = [
  { n: 1, path: "/", label: "Upload RAO files" },
  { n: 2, path: "/conditions", label: "Review conditions" },
  { n: 3, path: "/points", label: "Define points" },
  { n: 4, path: "/results", label: "Envelope results" },
];

export default function Stepper({ current }) {
  return (
    <nav aria-label="Analysis steps">
      <ol className="stepper">
        {STEPS.map((s) => {
          const state = s.n < current ? "done" : s.n === current ? "current" : "todo";
          const status = { done: "Completed", current: "Current step", todo: "Not started" }[state];
          return (
            <li key={s.n}>
              <NavLink
                end
                to={s.path}
                className={`step step--${state}`}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span className="step__num" aria-hidden="true">
                  {state === "done" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  ) : s.n}
                </span>
                <span className="step__text">
                  <span className="step__label"><span className="sr-only">Step {s.n}: </span>{s.label}</span>
                  <span className="muted">{status}</span>
                </span>
              </NavLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
