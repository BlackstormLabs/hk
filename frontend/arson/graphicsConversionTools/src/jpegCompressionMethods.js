const path = require('path');

const execFile = require('./utils').execFile;


const MS_MIN = 1000 * 60;


const mozjpegBinaries = {
  darwin: 'bin/mozjpeg/darwin/cjpeg',
  linux: 'bin/mozjpeg/linux/cjpeg'
};


const GUETZLI_PATH = path.join(__dirname, '..', 'bin', 'guetzli');
const MOZJPEG_PATH = path.join(__dirname, '..', mozjpegBinaries[process.platform]);


const compressJPEG = function (origName, cacheName, quality) {
  const execFileOptions = { timeout: 8 * MS_MIN };
  // Use guetzli for higher quality compression and mozjpeg for lower quality
  return quality >= 85
    ? execFile(GUETZLI_PATH, ['--quality', quality, origName, cacheName], execFileOptions)
    : execFile(MOZJPEG_PATH, ['-quality', quality, '-outfile', cacheName, origName], execFileOptions);
};


module.exports = {
  compressJPEG: compressJPEG
};
