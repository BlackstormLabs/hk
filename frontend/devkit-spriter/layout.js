
/**
 * Update Oct 27, 2017 by Rhett Anderson
 *
 * Fix infinite loop that happens when an image that's too large to fit spills out into a second sheet
 *
 * Update Aug 18, 2017 by Rhett Anderson
 *
 * Keeps the safety of the previous version (no infinite loop) while allowing the code to find the better
 * packing options of the earlier versions.
 *
 * Update Aug 16, 2017 by Rhett Anderson
 *
 * Fixed infinite loop when spriting in cats data
 * Changed for loop to while loop and added some early exits for speeding up the process
 *
 * Update Aug 12, 2017 by Rhett Anderson
 *
 * Cleaner loop. Smarter packing.
 *
 * Updated Aug 9-10, 2017 by Rhett Anderson
 *
 * The spriter is a naive packer. It sorts images by size and then plops them down into a spritesheet. It's
 * very willing to make a long horizontal line until it crosses the 2048 pixel boundary. This tends to leave
 * a lot of unused texture memory.
 *
 * Rather than rewrite the naive packer, I run it at different maximum widths (2048, 1024, 512) and compare
 * the outcomes. I choose the one with the smallest number of pixels (area).
 *
 * This is a pretty brute-force solution to improve the texture memory situation. Packing algorithms are not
 * trivial. A better next step than improving this would be to use a proven solution like texturePackerPro.
 *
 */

var Spritesheet = require('./Spritesheet');

var DEFAULT_MAX_SIZE = 2048;
var DEFAULT_PADDING = 2;

/**
 * @returns {Spritesheet[]}
 */

