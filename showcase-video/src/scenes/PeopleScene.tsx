import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { BrowserFrame } from "../components/BrowserFrame";
import { SceneText } from "../components/SceneText";

const enter = Easing.bezier(0.16, 1, 0.3, 1);

/** Employees and Cash Advance side by side, sliding up with a slight stagger. */
export const PeopleScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <BrandBackground light />
      <div style={{ position: "absolute", left: 120, top: 80 }}>
        <SceneText eyebrow="People & loans" title="Employees and cash advances" width={1500} />
      </div>

      <div style={{ position: "absolute", left: 90, top: 330, perspective: 2600 }}>
        <BrowserFrame
          src="shots/employees.png"
          width={860}
          title="Employees"
          style={{
            rotate: interpolate(frame, [10, 50], ["y 12deg", "y 6deg"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: enter }),
            translate: interpolate(frame, [10, 50, 165], ["0px 220px", "0px 0px", "0px -16px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: enter,
            }),
            opacity: interpolate(frame, [10, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        />
      </div>
      <div style={{ position: "absolute", left: 970, top: 330, perspective: 2600 }}>
        <BrowserFrame
          src="shots/cash-advance.png"
          width={860}
          title="Cash Advance"
          style={{
            rotate: interpolate(frame, [20, 60], ["y -12deg", "y -6deg"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: enter }),
            translate: interpolate(frame, [20, 60, 165], ["0px 220px", "0px 0px", "0px -16px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: enter,
            }),
            opacity: interpolate(frame, [20, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
