'use strict';

var Promise = require('bluebird');
var fs = require('fs');
var DevKitSpriter = require('../../devkit-spriter');
var path = require('path');
var fsSync = require('fs-sync');
var mkdirp = require('mkdirp');
var findInPath = require('../utils').findInPath;
var BuildCache = require('../cache/cache').BuildCache;

var verbose = false;

/**
 * TODO:
 *  - Note unspritable stuff.
 *  - Implement package functionality (re-encode inputs at certain quality).
 *  - Implement caching (hash of inputs of group + group metadata = output data).
 *  - Scaling.
 *  - Emitting half res.
 *  - Get in/out directories based on webpack knowledge.
 */

// Prepended to group names for low res versions.
const LOW_RES_KEY = 'low_res_';

// Input and output folders.
const SPRITE_ROOT = 'resources';
var SPRITE_OUT = 'dist/spritesheets';

var spriteCache = new BuildCache();

var metadataCache = {};
var sheetJsonCache = {};

// Helpers to read and write sprite cache entries.
// The runtime representation is:
//     cacheFiles: {} // dictionary of Buffers indexed by filename representing written files.
// So pretty simple to break down into streams.
function writeCacheEntry (inputKey, cacheObj) {

  var startTime = (new Date()).getMilliseconds();

  // Generate canonical file list.
  var fileList = [];
  for (var f in cacheObj.files) { fileList.push(f); }
  fileList.sort();

  // Convert to a buffer.
  var headerStr = JSON.stringify({
    sheets: cacheObj.sheets,
    files: fileList
  });

  var headerSize = (new Buffer(headerStr, 'utf8')).length;
  var headerBuff = Buffer.alloc(headerSize + 4);
  headerBuff.writeInt32BE(headerSize, 0);
  (new Buffer(headerStr, 'utf8')).copy(headerBuff, 4);

  var fd = spriteCache.openForWriteSync(inputKey);
  fs.writeSync(fd, headerBuff, 0, headerBuff.length);

  var written = headerBuff.length;

  var sizeBuff = new Buffer(4);

  fileList.forEach(function (file) {
    var fileBytes = cacheObj.files[file];
    var fileLen = fileBytes.length;

    // console.log("   - writing " + fileLen + " for " + file + " " + fileBytes.toString("hex").substring(0, 1024));

    sizeBuff.writeInt32BE(fileLen, 0);
    fs.writeSync(fd, sizeBuff, 0, 4, written); written += 4;
    fs.writeSync(fd, fileBytes, 0, fileLen, written); written += fileLen;
  });

  fs.closeSync(fd);

  if (verbose) console.log('Write time ' + (((new Date()).getMilliseconds()) - startTime) + 'ms');

  return Promise.resolve();
}

function readIntFromFd (fd) {
  var b = Buffer.alloc(4);
  fs.readSync(fd, b, 0, b.length, null);
  return b.readInt32BE(0);
}

// Wrapping the basic cache functionality, deserializes cached sprite sheet item.
function readCacheEntry (inputKey) {

  if (verbose) console.log("readCacheEntry - '" + inputKey + "'");

  var header = null;
  var cacheObj = { files: {} };

  // Read initial JSON.
  var cacheEntryFileDescriptor = spriteCache.openForReadSync(inputKey);
  if (!cacheEntryFileDescriptor) {
    return null;
  }

  var startTime = Date.now();

  var jsonSize = readIntFromFd(cacheEntryFileDescriptor);
  var headerBuff = Buffer.alloc(jsonSize);
  fs.readSync(cacheEntryFileDescriptor, headerBuff, 0, jsonSize, null);

  var json = headerBuff.toString('utf8');
  try {
    header = JSON.parse(json);
  } catch (e) {
    throw new Error('Cache JSON parse failed due to: ' + e);
  }

  // Get the sheet info off the file list.
  cacheObj.sheets = header.sheets;

  // Grab the files into the cache object.
  header.files.forEach(function (file) {
    var fileSize = readIntFromFd(cacheEntryFileDescriptor);
    var fileBuff = Buffer.alloc(fileSize);
    fs.readSync(cacheEntryFileDescriptor, fileBuff, 0, fileSize, null);
    cacheObj.files[file] = fileBuff;
  });

  fs.closeSync(cacheEntryFileDescriptor);

  if (verbose) console.log('Read time ' + (((new Date()).getMilliseconds()) - startTime) + 'ms');

  return cacheObj;
}

