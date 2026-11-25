import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../brand";

/**
 * Navy-to-blue gradient with the logo's diagonal square motif, drifting slowly.
 * Used behind intro/outro and as the stage for screenshot scenes (light=true).
 */
export const BrandBackground: React.FC<{ light?: boolean }> = ({ light = false }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, -40]);

  if (light) {
    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 60% at 75% 0%, rgba(66,106,221,0.18), transparent 70%), ${BRAND.page}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -260,
            bottom: -320,
            width: 900,
            height: 900,
            borderRadius: 120,
            rotate: "45deg",
            border: "2px solid rgba(30,54,130,0.06)",
            translate: `0px ${drift}px`,
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navy} 45%, ${BRAND.blue} 100%)` }}>
      <div
        style={{
          position: "absolute",
          right: -200,
          top: -260,
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: "rgba(66,106,221,0.45)",
          filter: "blur(120px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -180,
          top: 160,
          width: 820,
          height: 820,
          rotate: "45deg",
          borderRadius: 110,
          border: "2px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
          translate: `0px ${drift}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 60,
          top: 380,
          width: 520,
          height: 520,
          rotate: "45deg",
          borderRadius: 80,
          border: "2px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(135deg, rgba(255,255,255,0.08), transparent)",
          translate: `0px ${drift * 1.6}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -140,
          bottom: -200,
          width: 600,
          height: 600,
          rotate: "45deg",
          borderRadius: 90,
          border: "2px solid rgba(255,255,255,0.07)",
          translate: `0px ${-drift}px`,
        }}
      />
    </AbsoluteFill>
  );
};
