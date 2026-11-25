import { Composition, Folder } from "remotion";
import { FPS, HEIGHT, SCENES, TOTAL, WIDTH } from "./brand";
import { Showcase } from "./Showcase";
import { IntroScene } from "./scenes/IntroScene";
import { LoginScene } from "./scenes/LoginScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { PayrollScene } from "./scenes/PayrollScene";
import { PeopleScene } from "./scenes/PeopleScene";
import { OutroScene } from "./scenes/OutroScene";

const base = { fps: FPS, width: WIDTH, height: HEIGHT };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Showcase-Scenes">
        <Composition id="Intro" component={IntroScene} durationInFrames={SCENES.intro} {...base} />
        <Composition id="Login" component={LoginScene} durationInFrames={SCENES.login} {...base} />
        <Composition id="Dashboard" component={DashboardScene} durationInFrames={SCENES.dashboard} {...base} />
        <Composition id="Payroll" component={PayrollScene} durationInFrames={SCENES.payroll} {...base} />
        <Composition id="People" component={PeopleScene} durationInFrames={SCENES.people} {...base} />
        <Composition id="Outro" component={OutroScene} durationInFrames={SCENES.outro} {...base} />
      </Folder>
      <Composition id="Showcase" component={Showcase} durationInFrames={TOTAL} {...base} />
    </>
  );
};