// Given a list of matched rules from checkRule, lets you
// get a property allowing last matching rule to have priority.
function getCombinedProperty (rules, prop) {
  var n = rules.length;
  for (var i = 0; i < n; ++i) {
    if (prop in rules[i]) {
      return rules[i][prop];
    }
  }

  return null;
}

// Returns a promise that will resolve to true if we could output from cache,
// and false if not.
function cacheChecker (spriteGroup, opts) {

  var cacheGroupName = spriteGroup.name;

  // Check if we can fetch from cache. Include relevant settings. We do this
  // manually to make it easy to ensure canonical order.
  // First number is version.
  var cacheKey = 'spriter:6:' + opts.ext + '|' + opts.mime + '|' + opts.name + '|' + cacheGroupName + '|';

  // The object we will actually store.
  var cacheObj = {
    data: {}
  };

  // Can we early out on all the input files? If so we can just bail.
  var okToBail = true;
  spriteGroup.files.forEach(function (item) {
    if (spriteCache.checkFileStateCache(item) != null) { okToBail = false; }
  });

  if (spriteGroup.metadata._path && spriteCache.checkFileStateCache(spriteGroup.metadata._path) != null) { okToBail = false; }

  if (okToBail && sheetJsonCache[cacheGroupName]) {
    // This seems to cache too aggressively so we are disabling it. -- BJG
    // return sheetJsonCache[cacheGroupName];
  }

  // Get hash of all the input files (sprites and metadata).
  var hashStr = '|' + spriteCache.hashFiles(spriteGroup.files);
  if (spriteGroup.metadata._path) {
    hashStr += '|' + spriteCache.hashFile(spriteGroup.metadata._path);
  } else {
    hashStr += '|default metadata|';
  }

  // Include file hashes in the key.
  cacheKey += hashStr;

  // Also include hash of the filenames since they directly affect the spritesheet output.
  cacheKey += spriteGroup.files.join('|');

  // Also get all the scales in a canonical order for more stable caching.
  spriteGroup.files.sort();
  spriteGroup.files.forEach(function (file) {
    cacheKey += ':' + spriteGroup.fileScales[file];
  });

  // Note the key for later use.
  cacheObj.inputKey = cacheKey;

  // Great, now we can try to get the cached version.
  var result = readCacheEntry(cacheKey);

  // Not cached, so move on.
  if (!result) {
    cacheObj.cached = false;
    return cacheObj;
  }

  // Great. We stored it as a JSON array so we can write out each
  // output file.
  var fileList = Object.keys(result.files);
  fileList.forEach(function (_path) {

    const dest = SPRITE_OUT + '/' + _path;
    const destPath = path.dirname(dest);
    if (!fsSync.exists(destPath)) {
      mkdirp.sync(destPath);
    }

    fs.writeFileSync(dest, result.files[_path], { encoding: 'binary' });
  });

  cacheObj.cached = true;
  cacheObj.sheets = result.sheets;

  sheetJsonCache[cacheGroupName] = cacheObj;

  return cacheObj;
}

// Implements rule matching for the metadata.json.
function checkRule (rules, filename, buildOpts) {
  return rules.filter(function (rule) {
    // if (verbose) console.log("  - ", rule);
    return (!buildOpts
      || (!rule['cond-buildMode']
        || rule['cond-buildMode'] === buildOpts.scheme)

      && (!rule['cond-target']
        || rule['cond-target'] === buildOpts.target))

      && (!rule['cond-fileList']
        // exact match
        || rule['cond-fileList'].indexOf(filename) >= 0
        // filtered length
        || rule['cond-fileList'].filter(function (match) {

          // Drop trailing / on match.
          if (match[match.length - 1] === '/') match = match.substring(0, match.length - 1);

          var n = match.length;
          var isMatch = match === filename.substring(0, n)
            && (filename[n] === '/' || filename[n] === '\\');

          if (verbose) console.log('   o ', isMatch, match, filename, filename.substring(0, n), filename[n]);
          return isMatch;
        }).length);
  });
}


