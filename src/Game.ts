import PachinkoBall from "./PachinkoBall";
import { sqrt } from "./lib/MathHelpers";
export const GAMEPLAY_WIDTH = 576;
export const GAMEPLAY_HEIGHT = 1024;
export const MAX_BALLS = 32;
export const NUM_GUIDES = 10;
export const LAUNCH_X = GAMEPLAY_WIDTH / 2;
export const LAUNCH_Y = 50;
export const LAUNCH_SPEED = 0.0035; // was 0.004
export const BALLSCALE = .15;
export const GRAVITY = 0.001;
export const DRAG = 0;
export const IMAGE_SCALE = .225;
export const TRIANGLE_SCALE = IMAGE_SCALE * 1.4;
export const TRIANGLE_CENTER = 4 / 12 * sqrt(3);
export const HIT_DELAY = 50;
export const MESSAGE_DURATION = 3000;
export const DIGITS_SCALE = .75;
export const OBJECT_WIDTH = 80;
export const LINE_HEIGHT = OBJECT_WIDTH / 2 * sqrt(3);
export const BALL_DIAMETER = 24;
export const BALL_RADIUS = BALL_DIAMETER / 2;

export default class Game {
  private inShot: boolean;
  private time: number;
  private ballsShot: number;
  private pb: PachinkoBall[];
  private ball: any;

  constructor() {
    this.time = 0;
  }

  public tick(dt: number) {
  }
}
