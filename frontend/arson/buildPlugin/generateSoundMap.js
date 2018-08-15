var findInPath = require('../utils').findInPath;
var path = require('path');
var verbose = false;
var mkdirp = require('mkdirp');
var fs = require('fs');

// Generate the sound map JSON, which is just a map of the various sound files.
module.exports = function generateSoundMap (compiler, outpath) {
  var soundStartMs = new Date().getTime();

  const SOUND_EXTS = {
    '.mp3': true,
    '.ogg': true,
    '.mp4': true,
    '.3gp': true,
    '.m4a': true,
    '.aac': true,
    '.flac': true,
    '.mkv': true,
    '.wav': true
  };

  // Scan for all the sound files and note them in the result map.
  var resultMap = {};
  findInPath('resources', function (f) {
    return (path.extname(f) in SOUND_EXTS);
  }, function (f) {

    // Copy it!
    var fileData = fs.readFileSync(f, 'binary');
    var targetPath = outpath + '/' + path.dirname(f);
    mkdirp.sync(targetPath);

    var fileEncoding = { encoding: 'binary' };
    fs.writeFileSync(outpath + '/' + f, fileData, fileEncoding);

    // And note it.
    resultMap[f] = true;
  });

  if (verbose) console.log('Sound map took ' + (new Date().getTime() - soundStartMs) + 'ms');

  return resultMap;
};
