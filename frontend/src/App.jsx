import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import AnalysisBar from "./components/AnalysisBar.jsx";
import Footer from "./components/Footer.jsx";
import Header from "./components/Header.jsx";
import ConditionsPage from "./pages/ConditionsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import PointPage from "./pages/PointPage.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import UploadPage from "./pages/UploadPage.jsx";
import { AnalysisProvider, STEPS, useAnalysis } from "./state/AnalysisContext.jsx";

const THEME_KEY = "bps-smart-theme";

function initialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    return "light";
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function Layout() {
  const a = useAnalysis();
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const lastPath = useRef(pathname);
  const current = STEPS.findIndex((s) => s.path === pathname);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    window.scrollTo(0, 0);
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <>
      {current >= 0 && <AnalysisBar unitName={a.unit?.name} steps={STEPS} current={current} reached={a.reached} />}
      <main id="main" ref={mainRef} className="wrap main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/conditions" element={<ConditionsPage />} />
          <Route path="/point" element={<PointPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      return;
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <AnalysisProvider>
      <div className="app">
        <a className="skip" href="#main">Skip to main content</a>
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <Layout />
        <Footer />
      </div>
    </AnalysisProvider>
  );
}
