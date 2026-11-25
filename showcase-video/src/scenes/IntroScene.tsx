import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { fontFamily } from "../brand";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <BrandBackground />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div
          style={{
            width: 168,
            height: 168,
            borderRadius: 40,
            background: "white",
            padding: 26,
            boxShadow: "0 30px 80px -20px rgba(0,0,0,0.45)",
            scale: interpolate(frame, [0, 24], [0.6, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.spring({ damping: 14 }),
              output: "perceptual-scale",
            }),
            opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <Img src={staticFile("logo.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        <div
          style={{
            marginTop: 52,
            fontSize: 132,
            fontWeight: 700,
            letterSpacing: -3,
            color: "white",
            opacity: interpolate(frame, [12, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
            translate: interpolate(frame, [12, 32], ["0px 40px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          }}
        >
          JPMC Payroll
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 48,
            fontWeight: 500,
            color: "rgba(255,255,255,0.8)",
            opacity: interpolate(frame, [24, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
            translate: interpolate(frame, [24, 44], ["0px 30px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          }}
        >
          The new interface
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
