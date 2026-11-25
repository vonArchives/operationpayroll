import { Img, staticFile } from "remotion";
import { BRAND, fontFamily } from "../brand";

/**
 * Minimal browser window around a 16:10 screenshot (captured at 1600x1000 @2x).
 * Children render on top of the screenshot (e.g. highlight rings), in screenshot pixels.
 */
export const BrowserFrame: React.FC<{
  src: string;
  width: number;
  title?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ src, width, title = "JPMC Payroll", style, children }) => {
  const shotHeight = (width / 1600) * 1000;
  const barHeight = Math.round(width * 0.028);

  return (
    <div
      style={{
        width,
        borderRadius: 18,
        overflow: "hidden",
        background: "white",
        boxShadow: "0 2px 4px rgba(16,24,40,0.06), 0 40px 90px -20px rgba(30,54,130,0.45)",
        border: "1px solid rgba(30,54,130,0.10)",
        ...style,
      }}
    >
      <div
        style={{
          height: barHeight,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          background: "#eef1f6",
          borderBottom: "1px solid rgba(30,54,130,0.08)",
          fontFamily,
        }}
      >
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 13, height: 13, borderRadius: "50%", background: c }} />
        ))}
        <div
          style={{
            margin: "0 auto",
            padding: "6px 28px",
            borderRadius: 8,
            background: "white",
            color: BRAND.muted,
            fontSize: barHeight * 0.38,
            fontWeight: 500,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ position: "relative", width, height: shotHeight }}>
        <Img src={staticFile(src)} style={{ width, height: shotHeight, display: "block" }} />
        <div style={{ position: "absolute", inset: 0, scale: width / 1600, transformOrigin: "0 0", width: 1600, height: 1000 }}>
          {children}
        </div>
      </div>
    </div>
  );
};
