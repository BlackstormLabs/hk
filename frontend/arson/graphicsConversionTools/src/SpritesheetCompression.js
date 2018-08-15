const debug = require('debug');
const chalk = require('chalk');
const _ = require('lodash');
const Promise = require('bluebird');
const fs = require('fs');
const getFileHash = require('./utils').getFileHash;
const getHashAndSize = require('./utils').getHashAndSize;
const os = require('os');
const versionString = require('./config').versionString;
const cacheDataFile = require('./config').cacheDataFile;
const Overrides = require('./Overrides');
const Cache = require('./Cache');
const pngCompressionMethods = require('./pngCompressionMethods');
const compressJPEG = require('./jpegCompressionMethods').compressJPEG;

const childProcess = require('child_process');
const execFileSync = childProcess.execFileSync;
const execFile = Promise.promisify(childProcess.execFile);
const copyFile = Promise.promisify(require('fs-copy-file'));

const log = debug('coretech_frontend:graphicsConversionTools:SpritesheetCompression');


// Note: Leave one core free
const WORKER_CPU_COUNT = _.clamp(os.cpus().length - 1, 1, 4);
log('WORKER_CPU_COUNT=', WORKER_CPU_COUNT);


const releaseParams = '--floyd=1.0 --speed 1';
const debugParams = '--floyd=1.0 --speed 3';


class SpritesheetCompression {
  constructor (options) {
    this.mode = options.mode;
    this.outputPath = options.path;
    this.basePath = options.basePath;
    this.totalTextureArea = 0;

    this.overrides = new Overrides(options.overrides);

    this.cache = new Cache({
      cacheDir: options.cacheDir,
      fileName: options.cacheFileName,
      overrides: options.overrides
    });

    if (this.mode === 'modeDebug') {
      this.fast = true;
      this.standardParams = debugParams;
    } else {
      this.fast = false;
      this.standardParams = releaseParams;
    }

    console.log('\ngraphicsCompression.js. Version ' + versionString + '.');
    console.log('  cacheDataFile: ' + this.cache.getFileName(cacheDataFile));
  }

  /**
   * helper method that checks the file type
   * @param str input string (like "file.png")
   * @param suffix file extension (like ".png")
   * @returns true or false
   */
  endsWith (str, suffix) {
    return str.slice(-suffix.length) === suffix;
  }

