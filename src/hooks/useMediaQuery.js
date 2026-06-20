import { useState, useEffect } from "react";

/**
 * SSR-safe media query hook.
 * @param {string} query - CSS media query string, e.g. "(max-width: 1023px)"
 * @returns {boolean} whether the query currently matches
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/**
 * Convenience hook — true when viewport is below the lg breakpoint (1024px).
 * @returns {boolean}
 */
export function useIsMobile() {
  return useMediaQuery("(max-width: 1023px)");
}
