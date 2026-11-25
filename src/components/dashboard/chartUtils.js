export const formatPHP = (value, opts = {}) =>
  Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    ...opts,
  });

export const formatPHPCompact = (value) =>
  Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  });

/** CSS color token usable by Recharts (SVG fill/stroke accept CSS vars). */
export const chartColor = (n) => `hsl(var(--chart-${n}))`;
