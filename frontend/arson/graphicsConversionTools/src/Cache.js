const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const versionString = require('./config').versionString;
const cacheDataFile = require('./config').cacheDataFile;
const debug = require('debug');
const Overrides = require('./Overrides');


const log = debug('coretech_frontend:graphicsConversionTools:Cache');

/**
 * Used to compare the compression-state for compressed version of the image (in
 * the graphicsCache directory) against current compression-state.  On successful
 * compression of an image, compression-state is set, and persisted.
 */
class Cache {
  constructor (opts) {
    this.dir = opts.cacheDir;
    log('dir=', this.dir);

    if (!fs.existsSync(this.dir)) {
      log('> dir missing, making now');
      mkdirp.sync(this.dir);
    }

    this.load();
  }

  getFileName (fileName) {
    return path.join(this.dir, fileName);
  }

  _getDataFilePath () {
    return this.getFileName(cacheDataFile);
  }

  load () {
    const fileName = this._getDataFilePath();
    log('load: fileName=', fileName);

    if (!fs.existsSync(fileName)) {
      this.reset();
      return;
    }

    const rawData = fs.readFileSync(fileName, 'utf8');
    const parsedData = JSON.parse(rawData);

    // Make sure cache is of correct version, otherwise discard it
    if (parsedData.version !== versionString) {
      log(
        '> version mismatch, ignoring existing data: parsedData.version=',
        parsedData.version,
        'version=',
        versionString
      );
      this.reset();
      return;
    }

    this.overrides = new Overrides(parsedData.overrides);
    this.sheets = parsedData.sheets;
  }

  reset () {
    this.overrides = {};
    this.sheets = {};
  }

  toJSON () {
    return {
      version: versionString,
      sheets: this.sheets
    };
  }

  persist () {
    log('persist');
    const serializedData = JSON.stringify(this.toJSON(), null, 2);
    fs.writeFileSync(this._getDataFilePath(), serializedData);
  }

  // FIXME: Use object for data, not list
  setFileData (fileName, data, persist = true) {
    this.sheets[fileName] = data;

    if (persist) {
      this.persist();
    }
  }
}


module.exports = Cache;
