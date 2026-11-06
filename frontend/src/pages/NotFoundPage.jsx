import Button from "../components/Button.jsx";

export default function NotFoundPage() {
  return (
    <div className="page-head">
      <h1 className="h1">Page not found</h1>
      <p className="lead">This page does not exist yet.</p>
      <div className="actions"><Button to="/">Go to the analysis</Button></div>
    </div>
  );
}
