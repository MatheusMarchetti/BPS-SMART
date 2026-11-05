import { Link } from "react-router-dom";
import "./Button.css";

export default function Button({ variant = "primary", to, className = "", children, ...rest }) {
  const cls = `btn btn--${variant} ${className}`.trim();
  if (to) {
    return <Link className={cls} to={to} {...rest}>{children}</Link>;
  }
  return <button type="button" className={cls} {...rest}>{children}</button>;
}
