export const GAMEPLAY_WIDTH = 576;
export const GAMEPLAY_HEIGHT = 1024;

export const NUM_BALLS = 32;
export const NUM_GUIDES = 10;

export const LAUNCH_X = GAMEPLAY_WIDTH / 2;
export const LAUNCH_Y = 50;

export const LAUNCH_SPEED = 0.004;
export const BALLSCALE = .15;

export const GRAVITY = 0.001;
export const DRAG = 0;

import PachinkoBall from "./PachinkoBall";

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
