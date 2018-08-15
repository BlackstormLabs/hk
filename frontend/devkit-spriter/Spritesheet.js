var ImageBuffer = require('./ImageBuffer');

module.exports = Spritesheet;

function Spritesheet(opts) {
  this.name = opts.name;
  this.padding = opts.padding;
  this.powerOfTwoSheets = !!opts.powerOfTwoSheets;
  this._width = 0;
  this._height = 0;

  this.sprites = [];
}

function powerOfTwo(a) {
  var b = 1;
  while (b < a) {
    b = b << 1;
  }
  return b;
}

Object.defineProperties(Spritesheet.prototype, {
  'length': {
    'get': function () { return this.sprites.length; },
  },
  'width': {
    'get': function () {
      return this.powerOfTwoSheets ? powerOfTwo(this._width) : this._width;
    }
  },
  'height': {
    'get': function () {
      return this.powerOfTwoSheets ? powerOfTwo(this._height) : this._height;
    }
  }
});

Spritesheet.prototype.add = function (imageInfo, x, y) {
  imageInfo.x = x;
  imageInfo.y = y;

  this.sprites.push(imageInfo);

  if (x + imageInfo.contentWidth > this._width) {
    this._width = x + imageInfo.contentWidth;
  }

  if (y + imageInfo.contentHeight > this._height) {
    this._height = y + imageInfo.contentHeight;
  }

  return this;
};

Spritesheet.prototype.addDuplicate = function (duplicate, original) {
  duplicate.x = original.x;
  duplicate.y = original.y;
  duplicate.isDuplicate = true;
  this.sprites.push(duplicate);
};

Spritesheet.prototype.composite = function () {
  this.buffer = new ImageBuffer({
    width: this.width,
    height: this.height
  });

  this.sprites.forEach(function (sprite) {
    if (!sprite.isDuplicate) {
      this.blit(sprite);
    }
  }, this);

  return this;
};

Spritesheet.prototype.recycle = function () {
  this.buffer = null;
  this.recycleSprites();
  return this;
};

Spritesheet.prototype.recycleSprites = function () {
  this.sprites.forEach(function (sprite) {
    sprite.recycle();
  });
  return this;
};

Spritesheet.prototype.write = function (filename) {
  return this.buffer.write(filename);
};

Spritesheet.prototype.blit = function (img) {
  var pad = this.padding;

  // dest params, with dx2 / dy2 being exclusive
  var dx = img.x;
  var dy = img.y;
  var dw = img.contentWidth;
  var dh = img.contentHeight;
  var dx2 = img.x + img.contentWidth;
  var dy2 = img.y + img.contentHeight;

  // source params, with sx2 / sy2 being exclusive
  var sx = img.margin.left;
  var sy = img.margin.top;
  var sw = img.contentWidth;
  var sh = img.contentHeight;
  var sx2 = sx + img.contentWidth;
  var sy2 = sy + img.contentHeight;

  var srcBuffer = img.buffer;
  var destBuffer = this.buffer;

  for (var i = 1; i <= pad; i++) {
    // top-left
    destBuffer.drawImage(srcBuffer,
        sx, sy, 1, 1,
        dx - i, dy - i, 1, 1
      );

    // top
    destBuffer.drawImage(srcBuffer,
        sx, sy, sw, 1,
        dx, dy - i, dw, 1);

    // top-right
    destBuffer.drawImage(srcBuffer,
        sx2 - 1, sy, 1, 1,
        dx2 + i - 1, dy - i, 1, 1);

    // right
    destBuffer.drawImage(srcBuffer,
        sx2 - 1, sy, 1, sh,
        dx2 + i - 1, dy, 1, dh);

    // bottom-right
    destBuffer.drawImage(srcBuffer,
        sx2 - 1, sy2 - 1, 1, 1,
        dx2 + i - 1, dy2 + i - 1, 1, 1);

    // bottom
    destBuffer.drawImage(srcBuffer,
        sx, sy2 - 1, sw, 1,
        dx, dy2 + i - 1, dw, 1);

    // bottom-left
    destBuffer.drawImage(srcBuffer,
        sx, sy2 - 1, 1, 1,
        dx - i, dy2 + i - 1, 1, 1);

    // left
    destBuffer.drawImage(srcBuffer,
        sx, sy, 1, dh,
        dx - i, dy, 1, dh);
  }

  var xOdd = ((pad + dx2) & 0x1) !== 0;
  var yOdd = ((pad + dy2) & 0x1) !== 0;

  // extend the right side
  if (xOdd) {
    // top-right
    destBuffer.drawImage(srcBuffer,
        sx2 - 1, sy, 1, 1,
        dx2 + pad, dy - pad, 1, 1);

    // right
    destBuffer.drawImage(srcBuffer,
        sx2 - 1, sy, 1, sh,
        dx2 + pad, dy, 1, dh);
  }

  // extend the bottom
  if (yOdd) {
    // bottom
    destBuffer.drawImage(srcBuffer,
        sx, sy2 - 1, sw, 1,
        dx, dy2 + pad, dw, 1);

    // bottom-left
    destBuffer.drawImage(srcBuffer,
        sx, sy2 - 1, 1, 1,
        dx - pad, dy2 + pad, 1, 1);
  }

  // extend the bottom right
  if (yOdd && xOdd) {
    // bottom-right
    destBuffer.drawImage(srcBuffer,
        sx2 - 1, sy2 - 1, 1, 1,
        dx2 + pad, dy2 + pad, 1, 1);
  }

  // inside
  destBuffer.drawImage(srcBuffer,
      sx, sy, sw, sh,
      dx, dy, dw, dh);
};

Spritesheet.prototype.toJSON = function () {
  return {
      name: this.name,
      width: this.width,
      height: this.height,
      sprites: this.sprites.map(function (sprite) {
        return sprite.toJSON();
      })
    };
};
