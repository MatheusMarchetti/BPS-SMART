import logoLight from "../assets/SBM_OFFSHORE_LOGO.webp";
import logoDark from "../assets/SBM_OFFSHORE_LOGO_DARKMODE.webp";

export default function Logo({ theme }) {
  const src = theme === "dark" ? logoDark : logoLight;
  return <img className="hdr__logo" src={src} alt="SBM Offshore" width="75" height="40" />;
}
