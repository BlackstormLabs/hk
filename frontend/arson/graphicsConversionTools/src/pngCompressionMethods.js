const fs = require('fs');
const path = require('path');

const chalk = require('chalk');
const Promise = require('bluebird');
const debug = require('debug');
const UPNG = require('../jslib/upng');

const getHashAndSize = require('./utils').getHashAndSize;
const execFile = require('./utils').execFile;
const compressJPEG = require('./jpegCompressionMethods').compressJPEG;


// Promisified async functions
const copyFile = Promise.promisify(require('fs-copy-file'));
const readFile = Promise.promisify(fs.readFile);
const writeFile = Promise.promisify(fs.writeFile);


const log = debug('coretech_frontend:graphicsConversionTools:pngCompressionMethods');


const IMAGE_OPTIM_PATH = path.join(__dirname, '..', '/bin/ImageOptim.app/Contents/MacOS/ImageOptim');
const PNGQUANT_PATH = path.join(__dirname, '..', 'bin', 'pngquant');


/** Shared type passed to all png compression steps. */
// interface CompressOptions {
  // cache: Cache;
  // fast: boolean;
  // pngPath: string;
  // friendlyName: string;
  // cacheFileName: string;
  // sourceHashAndSize: HashAndSize;
  // params: any;
  // mode: string;
// }


const passthrough = function (opts) {
  console.log(chalk.yellow('\tOverride detected: Passthrough. Copying source file unaltered'));

  return copyFile(opts.pngPath, opts.cacheFileName)
    .then(() => {
      opts.cache.setFileData(
        opts.friendlyName,
        [
          opts.sourceHashAndSize.hash,
          opts.sourceHashAndSize.hash,
          opts.sourceHashAndSize.size,
          opts.sourceHashAndSize.size,
          opts.params,
          opts.mode
        ]
      );
    });
};

const lossless = function (opts) {
  console.log(chalk.yellow('\tOverride detected: Lossless.'));

  return Promise.resolve()
    .then(() => {
      if (opts.fast)
        return;

      log('\tImageOptim... (this is very slow)');
      return execFile(IMAGE_OPTIM_PATH, [opts.pngPath]);
    })
    .then(() => {
      return copyFile(opts.pngPath, opts.cacheFileName);  // copy compressed file to cache
    })
    .then(() => {
      // get stats on file after ImageOptim
      const hashAndSize = getHashAndSize(opts.pngPath);
      log('\t\tafter imageOptim: file size ' + hashAndSize.size);

      opts.cache.setFileData(
        opts.friendlyName,
        [
          opts.sourceHashAndSize.hash,
          hashAndSize.hash,
          opts.sourceHashAndSize.size,
          hashAndSize.size,
          opts.params,
          opts.mode
        ]
      );
    });
};

/**
 * posterizer
 * Takes a TrueColor png, posterizes it (with different amounts allowed for color vs alpha) and reduces
 *  it to an indexed color image
 * @param filename file to convert
 * @param rgbAmount number of color levels
 * @param alphaAmount number of alpha levels
 * @param reduceTo number of palette colors allowed in output
 */
const posterizer = function (filename, rgbAmount, alphaAmount, reduceTo) {
  return readFile(filename)
    .then(buff => {
      var img = UPNG.decode(buff);

      function remap (input, levels) {
        var slope = levels / 255;
        var output = Math.round(slope * input);
        slope = 1 / slope;
        return Math.round(slope * output);
      }

      for (var x = 0; x < img.width; x++) {
        for (var y = 0; y < img.height; y++) {
          var index = (y * img.width + x) * 4;
          img.data[index + 0] = remap(img.data[index + 0], rgbAmount);
          img.data[index + 1] = remap(img.data[index + 1], rgbAmount);
          img.data[index + 2] = remap(img.data[index + 2], rgbAmount);
          img.data[index + 3] = remap(img.data[index + 3], alphaAmount);
        }
      }

      var rgba = UPNG.toRGBA8(img).buffer;
      var out = UPNG.encode(rgba, img.width, img.height, reduceTo);

      return writeFile(filename, new Buffer(out, 'base64'));
    });
};

