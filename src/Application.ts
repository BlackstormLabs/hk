/// <reference path='../frontend/@types/frontend.d.ts' />

// NOTE: webpackGameEntrypoint must go at top of file!
import webpackGameEntrypoint from 'frontend/devkit-core/src/clientapi/webpackGameEntrypoint';
import animate from 'frontend/devkit-core/timestep/src/animate';
import device from 'frontend/devkit-core/timestep/src/device';
import ImageView from 'frontend/devkit-core/timestep/src/ui/ImageView';
import View from 'frontend/devkit-core/timestep/src/ui/View';
import { max, lerp, sqrt, rollInt, random, TAU, between, sin, cos } from './lib/MathHelpers';
import { center, setValue } from './lib/GameHelpers';
import PachinkoBall from './PachinkoBall';
import Game from './Game';
import platform from 'frontend/devkit-fbinstant/js';

import {
  GAMEPLAY_HEIGHT,
  GAMEPLAY_WIDTH,
  NUM_BALLS,
  NUM_GUIDES,
  LAUNCH_X,
  LAUNCH_Y,
  LAUNCH_SPEED,
  BALLSCALE,
} from './Game';
import filter from "frontend/devkit-core/timestep/src/ui/filter";


// obstaclePosX
//
// A two dimensional array that has x positions for each obstacle in a line
// Even lines and odd lines

// gameLines
// There are 20 "lines", each of which has 5 or 6 objects in it which can be collided against
// Here is what the line data looks like:
// {
//   currentScreenY,
//   [],              // array of six objects, each: {objectType, rotation, hit points}
// }
// This is the game data. obstacles[line][object] is the two-dimensional array of ImageView
//   that corresponds to this data.

const paleBlueFilter = new filter.MultiplyFilter('#C4BFFF');
const yellowFilter = new filter.MultiplyFilter('#FF0');
const redFilter = new filter.MultiplyFilter('#F00');

const DIGITS_SCALE = .75;
const OBJECT_WIDTH = 80;
const LINE_HEIGHT = OBJECT_WIDTH / 2 * sqrt(3);
const IMAGE_SCALE = .225;
const TRIANGLE_SCALE = IMAGE_SCALE * 1.4;
const KITTY_SCALE = 1.2;
const TIGER_SCALE = 1.2;
const TRIANGLE_CENTER = 4 / 12 * sqrt(3);
const BALL_DIAMETER = 24;
const BALL_RADIUS = BALL_DIAMETER / 2;
const ObjectImages = [
  'resources/images/game/objects/square.png',
  'resources/images/game/objects/circle.png',
  'resources/images/game/objects/triangle.png',
  'resources/images/game/objects/kitty.png',
  'resources/images/game/objects/panda.png',
  'resources/images/game/objects/tiger.png'
];
const TRIANGLE_POINTS = [
  { x: 0 - 23.37, y: 0 - 40.32 },
  { x: 69.93 - 23.37, y: 40.32 - 40.32 },
  { x: 0 - 23.37, y: 80.64 - 40.32 }
];
const SQUARE_POINTS = [
  { x: 28.8, y: 28.8 },
  { x: 28.8, y: -28.8 },
  { x: -28.8, y: 28.8 },
  { x: -28.8, y: -28.8 }
];
/*
const TIGER_POINTS = [
  { x: 4.6, y: 96 },
  { x: 30, y: 54.8 },
  { x: 29, y: 22.9 },
  { x: 55.1, y: 2.5 },
  { x: 80.6, y: 2.9 },
  { x: 99.9, y: 23.2 },
  { x: 129.7, y: 19.6 },
  { x: 165.7, y: 23.7 },
  { x: 189.5, y: 1.6 },
  { x: 221.6, y: 9.23 },
  { x: 237.9, y: 38.5 },
  { x: 231.9, y: 59.76 },
  { x: 252.05, y: 94.12 },
  { x: 254.1, y: 130.0 },
  { x: 234.0, y: 181.0 },
  { x: 160.4, y: 221.9 },
  { x: 97.14, y: 222.63 },
  { x: 35.5, y: 194.9 },
  { x: 3.7, y: 135.0 }
];
*/

