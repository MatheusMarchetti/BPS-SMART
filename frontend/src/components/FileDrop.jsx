import { useRef, useState } from "react";
import Button from "./Button.jsx";
import "./FileDrop.css";

export default function FileDrop({ accept, disabled, busy, invalid, onFiles }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const formats = accept ? accept.split(",").join(", ") : "";

  return (
    <div
      className={`drop ${dragging ? "is-dragging" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) onFiles(e.dataTransfer.files); }}
    >
      <svg className="drop__icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
        <path d="M14 3v5h5" />
        <path d="M12 17v-6" />
        <path d="M9.5 13.5L12 11l2.5 2.5" />
      </svg>
      <div className="drop__text">
        <p className="drop__title">Drag the RAO files here or select them</p>
        {formats && <p id="drop-formats" className="muted">Accepted format: {formats}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept || undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
      />
      <Button
        id="rao-select"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={formats ? "drop-formats" : undefined}
        onClick={() => inputRef.current.click()}
      >
        {busy ? "Reading files…" : "Select files"}
      </Button>
    </div>
  );
}
