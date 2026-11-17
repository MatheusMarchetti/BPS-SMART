import { useId, useRef, useState } from "react";
import ShipSvg, { VIEWS } from "./ShipSvg.jsx";
import "./ShipPreview.css";

const toNumber = (v) => (String(v).trim() === "" ? NaN : Number(String(v).trim().replace(",", ".")));

export default function ShipPreview({ point }) {
  const uid = useId().replace(/:/g, "");
  const tabRefs = useRef([]);
  const [active, setActive] = useState(0);

  const coords = { x: toNumber(point.x), y: toNumber(point.y), z: toNumber(point.z) };
  const hasPoint = Object.values(coords).every(Number.isFinite);
  const name = point.name.trim() || "Point";
  const summary = hasPoint
    ? `${name} at X ${coords.x} m, Y ${coords.y} m, Z ${coords.z} m.`
    : "Fill X, Y and Z to see the point on the ship.";

  function onKeyDown(event) {
    const last = VIEWS.length - 1;
    const next = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  const view = VIEWS[active];

  return (
    <div className="ship-preview">
      <h3 className="ship-preview__title" id={`${uid}-title`}>Ship preview</h3>

      <div role="tablist" aria-labelledby={`${uid}-title`} className="ship-preview__tabs" onKeyDown={onKeyDown}>
        {VIEWS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            role="tab"
            id={`${uid}-tab-${t.id}`}
            aria-selected={i === active}
            aria-controls={`${uid}-panel`}
            tabIndex={i === active ? 0 : -1}
            className="ship-preview__tab"
            onClick={() => setActive(i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${view.id}`} tabIndex={0} className="ship-preview__panel">
        <ShipSvg
          view={view}
          uid={uid}
          coords={hasPoint ? coords : null}
          name={name}
          className={`ship-preview__svg ship-preview__svg--${view.id}`}
          titleId={`${uid}-svg-title`}
          describedBy={`${uid}-summary`}
        />
      </div>

      <p id={`${uid}-summary`} className="muted ship-preview__note">{summary}</p>
    </div>
  );
}