const KITTY_POINTS: {} = [
  { x: 28.8 * KITTY_SCALE, y: 20.36 * KITTY_SCALE },
  { x: 28.8 * KITTY_SCALE, y: -20.36 * KITTY_SCALE },
  { x: -28.8 * KITTY_SCALE, y: 20.36 * KITTY_SCALE },
  { x: -28.8 * KITTY_SCALE, y: -20.36 * KITTY_SCALE }
];
const PANDA_POINTS: {} = [
  { x: 28.8, y: 20.36 },
  { x: 28.8, y: -20.36 },
  { x: -28.8, y: 20.36 },
  { x: -28.8, y: -20.36 }
];
const TIGER_POINTS: {} = [
  { x: 28.8 * TIGER_SCALE, y: 20.36 * TIGER_SCALE },
  { x: 28.8 * TIGER_SCALE, y: -20.36 * TIGER_SCALE },
  { x: -28.8 * TIGER_SCALE, y: 20.36 * TIGER_SCALE },
  { x: -28.8 * TIGER_SCALE, y: -20.36 * TIGER_SCALE }
];




export default class Application extends View {
  private game: Game;
  private pb: PachinkoBall[];

  private lines: any[];

  private pointing_dx: number;
  private pointing_dy: number;

  private time: number;
  private inShot: boolean;

  private ballsShot: number;
  private timeSinceStart: number;

  private obstaclePosX: number[][];
  private header: ImageView;
  private header_arrow: ImageView;
  private playfield: ImageView;
  private guide: View[];
  private ball: ImageView[];

  // arrays of something
  private obstacles: any[];
  private shapeTypes: any[];
  private digits: any[];

  private collisionsThisFrame: boolean;

  private linefield: any

  private leftLine: ImageView;
  private rightLine: ImageView;

  private cloud: ImageView[];

  constructor(opts) {
    super(opts);

    this.game = new Game();

    this.shapeTypes = [];
    this.obstacles = [];

    this.pb = [];
    for (let i = 0; i < NUM_BALLS; i++) {
      this.pb[i] = new PachinkoBall();
      this.pb[i].setPosition(50, 50);
      this.pb[i].setVelocity(0, 0);
      this.pb[i].setPreCollision(true);
    }

    this.lines = [];

    this.pointing_dx = 0;
    this.pointing_dy = 1;

    this.time = 0;
    this.inShot = false;
    this.ballsShot = 0;

    this.timeSinceStart = 0;

    this.generateGameData();

    this._startGame();
    this.buildObstacleLines();

    device.screen.on('Resize', () => this._resize());
    this._resize();

    platform.startGameAsync();
  }

  generateGameData () {
    this.obstaclePosX = [];
    for (let line = 0; line <= 1; line++) {
      this.obstaclePosX[line] = [];
      for (let obj = 0; obj < 6; obj++) {
        this.obstaclePosX[line][obj] = 130 - OBJECT_WIDTH / 2 * (line & 1) + obj * OBJECT_WIDTH;
        //console.log(line, obj, this.obstaclePosX[line][obj]);
      }
    }
  }

  updateGuide (position) {
    const sourceX = LAUNCH_X;
    const sourceY = LAUNCH_Y;
    const pos = this.screenToPlayfield(position);
    pos.y = max(pos.y, LAUNCH_Y + 10);
    let dx = pos.x - sourceX;
    let dy = pos.y - sourceY;
    let sumSquares = dx * dx + dy * dy;
    if (sumSquares > 0) {
      const d = 500 / sqrt(sumSquares);
      dx *= d;
      dy *= d;
      this.pointing_dx = dx * LAUNCH_SPEED;
      this.pointing_dy = dy * LAUNCH_SPEED;
      const angle = Math.atan2(dy, dx);
      this.header_arrow.style.r = angle - TAU / 4;

      for (let i = 0; i < NUM_GUIDES; i++) {
        this.guide[i].style.x = lerp(sourceX, sourceX + dx, i / NUM_GUIDES);
        this.guide[i].style.y = lerp(sourceY, sourceY + dy, i / NUM_GUIDES);
      }
    }
  }

  screenToPlayfield (p) {
    return {
      x: (p.x - this.playfield.style.offsetX) / this.playfield.style.scale,
      y: (p.y - this.playfield.style.offsetY) / this.playfield.style.scale
    }
  }

