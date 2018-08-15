
export function center(v, scale: number): void {
  v.style.width *= scale;
  v.style.height *= scale;
  v.style.offsetX = -v.style.width / 2;
  v.style.offsetY = -v.style.height / 2;
  v.style.anchorX = -v.style.offsetX;
  v.style.anchorY = -v.style.offsetY;
}

export function setValue(d: any, v: number, scale: number): void {
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
