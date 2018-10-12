/// <reference path='../frontend/@types/frontend.d.ts' />

// NOTE: webpackGameEntrypoint must go at top of file!
import webpackGameEntrypoint from 'frontend/devkit-core/src/clientapi/webpackGameEntrypoint';
import animate from 'frontend/devkit-core/timestep/src/animate';
import device from 'frontend/devkit-core/timestep/src/device';
import ImageView from 'frontend/devkit-core/timestep/src/ui/ImageView';
import View from 'frontend/devkit-core/timestep/src/ui/View';
import { max, lerp, sqrt, rollInt, TAU, between, sin, cos, min, rollFloat } from './lib/MathHelpers';
import { center, setValue, drawScore, getLevelName, setMessage, updateClouds, screenToPlayfield, resize, yOfLine, drawNormal } from './lib/GameHelpers';
import PachinkoBall from './PachinkoBall';
import Game, { IMAGE_SCALE, TRIANGLE_SCALE, OBJECT_WIDTH, MESSAGE_DURATION, BALL_RADIUS, HIT_DELAY, LINE_HEIGHT, DIGITS_SCALE, BALL_DIAMETER } from './Game';
import platform from 'frontend/devkit-fbinstant/js';
import sounds from 'src/lib/sounds'
import BallPhysics from './BallPhysics'
import HKPhysics from './HKPhysics'

import {
  GAMEPLAY_HEIGHT,
  GAMEPLAY_WIDTH,
  MAX_BALLS,
  NUM_GUIDES,
  LAUNCH_X,
  LAUNCH_Y,
  LAUNCH_SPEED,
  BALLSCALE,
} from './Game';
import filter from "frontend/devkit-core/timestep/src/ui/filter";
import Levels from './Levels';

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

const SHOW_COLLISIONS = false;
const paleBlueFilter = new filter.MultiplyFilter('#C4BFFF');
const yellowFilter = new filter.MultiplyFilter('#FF0');
const redFilter = new filter.MultiplyFilter('#F00');
const whiteFilter = new filter.MultiplyFilter('#FFF');

