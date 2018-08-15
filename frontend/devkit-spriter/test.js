var fs = require('graceful-fs');
var Promise = require('bluebird');
var Spriter = require('./Spriter');
var ImageLoader = require('./ImageLoader');

var filenames = fs.readdirSync('.').filter(function (img) {
  return /\.(png|jpg|bmp)/i.test(img);
});

var startLoad = Date.now();
var spritesheets = new Spritesheets();
var sheetNumber = 0;
new ImageLoader()
  .load(filenames)
  .then(function (images) {

    var hash = {};
    images = images.filter(function (image) {
      if (image.hash in hash) {
        return false;
      }

      hash[image.hash] = true;
      return true;
    });

    console.log("loaded", images.length, "images in", Date.now() - startLoad + 'ms');

    // require('./spriter').test(images);
    // return;
    new Spriter()
      .on('sheet', function (sheet) {
        spritesheets.push(sheet);
        sheet.name = 'spritetest-' + sheetNumber++;
        sheet.composite();
        sheet.write('spritesheets/' + sheet.name + '.png')
          .then(function () {
            sheet.recycle();
            sheet.recycleSprites();
          });
      })
      .sprite(images);

    console.log(JSON.stringify(spritesheets));

    console.log("sprited", Date.now() - startLoad + 'ms');
  });

function Spritesheets() {
  this._sheets = [];
}

Spritesheets.prototype.push = function (sheet) {
  this._sheets.push(sheet);
};

Spritesheets.prototype.toJSON = function () {
  var res = {};
  this._sheets.forEach(function (sheet) {
    res[sheet.name] = sheet.toJSON();
  });
  return res;
};

/*
function (images) {
  var img = new ImageBuffer({width: SHEET_MAX_SIZE, height: SHEET_MAX_SIZE});
  SheetWriter.prototype.blit.call({image: img}, images[1], 10, 10);
  img.write('sheet-test.png');
}
*/
