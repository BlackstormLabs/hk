var crypto = require('crypto');

module.exports = ImageInfo;

function ImageInfo(filename, buffer, scale) {
  this.x = 0;
  this.y = 0;

  this.filename = filename;
  this.hash = crypto.createHash('md5').update(buffer.bitmap.data).digest('hex');
  this.buffer = buffer;
  this.width = buffer.bitmap.width;
  this.height = buffer.bitmap.height;
  this.area = this.width * this.height;
  this.scale = scale || 1;
  this.data = buffer.bitmap.data;
  this.depth = this.data.length / this.area;
  this.hasAlphaChannel = (this.depth == 4);

  this.margin = this.computeMargins();
  this.contentWidth = this.width - this.margin.left - this.margin.right;
  this.contentHeight = this.height - this.margin.top - this.margin.bottom;
  this.contentArea = this.contentWidth * this.contentHeight;
}

ImageInfo.prototype.recycle = function () {
  this.buffer = null;
};

ImageInfo.prototype.computeMargins = function() {
  var cols = this.width;
  var rows = this.height;
  var depth = this.depth;
  var data = this.data;

  var marginLeft = 0;
  var marginRight = 0;
  var marginTop = 0;
  var marginBottom = 0;

  if (depth == 4) {
    // trim alpha channel
    for (; marginLeft < cols; ++marginLeft) {
      if (!isColumnTransparent(marginLeft, data, rows, cols)) {
        break;
      }
    }

    for (; marginRight < cols; ++marginRight) {
      if (!isColumnTransparent(cols - marginRight - 1, data, rows, cols)) {
        break;
      }
    }

    for (; marginTop < rows; ++marginTop) {
      if (!isRowTransparent(marginTop * cols, data, cols)) {
        break;
      }
    }

    for (; marginBottom < rows; ++marginBottom) {
      if (!isRowTransparent((rows - marginBottom - 1) * cols, data, cols)) {
        break;
      }
    }
  }

  // edge case: handle fully transparent images
  if (marginTop === rows) {
    marginTop = rows - 1;
    marginBottom = 0;
  }
  if (marginLeft === cols) {
    marginLeft = cols - 1;
    marginRight = 0;
  }

  return {
    top: marginTop,
    right: marginRight,
    bottom: marginBottom,
    left: marginLeft
  };
};

ImageInfo.prototype.toJSON = function () {
  return {
      f: this.filename,
      x: this.x,
      y: this.y,
      w: this.contentWidth,
      h: this.contentHeight,
      t: this.margin.top || undefined,
      l: this.margin.left || undefined,
      b: this.margin.bottom || undefined,
      r: this.margin.right || undefined,
      s: !this.scale || this.scale == 1 ? undefined : this.scale,
      g: this.group || undefined, // TODO: groups?
    };
};

function isColumnTransparent(column, data, rows, cols) {
  for (var i = 0; i < rows; ++i) {
    if (data[4 * (i * cols + column) + 3] !== 0) { return false; }
  }

  return true;
}

function isRowTransparent(rowOffset, data, cols) {
  for (var i = 0; i < cols; ++i) {
    if (data[4 * (rowOffset + i) + 3] !== 0) { return false; }
  }

  return true;
}