const ObjectImages = [
  'resources/images/game/objects/square.png',
  'resources/images/game/objects/circle.png',
  'resources/images/game/objects/triangle.png',
  'resources/images/game/objects/kitty.png',
  'resources/images/game/objects/panda.png',
  'resources/images/game/objects/tiger.png'
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
  private obstacles: any[];
  private shapeTypes: any[];
  private digits: any[];
  private lastSoundPlayedTime: number;
  private collisionsThisFrame: boolean;
  private linefield: any
  private cloud: ImageView[];
  private physics: BallPhysics;
  private hkPhysics: HKPhysics;
  private bowl: ImageView;
  private bowl_front: ImageView;
  private deltaX: number;
  private hill: ImageView;
  private levels: Levels;
  private currentLevel: number;
  private currentBalls: number;
  private hearts: ImageView[];
  private scoreDigits: ImageView[];
  private highScoreDigits: ImageView[];
  private currentScore: number;
  private types: number[][];
  private highScore: number;
  private message: ImageView;
  private countdown: number;
  private advance: boolean;
  private collisionIndicators: any[];
  private normalIndicators: any[];
  secondary: any;

  constructor(opts) {
    super(opts);

    this.game = new Game();
    this.physics = new BallPhysics();
    this.hkPhysics = new HKPhysics();
    this.levels = new Levels();

    this.lastSoundPlayedTime = Date.now();

    this.shapeTypes = [];
    this.obstacles = [];

    this.pb = [];
    for (let i = 0; i < MAX_BALLS; i++) {
      this.pb[i] = new PachinkoBall();
      this.pb[i].setPosition(50, 50);
      this.pb[i].setVelocity(0, 0);
      this.pb[i].setPreCollision(true);
    }

    this.lines = [];

    this.types = [];
    for (let i = 0; i < 20; i++) {
      this.types[i] = [];
    }

    this.advance = false;

    this.pointing_dx = 0;
    this.pointing_dy = 1;
    this.time = 0;
    this.inShot = false;
    this.ballsShot = 0;
    this.currentBalls = 1;
    this.timeSinceStart = 0;
    this.generateGameData();
    this.currentLevel = 0;
    this._startGame();
    device.screen.on('Resize', () => this._resize());
    this._resize();

    platform.startGameAsync();
    this.currentScore = 0;
    let t = localStorage.getItem('highscore' + getLevelName(this.currentLevel));
    if (t === null) {
      t = '0';
    }
    this.highScore = parseInt(t);
    this.updateGUI();
    drawScore(this.scoreDigits, 0);
    drawScore(this.highScoreDigits, this.highScore);
  }

  private _resize () { resize(device, this.playfield, this.style); }

  //  0 = game active
  //  1 = player cleared board
  // -1 = player lost
  private checkGameOver () {
    for (let line = 0; line < 20; line++) {
      this.obstaclePosX[line] = [];
      const obstaclesInLine = 5 + (line & 1);
      for (let obj = 0; obj < obstaclesInLine; obj++) {
        if (this.obstacles[line][obj].style.visible) {
          if (yOfLine(line, this.linefield) < 150) {
            return -1
          } else {
            return 0;
          }
        }
      }
    }
    return 1;
  }

  private generateGameData () {
    this.obstaclePosX = [];
    for (let line = 0; line <= 1; line++) {
      this.obstaclePosX[line] = [];
      const obstaclesInLine = 5 + (line & 1);
      for (let obj = 0; obj < obstaclesInLine; obj++) {
        this.obstaclePosX[line][obj] = 130 - OBJECT_WIDTH / 2 * (line & 1) + obj * OBJECT_WIDTH;
      }
    }
  }

  private updateGuide (position) {
    const sourceX = LAUNCH_X;
    const sourceY = LAUNCH_Y;
    const pos = screenToPlayfield(position, this.playfield);
    pos.y = max(pos.y, LAUNCH_Y + 100);
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
      this.ballsShot = this.currentBalls;
      for (let i = 0; i < this.ballsShot; i++) {
        this.pb[i].setPreCollision(true);
        this.pb[i].setDelay(i * 150);
        this.pb[i].setPosition(LAUNCH_X, LAUNCH_Y);
        this.pb[i].setVelocity(this.pointing_dx, this.pointing_dy);
        this.pb[i].setType('default');
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

  private incrementScore () {
    this.currentScore++;
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
    }
    drawScore(this.scoreDigits, this.currentScore);
    drawScore(this.highScoreDigits, this.highScore);
  }

  _tick (dt) {
    this.game.tick(dt);
    this.timeSinceStart += dt;

    for (let i = 0; i < dt; i++) {
      this.timeSinceStart++;

      //move bowl
      this.bowl.style.x = sin(this.timeSinceStart * .0005) * 180 + 290;
      this.deltaX = this.bowl.style.x - this.bowl_front.style.x;
      this.bowl_front.style.x = this.bowl.style.x;
    }

    // warning. danger zone flashing
    for (let line = 0; line < 20; line++) {
      if (yOfLine(line, this.linefield) < 150) {
        const obstaclesInLine = 5 + (line & 1);
        for (let i = 0; i < obstaclesInLine; i++) {
          this.obstacles[line][i].style.opacity = ((this.timeSinceStart >> 7) & 1) * 0.5 + .25;
        }
      }
    }

    // decrement all the object hit counters
    for (let line = 0; line < 20; line++) {
      const obstaclesInLine = 5 + (line & 1);
      for (let i = 0; i < obstaclesInLine; i++) {
        const t = this.obstacles[line][i];
        if (t.countdown > 0) {
          t.countdown = max(0, t.countdown - dt)
        }
      }
    }

    updateClouds(this.cloud, dt);

    if (this.countdown > 0) {
      this.countdown -= dt;
      const t = this.countdown / MESSAGE_DURATION;
      const u = 1 - t;
      this.message.style.opacity = t;
      this.message.style.scale = 2 - t;
      this.message.style.r = u * u * u * u;
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.message.style.visible = false;
        if (this.advance) {
          this.currentLevel++;
          if (this.currentLevel === 5) {
            this.currentLevel = 0;
          }
          this.setupLevel(this.currentLevel);
        }
      }
      return;
    }

    let ballsToAdd = 0;
    if (this.inShot) {
      // if I need to fire any balls, do it
      for (let i = 0; i < dt; i++) {
        for (let ball = 0; ball < this.ballsShot; ball++) {
          const delay = this.pb[ball].getDelay();
          if (delay > 0) {
            this.pb[ball].setDelay(delay - 1);
          }

          if (delay === 0) {
            this.ball[ball].style.visible = true;
            this.pb[ball].setGravityActive(!this.pb[ball].preCollision);

            const d = this.pb[ball].getPositionAndVelocity();
            const n = { x: d.x + d.dx, y: d.y + d.dy };

            //left and right walls
            if ((n.x < 16) || (n.x > GAMEPLAY_WIDTH - 16)) {
              this.pb[ball].setVelocity(-d.dx * .6, d.dy * .8);
              this.pb[ball].preCollision = false;
              this.collisionsThisFrame = true;
            }

            //ceiling
            if (n.y < 0 && d.dy < 0) {
              this.pb[ball].setVelocity(d.dx * .8, -d.dy * .6);
              this.pb[ball].preCollision = false;
              this.collisionsThisFrame = true;
            }

            //bucket
            const BUCKET_OFFX = 65;
            if (n.y > 930 && n.y < 970) {
              // in the range where I might be hitting the lip of the bowl

              let dx = this.bowl.style.x - BUCKET_OFFX - n.x;
              let dy = 950 - n.y;
              let sumSquares = dx * dx + dy * dy;
              if (sumSquares < BALL_RADIUS * BALL_RADIUS * 1.2) {
                const t = this.physics.ballVsPoint(n.x, n.y, d.dx, d.dy, this.bowl.style.x - BUCKET_OFFX, 950, .5);
                this.pb[ball].setVelocity(t.dx, t.dy);
                this.pb[ball].preCollision = false;
              }

              dx = this.bowl.style.x + BUCKET_OFFX - n.x;
              dy = 950 - n.y;
              sumSquares = dx * dx + dy * dy;
              if (sumSquares < BALL_RADIUS * BALL_RADIUS * 1.2) {
                const t = this.physics.ballVsPoint(n.x, n.y, d.dx, d.dy, this.bowl.style.x + BUCKET_OFFX, 950, .5);
                this.pb[ball].setVelocity(t.dx, t.dy);
                this.pb[ball].preCollision = false;
              }
            }

            //if in the bucket, get rid of it
            if (n.y > 970 && n.x > this.bowl.style.x - BUCKET_OFFX && n.x < this.bowl.style.x + BUCKET_OFFX) {
              this.pb[ball].setPosition(n.y, 1200);
              this.incrementScore();
            }

            //objects
            const collisionCutOff = 900;
            let collisionsThisFrame = false;
            for (let line = 0; line < 20; line++) {
              if (this.roughCheckCollision(n.x, n.y, line) && yOfLine(line, this.linefield) < collisionCutOff) {
                const obstaclesInLine = 5 + (line & 1);
                for (let i = 0; i < obstaclesInLine; i++) {
                  const ob = this.obstacles[line][i].style;
                  if (ob.visible) {
                    const type = this.shapeTypes[line][i];
                    switch (type) {
                      case 0: //circle
                        {
                          const a = this.circumscribedCircleCheck(d.x, d.y, line, i);
                          const b = this.circumscribedCircleCheck(n.x, n.y, line, i);

                          if (a || b) {
                            if (this.obstacles[line][i].countdown === 0) {
                              this.obstacles[line][i].countdown = HIT_DELAY;
                              this.obstacles[line][i].value--;
                              this.incrementScore();
                              sounds.playSound('contact');
                              animate(this.obstacles[line][i])
                                .now({ scale: .95 }, 50, animate.easeInOutSine)
                                .then({ scale: 1.0 }, 50, animate.easeInOutSine)
                              setValue(this.digits[line][i], this.obstacles[line][i].value, DIGITS_SCALE);
                              if (!this.obstacles[line][i].value) {
                                ob.visible = false;
                                this.secondary[line][i].style.visible = false;
                              }
                            }
                          }

                          if (!a && b) {
                            const dx = ob.x - n.x;
                            const dy = ob.y + yOfLine(line, this.linefield) - n.y;
                            const len = sqrt(dx * dx + dy * dy);
                            const px = dx / len * BALL_RADIUS + n.x;
                            const py = dy / len * BALL_RADIUS + n.y;

                            const t = this.physics.ballVsPoint(n.x, n.y, d.dx, d.dy, px, py, .72);
                            this.pb[ball].setVelocity(t.dx, t.dy);
                            this.pb[ball].preCollision = false;
                            this.collisionsThisFrame = true;
                          }
                        }
                        break;
                      default:
                        if (this.circumscribedCircleCheck(n.x, n.y, line, i)) {
                          const p = this.findCollisionPoint(n.x, n.y, line, i);
                          const deltaX = d.x - p.x;
                          const deltaY = d.y - p.y;
                          if ((deltaX * d.dx) + (deltaY * d.dy) < 0) {
                            const dx = p.x - n.x;
                            const dy = p.y - n.y;
                            const sumSquares = dx * dx + dy * dy;
                            if (sumSquares < BALL_RADIUS * BALL_RADIUS) {
                              if (this.obstacles[line][i].countdown === 0) {
                                this.obstacles[line][i].countdown = HIT_DELAY;
                                this.obstacles[line][i].value--;
                                this.incrementScore();
                                sounds.playSound('contact');
                                animate(this.obstacles[line][i])
                                  .now({ scale: .95 }, 50, animate.easeInOutSine)
                                  .then({ scale: 1.0 }, 50, animate.easeInOutSine)
                                setValue(this.digits[line][i], this.obstacles[line][i].value, DIGITS_SCALE);
                                if (!this.obstacles[line][i].value) {
                                  ob.visible = false;
                                  this.secondary[line][i].style.visible = false;
                                }
                              }
                              const cor = this.levels.shapeData[type].cor;
                              const t = this.physics.ballVsPoint(n.x, n.y, d.dx, d.dy, p.x, p.y, cor);                              
                              this.pb[ball].setVelocity(t.dx, t.dy);
                              this.pb[ball].preCollision = false;
                              this.collisionsThisFrame = true;
                              if (type === 15) {
                                ballsToAdd++;
                              }
                              if (type === 7) {
                                this.pb[ball].setType('rocket');
                              } else if (this.pb[ball].getType() === 'rocket') {
                                this.pb[ball].setType('default');
                              }
                            }
                          }
                        }
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

    this.currentBalls = min(this.currentBalls + ballsToAdd, MAX_BALLS);
    this.updateGUI();
  }

  private findCollisionPoint (ballX, ballY, line, obstacle) {
    const ob = this.obstacles[line][obstacle].style;
    const s = sin(ob.r);
    const c = cos(ob.r);

    const type = this.shapeTypes[line][obstacle];
    const obstacleX = this.obstacles[line][obstacle].style.x;
    const obstacleY = this.obstacles[line][obstacle].style.y + yOfLine(line, this.linefield);

    let rotatedPoints = [];
    let t, u;
    switch (type) {
      case 0: // circle
        break;
      case 1: // square
        for (let i = 0; i < 4; i++) {
          const x = this.hkPhysics.SQUARE_POINTS[i].x;
          const y = this.hkPhysics.SQUARE_POINTS[i].y;
          const tx = x * c - y * s + obstacleX;
          const ty = y * c + x * s + obstacleY;
          if (SHOW_COLLISIONS) {
            this.collisionIndicators[i].style.x = tx;
            this.collisionIndicators[i].style.y = ty;
          }
          rotatedPoints[i] = { x: tx, y: ty };
        }
        t = this.physics.closestTwo(
          ballX, ballY,
          [rotatedPoints[0],
          rotatedPoints[1],
          rotatedPoints[2],
          rotatedPoints[3]]
        );
        u = this.physics.interpolateClosestOfPair(ballX, ballY, t.p0, t.p1);
        drawNormal(u, { x: ballX, y: ballY }, this.normalIndicators);
        return u;
      case 2: // triangle
        for (let i = 0; i < 3; i++) {
          const x = this.hkPhysics.TRIANGLE_POINTS[i].x;
          const y = this.hkPhysics.TRIANGLE_POINTS[i].y;
          const tx = x * c - y * s + obstacleX;
          const ty = y * c + x * s + obstacleY;
          if (SHOW_COLLISIONS) {
            this.collisionIndicators[i].style.x = tx;
            this.collisionIndicators[i].style.y = ty;
          }
          rotatedPoints[i] = { x: tx, y: ty };
        }
        t = this.physics.closestTwo(
          ballX, ballY,
          [rotatedPoints[0],
          rotatedPoints[1],
          rotatedPoints[2]]
        );
        u = this.physics.interpolateClosestOfPair(ballX, ballY, t.p0, t.p1);
        drawNormal(u, { x: ballX, y: ballY }, this.normalIndicators);
        return u;
      default: // kitty
        for (let i = 0; i < 4; i++) {
          const x = this.hkPhysics.KITTY_POINTS[i].x;
          const y = this.hkPhysics.KITTY_POINTS[i].y;
          const tx = x * c - y * s + obstacleX;
          const ty = y * c + x * s + obstacleY;
          if (SHOW_COLLISIONS) {
            this.collisionIndicators[i].style.x = tx;
            this.collisionIndicators[i].style.y = ty;
          }
          rotatedPoints[i] = { x: tx, y: ty };
        }
        u = this.physics.findBouncePoint(ballX, ballY, rotatedPoints);
        drawNormal(u, { x: ballX, y: ballY }, this.normalIndicators);
        return u;
    }
  }


  private circumscribedCircleCheck (x, y, line, obstacle) {
    const SLOP = 1.1;
    const ob = this.obstacles[line][obstacle].style;
    let sumOfRadii;
    let res = false;
    const dx = x - ob.x;
    const dy = y - (yOfLine(line, this.linefield) + ob.y);
    const sumOfSquares = dx * dx + dy * dy;
    const type = this.shapeTypes[line][obstacle];
    switch (type) {
      case 0: //circle
        sumOfRadii = ((57.6 / 2) + BALL_RADIUS);
        res = sumOfSquares < sumOfRadii * sumOfRadii;
        break;
      case 1: //square
        sumOfRadii = ((57.6 / 2) + BALL_RADIUS * sqrt(2)) * SLOP;
        res = sumOfSquares < sumOfRadii * sumOfRadii;
        break;
      case 2: //triangle
        sumOfRadii = (80.64 * (1 - 1 / sqrt(3)) + BALL_RADIUS) * 1.2;
        res = sumOfSquares < sumOfRadii * sumOfRadii;
        break;
      default: //kitty
        sumOfRadii = ((57.6 / 2 * this.hkPhysics.KITTY_SCALE) + BALL_RADIUS * sqrt(2)) * SLOP;
        res = sumOfSquares < sumOfRadii * sumOfRadii;
        break;
    }
    return res;
  }

  // possibly touching anything in this line?
  private roughCheckCollision (x, y, line) {
    // first filter -- is the ball in the line's y range?
    const yMin = yOfLine(line, this.linefield) - 10; //slop for overlap
    const yMax = yMin + LINE_HEIGHT + 10; //slop for overlap
    //console.log(y, yMin, yMax);
    if (between(y, yMin - BALL_RADIUS, yMax + BALL_RADIUS)) {
      // second filter -- is the ball in the obstacle's x range?
      //console.log("Y_TOUCH");
      const obstaclesInLine = 5 + (line & 1);
      for (let obstacle = 0; obstacle < obstaclesInLine; obstacle++) {
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

  private moveLinesUp () {
    localStorage.setItem('highscore' + getLevelName(this.currentLevel), this.highScore + '');
    const result = this.checkGameOver();
    if (result === 0) { // game not over
      //for kitties who do something when the shot is over.
      for (let line = 0; line < 20; line++) {
        const obstaclesInLine = 5 + (line & 1);
        for (let object = 0; object < obstaclesInLine; object++) {
          if (this.types[line][object] === 11) {
            this.obstacles[line][object].style.r += 1 / 24 * TAU;
          }
          if (this.types[line][object] === 19) {
            this.obstacles[line][object].style.r *= -1;
          }
        }
      }
      for (let i = 0; i < this.linefield.length; i++) {
        const y = this.linefield[i].style.y;
        animate(this.linefield[i])
          .wait(i * 15)
          .then({ y: y - LINE_HEIGHT }, 500, animate.easeInOutSine);
      }
      setTimeout(() => {
        sounds.playSound('line');
      }, 500);
    } else if (result === 1) { // player won
      setMessage(this.message, 0);
      this.countdown = MESSAGE_DURATION;
      this.advance = true;
    } else { //player lost
      setMessage(this.message, 1);
      this.countdown = MESSAGE_DURATION;
      this.setupLevel(this.currentLevel);
      this.advance = false;
    }
  }

  private setupLevel (levelNumber: number) {
    let y = 800;
    this.currentBalls = this.levels.numBalls[levelNumber];
    for (let line = 0; line < 20; line++) {
      this.linefield[line].style.y = y;
      y += LINE_HEIGHT;
      const obstaclesInLine = 5 + (line & 1);
      for (let object = 0; object < obstaclesInLine; object++) {
        const d = this.levels.getData(levelNumber, line, object);
        if (d) {
          let name = d.type;
          let type = this.levels.indexmap[name];
          this.types[line][object] = type;
          let angle = d.angle / 24 * TAU;
          this.obstacles[line][object].setImage('resources/images/game/' + this.levels.filemap[d.type]);
          this.obstacles[line][object].style.r = angle;
          this.obstacles[line][object].style.visible = true;
          this.obstacles[line][object].style.opacity = d.opacity;
          if (d.secondary) {
            console.log("found a secondary", d.secondary);
            this.secondary[line][object].setImage('resources/images/game/' + this.levels.filemap[d.secondary]);
            this.secondary[line][object].style.r = 0;
            this.secondary[line][object].style.visible = true;
            center(this.secondary[line][object], .25);
            this.secondary[line][object].style.opacity = 1;
          }

          let scale = IMAGE_SCALE;
          if (type === 2) {
            scale = TRIANGLE_SCALE;
          }
          if (type > 2) {
            scale *= this.hkPhysics.KITTY_SCALE;
          }

          center(this.obstacles[line][object], scale);
          //triangles are different
          if (type === 2) {
            const t = 23.37;
            this.obstacles[line][object].style.offsetX = -t;
            this.obstacles[line][object].style.anchorX = t;
          }

          const value = d.points;
          setValue(this.digits[line][object], value, DIGITS_SCALE);
          this.obstacles[line][object].value = value;
          this.obstacles[line][object].countdown = 0;
          this.shapeTypes[line][object] = type;
        } else {
          this.types[line][object] = -1;
          this.obstacles[line][object].style.visible = false;
          setValue(this.digits[line][object], 0, DIGITS_SCALE);
          this.obstacles[line][object].value = 0;
        }
      }
    }
    this.updateGUI();
    this.currentScore = 0;
    let t = localStorage.getItem('highscore' + getLevelName(this.currentLevel));
    if (t === null) {
      t = '0';
    }
    this.highScore = parseInt(t);
    this.updateGUI();
    drawScore(this.highScoreDigits, this.highScore);
    drawScore(this.scoreDigits, this.currentScore);
  }

  private buildObstacleLines (levelNumber: number) {
    const level = this.levels.layout[levelNumber];

    this.linefield = [];
    this.obstacles = [];
    this.secondary = [];
    this.digits = [];
    this.shapeTypes = [];
    let y = 800;
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
      this.secondary[line] = [];
      this.digits[line] = [];

      let x = 130 - OBJECT_WIDTH / 2 * (line & 1);

      const obstaclesInLine = 5 + (line & 1);
      for (let object = 0; object < obstaclesInLine; object++) {
        const d = this.levels.getData(levelNumber, line, object);
        let type = 0;
        let name = '';
        let angle = 0;

        //object
        this.obstacles[line][object] = new ImageView({
          parent: this.linefield[line],
          x: x,
          y: LINE_HEIGHT / 2,
          autoSize: true,
          visible: !!d,
        });

        this.secondary[line][object] = new ImageView({
          parent: this.linefield[line],
          x: x,
          y: LINE_HEIGHT / 2,
          autoSize: true,
          visible: false,
        });

        //digits
        this.digits[line][object] = [];
        for (let j = 0; j < 3; j++) {
          this.digits[line][object][j] = new ImageView({
            parent: this.linefield[line],
            x: x + j * 15 - 15 + 25,
            y: LINE_HEIGHT / 2 + 25,
            autoSize: true,
            visible: true,
          });
        }
        x += OBJECT_WIDTH;

        if (d) {
          name = d.type;
          type = this.levels.indexmap[name];
          angle = d.angle / 24 * TAU;
          this.obstacles[line][object].setImage('resources/images/game/' + this.levels.filemap[d.type]);
          this.obstacles[line][object].style.r = angle;
          this.obstacles[line][object].style.opacity = d.opacity;

          let scale = IMAGE_SCALE;
          if (type === 2) {
            scale = TRIANGLE_SCALE;
          }
          if (type > 2) {
            scale *= this.hkPhysics.KITTY_SCALE;
          }

          center(this.obstacles[line][object], scale);
          //triangles are different
          if (type === 2) {
            const t = 23.37; // this number ensures correct triangle rotation
            this.obstacles[line][object].style.offsetX = -t;
            this.obstacles[line][object].style.anchorX = t;
          }

          const value = d.points;
          setValue(this.digits[line][object], value, DIGITS_SCALE);
          this.obstacles[line][object].value = value;
          this.obstacles[line][object].countdown = 0;
        } else {
          setValue(this.digits[line][object], 0, DIGITS_SCALE);
          this.obstacles[line][object].value = 0;
        }

        this.shapeTypes[line][object] = type;
      }
    }
  }

  private updateGUI () {
    let separation = 16;
    if (this.currentBalls > 12) {
      separation = 160 / this.currentBalls;
    }
    for (let i = 0; i < MAX_BALLS; i++) {
      this.hearts[i].style.visible = i < this.currentBalls;
      this.hearts[i].style.x = 360 + i * separation;
    }
  }

  private _startGame () {
    this.playfield = new ImageView({
      parent: this,
      image: 'resources/images/game/background/background.png',
      x: 0,
      y: 0,
      width: GAMEPLAY_WIDTH,
      height: GAMEPLAY_HEIGHT,
      backgroundColor: '#242551',
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

    this.buildObstacleLines(this.currentLevel);

    this.hill = new ImageView({
      parent: this.playfield,
      image: 'resources/images/game/background/background_hill.png',
      x: 0,
      y: 0,
      width: GAMEPLAY_WIDTH,
      height: GAMEPLAY_HEIGHT,
    });

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

    this.bowl = new ImageView({
      parent: this.playfield,
      image: 'resources/images/game/objects/bowl.png',
      x: 576 / 2,
      y: 970,
      width: 300,
      height: 187,
    })
    center(this.bowl, .5);

    this.ball = [];
    const d = BALL_DIAMETER * 1.3;
    for (let i = 0; i < MAX_BALLS; i++) {
      this.ball[i] = new ImageView({
        parent: this.playfield,
        image: 'resources/images/game/objects/heart.png',
        x: 0,
        y: 0,
        width: d,
        height: d,
        visible: false,
      });
      center(this.ball[i], 1);
    }

    // heart counters
    this.hearts = [];
    for (let i = 0; i < MAX_BALLS; i++) {
      let s = 1;
      const t = i % 10;
      if (t === 9) {
        s = 1.25;
      }
      this.hearts[i] = new ImageView({
        parent: this.playfield,
        image: 'resources/images/game/objects/heart.png',
        x: 40 + i * d / 3,
        y: 70,
        width: d,
        height: d,
        visible: false,
      });
      center(this.hearts[i], s * .75);
    }

    // score && high score
    this.scoreDigits = [];
    this.highScoreDigits = [];
    for (let i = 0; i < 6; i++) {
      this.scoreDigits[i] = new ImageView({
        parent: this.playfield,
        image: 'resources/fonts/digits/' + 0 + '.png',
        x: 10 + i * 18,
        y: 25,
        width: 22,
        height: 32,
      });
      this.highScoreDigits[i] = new ImageView({
        parent: this.playfield,
        image: 'resources/fonts/digits/' + 0 + '.png',
        x: 10 + i * 18,
        y: 55,
        width: 22,
        height: 32,
      });
    }

    this.bowl_front = new ImageView({
      parent: this.playfield,
      image: 'resources/images/game/objects/bowl_front.png',
      x: 576 / 2,
      y: 970,
      width: 300,
      height: 187,
    });
    center(this.bowl_front, .5);

    this.message = new ImageView({
      parent: this.playfield,
      image: "resources/images/game/text/LevelComplete.png",
      x: 576 / 2,
      y: 500,
      width: 385,
      height: 55,
      visible: false,
    });
    center(this.message, 1);

    this.collisionIndicators = [];
    for (let i = 0; i < 4; i++) {
      this.collisionIndicators[i] = new ImageView({
        parent: this.playfield,
        image: 'resources/images/game/objects/arrow_dot.png',
        x: 0,
        y: 0,
        width: 256 * 0.025,
        height: 256 * 0.025,
        visible: SHOW_COLLISIONS,
      });
      center(this.collisionIndicators[i], 1);
    }
    this.normalIndicators = [];
    for (let i = 0; i < 8; i++) {
      this.normalIndicators[i] = new ImageView({
        parent: this.playfield,
        image: 'resources/images/game/objects/arrow_dot.png',
        x: 0,
        y: 0,
        width: 256 * 0.025,
        height: 256 * 0.025,
        visible: SHOW_COLLISIONS,
      });
      center(this.normalIndicators[i], 1);
    }

    sounds.playSong('game');
    this.setupLevel(this.currentLevel);
  }
}

webpackGameEntrypoint(Application);
