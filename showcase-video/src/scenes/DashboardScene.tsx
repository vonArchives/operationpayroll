import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { BrowserFrame } from "../components/BrowserFrame";
import { FocusPill } from "../components/FocusPill";
import { SceneText } from "../components/SceneText";

const ease = Easing.bezier(0.65, 0, 0.35, 1);
const enter = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * Intro text, then a camera move: zoom into the KPI row, glide down to the trend chart.
 */
export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <BrandBackground light />
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 340,
          opacity: interpolate(frame, [70, 88], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <SceneText
          eyebrow="Dashboard"
          title="Payroll at a glance"
          body="Payout, approvals and trends the moment you sign in."
        />
      </div>

      {/* Camera: scale + origin animate together */}
      <div
        style={{
          position: "absolute",
          left: interpolate(frame, [70, 110], [800, 210], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          top: 70,
          perspective: 2400,
          // Scale 1.4 keeps the full KPI row (then the chart row) inside the 1920px frame.
          scale: interpolate(frame, [80, 120, 240], [1, 1.4, 1.42], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
          transformOrigin: interpolate(frame, [80, 120, 150, 190], ["82% 28%", "82% 28%", "82% 28%", "82% 92%"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
        }}
      >
        <BrowserFrame
          src="shots/dashboard.png"
          width={1500}
          style={{
            rotate: interpolate(frame, [0, 40, 70, 110], ["y -14deg", "y -8deg", "y -8deg", "y 0deg"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: enter,
            }),
            translate: interpolate(frame, [0, 40], ["260px 0px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: enter }),
            opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        />
      </div>

      <FocusPill text="Net payout, approvals and pending at a glance" from={118} to={182} style={{ left: 120, bottom: 90 }} />
      <FocusPill text="Monthly payout trend and pay breakdown" from={188} to={240} style={{ left: 120, bottom: 90 }} />
    </AbsoluteFill>
  );
};
