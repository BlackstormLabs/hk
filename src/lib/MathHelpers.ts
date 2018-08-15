/**********************************************************************
 *
 * Math Helpers
 *
 * Only the good stuff from utils.js and other sources
 *
 **********************************************************************/

export const sin: Function = Math.sin;
export const cos: Function = Math.cos;
export const abs: Function = Math.abs;
export const round: Function = Math.round;
export const max: Function = Math.max;
export const min: Function = Math.min;
export const random: Function = Math.random;
export const sqrt: Function = Math.sqrt;
export const PI: number = Math.PI;
export const TAU: number = PI * 2;

export function lerp(v0: number, v1: number, t: number): number { return v0 + (v1 - v0) * t; }
export function between(n: number, low: number, high: number): boolean { return (n >= low && n <= high); }
export function rollFloat(min: number, max: number): number { return min + random() * (max - min); }
export function rollInt(min: number, max: number): number { return (min + random() * (1 + max - min) | 0); }
export function clamp(val, lowest, highest) { return min(max(val, lowest), highest); }
export function remapValueInRange(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
): number {
  return outputMin + (outputMax - outputMin) * (value - inputMin) / (inputMax - inputMin);
}

export function isEven(n): boolean {
  return !!(n & 1);
}
