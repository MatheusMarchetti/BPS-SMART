import StepBar from "./StepBar.jsx";

export default function AnalysisBar({ unitName, steps, current, reached }) {
  return (
    <div className="analysis-bar">
      <div className="wrap analysis-bar__inner">
        <div className="analysis-bar__row">
          <div className="analysis-bar__name">
            <span className="muted">Analysis</span>
            <span className="analysis-bar__title">{unitName || "No unit selected"}</span>
          </div>
          <span className="muted">Files stay on this computer</span>
        </div>
        <StepBar steps={steps} current={current} reached={reached} />
      </div>
    </div>
  );
}
