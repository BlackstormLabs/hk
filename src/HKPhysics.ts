import { yOfLine } from "./lib/GameHelpers";

export default class Physics {
  constructor() {}

  KITTY_SCALE = 1.4;
  KITTY_POINTS: {} = [
    { x: -24 * this.KITTY_SCALE, y: -20 * this.KITTY_SCALE },
    { x: 24 * this.KITTY_SCALE, y: -20 * this.KITTY_SCALE },
    { x: 19 * this.KITTY_SCALE, y: 20 * this.KITTY_SCALE },
    { x: -19 * this.KITTY_SCALE, y: 20 * this.KITTY_SCALE },
  ];
  TRIANGLE_POINTS = [
    { x: 0 - 23.37, y: 0 - 40.32 },
    { x: 69.93 - 23.37, y: 40.32 - 40.32 },
    { x: 0 - 23.37, y: 80.64 - 40.32 }
  ];
  SQUARE_POINTS = [
    { x: -28.8, y: 28.8 },
    { x: 28.8, y: -28.8 },
    { x: 28.8, y: 28.8 },
    { x: -28.8, y: -28.8 }
  ];
}
