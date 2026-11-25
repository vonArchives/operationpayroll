import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { BrandBackground } from "../components/BrandBackground";
import { BrowserFrame } from "../components/BrowserFrame";
import { SceneText } from "../components/SceneText";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const LoginScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <BrandBackground light />
      <div style={{ position: "absolute", left: 120, top: 360 }}>
        <SceneText eyebrow="Sign in" title="Clean, on‑brand login" body="The JPMC identity, front and center." />
      </div>
      <div style={{ position: "absolute", left: 800, top: 70, perspective: 2400 }}>
        <BrowserFrame
          src="shots/login.png"
          width={1500}
          style={{
            rotate: interpolate(frame, [0, 40], ["y -14deg", "y -8deg"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
            translate: interpolate(frame, [0, 40], ["260px 0px", "0px 0px"], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }),
            opacity: interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            scale: interpolate(frame, [40, 120], [1, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            transformOrigin: "30% 50%",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
