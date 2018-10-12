import { sqrt } from "./lib/MathHelpers";

export default class Physics {
  constructor() {
  }

  public closestTwo (x, y, p) {
    let small = [Number.MAX_VALUE, 0, 0];
    let smallest = [Number.MAX_VALUE, 0, 0];
    for (let i: number = 0; i < p.length; i++) {
      const px: number = p[i].x;
      const py: number = p[i].y;
      const dx: number = x - px;
      const dy: number = y - py;
      const d: number = dx * dx + dy * dy;
      if (d < smallest[0]) {
        small = smallest;
        smallest = [d, px, py];
      } else if (d < small[0]) {
        small = [d, px, py];
      }
    }
    return { p0: { x: smallest[1], y: smallest[2] }, p1: { x: small[1], y: small[2] } };
  }

  public closestOutlinePoint (x: number, y: number, p): number {
    let small: number = Number.MAX_VALUE;
    let index: number;
    for (let i: number = 0; i < p.length; i++) {
      const px: number = p[i].x;
      const py: number = p[i].y;
      const dx: number = x - px;
      const dy: number = y - py;
      const d: number = dx * dx + dy * dy;
      if (d < small) {
        small = d;
        index = i;
      }
    }
    return index;
  }

    // binary search to find closest point
    public interpolateClosestOfPair (x, y, p0, p1) {
      let ax = p0.x;
      let ay = p0.y;
      let bx = p1.x;
      let by = p1.y;
      let d0 = (ax - x) * (ax - x) + (ay - y) * (ay - y);
      let d1 = (bx - x) * (bx - x) + (by - y) * (by - y);
  
      for (let iter = 0; iter < 6; iter++) {
        const tx = (ax + bx) * .5
        const ty = (ay + by) * .5;
        if (d0 < d1) {
          bx = tx;
          by = ty;
        } else {
          ax = tx;
          ay = ty;
        }
        d0 = (ax - x) * (ax - x) + (ay - y) * (ay - y);
        d1 = (bx - x) * (bx - x) + (by - y) * (by - y);
      }
      if (d0 < d1) {
        return { x: ax, y: ay };
      } else {
        return { x: bx, y: by };
      }
    }

      /**
   * collide ball against a point and return new velocity
   *
   * @param bx ball x
   * @param by ball y
   * @param vx vel x
   * @param vy vel y
   * @param px point x
   * @param py point y
   * @param cor coefficient of restitution
   */
  public ballVsPoint (bx, by, vx, vy, px, py, cor) {
    let dx = px - bx;
    let dy = py - by;
    const mult = 1.0 / sqrt(dx * dx + dy * dy);
    dx *= mult;
    dy *= mult;
    const dot = (vx * dx + vy * dy) * cor;
    const dotx = dx * dot;
    const doty = dy * dot;

    const newDX = vx - dotx - dotx;
    const newDY = vy - doty - doty;

    return { dx: newDX, dy: newDY };
  }

  public findBouncePoint (x, y, p) {
    const index = this.closestOutlinePoint(x, y, p);

    // do the clockwise and counterclockwise adjacent points
    const a = this.interpolateClosestOfPair(x, y, p[index], p[(index + 1) % p.length]);
    const b = this.interpolateClosestOfPair(x, y, p[index], p[(index - 1 + p.length) % p.length]);

    if (a.x === p[index].x && a.y === p[index].y) {
      return b;
    } else {
      return a;
    }
  }
  

}
