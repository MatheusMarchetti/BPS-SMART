export default function PageHead({ title, lead, actions }) {
  return (
    <div className="page-head">
      <div className="page-head__text">
        <h1 className="h1">{title}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
