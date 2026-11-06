import Button from "./Button.jsx";

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  return (
    <Button variant="outline" onClick={onToggle}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4.75" fill="currentColor" />
            <path d="M12.00 4.25L12.00 1.75M17.48 6.52L19.25 4.75M19.75 12.00L22.25 12.00M17.48 17.48L19.25 19.25M12.00 19.75L12.00 22.25M6.52 17.48L4.75 19.25M4.25 12.00L1.75 12.00M6.52 6.52L4.75 4.75" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
      {isDark ? "Light mode" : "Dark mode"}
    </Button>
  );
}
