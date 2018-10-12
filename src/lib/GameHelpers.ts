import ImageView from "frontend/devkit-core/timestep/src/ui/ImageView";
import { GAMEPLAY_HEIGHT, GAMEPLAY_WIDTH } from "../Game";
import { lerp } from "./MathHelpers";

export function center (v, scale: number): void {
  v.style.width *= scale;
  v.style.height *= scale;
  v.style.offsetX = -v.style.width / 2;
  v.style.offsetY = -v.style.height / 2;
  v.style.anchorX = -v.style.offsetX;
  v.style.anchorY = -v.style.offsetY;
}

export function setValue (d: any, v: number, scale: number): void {
  if (v === 0) {
    for (let i = 0; i < 3; i++) {
      d[i].style.visible = false;
    }
  } else {
    let remainder: number;
    const h: number = (v / 100) | 0;
    remainder = v - h * 100;
    const t: number = (remainder / 10) | 0;
    remainder -= t * 10;
    let digits: number = 1;
    if (h > 0) {
      digits = 3;
    } else if (t > 0) {
      digits = 2;
    }

    for (let i = 0; i < 3; i++) {
      d[2 - i].style.visible = i < digits;
    }

    d[0].setImage('resources/fonts/digits/' + h + '.png');
    d[1].setImage('resources/fonts/digits/' + t + '.png');
    d[2].setImage('resources/fonts/digits/' + remainder + '.png');
    center(d[0], scale);
    center(d[1], scale);
    center(d[2], scale);

    for (let i = 0; i < 3; i++) {
      d[i].style.offsetX -= (3 - digits) * 5;
    }
  }
}

export function drawScore (digits: ImageView[], value: number) {
  let v = value;
  for (let i = 5; i >= 0; i--) {
    const t = v % 10;
    const visible = (v > 0 || i === 5);
    if (visible) {
      digits[i].setImage('resources/fonts/digits/' + t + '.png');
      v = (v / 10) | 0;
    }
    digits[i].style.visible = visible;
  }
}

export function getLevelName (level: number): string {
  let s: string = level.toString();
  while (s.length < 4) {
    s = '0' + s;
  }
  return s;
}

export function setMessage (message: ImageView, messageNumber: number) {
  let h, w;
  switch (messageNumber) {
    case 0:
      message.setImage("resources/images/game/text/LevelComplete.png");
      h = 55;
      w = 385;
      break;
    case 1:
      message.setImage("resources/images/game/text/TryAgain.png");
      h = 56;
      w = 228;
      break;
  }
  message.style.height = h;
  message.style.width = w;
  message.style.anchorX = w / 2;
  message.style.anchorY = h / 2;
  message.style.offsetX = -w / 2;
  message.style.offsetY = -h / 2;
  message.style.scale = 1;
  message.style.visible = true;
  message.style.opacity = 1;
}

export function updateClouds (cloud, dt) {
  const cloudSpeed = [.01, .005, .003];
  for (let i = 0; i < 3; i++) {
    let x = cloud[i].style.x;
    x += cloudSpeed[i] * dt;
    if (x > 600) {
      x = - 300;
    }
    cloud[i].style.x = x;
  }
}

export function screenToPlayfield (p, playfield) {
  return {
    x: (p.x - playfield.style.offsetX) / playfield.style.scale,
    y: (p.y - playfield.style.offsetY) / playfield.style.scale
  }
}

export function resize (device, playfield, style) {
  const screen = device.screen;
  const screenWidth = screen.width;
  const screenHeight = screen.height;
  const GAMEPLAY_ASPECT = GAMEPLAY_HEIGHT / GAMEPLAY_WIDTH;
  const SCREEN_ASPECT = screenHeight / screenWidth;

  style.width = screenWidth;
  style.height = screenHeight;

  if (playfield) {
    if (GAMEPLAY_ASPECT > SCREEN_ASPECT) {
      const mult = screenHeight / GAMEPLAY_HEIGHT;
      playfield.style.scale = mult;
      playfield.style.offsetX = (screenWidth - (GAMEPLAY_WIDTH * mult)) / 2;
      playfield.style.offsetY = 0;
    } else {
      const mult = screenWidth / GAMEPLAY_WIDTH;
      playfield.style.scale = mult;
      playfield.style.offsetX = 0;
      playfield.style.offsetY = (screenHeight - (GAMEPLAY_HEIGHT * mult)) / 2;
    }
  }
}

// returns yMin
export function yOfLine (line, linefield) {
  return linefield[line].style.y;
}

export function drawNormal (p0, p1, normalIndicators) {
  for (let i = 0; i < 8; i++) {
    normalIndicators[i].style.x = lerp(p0.x, p1.x, i / 8);
    normalIndicators[i].style.y = lerp(p0.y, p1.y, i / 8);
  }
}
