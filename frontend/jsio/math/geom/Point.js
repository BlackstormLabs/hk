let exports = {};

/**
 * @package math.geom.Point;
 * Models a Point in 2D space.
 */
exports = class Point {
  constructor (a, b) {
    switch (arguments.length) {
      case 0:
        this.x = 0;
        this.y = 0;
        break;
      case 1:
        this.x = a.x || 0;
        this.y = a.y || 0;
        break;
      case 2:
        this.x = a || 0;
        this.y = b || 0;
        break;
    }
  }

  rotate (r) {
    var x = this.x,
      y = this.y,
      cosr = Math.cos(r),
      sinr = Math.sin(r);

    this.x = x * cosr - y * sinr;
    this.y = x * sinr + y * cosr;

    return this;
  }

  add (x, y) {
    if (typeof x == 'number') {
      this.x += x;
      this.y += y;
    } else {
      this.x += x.x;
      this.y += x.y;
    }
    return this;
  }

  subtract (x, y) {
    if (typeof x == 'number') {
      this.x -= x;
      this.y -= y;
    } else {
      this.x -= x.x;
      this.y -= x.y;
    }
    return this;
  }

  scale (sx, sy) {
    // if no scaleY specified
    if (sy === undefined)
      { sy = sx; }

    this.x *= sx;
    this.y *= sy;
    return this;
  }

  setMagnitude (m) {
    var theta = this.getAngle();
    this.x = m * Math.cos(theta);
    this.y = m * Math.sin(theta);
    return this;
  }

  normalize () {
    var m = this.getMagnitude();
    this.x /= m;
    this.y /= m;
    return this;
  }
  addMagnitude (m) {
    return this.setMagnitude(this.getMagnitude() + m);
  }
  getMagnitude () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  getSquaredMagnitude () {
    return this.x * this.x + this.y * this.y;
  }
  getAngle () {
    return Math.atan2(this.y, this.x);
  }
};
exports.prototype.translate = exports.prototype.add;
exports.prototype.getDirection = exports.prototype.getAngle;
var Point = exports;

/*
 */
Point.getPolarR = function (x, y) {
  throw 'notImplemented';
};

/*
	### Class Method: Point.getPolarTheta (x, y)
	1. `x {number}`
	2. `y {number}`
	3. Return: `{number}`
*/
Point.getPolarTheta = function (x, y) {
  var val = Math.atan2(y, x) + Math.PI * 2;
  return val > Math.PI * 2 ? val % (Math.PI * 2) : val;
};

/*
	### Class Method: Point.add (a, b, c, d)
	### Class Method: Point.translate (a, b, c, d)
	1. `a {number}`
	2. `b {number}`
	3. `c {number}`
	4. `d {number}`
	5. Return: `{Point}`
 */
Point.add = Point.translate = function (a, b, c, d) {
  switch (arguments.length) {
    case 2:
      return new Point(a).add(b);
    case 3:
      return new Point(a).add(b, c);
    case 4:
      return new Point(a, b).add(c, d);
  }
};

/*
	### Class Method: Point.subtract (a, b, c, d)
	1. `a {number}`
	2. `b {number}`
	3. `c {number}`
	4. `d {number}`
	5. Return: `{Point}`
 */
Point.subtract = function (a, b, c, d) {
  switch (arguments.length) {
    case 2:
      return new Point(a).subtract(b);
    case 3:
      return new Point(a).subtract(b, c);
    case 4:
      return new Point(a, b).subtract(c, d);
  }
};

/*
	### Class Method: Point.scale (a, b, c)
	1. `a {number}`
	2. `b {number}`
	3. `c {number}`
	4. Return: `{Point}`
 */
Point.scale = function (a, b, c) {
  switch (arguments.length) {
    case 2:
      return new Point(a).scale(b);
    case 3:
      return new Point(a, b).scale(c);
  }
};

/*
	### Class Method: Point.setMagnitude (a, b, c)
	1. `a {number}`
	2. `b {number}`
	3. `c {number}`
	4. Return: `{Point}`
*/
Point.setMagnitude = function (a, b, c) {
  switch (arguments.length) {
    case 2:
      return new Point(a).setMagnitude(c);
    case 3:
      return new Point(a, b).setMagnitude(c);
  }
};

/*
	### Class Method: Point.addMagnitude (a, b, c)
	1. `a {number}`
	2. `b {number}`
	3. `c {number}`
	4. Return: `{Point}`
 */
Point.addMagnitude = function (a, b, c) {
  switch (arguments.length) {
    case 2:
      pt = new Point(a);
      break;
    case 3:
      pt = new Point(a, b);
      b = c;
      break;
  }

  return pt.addMagnitude(b);
};

/*
	### Class Method: Point.getMagnitude (a, b)
	1. `a {number}`
	2. `b {number}`
	3. Return: `{Point}`
 */
Point.getMagnitude = function (a, b) {
  return new Point(a, b).getMagnitude();
};

/*
	### Class Method: Point.rotate (a, b, c)
	1. `a {number}`
	2. `b {number}`
	3. `c {number}`
	4. Return: `{Point}`
 */
Point.rotate = function (a, b, c) {
  switch (arguments.length) {
    case 2:
      return new Point(a).rotate(b);
    case 3:
      return new Point(a, b).rotate(c);
  }
};

/**
 * Treat two points as vectors and project a onto b
 *  (a dot unit(b)) * unit(b)
 */
Point.project = function (a, b) {
  var unitB = new Point(b).normalize();
  return unitB.scale(unitB.x * a.x + unitB.y * a.y);
};

export default exports;
