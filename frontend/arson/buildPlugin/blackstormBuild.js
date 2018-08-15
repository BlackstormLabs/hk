var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var child_process = require('child_process');
var path = require('path');
var generateSpriteSheets = require('./generateSpriteSheets');
var generateIndexHtml = require('./generateIndexHtml');
var generateSoundMap = require('./generateSoundMap');
var utils = require('../utils');
var findInPath = utils.findInPath;
var ConcatSource = require('webpack-sources').ConcatSource;
var mkdirp = require('mkdirp');
var doCompress = require('../graphicsConversionTools/src/index');
var os = require('os');
var chokidar = require('chokidar');
var obscuration = require('./obscuration');
var globalPathnameStorage = '';

// Do you want a ton of detail on what's going on with the plugin? Set this to
// true.
var verbose = false;

// We generate an inline cache of all the JSON files in the world, plus a couple
// we generate. This accumulates that data until it's time to bake it out.
var jsonFiles = {};

// Make sure cache folder exists.
mkdirp.sync('.cache/sprites');

// Compiles images into spritesheets and compress them.
function packSprites (compiler, outputPath, options) {
  var spritesheetPath = path.join(outputPath, 'spritesheets');
  var copiedImagePath = path.join(outputPath, 'resources', 'images');

  // We want to create a couple of folders.
  mkdirp.sync(spritesheetPath);
  mkdirp.sync(copiedImagePath);

  // It's good to report timing.
  var spriteStartMs = Date.now();

  // Pack and store JSON for the images. Async so we will put it in the
  // assetEmitPromises.
  var maxSpritesheetSize = options.rootPackage.manifest.browser.maxSpritesheetSize;
  var lowResImages = options.lowResImages;

  console.log('\n\nCompiling spritesheets...\n');

  return generateSpriteSheets(compiler, spritesheetPath, maxSpritesheetSize, lowResImages)
    .then(function (sheetMap) {
      jsonFiles['spritesheets/map.json'] = JSON.stringify(sheetMap);
      console.log('Sprites took ' + (Date.now() - spriteStartMs) + 'ms');
      return Promise.resolve();
    })
    // Fire image compression once all the images are processed.
    .then(function () {
      if (os.platform() === 'darwin') {
        return doCompress({
          path: [
            spritesheetPath,
            copiedImagePath
          ],
          mode: options.isRelease || options.isFullImageCompress
            ? 'modeRelease' : 'modeDebug',
          cacheDir: options.imageCacheLocation,
          basePath: outputPath,
          overrides: options.spritesheetOverrides
        });
      } else {
        console.log('Skip compressing images. Available on OSX only.');
        return Promise.resolve();
      }
    });
}

// We can gather most JSON before the dynamic JSON sources (sheets, soundmap)
// are generated, so that the final concat and write happens as late as
// possible in the build.
function gatherJSON (compiler, outpath) {

  globalPathnameStorage = outpath;
  if (verbose) console.log('Gathering JSON.');

  function handleJSON (filepath) {
    // Don't include metadata.
    if (filepath.indexOf('metadata.json') !== -1) { return; }

    // Don't include animation files
    if (filepath.indexOf('/data.json') !== -1) { return; }


    // Get the file!
    var fileData = fs.readFileSync(filepath, 'utf-8');

    // Parse and store.
    jsonFiles[filepath] = fileData;
  }

  // Grab all the places we know about json config files.
  findInPath('resources', /\.json$/, handleJSON);
  findInPath('src/conf', /\.json$/, handleJSON);

  if (verbose) console.log('50% done gathering JSON.');

  // Also copy all JS files and animation JSON files in resources.
  findInPath('resources', /(\/data.json|\.js)$/, function (filepath) {
    // Get the file!
    var fileData = fs.readFileSync(filepath, 'utf-8');

    // Write the file! Making sure its directory exists.
    var targetPath = outpath + '/' + path.dirname(filepath);
    mkdirp.sync(targetPath);
    fs.writeFileSync(outpath + '/' + filepath, fileData, { encoding: 'utf-8' });
  });

  var resourceList = [];

  findInPath('resources',
    function () { return true; },
    function (file) {
      resourceList.push(file);
    });

  // Game expects to have a list of all the resources, which we provide here.
  jsonFiles['resources/resource-list.json'] = JSON.stringify(resourceList);

  if (verbose) console.log('Done gathering JSON.');

}

function showNotification (message, gameTitle) {
  child_process.exec(`osascript -e 'display notification "${message}" with title "${gameTitle}" subtitle "Webpack Build"'`);
}

// Define the plugin class.
function BlackstormBuild (options) {
  // Plugin defaults.
  this.options = _.extend({}, options);
  this.isRelease = options.isRelease;
}