  /** FIXME: Friendly how? */
  getFriendlyName (name) {
    return name.substr(this.basePath.length + 1).replace(/\//g, '_');
  }

  getTimeString (ms) {
    let seconds = Math.floor(ms / 1000);
    var minutes = (seconds / 60) | 0;
    seconds -= minutes * 60;
    if (seconds < 10) {
      return minutes + ':0' + seconds;
    } else {
      return minutes + ':' + seconds;
    }
  }

  /**
   * generate a list of png files and places them in png_list
   *   then start compression
   * @param path spritesheets directory
   */
  launch () {
    log('launching... Path is ' + this.outputPath);
    log('current working directory is ' + process.cwd());

    var findArgs = typeof this.outputPath === 'string'
      ? [this.outputPath] : this.outputPath;

    var findStdOut = execFileSync('find', findArgs).toString();

    var pngList = [];
    var jpgList = [];
    var fileList = findStdOut.split('\n');

    log('File list:');
    fileList.forEach(element => {
      if (this.endsWith(element, '.png')) {
        pngList.push(element);
      }
      if (this.endsWith(element, '.jpg')) {
        jpgList.push(element);
      }
      log('  ' + element);
    });

    return [pngList, jpgList];
  }

  report () {
    var cacheSheetData = this.cache.sheets;
    var count = 0;

    var totalBeforeSize = 0;
    var totalAfterSize = 0;
    for (var key in cacheSheetData) {
      if (cacheSheetData.hasOwnProperty(key)) {
        var beforeSize = cacheSheetData[key][2];
        var afterSize = cacheSheetData[key][3];
        count++;
        totalBeforeSize += beforeSize;
        totalAfterSize += afterSize;
      }
    }
    console.log('---SIZE REPORT---');
    console.log('Total number of files that have been cached (clear cache if needed): ' + count);
    console.log('Before and after size, in bytes');
    console.log('   before\t' + totalBeforeSize);
    console.log('   after \t' + totalAfterSize);
    console.log('   compression ratio:' + totalAfterSize / totalBeforeSize);
    console.log('Total texture area : ' + this.totalTextureArea);
  }

  _processJPEGs (jpgs) {
    if (this.fast) {
      console.log(chalk.whiteBright('---Skipping jpeg compression---'));
      return Promise.resolve();
    }

    console.log(chalk.whiteBright('---Compressing ' + jpgs.length + ' jpg files---'));

    return Promise.map(
      jpgs,
      (jpg, index) => {
        return this._processJPEG(jpg, index, jpgs.length);
      },
      { concurrency: WORKER_CPU_COUNT }
    )
    .then(() => {
      console.log(chalk.whiteBright('---Compression of jpg files done---'));
    });
  }

  _processJPEG (jpgPath, index, indexCount) {
    return Promise.resolve()
      .then(() => {
        // Load the jpg and note its hash.
        var sourceHash = getFileHash(jpgPath);

        // Get the cache data
        var friendlyName = this.getFriendlyName(jpgPath);
        var params = this.overrides.getParamsForFile(friendlyName, this.standardParams);
        var cacheName = this.cache.getFileName(friendlyName);

        const rawCacheData = this.cache.sheets[friendlyName];
        const cacheData = {
          sourceHash: undefined,
          destinationHash: undefined,
          sourceSize: undefined,
          destinationSize: undefined,
          params: undefined,
          mode: undefined
        };
        const hasCacheData = !!rawCacheData;
        if (hasCacheData) {
          cacheData.sourceHash = rawCacheData[0];
          cacheData.destinationHash = rawCacheData[1];
          // cacheData.destinationSize = rawCacheData[2];
          // cacheData.destinationSize = rawCacheData[3];
          cacheData.params = rawCacheData[4];
          cacheData.mode = rawCacheData[5];
        }
        const currentParamsMatchCache = this._currentParamsMatchCache(params, cacheData);

        // If the dest hash is found, do nothing and exit
        if (
          hasCacheData
          && cacheData.sourceHash === sourceHash
          && fs.existsSync(cacheName)
          && currentParamsMatchCache
        ) {
          log('\trecognized hash and found cached file... copying');
          return copyFile(cacheName, jpgPath);
        }

        if (
          hasCacheData
          && cacheData.destinationHash === sourceHash
          && currentParamsMatchCache
        ) {
          log('\trecognized hash... the file found has already been converted');
          return;
        }

        console.log(`Compressing ${index + 1} of ${indexCount}: ${chalk.green(friendlyName)}`);

        // Load the jpg and note its hash and file size
        const sourceHashAndSize = getHashAndSize(jpgPath);

        // Use guetzli for higher quality compression and mozjpeg for lower quality
        return compressJPEG(jpgPath, cacheName, params.quality)
          .then(() => {
            // Replace original with the compressed
            return copyFile(cacheName, jpgPath);
          })
          .then(() => {
            // Get new hash, get new file size, write to cache json, write to cache
            const hashAndSize = getHashAndSize(cacheName);

            // Write hash to cacheData object
            this.cache.setFileData(
              friendlyName,
              [
                sourceHashAndSize.hash,
                hashAndSize.hash,
                sourceHashAndSize.size,
                hashAndSize.size,
                params,
                this.mode
              ]
            );
          });
      });
  }

  runAll () {
    var lists = this.launch();
    return this._processPNGs(lists[0])
    .then(() => this._processJPEGs(lists[1]));
  }

  _currentParamsMatchCache (currentParams, cacheData) {
    return _.isEqual(currentParams, cacheData.params) && (this.mode === cacheData.mode);
  }

  _processPNG (pngPath, index, indexCount, startTime) {
    log(`_processPNG: Index= ${index} of ${indexCount} Path= ${pngPath}`);

    const friendlyName = this.getFriendlyName(pngPath);
    const cacheFileName = this.cache.getFileName(friendlyName);

    const params = this.overrides.getParamsForFile(friendlyName, this.standardParams);
    const sourceHashAndSize = getHashAndSize(pngPath);
    log(
      'Source image info:'
      + `\n\tFile size=\t${sourceHashAndSize.size}`
      + `\n\tFile hash=\t${sourceHashAndSize.hash}`
    );

    const rawCacheData = this.cache.sheets[friendlyName];
    const hasCacheData = !!rawCacheData;

    const cacheData = {
      sourceHash: undefined,
      destinationHash: undefined,
      sourceSize: undefined,
      destinationSize: undefined,
      params: undefined,
      mode: undefined
    };
    if (hasCacheData) {
      cacheData.sourceHash = rawCacheData[0];
      cacheData.destinationHash = rawCacheData[1];
      cacheData.sourceSize = rawCacheData[2];
      cacheData.destinationSize = rawCacheData[3];
      cacheData.params = rawCacheData[4];
      cacheData.mode = rawCacheData[5];
    }

    const currentParamsMatchCache = this._currentParamsMatchCache(params, cacheData);

    if (
      hasCacheData
      && cacheData.sourceHash === sourceHashAndSize.hash
      && fs.existsSync(cacheFileName)
      && currentParamsMatchCache
    ) {
      log('\trecognized source hash and found cached file... copying');
      return copyFile(cacheFileName, pngPath);
    }

    if (
      hasCacheData
      && cacheData.destinationHash == sourceHashAndSize.hash
      && currentParamsMatchCache
    ) {
      log('\trecognized destination hash... the file found has already been converted');
      return;
    }

    const elapsedMS = new Date().getTime() - startTime;
    console.log('[' + chalk.blue(this.getTimeString(elapsedMS)) + '] Compressing ' + (index + 1) + ' of ' + indexCount + ': ' + chalk.green(friendlyName));

    // Build shared compressOptions object
    const compressOptions = {
      cache: this.cache,
      pngPath: pngPath,
      friendlyName: friendlyName,
      cacheFileName: cacheFileName,
      sourceHashAndSize: sourceHashAndSize,
      params: params,
      mode: this.mode,
      fast: this.fast
    };

    // FIXME: camelCase variable names in JS
    if (params.pass_through) {
      return pngCompressionMethods.passthrough(compressOptions);
    } else if (params.lossless) {
      return pngCompressionMethods.lossless(compressOptions);
    } else if (params.posterize) {
      return pngCompressionMethods.posterize(compressOptions);
    } else if (params.force_jpg) {
      return pngCompressionMethods.forceJPG(compressOptions);
    } else if (params.solid_font) {
      return pngCompressionMethods.solidFont(compressOptions);
    } else {
      return pngCompressionMethods.pngquant(compressOptions);
    }
  }

  /**
   * Call pngquant on png files one by one (with parameters optionally provided by a json file)
   * Then call ImageOptim on the whole directory (much faster than calling it file by file)
   * @param pngs the list of png filenames
   */
  _processPNGs (pngPaths) {
    const startTime = new Date().getTime();

    console.log(chalk.whiteBright('---Compressing ' + pngPaths.length + ' png files---'));

    // process png files
    if (pngPaths.length === 0) {
      console.log(chalk.whiteBright('---No png files found to compress. Skipping.---'));
      return Promise.resolve();
    }

    return Promise.map(
      pngPaths,
      (png, pngIndex) => {
        return this._processPNG(png, pngIndex, pngPaths.length, startTime);
      },
      { concurrency: WORKER_CPU_COUNT }
    )
    .then(() => {
      console.log(chalk.whiteBright('---Compression of png files done---'));

      // Finalize build
      // update hashes file
      this.cache.persist();

      const elapsedMS = new Date().getTime() - startTime;
      console.log('Total elapsed time: ' + this.getTimeString(elapsedMS));
    });
  }
}


module.exports = SpritesheetCompression;
