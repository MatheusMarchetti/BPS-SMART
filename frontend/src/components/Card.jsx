import { useId } from "react";
import "./Card.css";

export default function Card({ title, meta, actions, as: Tag = "section", className = "", children }) {
  const titleId = useId();
  return (
    <Tag className={`card ${className}`.trim()} aria-labelledby={title ? titleId : undefined}>
      {(title || actions) && (
        <div className="card__head">
          <div className="card__title">
            {title && <h2 id={titleId} className="h2">{title}</h2>}
            {meta && <span className="muted">{meta}</span>}
          </div>
          {actions && <div className="actions">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}
