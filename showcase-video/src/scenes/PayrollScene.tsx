import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { BrowserFrame } from "../components/BrowserFrame";
import { FocusPill } from "../components/FocusPill";
import { SceneText } from "../components/SceneText";

const ease = Easing.bezier(0.65, 0, 0.35, 1);
const enter = Easing.bezier(0.16, 1, 0.3, 1);

export const PayrollScene: React.FC = () => {
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
        <SceneText eyebrow="Payroll Summary" title="Review both pay periods" body="Approve, edit and export from one table." />
      </div>

      <div
        style={{
          position: "absolute",
          left: interpolate(frame, [70, 115], [800, 210], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          top: 70,
          perspective: 2400,
          scale: interpolate(frame, [80, 125, 165], [1, 1.35, 1.38], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
          transformOrigin: interpolate(frame, [80, 125, 165], ["40% 30%", "30% 55%", "36% 55%"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          }),
        }}
      >
        <BrowserFrame
          src="shots/payroll.png"
          width={1500}
          style={{
            rotate: interpolate(frame, [0, 40, 70, 115], ["y -14deg", "y -8deg", "y -8deg", "y 0deg"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: enter,
            }),
            translate: interpolate(frame, [0, 40], ["260px 0px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: enter }),
            opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        />
      </div>

      <FocusPill text="Period 1, Period 2 and monthly views" from={120} to={165} style={{ left: 120, bottom: 90 }} />
    </AbsoluteFill>
  );
};
