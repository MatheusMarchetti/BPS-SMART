import { useId } from "react";

export default function Note({ title, children }) {
  const id = useId();
  return (
    <section className="note" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <p>{children}</p>
    </section>
  );
}
