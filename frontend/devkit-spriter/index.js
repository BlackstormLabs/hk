var DiskCache = require('./DiskCache');
var ImageLoader = require('./ImageLoader');
var layout = require('./layout');

exports.loadImages = function (files, scale) {
  return new ImageLoader().load(files, scale);
};

/**
 * @returns {Spritesheet[]}
 */
exports.sprite = layout;


exports.loadCache = function (cacheFile) {
  return DiskCache.load(cacheFile);
};

exports.verifySheets = require('./cachedSheets').verify;
exports.NotCachedError = require('./NotCachedError');
