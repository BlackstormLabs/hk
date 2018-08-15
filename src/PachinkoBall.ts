//todo grid the collisions for big speed boost

import PachinkoCollider from './PachinkoCollider';
import { rollFloat, sqrt } from './lib/MathHelpers';
import { GRAVITY, DRAG } from "./Game";
import View from 'frontend/devkit-core/timestep/src/ui/View';

export default class PachinkoBall extends View {
  private x: number;
  private y: number;
  private dx: number;
  private dy: number;
  private active: boolean;
  private freezeFrame: boolean;
  private gravityActive: boolean;
  public preCollision: boolean;
  private delay: number;

  constructor() {
    super({});

    this.freezeFrame = false;
    this.active = false;
    this.preCollision = true;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setVelocity(dx: number, dy: number): void {
    this.dx = dx;
    this.dy = dy;
  }

  freeze(): void {
    this.freezeFrame = true;
  }

  unfreeze(): void {
    this.freezeFrame = false;
  }

  getFreezeFlag(): boolean {
    return this.freezeFrame;
  }

  setActiveFlag(flag: boolean): void {
    this.active = flag;
  }

  getActiveFlag(): boolean {
    return this.active;
  }

  getPositionAndVelocity(): any {
    return { x: this.x, y: this.y, dx: this.dx, dy: this.dy };
  }

  setPositionAndVelocity(t: any): void {
    this.x = t.x;
    this.y = t.y;
    this.dx = t.dx;
    this.dy = t.dy;
  }

  incrementVelocity(x: number, y: number): void {
    this.dx += x;
    this.dy += y;
  }

  getX(): number {
    return this.x;
  }

  getY(): number {
    return this.y;
  }

  getDX(): number {
    return this.dx;
  }

  getDY(): number {
    return this.dy;
  }

  setDX(dx: number): void {
    this.dx = dx;
  }

  setDY(dy: number): void {
    this.dy = dy;
  }

  setGravityActive(active: boolean): void {
    this.gravityActive = active;
  }

  miniNudge() {
    this.incrementVelocity(rollFloat(-1e-7, 1e-7), 0);
  }

  setPreCollision(preCollision: boolean): void {
    this.preCollision = preCollision;
  }

  getPreCollision(): boolean {
    return this.preCollision;
  }

  setDelay(d: number): void {
    this.delay = d;
  }

  getDelay(): number {
    return this.delay;
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
  ballVsPoint(bx: number, by: number, vx: number, vy: number, px: number, py: number, cor: number) {
    let dx: number = px - bx;
    let dy: number = py - by;
    const mult: number = 1.0 / sqrt(dx * dx + dy * dy);
    dx *= mult;
    dy *= mult;
    const dot: number = (vx * dx + vy * dy) * cor;
    const dotx: number = dx * dot;
    const doty: number = dy * dot;
    this.dx = vx - dotx - dotx;
    this.dy = vy - doty - doty;
  }

  //optimized, but be careful. Maybe only for slow ball speeds
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
   * @param rrs ball reciprical radius squared
   */
  ballVsPointOptimized(bx: number, by: number, vx: number, vy: number, px: number, py: number, cor: number, rrs: number) {
    const ux: number = px - bx;
    const uy: number = py - by;
    const dot: number = (vx * ux + vy * uy) * cor * rrs;
    const dotx: number = ux * dot;
    const doty: number = uy * dot;
    this.dx = vx - dotx - dotx;
    this.dy = vy - doty - doty;
  }

  lineSegmentCollide(ls: PachinkoCollider): void {
    const x = this.x + this.dx;
    const y = this.y + this.dy;
    const ux = ls.unitX;
    const uy = ls.unitY;
    const dot = (x - ls.x0) * ux + (y - ls.y0) * uy;
    if (dot < 0) {
      //not colliding with segment, but maybe with point on the end of it
      const lx = ls.x0;
      const ly = ls.y0;
      const dx = x - lx;
      const dy = y - ly;
      if (dx * dx + dy * dy < 11 * 11) {
        this.ballVsPoint(x, y, this.dx, this.dy, lx, ly, ls.cor);
        this.freeze();
      }
    } else {
      const collisionX = ux * dot;
      const collisionY = uy * dot;
      const lenSquared = collisionX * collisionX + collisionY * collisionY;
      if (lenSquared > ls.lenSquared) {
        //not colliding with segment, but maybe with point on the end of it
        const lx = ls.x1;
        const ly = ls.y1;
        const dx = x - lx;
        const dy = y - ly;
        if (dx * dx + dy * dy < 11 * 11) {
          this.ballVsPoint(x, y, this.dx, this.dy, lx, ly, ls.cor);
          this.freeze();
        }
      } else {
        //possibly colliding with line segment
        const tx = ls.x0 + collisionX;
        const ty = ls.y0 + collisionY;
        const dx = x - tx;
        const dy = y - ty;
        if (dx * dx + dy * dy < 11 * 11) {
          this.ballVsPoint(x, y, this.dx, this.dy, tx, ty, ls.cor);
          this.freeze();
        }
      }
    }
  }

  boardTopCollide(): void {
    const d = 540 / 2;
    if (this.y + this.dy < d) { //collide only with the upper semicircle
      //collide only if going fast. This lets the ball drop from gravity if it has penetrated and going slowly
      if (this.dx * this.dx + this.dy * this.dy > .1) {
        //see if ball is about to penetrate the upper semi-circle
        const dx = d - (this.x + this.dx);
        const dy = d - (this.y + this.dy);
        if (dx * dx + dy * dy > (d - 11) * (d - 11)) {
          //calculate collision point
          const mult = d / (d - 11);
          this.ballVsPoint(this.x, this.y, this.dx, this.dy, d + dx * mult, d + dy * mult, 0.9);
        }
      }
    }
  }

  ballCollide(b: PachinkoBall) {
    //first predict next positions of balls
    const n_ax = this.x + this.dx;
    const n_ay = this.y + this.dy;
    const n_bx = b.x + b.dx;
    const n_by = b.y + b.dy;

    //check for collision about to happen this sub-tick
    const tx = n_ax - n_bx;
    const ty = n_ay - n_by;
    if (tx * tx + ty * ty <= 16 * 16) {
      //create unit connection vector
      let cx = b.x - this.x;
      let cy = b.y - this.y;
      const scaler = 1.0 / sqrt(cx * cx + cy * cy);
      cx *= scaler;
      cy *= scaler;

      //create unit delta velocity vector
      const vx = this.dx - b.dx;
      const vy = this.dy - b.dy;

      const dot = cx * vx + cy * vy;

      const transferX = cx * dot;
      const transferY = cy * dot;

      b.dx += transferX;
      b.dy += transferY;
      this.dx -= transferX;
      this.dy -= transferY;

      this.dx *= 0.98;
      this.dy *= 0.98;
      b.dx *= 0.98;
      b.dy *= 0.98;

      this.freeze();
      b.freeze();
    }
  }

  pinCollide(p: PachinkoCollider) {
    //  const bd = this.getPositionAndVelocity();
    const px = p.x0 - 12; //why this offset?
    const py = p.y0 - 12;
    //first predict next position of ball
    const n_ax = this.x + this.dx;
    const n_ay = this.y + this.dy;

    //check for collision about to happen this sub-tick
    const tx = n_ax - px;
    const ty = n_ay - py;

    if (tx * tx + ty * ty <= 11 * 11) { //why this size?
      this.ballVsPoint(this.x, this.y, this.dx, this.dy, px, py, 0.8);
      this.freeze();
    }
  }

  //todo don't use so many constants.
  //todo trigger should not just be speed. should dot into unit connection vector
  bumperCollide(p: PachinkoCollider): boolean {
    //  const bd = this.getPositionAndVelocity();
    let triggered = false;
    const px = p.x0 + 16;
    const py = p.y0 + 16;
    //first predict next position of ball
    const n_ax = this.x + this.dx;
    const n_ay = this.y + this.dy;

    //check for collision about to happen this sub-tick
    const tx = n_ax - px;
    const ty = n_ay - py;

    if (tx * tx + ty * ty <= 38 * 38) { //why this size?
      const d: number = 11 / sqrt(tx * tx + ty * ty);
      this.ballVsPoint(this.x, this.y, this.dx, this.dy, px - tx * d, py - ty * d, 0.7);
      if (p.countdown == 0) {
        if (this.dx * this.dx + this.dy * this.dy > 0.5) {
          this.dx += tx * 0.035;
          this.dy += ty * 0.035;
          triggered = true;
          p.countdown = 6;
        }
      }
      this.freeze();
    }
    return triggered;
  }

  ballPushout(b: PachinkoBall) {
    /*
    let bda = this._ballData[a];
    let bdb = this._ballData[b];
    let dx = bda.x - bdb.x;
    let dy = bda.y - bdb.y;
    let sumSquares = dx * dx + dy * dy;
    if (sumSquares < 20 * 20) {
      //shocking penetration
      let t = 1 / sumSquares;
      t *= 1;
      bda.dx += dx * t;
      bda.dy += dy * t;
      bdb.dx -= dx * t;
      bdb.dy -= dy * t;
      bda.dx *= 0.95;
      bda.dy *= 0.95;
      bdb.dx *= 0.95;
      bdb.dy *= 0.95;
    }
    */
  }

  /**
   *
   */
  updatePosition() {
    this.x += this.dx;
    this.y += this.dy;

    if (this.gravityActive) {
      //gravity
      this.dy += GRAVITY;
      //drag
      const d = 1 - DRAG;
      this.dx *= d;
      this.dy *= d;
    }
  }
}
