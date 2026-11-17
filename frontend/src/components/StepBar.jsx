import { Link } from "react-router-dom";
import "./StepBar.css";

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);

export default function StepBar({ steps, current, reached }) {
  return (
    <nav aria-label="Analysis steps">
      <ol className="steps">
        {steps.map((step, i) => {
          const state = i === current ? "current" : i < current && reached[i] ? "done" : "todo";
          const status = { current: "Current step", done: "Completed", todo: "Not started" }[state];
          const inner = (
            <>
              <span className="steps__num">{state === "done" ? <Check /> : i + 1}</span>
              <span className="steps__text">
                <span className="steps__label">{step.label}</span>
                <span className="muted steps__status">{status}</span>
              </span>
            </>
          );
          return (
            <li key={step.path} className={`steps__item is-${state}`}>
              {reached[i] ? (
                <Link className="steps__link" to={step.path} aria-current={state === "current" ? "step" : undefined}>{inner}</Link>
              ) : (
                <span className="steps__link" aria-disabled="true">{inner}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