module.exports = function (images, opts) {
  var bestArea = -1;
  var bestNumSheets = 1000;
  var bestX = DEFAULT_MAX_SIZE;

  if (!opts) { opts = {}; }
  var maxSizeX = opts.maxSize !== undefined ? opts.maxSize : DEFAULT_MAX_SIZE;
  var maxSizeY = opts.maxSize !== undefined ? opts.maxSize : DEFAULT_MAX_SIZE;
  var padding = opts.padding !== undefined ? opts.padding : DEFAULT_PADDING;
  var powerOfTwoSheets = opts.powerOfTwoSheets !== undefined ? !!opts.powerOfTwoSheets : true;
  var name = opts.name || '';
  var ext = opts.ext || '';
  var imageMemory = images;

  // used for the calculation of the power of two that a texture will fit into
  function highestBitSet (value) {
    var r = 0;
    while ((value >>= 1) > 0) {
      r++;
    }
    return r;
  }

  function createSpritesheet () {
    return new Spritesheet({
      name: name + (sheetIndex++) + ext,
      padding: padding,
      powerOfTwoSheets: powerOfTwoSheets
    });
  }

  var finalpass = 4;
  var pass = 0;

  while (pass <= finalpass) {
    if (pass == finalpass) {
      maxSizeX = bestX;
    }

    images = imageMemory;
    var sheets = [];
    var sheetIndex = 1;
    var sheet = createSpritesheet();
    var seen = {};

    // handle large images
    images = images.filter(function (image) {
      if (image.contentWidth <= maxSizeY && image.contentHeight <= maxSizeX) {
        return true;
      }

      sheets.push(createSpritesheet().add(image, 0, 0));
      return false;
    }, this);

    images.sort(sortLargestAreaFirst);

    var greatestX = 0;
    var greatestY = 0;

    var widest = 0;
    for (var i = 0; i < images.length; i++) {
      if (images[0].contentWidth + DEFAULT_PADDING > widest) {
        widest = images[0].contentWidth + DEFAULT_PADDING;
      }
    }

    var numBitmaps = images.length;
    var proposedWidth = 2048;

    //----infinite loop in this while
    var malformed = false;
    while (images.length) {
      if (malformed) {
        break;
      }
      var points = [{ x: 0, y: 0 }];
      while (points[0]) {
        var index = getTopLeftPoint(points);
        var pt = points[index];
        points.splice(index, 1);
        if (pt.x >= maxSizeX || pt.y >= maxSizeY) {
          continue;
        }

        var right = maxSizeX + padding;
        while (index < points.length) {
          var rightPoint = points[index];
          if (rightPoint.y == pt.y) {
            points.splice(index, 1);
          } else {
            right = rightPoint.x;
            break;
          }
        }

        var i = 0;
        var placed = false;

        while (i < images.length) {
          var image = images[i];
          var x = pt.x;
          var y = pt.y;
          var width = image.contentWidth + padding;
          var height = image.contentHeight + padding;

          //if image is bigger than our sheet size, we're very done
          if (width > maxSizeX) {
            malformed = true;
            break;
          }

          if (x > 0) { x += padding; width += padding; }
          if (y > 0) { y += padding; height += padding; }

          if (seen[image.hash]) {
            var seenInfo = seen[image.hash];
            seenInfo.sheet.addDuplicate(image, seenInfo.image);
            images.splice(i, 1);
            continue;
          }

          if (width <= right - pt.x && height <= maxSizeY + padding - pt.y) {
            placed = true;
            if (pt.x + width > greatestX) {
              greatestX = pt.x + width;
            }
            if (pt.y + height > greatestY) {
              greatestY = pt.y + height;
            }

            images.splice(i, 1);
            sheet.add(image, x, y);
            seen[image.hash] = {
              image: image,
              sheet: sheet
            };

            var nextX = pt.x + width;
            var nextY = pt.y + height;
            nextY += nextY & 0x1;
            nextX += nextX & 0x1;

            // bottom-left point
            var found = addPoint(pt.x, nextY);
            if (found > -1) {
              points.splice(found, 1);
            }

            // top-right point
            if (nextX < maxSizeX && pt.y < maxSizeY) {
              addPoint(nextX, pt.y);
            }
            break;
          } else {
            ++i;
          }
        }

        if (!placed) {
          var leftPoint = null;
          var rightPoint = null;
          var n = points.length;
          for (var i = 0; i < n; ++i) {
            var e = points[i];
            if (e.x < pt.x) {
              leftPoint = e;
              if (i + 1 < n) {
                rightPoint = points[i + 1];
              }
            }
          }

          if (leftPoint && rightPoint && rightPoint.y < leftPoint.y) {
            rightPoint.x = pt.x;
          }
        }
      }

      if (sheet.length > 0) {
        sheets.push(sheet);
        sheet = createSpritesheet();
      }
    }

    var po2x = 2 << highestBitSet(greatestX - padding - 1);
    var po2y = 2 << highestBitSet(greatestY - padding - 1);

    var po2area = po2x * po2y;

    if ((bestArea < 0 || po2area <= bestArea) && (sheets.length <= bestNumSheets)) {
      bestArea = po2area;
      bestX = po2x;
      bestNumSheets = sheets.length;
    }

    if (po2x > DEFAULT_MAX_SIZE) {
      po2x = DEFAULT_MAX_SIZE;
    }

    maxSizeX = po2x / 2;
    if (maxSizeX < widest) {
      maxSizeX *= 2;
    }

    if (proposedWidth < maxSizeX) {
      maxSizeX = proposedWidth;
    }

    if ((maxSizeX < 64) && (pass < finalpass)) {
      pass = finalpass - 1;
    }

    if ((numBitmaps < 3) && (pass < finalpass)) {
      pass = finalpass - 1;
    }

    if ((sheets > bestNumSheets) && (pass < finalpass)) {
      pass = finalpass - 1;
    }

    if ((greatestX > DEFAULT_MAX_SIZE/2) && (greatestY > DEFAULT_MAX_SIZE/2) && pass < finalpass) {
      bestX = DEFAULT_MAX_SIZE;
      pass = finalpass - 1;
    }

    if (bestX > DEFAULT_MAX_SIZE) {
      bestX = DEFAULT_MAX_SIZE;
      maxSizeX = bestX / 2;
    }

    if (malformed) {
      bestX = DEFAULT_MAX_SIZE;
      pass = finalpass - 1;
    }

    proposedWidth /= 2;
    pass++;
  }

  return sheets;

  // returns index of found point, or inserts the point and returns -1
  function addPoint (x, y) {
    var i = points.length;
    var insertAt = i;
    while (i-- > 0) {
      var pt = points[i];
      if (pt.x == x && pt.y == y) {
        return i;
      }

      // find the insertion index such that the array is sorted left-to-right,
      // top-to-bottom
      if (x < pt.x || x == pt.x && y < pt.y) {
        insertAt = i;
      }
    }

    points.splice(insertAt, 0, { x: x, y: y });
    return -1;
  }
};

function sortLargestAreaFirst (a, b) {
  return b.contentArea - a.contentArea;
}

function getTopLeftPoint (points) {
  var index = 0;
  var minX = points[0].x;
  var minY = points[0].y;

  var n = points.length;
  for (var i = 0; i < n; ++i) {
    var pt = points[i];
    if (pt.y < minY || pt.y == minY && pt.x < minX) {
      index = i;
      minX = pt.x;
      minY = pt.y;
    }
  }

  return index;
}
