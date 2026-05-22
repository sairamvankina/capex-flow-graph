import { useState, useEffect } from "react";

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("graph-dark-mode");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    localStorage.setItem("graph-dark-mode", String(dark));
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return [dark, setDark] as const;
}
