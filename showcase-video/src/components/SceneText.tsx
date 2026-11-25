import { Easing, interpolate, useCurrentFrame } from "remotion";
import { BRAND, fontFamily } from "../brand";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** Eyebrow + headline + supporting line, each easing in with a short stagger. */
export const SceneText: React.FC<{
  eyebrow: string;
  title: string;
  body?: string;
  dark?: boolean;
  delay?: number;
  width?: number;
}> = ({ eyebrow, title, body, dark = false, delay = 6, width = 600 }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ width, fontFamily }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: dark ? "rgba(255,255,255,0.8)" : BRAND.blue,
          opacity: interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          translate: interpolate(frame, [delay, delay + 18], ["0px 20px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
        }}
      >
        <span style={{ width: 40, height: 4, borderRadius: 2, background: dark ? "white" : BRAND.blue }} />
        {eyebrow}
      </div>
      <div
        style={{
          marginTop: 22,
          fontSize: 92,
          lineHeight: 1.04,
          fontWeight: 700,
          letterSpacing: -2,
          color: dark ? "white" : BRAND.navy,
          opacity: interpolate(frame, [delay + 5, delay + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          translate: interpolate(frame, [delay + 5, delay + 25], ["0px 30px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
        }}
      >
        {title}
      </div>
      {body && (
        <div
          style={{
            marginTop: 26,
            fontSize: 40,
            lineHeight: 1.35,
            fontWeight: 400,
            color: dark ? "rgba(255,255,255,0.75)" : BRAND.muted,
            opacity: interpolate(frame, [delay + 12, delay + 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
            translate: interpolate(frame, [delay + 12, delay + 32], ["0px 24px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
};