  onInputStart (event, position) {
    if (!this.inShot) {
      this.updateGuide(position);
      for (let i = 0; i < NUM_GUIDES; i++) {
        this.guide[i].style.visible = true;
      }
    }
  }

  onInputSelect (event, position) {
    if (!this.inShot) {
      for (let i = 0; i < NUM_GUIDES; i++) {
        this.guide[i].style.visible = false;
      }
      this.inShot = true;
      this.ballsShot = 10;
      for (let i = 0; i < this.ballsShot; i++) {
        this.pb[i].setPreCollision(true);
        this.pb[i].setDelay(i * 150);
        this.pb[i].setPosition(LAUNCH_X, LAUNCH_Y);
        this.pb[i].setVelocity(this.pointing_dx, this.pointing_dy);
      }
    }
  }

  onInputMove (event, position) {
    if (!this.inShot) {
      this.updateGuide(position);
      for (let i = 0; i < NUM_GUIDES; i++) {
        this.guide[i].style.visible = true;
      }
    }
  }

  _resize () {
    const screen = device.screen;
    const screenWidth = screen.width;
    const screenHeight = screen.height;
    const GAMEPLAY_ASPECT = GAMEPLAY_HEIGHT / GAMEPLAY_WIDTH;
    const SCREEN_ASPECT = screenHeight / screenWidth;

    this.style.width = screenWidth;
    this.style.height = screenHeight;

    if (this.playfield) {
      if (GAMEPLAY_ASPECT > SCREEN_ASPECT) {
        const mult = screenHeight / GAMEPLAY_HEIGHT;
        this.playfield.style.scale = mult;
        this.playfield.style.offsetX = (screenWidth - (GAMEPLAY_WIDTH * mult)) / 2;
        this.playfield.style.offsetY = 0;

      } else {
        const mult = screenWidth / GAMEPLAY_WIDTH;
        this.playfield.style.scale = mult;
        this.playfield.style.offsetX = 0;
        this.playfield.style.offsetY = (screenHeight - (GAMEPLAY_HEIGHT * mult)) / 2;
      }
    }

    //console.log(screenWidth, screenHeight);
  }

