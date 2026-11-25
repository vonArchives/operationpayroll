import { loadFont } from "@remotion/google-fonts/DMSans";

// Same font and brand colors as the app (JPMC brand sheet: #1e3682 / #426add).
export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const BRAND = {
  navy: "#1e3682",
  blue: "#426add",
  blueLight: "#9db4f0",
  ink: "#0f172a",
  muted: "#64748b",
  page: "#f5f7fa",
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Scene lengths in frames; transitions overlap by TRANSITION frames. */
export const SCENES = {
  intro: 105,
  login: 120,
  dashboard: 240,
  payroll: 165,
  people: 165,
  outro: 135,
};
export const TRANSITION = 15;
export const TOTAL =
  Object.values(SCENES).reduce((a, b) => a + b, 0) - TRANSITION * (Object.keys(SCENES).length - 1);
