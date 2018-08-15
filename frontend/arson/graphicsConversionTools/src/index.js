const Promise = require('bluebird');
const SpritesheetCompression = require('./SpritesheetCompression');


const defaults = {
  mode: 'modeRelease',
  cacheDir: {},
  overrides: {}
};


module.exports = function graphicsCompression (options) {
  if (typeof options !== 'object')
    throw new Error('`options` should be an object');

  options = Object.assign({}, defaults, options);

  // Don't compress debug builds per Jimmy - says quant is too slow for use in
  //   development workflow.  Also says there are issues with dragging and dropping
  //   images around (maybe just slow?).
  if (options.mode == 'modeDebug') {
    return Promise.resolve();
  }

  var compressor = new SpritesheetCompression(options);
  return compressor.runAll();
};