  _tick (dt) {
    this.game.tick(dt);
    this.timeSinceStart += dt;

    const cloudSpeed = [.01, .005, .003];
    for (let i = 0; i < 3; i++) {
      let x = this.cloud[i].style.x;
      x += cloudSpeed[i] * dt;
      if (x > 600) {
        x = - 300;
      }
      this.cloud[i].style.x = x;
    }

    if (this.inShot) {
      // if I need to fire any balls, do it
      for (let i = 0; i < dt; i++) {
        for (let ball = 0; ball < this.ballsShot; ball++) {
          const d = this.pb[ball].getDelay();
          if (d > 0) {
            this.pb[ball].setDelay(d - 1);
          }

          if (d === 0) {
            this.ball[ball].style.visible = true;
            this.pb[ball].setGravityActive(!this.pb[ball].preCollision);

            const d = this.pb[ball].getPositionAndVelocity();
            const n = { x: d.x + d.dx, y: d.y + d.dy };

            //left and right walls
            if ((n.x < 20) || (n.x > GAMEPLAY_WIDTH - 20)) {
              this.pb[ball].setVelocity(-d.dx * .6, d.dy * .8);
              this.pb[ball].preCollision = false;
            }

            //ceiling
            if (n.y < 110 && d.dy < 0) {
              this.pb[ball].setVelocity(d.dx * .8, -d.dy * .6);
              this.pb[ball].preCollision = false;
            }

            //objects
            let collisionsThisFrame = false;
            for (let line = 0; line < 20; line++) {
              if (this.roughCheckCollision(n.x, n.y, line) && this.yOfLine(line) < 1010) {
                for (let i = 0; i < 6; i++) {
                  const ob = this.obstacles[line][i].style;
                  if (ob.visible) {
                    const type = this.shapeTypes[line][i];
                    switch (type) {
                      case 0: //square
                      case 2: //triangle
                      case 3: //kitty
                      case 4: //panda
                      case 5: //tiger
                        if (this.circumscribedCircleCheck(n.x, n.y, line, i)) {
                          const p = this.findCollisionPoint(n.x, n.y, line, i);
                          const dx = p.x - n.x;
                          const dy = p.y - n.y;
                          const sumSquares = dx * dx + dy * dy;
                          if (sumSquares < BALL_RADIUS * BALL_RADIUS) {
                            this.obstacles[line][i].value--;
                            animate(this.obstacles[line][i])
                              .now({ scale: .95 }, 50, animate.easeInOutSine)
                              .then({ scale: 1.0 }, 50, animate.easeInOutSine)
                            setValue(this.digits[line][i], this.obstacles[line][i].value, DIGITS_SCALE);
                            if (!this.obstacles[line][i].value) {
                              ob.visible = false;
                            }
                            const t = this.ballVsPoint(n.x, n.y, d.dx, d.dy, p.x, p.y, .8);
                            this.pb[ball].setVelocity(t.dx, t.dy);
                            this.pb[ball].preCollision = false;
                            this.collisionsThisFrame = true;
                          }
                        }
                        break;
                      case 1: //circle
                        {
                          const a = this.circumscribedCircleCheck(d.x, d.y, line, i);
                          const b = this.circumscribedCircleCheck(n.x, n.y, line, i);

                          if (a || b) {
                            this.obstacles[line][i].value--;
                            animate(this.obstacles[line][i])
                              .now({ scale: .95 }, 50, animate.easeInOutSine)
                              .then({ scale: 1.0 }, 50, animate.easeInOutSine)
                            setValue(this.digits[line][i], this.obstacles[line][i].value, DIGITS_SCALE);
                            if (!this.obstacles[line][i].value) {
                              ob.visible = false;
                            }
                          }

                          if (!a && b) {
                            const dx = ob.x - n.x;
                            const dy = ob.y + this.yOfLine(line) - n.y;
                            const len = sqrt(dx * dx + dy * dy);
                            const px = dx / len * BALL_RADIUS + n.x;
                            const py = dy / len * BALL_RADIUS + n.y;

                            const t = this.ballVsPoint(n.x, n.y, d.dx, d.dy, px, py, .8);
                            this.pb[ball].setVelocity(t.dx, t.dy);
                            this.pb[ball].preCollision = false;
                            this.collisionsThisFrame = true;
                          }
                        }
                        break;
                      default:
                        break;
                    }
                  }
                }
              }
            }

            if (!collisionsThisFrame) {
              this.pb[ball].updatePosition();
            } else {
              this.pb[ball].setGravityActive(false);
              this.pb[ball].updatePosition();
              this.pb[ball].setGravityActive(true);
            }
          }
        }
      }

      let active = false;
      for (let ball = 0; ball < this.ballsShot; ball++) {
        //update graphics
        const x = this.pb[ball].getX();
        const y = this.pb[ball].getY();
        this.ball[ball].style.x = x;
        this.ball[ball].style.y = y;
        if (y < 1024) {
          active = true;
        }
      }

      if (!active) {
        for (let ball = 0; ball < this.ballsShot; ball++) {
          this.ball[ball].style.visible = false;
        }
        this.inShot = false;
        //console.log("calling moveLinesUp");
        this.moveLinesUp();
      }
    }
  }


  // returns yMin
  yOfLine (line) {
    return this.linefield[line].style.y;
  }

  closestTwo (x, y, p) {
    let small = [Number.MAX_VALUE, 0, 0];
    let smallest = [Number.MAX_VALUE, 0, 0];
    for (let i = 0; i < p.length; i++) {
      const px = p[i].x;
      const py = p[i].y;
      const dx = x - px;
      const dy = y - py;
      const d = dx * dx + dy * dy;
      if (d < smallest[0]) {
        small = smallest;
        smallest = [d, px, py];
      } else if (d < small[0]) {
        small = [d, px, py];
      }
    }
    return { p0: { x: smallest[1], y: smallest[2] }, p1: { x: small[1], y: small[2] } };
  }