// This is where we hook into the webpack build.
BlackstormBuild.prototype.apply = function (compiler) {

  var thiz = this;

  // We'll want to always build sprites on the first compilation
  var rebuildSprites = true;

  // Hook up file system change monitoring. Fire a build when something changes.
  if (thiz.options.isWatch) {
    // We want to chain compilations if changes are occuring during compilation
    var compilationChain = Promise.resolve();

    // Accumulate changes before firing compile
    var compile = _.throttle(() => {
      // Chain compilation requests, but skip actual compilations if there are
      // no more changes to spritesheets
      compilationChain = compilationChain.then(() => {
        if (!rebuildSprites)
          return;

        return new Promise(resolve => compiler.run(resolve));
      });
    }, 300, {
      leading: false
    });

    // Monitor resource folder to catch all image, font, sound and localiation
    // file changes.
    chokidar.watch(thiz.options.resourceDir, { ignoreInitial: true })
      .on('all', () => {
        rebuildSprites = true;
        compile();
      });
  }

  compiler.plugin('before-compile', function (compilation, callback) {
    console.log('\nBuild starting...\n');
    callback();
  });

  // We need to always re-emit because we embed a bunch of our JSON state in
  // the final built artifact. It costs us a little time in the build but
  // keeps things working.
  compiler.plugin('should-emit', function () {
    return true;
  });

  compiler.plugin('make', function (compilation, callback) {
    // We can do these synchronously.
    if (verbose) console.log('Doing soundmap');
    jsonFiles['resources/sound-map.json'] = JSON.stringify(generateSoundMap(compiler, compilation.outputOptions.path));
    if (verbose) console.log('Done doing soundmap');
    gatherJSON(compiler, compilation.outputOptions.path, compilation.outputOptions.path);

    callback();
  });

  compiler.plugin('emit', function (compilation, callback) {
    Promise.resolve()
      .then(() => {
        if (!rebuildSprites)
          return;

        rebuildSprites = false;
        return packSprites(compiler, compilation.outputOptions.path, thiz.options);
      })
      .then(() => generateIndexHtml(compiler, {
        simulated: thiz.options.isSimulated,
        rootPackage: thiz.options.rootPackage,
        isRelease: thiz.options.isRelease
      }))
      .then(function () {
        // Generate our combined output JS file, and don't emit the original version.
        var inlineCache = 'window.CACHE = ' + JSON.stringify(jsonFiles) + ';\n\n';
        const compilationMainJS = compilation.assets['main.js'];
        // Cannot run ConcatSource if source is falsey
        if (!compilationMainJS) { return; }

        compilation.assets['browser-mobile.js'] = new ConcatSource(
          inlineCache,
          compilationMainJS
        );
        delete compilation.assets['main.js'];
      })
      .catch(error => {
        // Assuming the error came from sprite packing, we should try to rebuild
        // them on next compilation.
        rebuildSprites = true;

        // Webpack error reporting
        compilation.errors.push(error);
      })
      .finally(() => {
        // Let execution proceed.
        callback();
      });
  });

  var gameTitle = thiz.options.rootPackage.manifest.title;
  var stats;

  compiler.plugin('after-emit', function (compilation, callback) {
    // Notify we are done, only if success state changed
    var lastErrors = stats && stats.compilation.errors.length > 0;
    var lastWarnings = stats && stats.compilation.warnings.length > 0;

    stats = compilation.getStats();

    var currErrors = stats.compilation.errors.length > 0;
    var currWarnings = stats.compilation.warnings.length > 0;

    var stateChanged = lastErrors !== currErrors || lastWarnings !== currWarnings;

    if (stateChanged || thiz.isRelease) {
      if (currErrors)
        showNotification('Failed to compile', gameTitle);
      else if (currWarnings)
        showNotification('Compiled with warnings', gameTitle);
      else
        showNotification('Compiled successfully', gameTitle);
    }

    callback();
  });

  compiler.plugin('done', function () {
    if (thiz.options.isRelease) {
      obscuration(globalPathnameStorage);
    }

    if (thiz.options.isWatch && thiz.options.serverAddresses) {
      var addyList = thiz.options.serverAddresses();

      var msg = '';
      if (thiz.options.isFacebookMode) {
        msg =   '*** Development Servers Active ***\n' +
            ' (You can develop within Facebook by running npm run serveFacebook)\n' +
            ' Basic local server      : ' + addyList[0] + '\n' +
            ' Live reload local server: ' + addyList[1] + '\n';
      } else {
        var localServerPath = addyList[0];
        msg =   '*** Facebook Test Server Active ***\n' +
        ' First, go to ' + localServerPath + ' and make sure you have accepted the certificate.\n' +
        ' To run in Facebook, add ?game_url=' + localServerPath + ' to the end of a FB URL running the game.\n' +
            ' For instance: \n' +
            '   https://www.facebook.com/embed/instantgames/' + process.env.FB_APP_ID + '/player?game_url=' + localServerPath + '\n';
      }

      // We have to defer this to get it to consistently show up at end of build process.
      setTimeout(function () {
        obscuration(globalPathnameStorage);
        console.log('\n' + msg);
      }, 250);
    }
  });
};

module.exports = BlackstormBuild;
