var NotCachedError = require('./NotCachedError');
var Promise = require('bluebird');
var path = require('path');
var fs = require('graceful-fs');

var exists = function (filename) {
  return new Promise(function (resolve, reject) {
    fs.exists(filename, function (exists) {
      if (exists) {
        resolve();
      } else {
        reject();
      }
    });
  });
};

var stat = Promise.promisify(fs.stat);

exports.verify = function (spritesheetsDirectory, filenames, mtimes, sheets) {
  var currentMtime = {};
  return Promise
    .resolve(filenames)
    .bind(this)
    .map(function (filename) {
      // compute all new mtimes
      return stat(filename)
        .then(function (stat) {
          currentMtime[filename] = stat.mtime.getTime();
        });
    })
    .then(function () {
      if (!mtimes || !sheets) {
        throw new NotCachedError('cache missing');
      }
      // set cache to current mtimes, when cache gets written it will have the
      // lastest values

      // validate no new files were added to the group since the last spriting
      for (var filename in currentMtime) {
        if (!(filename in mtimes)) {
          throw new NotCachedError('new file: ' + filename);
        } else if (mtimes[filename] != currentMtime[filename]) {
          throw new NotCachedError('file updated: ' + filename);
        }
      }

      // validate no files were removed from the group since the last spriting
      for (var filename in mtimes) {
        if (!(filename in currentMtime)) {
          throw new NotCachedError('file removed: ' + filename);
        }
      }

      return Promise.map(sheets, function (sheet) {
          // validate sheet has a name and sprites
          if (!sheet || !sheet.name || !sheet.sprites) {
            console.log(sheet);
            throw new NotCachedError('cache corrupted: missing sheet');
          }

          // validate sheet sprites are in the mtime hash
          sheet.sprites.forEach(function (info) {
            if (!info.f || !(info.f in currentMtime)) {
              throw new NotCachedError('cache corrupted: missing filename');
            }
          });

          // validate sheet exists
          var sheetFilename = path.join(spritesheetsDirectory, sheet.name);
          return exists(sheetFilename)
            .catch(function (e) {
              throw new NotCachedError('spritesheet missing: ' + sheetFilename);
            });
        });
    })
    .catch(function (err) {
      if (err instanceof NotCachedError) {
        err.mtimes = currentMtime;
      }

      throw err;
    });
};