  // binary search to find closest point
  interpolateClosestOfPair (x, y, p0, p1) {
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

  //to do: at some point, should init the corners based
  //  on the rotation of the objects. avoid the trig
  // USES TRIANGLE_POINTS and SQUARE_POINTS
  findCollisionPoint (ballX, ballY, line, obstacle) {
    const ob = this.obstacles[line][obstacle].style;
    //might need TAU - r. Needs test
    const s = sin(ob.r);
    const c = cos(ob.r);


    const type = this.shapeTypes[line][obstacle];
    const obstacleX = this.obstacles[line][obstacle].style.x;
    const obstacleY = this.obstacles[line][obstacle].style.y + this.yOfLine(line);

    let rotatedPoints = [];
    let t, u;
    switch (type) {
      case 0: // square

        for (let i = 0; i < 4; i++) {
          const x = SQUARE_POINTS[i].x;
          const y = SQUARE_POINTS[i].y;
          rotatedPoints[i] = { x: x * c - y * s + obstacleX, y: y * c + x * s + obstacleY };
        }
        t = this.closestTwo(
          ballX, ballY,
          [rotatedPoints[0],
          rotatedPoints[1],
          rotatedPoints[2],
          rotatedPoints[3]]
        );
        u = this.interpolateClosestOfPair(ballX, ballY, t.p0, t.p1);
        return u;
      case 1: // circle
        break;
      case 2: // triangle
        for (let i = 0; i < 3; i++) {
          const x = TRIANGLE_POINTS[i].x;
          const y = TRIANGLE_POINTS[i].y;
          rotatedPoints[i] = { x: x * c - y * s + obstacleX, y: y * c + x * s + obstacleY };
        }
        t = this.closestTwo(
          ballX, ballY,
          [rotatedPoints[0],
          rotatedPoints[1],
          rotatedPoints[2]]
        );
        u = this.interpolateClosestOfPair(ballX, ballY, t.p0, t.p1);
        return u;
      case 3: // kitty
        for (let i = 0; i < 4; i++) {
          const x = KITTY_POINTS[i].x;
          const y = KITTY_POINTS[i].y;
          rotatedPoints[i] = { x: x * c - y * s + obstacleX, y: y * c + x * s + obstacleY };
        }
        t = this.closestTwo(
          ballX, ballY,
          [rotatedPoints[0],
          rotatedPoints[1],
          rotatedPoints[2],
          rotatedPoints[3]]
        );
        u = this.interpolateClosestOfPair(ballX, ballY, t.p0, t.p1);
        return u;
      case 4: // panda
        for (let i = 0; i < 4; i++) {
          const x = PANDA_POINTS[i].x;
          const y = PANDA_POINTS[i].y;
          rotatedPoints[i] = { x: x * c - y * s + obstacleX, y: y * c + x * s + obstacleY };
        }
        t = this.closestTwo(
          ballX, ballY,
          [rotatedPoints[0],
          rotatedPoints[1],
          rotatedPoints[2],
          rotatedPoints[3]]
        );
        u = this.interpolateClosestOfPair(ballX, ballY, t.p0, t.p1);
        return u;
      case 5: // tiger
        for (let i = 0; i < 4; i++) {
          const x = TIGER_POINTS[i].x;
          const y = TIGER_POINTS[i].y;
          rotatedPoints[i] = { x: x * c - y * s + obstacleX, y: y * c + x * s + obstacleY };
        }
        t = this.closestTwo(
          ballX, ballY,
          [rotatedPoints[0],
          rotatedPoints[1],
          rotatedPoints[2],
          rotatedPoints[3]]
        );
        u = this.interpolateClosestOfPair(ballX, ballY, t.p0, t.p1);
        return u;
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
  ballVsPoint (bx, by, vx, vy, px, py, cor) {
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

  circumscribedCircleCheck (x, y, line, obstacle) {
    const SLOP = 1.1;
    const ob = this.obstacles[line][obstacle].style;
    let sumOfRadii;
    let res = false;
    const dx = x - ob.x;
    const dy = y - (this.yOfLine(line) + ob.y);
    const sumOfSquares = dx * dx + dy * dy;
    const type = this.shapeTypes[line][obstacle];
    switch (type) {
      case 0: //square
        sumOfRadii = ((57.6 / 2) + BALL_RADIUS * sqrt(2)) * SLOP;
        res = sumOfSquares < sumOfRadii * sumOfRadii;
        break;
      case 1: //circle
        sumOfRadii = ((57.6 / 2) + BALL_RADIUS);
        res = sumOfSquares < sumOfRadii * sumOfRadii;

        //console.log(dx, dy, sumOfSquares, sumOfRadii * sumOfRadii);
        break;
      case 2: //triangle
        sumOfRadii = (80.64 * (1 - 1 / sqrt(3)) + BALL_RADIUS) * 1.2;
        res = sumOfSquares < sumOfRadii * sumOfRadii;
        break;
      case 3: //kitty
        sumOfRadii = ((57.6 / 2 * KITTY_SCALE) + BALL_RADIUS * sqrt(2)) * SLOP;
        res = sumOfSquares < sumOfRadii * sumOfRadii;
        break;
      case 4: //panda
        sumOfRadii = ((57.6 / 2) + BALL_RADIUS * sqrt(2)) * SLOP;
        res = sumOfSquares < sumOfRadii * sumOfRadii;
        break;
      case 5: //tiger
        sumOfRadii = ((57.6 / 2 * TIGER_SCALE) + BALL_RADIUS * sqrt(2)) * SLOP;
        res = sumOfSquares < sumOfRadii * sumOfRadii;
        break;
      default:
        console.log("Warning: Unrecognized shape " + type);
        break;
    }
    return res;
  }


  // possibly touching anything in this line?
  roughCheckCollision (x, y, line) {
    // first filter -- is the ball in the line's y range?
    const yMin = this.yOfLine(line) - 10; //slop for overlap
    const yMax = yMin + LINE_HEIGHT + 10; //slop for overlap
    //console.log(y, yMin, yMax);
    if (between(y, yMin - BALL_RADIUS, yMax + BALL_RADIUS)) {
      // second filter -- is the ball in the obstacle's x range?
      //console.log("Y_TOUCH");
      for (let obstacle = 0; obstacle < 6; obstacle++) {
        // is this obstacle visible?
        const ob = this.obstacles[line][obstacle].style;
        if (ob.visible) {
          // is the ball possibly touching it?
          const width = OBJECT_WIDTH * 1.2; // 1.2 for overlap
          const xMin = ob.x - (width + BALL_RADIUS);
          const xMax = ob.x + (width + BALL_RADIUS);
          if (between(x, xMin, xMax)) {
            //this.obstacles[line][obstacle].setFilter(paleBlueFilter);
            //at least one rough collision
            return true;
          }
        }
      }
    }
    return false;
  }

  moveLinesUp () {
    for (let i = 0; i < this.linefield.length; i++) {
      const y = this.linefield[i].style.y;
      animate(this.linefield[i])
        .wait(i * 15)
        .then({ y: y - LINE_HEIGHT }, 500, animate.easeInOutSine);
    }
  }

  resetFilterToYellow () {
    for (let line = 0; line < 20; line++) {
      for (let obstacle = 0; obstacle < 6; obstacle++) {
        this.obstacles[line][obstacle].setFilter(yellowFilter);
      }
    }
  }

  spinObjects (dt) {
    let angle = (this.timeSinceStart / 1000) | 0;
    angle %= 3;

    angle *= TAU / 3;
    for (let line = 0; line < 20; line++) {
      for (let object = 0; object < 6; object++) {
        this.obstacles[line][object].style.r = angle;
      }
    }
  }

  buildObstacleLines () {
    this.linefield = [];
    this.obstacles = [];
    this.digits = [];
    this.shapeTypes = [];
    let y = 800;
    let activeCount = 0;
    for (let line = 0; line < 20; line++) {
      this.shapeTypes[line] = [];
      this.linefield[line] = new ImageView({
        parent: this.playfield,
        x: 0,
        y: y,
        width: GAMEPLAY_WIDTH,
        height: LINE_HEIGHT,
      });
      y += LINE_HEIGHT;
      this.obstacles[line] = [];
      this.digits[line] = [];

      let x = 130 - OBJECT_WIDTH / 2 * (line & 1);
      const obstaclesInLine = 5 + (line & 1);
      for (let object = 0; object < 6; object++) {
        let active = object < obstaclesInLine && random() > .5;
        let type = rollInt(3, 5);

        //1/5 of the time, use 0 degrees rotation, else randomly choose a rotation that's
        // not too terribly far from 0
        let angle = (rollInt(0, 6) - 3) / 24 * TAU;
        if (random() < .2) {
          angle = 0;
        }

        this.obstacles[line][object] = new ImageView({
          parent: this.linefield[line],
          image: ObjectImages[type],
          x: x,
          y: LINE_HEIGHT / 2,
          autoSize: true,
          visible: active,
          r: angle
        });
        this.shapeTypes[line][object] = type;
        x += OBJECT_WIDTH;
        //this.obstacles[line][object].setFilter(yellowFilter);

        let scale = IMAGE_SCALE;
        if (type === 2) {
          scale = TRIANGLE_SCALE;
        }
        if (type === 3) {
          scale *= KITTY_SCALE;
        }
        if (type === 5) {
          scale *= TIGER_SCALE;
        }
        center(this.obstacles[line][object], scale);
        //triangles are different
        if (type === 2) {
          const t = 23.37; // WHY? this.obstacles[line][object].style.width * TRIANGLE_CENTER;
          this.obstacles[line][object].style.offsetX = -t;
          this.obstacles[line][object].style.anchorX = t;
        }

        this.digits[line][object] = [];
        for (let j = 0; j < 3; j++) {
          this.digits[line][object][j] = new ImageView({
            parent: this.linefield[line],
            x: this.obstacles[line][object].style.x + j * 15 - 15 + 25,
            y: this.obstacles[line][object].style.y + 25,
            autoSize: true,
            visible: active,
          });
        }
        if (active) {
          const value = rollInt(1, 45);
          setValue(this.digits[line][object], value, DIGITS_SCALE);
          this.obstacles[line][object].value = value;
          activeCount++;
        }

      }
    }
  }




  _startGame () {
    this.playfield = new ImageView({
      parent: this,
      image: 'resources/images/game/background/background.png',
      x: 0,
      y: 0,
      width: GAMEPLAY_WIDTH,
      height: GAMEPLAY_HEIGHT,
      //backgroundColor: '#242551'
      clip: true,
    });

    const cloudImages = [
      'resources/images/game/objects/cloud_01.png',
      'resources/images/game/objects/cloud_02.png',
      'resources/images/game/objects/cloud_03.png'
    ];
    const cloudY = [
      500, 300, 225
    ]

    this.cloud = [];
    for (let i = 0; i < 3; i++) {
      this.cloud[i] = new ImageView({
        parent: this.playfield,
        image: cloudImages[i],
        autoSize: true,
        x: rollInt(0, 500),
        y: cloudY[i],
        clip: true,
      })
    }

    this.ball = [];
    const d = BALL_DIAMETER * 1.3;
    for (let i = 0; i < NUM_BALLS; i++) {
      this.ball[i] = new ImageView({
        parent: this.playfield,
        image: 'resources/images/game/objects/heart.png',
        x: 0,
        y: 0,
        width: d,
        height: d,
        offsetX: -d / 2,
        offsetY: -d / 2,
        anchorX: d / 2,
        anchorY: d / 2,
        visible: false,
      });
    }

    this.guide = [];
    const scale = .05
    for (let i = 0; i < NUM_GUIDES; i++) {
      this.guide[i] = new ImageView({
        parent: this.playfield,
        image: 'resources/images/game/objects/arrow_dot.png',
        x: 0,
        y: 0,
        width: 256 * scale,
        height: 256 * scale,
        offsetX: -256 / 2 * scale,
        offsetY: -256 / 2 * scale,
        visible: false,
      });
    }

    this.leftLine = new ImageView({
      parent: this.playfield,
      image: 'resources/images/game/objects/solid_white.png',
      x: 0,
      y: 0,
      width: 4,
      height: 1024,
    });

    this.rightLine = new ImageView({
      parent: this.playfield,
      image: 'resources/images/game/objects/solid_white.png',
      x: 576 - 4,
      y: 0,
      width: 4,
      height: 1024,
    });

    this.header_arrow = new ImageView({
      parent: this.playfield,
      image: 'resources/images/game/objects/header_arrow.png',
      x: 576 / 2,
      y: 50,
      width: 96,
      height: 144,
      anchorX: 96 / 2,
      anchorY: -10,
      offsetX: -96 / 2,
      offsetY: 10
    });

    this.header = new ImageView({
      parent: this.playfield,
      image: 'resources/images/game/objects/header_sanrio.png',
      x: 576 / 2,
      y: 50,
      width: 123,
      height: 123,
      centerAnchor: true,
      centerOnOrigin: true
    });

    // sorry for the annoying music
    // sounds.playSong('mainmenu');
  }
}

webpackGameEntrypoint(Application);
