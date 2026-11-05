import { useEffect, useState } from "react";
import { getVersion } from "../services/api.js";
import { USE_MOCK } from "../services/config.js";

export default function Footer() {
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion()
      .then((v) => setVersion(`v${v.version}`))
      .catch(() => setVersion(""));
  }, []);

  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap muted footer__inner">
        <p>
          © {year} · BPS SMART · {version}{USE_MOCK ? " (mock backend)" : ""}.
        </p>
        <p>
          SBM Offshore · Developed by:{" "}
          <a href="mailto:matheus.marchetti@ext.sbmoffshore.com">Matheus Marchetti</a> (Back-End) ·{" "}
          <a href="mailto:alessandrabrumcontato@gmail.com">Alessandra Brum</a> (Front-End &amp; UX)
        </p>


      </div>
    </footer>
  );
}