// Identify, configure, pack, and serialize spritesheets.
function packSprites (compiler, outputPath, maxSpritesheetSize, includeLowRes) {

  SPRITE_OUT = outputPath;

  // Make sure we have an output folder.
  try {
    mkdirp.sync(SPRITE_OUT);
  } catch (e) {
    // TODO: Maybe log or something? Generally benign.
  }

  // State for this packing operation - metadata holds the various
  // metadata.json files we find, keyed by their path. spriteGroups
  // holds information about the groups being generated, keyed by
  // group name.
  var metadataHash = {};
  var spriteGroupsHighRes = {};
  var spriteGroupsLowRes = {};

  // We also store the sheet results, here keyed by the path of the
  // generate sheet. This goes into the inline cache (ie included in
  // the build JS file).
  var mapJson = {};

  // Helper to look up metadata.
  function getMetadata (filePath) {
    var md = {};
    var p = path.dirname(filePath);
    var initialP = p;

    // Walk up the directory path, merging together all existing metadata files
    // with child data overwriting parent's
    while (p != '/' && p != '' && p != '.') {
      var pmd = metadataHash[p];

      // Merge the properties together
      if (pmd)
        md = Object.assign({}, pmd, md);

      // Walk up the path.
      p = path.dirname(p);
    }

    if (!md.group) {
      // This isn't a problem because we will generate some default state.
      var autoGroupName = initialP.replace(/\//g, '-');
      if (verbose) console.log('Creating default group ' + autoGroupName + ' for ' + filePath);
      md.group = autoGroupName;
    }

    return md;
  }

  function filterFiles (filepath) {
    if (filepath.indexOf('metadata.json') >= 0) { return true; }

    var ext = path.extname(filepath);
    return (ext === '.png' || ext === '.jpg' || ext === '.jpeg');
  }

  function performCopyShouldSprite (md, file) {

    var shouldCopy = false;
    var shouldSprite = false;

    // TODO: There is probably some elegant way to do this, but I'm too lazy
    // to figure it out -- BJG.

    if (md.package === undefined && md.sprite === undefined) {
      shouldCopy = false;
      shouldSprite = true;
    } else if (md.package !== undefined && md.sprite === undefined) {
      if (md.package === true) {
        shouldCopy = true;
        shouldSprite = false;
      } else {
        shouldCopy = false;
        shouldSprite = true;
      }
    } else if (md.package === undefined && md.sprite !== undefined) {
      if (md.sprite === true) {
        shouldCopy = false;
        shouldSprite = true;
      } else {
        shouldCopy = true;
        shouldSprite = false;
      }
    } else {
      shouldCopy = md.package;
      shouldSprite = md.sprite;
    }

    if (verbose) console.log('DECISION', file, shouldCopy, shouldSprite);

    // For now, we force copy every time no matter if it's an incremental build
    // or initial. This is because we want to apply image compression at a later
    // stage to the original file.

    // @TODO Check if the file in the output dir is the same as the original to
    // speed up incremental builds

    // var curHash = spriteCache.checkFileStateCache(file);
    if (shouldCopy) {
      // TODO: Apply packaging rules if specified?
      const dest = path.normalize(SPRITE_OUT + '/../' + file);
      const destPath = path.dirname(dest);
      if (!fsSync.exists(destPath)) {
        mkdirp.sync(destPath);
      }

      if (verbose) console.log('Copy ', file);
      fsSync.copy(file, dest, { force: true });
      // spriteCache.updateFileStateCache(file, curHash);
    }

    return shouldSprite;
  }

  var spriteFileList = [];

  function processPotentialSpriteFile (file) {

    if (!file) { return; }

    if (verbose) console.log('Considering ' + file);

    // Handle metadata filess.
    if (file.indexOf('metadata.json') > -1) {

      var key = path.dirname(file);

      // If no change reuse last parse.
      var fileHash = spriteCache.checkFileStateCache(file);
      if (fileHash == null && metadataCache[file]) {
        metadataHash[key] = metadataCache[file];
        return;
      }

      try {
        metadataHash[key] = JSON.parse(fs.readFileSync(file, 'utf-8'));
      } catch (err) {
        // Format the message webpack-style
        throw new Error(`${file}\nError reading sprite metadata: ${err}`);
      }

      metadataHash[key]._path = file;
      metadataCache[file] = metadataHash[key];

      spriteCache.updateFileStateCache(file, fileHash);
      return;
    }

    // Otherwise it's a sprite. Just store for now, as we need full metadata in
    // order to know what to do.
    spriteFileList.push(file);
    if (verbose) console.log('FOUND ' + file);
  }

  // Find the other root folders (ie localized);
  var potentialRoots = fs.readdirSync('.');
  var spriteRoots = [];
  for (let i = 0; i < potentialRoots.length; i++) {
    var potentialRoot = potentialRoots[i];
    if (potentialRoot.indexOf(SPRITE_ROOT) !== 0) { continue; }

    spriteRoots.push(potentialRoot);
  }

  // Scan for all files relevant to spriting. We can save time by not traversing
  // the whole tree multiple times.
  for (let i = 0; i < spriteRoots.length; i++) {
    findInPath(spriteRoots[i], filterFiles, processPotentialSpriteFile);
  }

  // Also some stuff here for god knows why.
  findInPath('frontend/devkit-fbinstant/images', filterFiles, processPotentialSpriteFile);

  spriteFileList.sort();

  // Now that we have metadata, process the sprite file list.
  spriteFileList.forEach(function (file) {

    // Find the metadata.
    var md = getMetadata(file);

    // Get some useful values and/or their defaults.
    var groupName = md.group;
    var groupScale = md.scale || 1;
    var groupLowScale = md.scaleLowRes || groupScale / 2.0;
    var groupSprite = md.sprite;
    var groupPackage = md.package;

    if (md.rules) {

      // Rules are relative to the metadata file's path.
      var relPath = path.relative(path.dirname(md._path), file);

      if (verbose) console.log('prematch', md._path, relPath, path.dirname(md._path), file);

      // See what matches.
      var ruleMatches = checkRule(md.rules, relPath, null);

      if (ruleMatches.length > 0) {

        // Got a match! Let it set properties if needed.
        var localGroup = getCombinedProperty(ruleMatches, 'group');
        var localScale = getCombinedProperty(ruleMatches, 'scale');
        var localScaleLowRes = getCombinedProperty(ruleMatches, 'scaleLowRes');
        var localSprite = getCombinedProperty(ruleMatches, 'sprite');
        var localPackage = getCombinedProperty(ruleMatches, 'package');

        if (localGroup) { groupName = localGroup; }

        if (localScale) { groupScale = localScale; }

        if (localScaleLowRes) { groupLowScale = localScaleLowRes; }

        if (localSprite) { groupSprite = localSprite; }

        if (localPackage === true) { groupPackage = localPackage; }

        // Local compression overrides can change the sheet's format so we need
        // to create a subgroup named after rule index
        var localCompress;
        var compressRuleIndex;

        // Compress is special in that we need rule index ID to create subgroup
        for (var i = 0; i < ruleMatches.length; i++) {
          if (ruleMatches[i].compress) {
            localCompress = ruleMatches[i].compress;
            compressRuleIndex = i + 1;
            break;
          }
        }

        if (localCompress) {
          groupName = `${groupName}-${compressRuleIndex}`;
          md.compress = localCompress;
        }
      }
    }

    // OK, determine the operation we should perform - sprite? copy? neither?
    // This will perform the copy and indicate if we should sprite.
    var md2 = {
      package: groupPackage,
      sprite: groupSprite
    };

    if (verbose) console.log('md2', md2);

    if (!performCopyShouldSprite(md2, file)) {
      return;
    }

    if (verbose) console.log("groupName = '" + groupName + "'");

    // Fetch/init the sprite group.
    var ghr = spriteGroupsHighRes[groupName];
    var glr = spriteGroupsLowRes[groupName];
    if (!ghr) {
      var files = [];
      ghr = spriteGroupsHighRes[groupName] = {
        name: groupName,
        files: files,
        fileScales: {},
        scale: groupScale,
        metadata: md
      };

      glr = spriteGroupsLowRes[groupName] = {
        name: LOW_RES_KEY + groupName,
        files: files,
        fileScales: {},
        scale: groupLowScale,
        metadata: md
      };
    }

    // Store the file path into the group!
    ghr.files.push(file);

    // Also store the scale.
    ghr.fileScales[file] = groupScale;
    glr.fileScales[file] = groupLowScale;

    if (verbose) console.log(file, groupScale, groupLowScale, groupName);

  });

  // console.log("resource search took " + (Date.now() - startTime));

  // Because we're doing a bunch of closures, to avoid locals changing out
  // from under us, let's just throw it all in another function that we
  // call immediately.
  function spriteProcessingClosure (spriteGroup) {

    var opts = {
      ext: '.png',
      mime: 'image/png',
      spritesheetsDirectory: SPRITE_OUT,
      name: spriteGroup.name,
      maxSize: maxSpritesheetSize
    };

    // Override based on group settings.
    if (spriteGroup.metadata.compress) {
      var cBlock = spriteGroup.metadata.compress;
      if (cBlock.format === 'jpeg') {
        opts.ext = '.jpg';
        opts.mime = 'image/jpeg';
        opts.compress = cBlock;
      }
    }

    if (verbose) console.log('Considering ', spriteGroup.name, spriteGroup);

    // Do we need to do more work?
    var result = cacheChecker(spriteGroup, opts);

    // Easy, cached so all done!
    if (result.cached) {
      // Obtain data for all sheets from cache
      for (var sheetKey in result.sheets)
        mapJson[sheetKey] = result.sheets[sheetKey];
      return null;
    }

    if (verbose) console.log('Processing ' + spriteGroup.name);

    // Otherwise, run the spriting process, caching the input and output.
    var inputKey = result.inputKey;

    var cacheResults = {
      files: {}
    };

    function perSheetProcessChain (spritesheet, spritesheetInfo, options2) {
      // For each page of the generated sheet...

      // Get the file and data for this sheet of the spritesheet.
      var filename = spritesheet.name;
      var image = spritesheet.composite().buffer;

      // We're just gonna hope that getBuffer is secretly synchronous.
      return image.getBuffer(options2.mime)
        .then(function (outBuffer) {
          if (outBuffer == null) throw new Error('Failed to get compressed sheet synchronously');

          var imageResult = {
            spritesheet: spritesheet,
            buffer: outBuffer
          };

          // Save some resources!
          imageResult.spritesheet.recycle();
          if (verbose) console.log(filename);

          // Write actual data and get the spritesheet JSON description for
          // later.
          var resolvedPath = path.resolve(options2.spritesheetsDirectory, imageResult.spritesheet.name);

          // Store off results for cache.
          cacheResults.files[imageResult.spritesheet.name] = imageResult.buffer;

          // Note sheet data for later serialization.
          spritesheetInfo.push(spritesheet.toJSON());

          // Sync write and return.
          fs.writeFileSync(resolvedPath, imageResult.buffer, { encoding: 'binary' });
          return Promise.resolve();
        });
    }

    function sheetActionClosure (localSpriteGroup, options) {
      // Load and sheet the images in this group.
      var p = DevKitSpriter.loadImages(localSpriteGroup.files, localSpriteGroup.fileScales)
        .then(function (imageFiles) {

          // Actually perform spritesheet layout.
          var sprited = DevKitSpriter.sprite(imageFiles.images, options);

          // Now we can mark the files as updated.
          localSpriteGroup.files.forEach(function (f) {
            spriteCache.updateFileStateCache(f);
          });

          // As well as the metadata.
          if (localSpriteGroup.metadata._path) { spriteCache.updateFileStateCache(localSpriteGroup.metadata._path); }

          // We can directly kick off each spritesheet.
          var spritePromises = [];
          var spritesheetInfo = [];
          sprited.forEach(function (spritesheet) {
            spritePromises.push(perSheetProcessChain(spritesheet, spritesheetInfo, options));
          });

          return Promise.all(spritePromises).return(spritesheetInfo);

        }).then(function (spritesheetInfo) {
          cacheResults.sheets = {};

          spritesheetInfo.forEach(sInfo => {
            sInfo.name = 'spritesheets/' + sInfo.name;

            // Store sprite info for later injection to inline cache.
            mapJson[sInfo.name] = sInfo.sprites.slice();

            // Cache it out.
            cacheResults.sheets[sInfo.name] = sInfo.sprites.slice();
          });

          // Warning - super verbose! Shows incoming sheet info and
          // accumulated dictionary.
          // if(verbose) console.log(JSON.stringify(mapJson), mapJson);

          return writeCacheEntry(inputKey, cacheResults);
        });

      return p;
    }

    return sheetActionClosure(spriteGroup, opts);
  }

  // OK, now we have all the groups. So we need to check the cache status.
  // If we see changes, then repack. Cache key for a group is SHA256 of each
  // file + the owning metadata.json.
  var promises = [];

  function performGroupSpriting (spriteGroups) {
    // Kick off processing all the sprite groups.
    for (var gn in spriteGroups) {
      var p = spriteProcessingClosure(spriteGroups[gn]);

      // In some cases if cached we will just get a null return.
      if (p) promises.push(p);
    }
  }

  performGroupSpriting(spriteGroupsHighRes);

  if (includeLowRes)
    performGroupSpriting(spriteGroupsLowRes);

  return Promise.all(promises).return(mapJson);
}

// Export a wrapper function that makes sure that all exceptions are thrown
// inside a promise chain and handled appropriately.
module.exports = function (...args) {
  return Promise.resolve()
    .then(() => packSprites(...args));
};