const posterize = function (opts) {
  console.log(chalk.yellow('\tOverride detected: Posterize.'));

  return posterizer(opts.pngPath, opts.params.rgb_amount, opts.params.alpha_amount, 0)
    .then(() => {
      if (opts.fast)
        return;

      log('\tImageOptim... (this is very slow)');
      return execFile(IMAGE_OPTIM_PATH, [opts.pngPath]);
    })
    .then(() => {
      return copyFile(opts.pngPath, opts.cacheFileName);  // copy compressed file to cache
    })
    .then(() => {
      // get stats on file after ImageOptim
      const hashAndSize = getHashAndSize(opts.pngPath);
      log('\t\tafter imageOptim: file size ' + hashAndSize.size);

      opts.cache.setFileData(
        opts.friendlyName,
        [
          opts.sourceHashAndSize.hash,
          hashAndSize.hash,
          opts.sourceHashAndSize.size,
          hashAndSize.size,
          opts.params,
          opts.mode
        ]
      );
    });
};

const forceJPG = function (opts) {
  console.log(chalk.yellow('\tOverride detected: Force JPG. Converting file from png to jpeg format'));

  return compressJPEG(opts.pngPath, opts.cacheFileName, opts.params.quality)
    .then(() => {
      // replace original with compressed
      return copyFile(opts.cacheFileName, opts.pngPath);
    })
    .then(() => {
      // get stats on file after converting
      const hashAndSize = getHashAndSize(opts.cacheFileName);
      log('\t\tafter guetzli: ' + chalk.blue('file size ' + hashAndSize.size));

      opts.cache.setFileData(
        opts.friendlyName,
        [
          opts.sourceHashAndSize.hash,
          hashAndSize.hash,
          opts.sourceHashAndSize.size,
          hashAndSize.size,
          opts.params,
          opts.mode
        ]
      );
    });
};

const solidFont = function (opts) {
  console.log(chalk.yellow('\tOverride detected: Solid Font.'));

  return posterizer(opts.pngPath, 16, 8, 0)
    .then(() => {
      return execFile(
        PNGQUANT_PATH,
        ['--nofs', '--speed', 1, '--force', '--ext', '.png', 64, '--', opts.pngPath]
      );
    })
    .then(() => {
      if (opts.fast)
        return;

      log('\tImageOptim... (this is very slow)');
      return execFile(IMAGE_OPTIM_PATH, [opts.pngPath]);
    })
    .then(() => {
      return copyFile(opts.pngPath, opts.cacheFileName);
    })
    .then(() => {
      const hashAndSize = getHashAndSize(opts.pngPath);
      opts.cache.setFileData(
        opts.friendlyName,
        [
          opts.sourceHashAndSize.hash,
          hashAndSize.hash,
          opts.sourceHashAndSize.size,
          hashAndSize.size,
          opts.params,
          opts.mode
        ]
      );
    });
};

const pngquant = function (opts) {
  log('\tpngquant ' + chalk.blue('params='), opts.params);
  const parsedParams = opts.params.raw ? opts.params.raw.split(' ') : [];

  return execFile(PNGQUANT_PATH, [...parsedParams, '--force', '--ext', '.png', '--', opts.pngPath])
    .then(() => {
      // get stats on file after pngquant
      const midHashAndSize = getHashAndSize(opts.pngPath);
      log('\t\tafter pngquant: file size ' + midHashAndSize.size);

      if (opts.fast)
        return;

      log('\tImageOptim... (this is very slow)');
      return execFile(IMAGE_OPTIM_PATH, [opts.pngPath]);
    })
    .then(() => {
      // copy compressed file to cache
      return copyFile(opts.pngPath, opts.cacheFileName);
    })
    .then(() => {
      // get stats on file after ImageOptim
      const hashAndSize = getHashAndSize(opts.pngPath);
      log('\t\tafter imageOptim: file size ' + hashAndSize.size);

      opts.cache.setFileData(
        opts.friendlyName,
        [
          opts.sourceHashAndSize.hash,
          hashAndSize.hash,
          opts.sourceHashAndSize.size,
          hashAndSize.size,
          opts.params,
          opts.mode
        ]
      );
    });
};

module.exports = {
  passthrough: passthrough,
  lossless: lossless,
  posterize: posterize,
  forceJPG: forceJPG,
  solidFont: solidFont,
  pngquant: pngquant
};
