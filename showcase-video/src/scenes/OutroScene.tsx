import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { fontFamily } from "../brand";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ fontFamily }}>
      <BrandBackground />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "0 160px", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
            translate: interpolate(frame, [0, 18], ["0px 30px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          }}
        >
          <div style={{ width: 150, height: 150, borderRadius: 36, background: "white", padding: 22, flexShrink: 0 }}>
            <Img src={staticFile("logo.png")} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ fontSize: 104, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2, color: "white", textTransform: "uppercase" }}>
            JP Management
            <br />
            Consultancy OPC
          </div>
        </div>
        <div
          style={{
            marginTop: 44,
            marginLeft: 190,
            display: "flex",
            alignItems: "center",
            gap: 22,
            fontSize: 54,
            fontStyle: "italic",
            color: "rgba(255,255,255,0.85)",
            opacity: interpolate(frame, [16, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
            translate: interpolate(frame, [16, 36], ["0px 24px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          }}
        >
          <span style={{ width: 56, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.85)" }} />
          We build your edge
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
