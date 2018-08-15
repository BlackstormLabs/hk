/**
 * PachinkoCollider.ts
 */

import ImageView from '../frontend/devkit-core/timestep/src/ui/ImageView';
import { sqrt } from './lib/MathHelpers';

export enum ColliderType {
  Pin, LineSegment, PoweredBumper
}

export default class PachinkoCollider {
  public type: ColliderType;
  //position
  public x0: number;           //all
  public y0: number;           //all
  public x1: number;           //LineSegment
  public y1: number;           //LineSegment
  //unit vector
  public unitX: number;        //LineSegment
  public unitY: number;        //LineSegment
  public lenSquared: number;   //LineSegment
  //coefficient of restitution
  public cor: number;          //all
  //radius
  private radius: number;       //Pin, PoweredBumper
  //trigger speed (into normal)
  private triggerSpeed: number; //PoweredBumper
  public countdown: number;     //PoweredBumper
  public colliderView: ImageView;

  initLineSegment(x0: number, y0: number, x1: number, y1: number, cor: number) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    this.lenSquared = dx * dx + dy * dy;
    const len = sqrt(this.lenSquared);
    this.unitX = dx / len;
    this.unitY = dy / len;
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this.cor = cor;
    this.type = ColliderType.LineSegment;
  }

  initPin(x0: number, y0: number, r: number, cor: number, v: ImageView) {
    this.x0 = x0;
    this.y0 = y0;
    this.radius = r;
    this.cor = cor;
    this.type = ColliderType.Pin;
    this.colliderView = v;
  }

  initPoweredBumper(x0: number, y0: number, radius: number, cor: number, triggerSpeed: number, v: ImageView) {
    this.x0 = x0;
    this.y0 = y0;
    this.radius = radius;
    this.cor = cor;
    this.triggerSpeed = triggerSpeed;
    this.countdown = 0;
    this.type = ColliderType.PoweredBumper;
    this.colliderView = v;
  }
}
