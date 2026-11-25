import { Easing, interpolate, useCurrentFrame } from "remotion";
import { BRAND, fontFamily } from "../brand";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** Small caption pill that eases in at `from` and out at `to` (scene frames). */
export const FocusPill: React.FC<{ text: string; from: number; to: number; style?: React.CSSProperties }> = ({
  text,
  from,
  to,
  style,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "22px 34px",
        borderRadius: 999,
        background: BRAND.navy,
        color: "white",
        fontFamily,
        fontSize: 40,
        fontWeight: 600,
        boxShadow: "0 24px 60px -18px rgba(30,54,130,0.6)",
        opacity: interpolate(frame, [from, from + 14, to - 10, to], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        translate: interpolate(frame, [from, from + 14], ["0px 24px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease,
        }),
        ...style,
      }}
    >
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: BRAND.blueLight }} />
      {text}
    </div>
  );
};
