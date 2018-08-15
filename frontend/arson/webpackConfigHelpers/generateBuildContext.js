const envParser = require('node-env-file');
const { execSync } = require('child_process');
const path = require('path');
const utils = require('../utils');

const tmpImageCacheLocation = '.cache/sprites';
const defaultResourcePath = 'resources/';

var verbose = false;

module.exports = function generateBuildContext (rootDir, env, buildContext) {

  // Determine and load build settings from env file.
  var buildType = (env && env.buildType) || 'development';
  console.log('Using configuration data from envs/' + buildType);

  var envPath = rootDir + '/envs/' + buildType;
  var parsedEnvironmentData = envParser(envPath);
  if (!parsedEnvironmentData) { throw new Error('Failed to parse or find environment config.'); }

  // Fix up any lines starting with export.
  let exportStr = 'export ';
  let exportStrLength = exportStr.length;
  var environmentData = {};

  for (let k in parsedEnvironmentData) {

    // Just copy any keys starting with export into their correct values. No one
    // is going to look up "export FOO" when they want "FOO". (Famous last words.)
    let realKey = k;
    if (k.indexOf(exportStr) !== -1) {
      realKey = k.substr(exportStrLength);
    }

    // TODO: Don't allow multiple assign to same key. envParser silently
    // resolves this so we can't just check if assigning same key twice
    // to environmentData.

    // Copy de-exportified key into the final environment data.
    environmentData[realKey] = parsedEnvironmentData[k];
  }

  // Get commit hash
  try {
    var commitHash = execSync('git rev-parse --short HEAD').toString().replace('\n', '');
    environmentData.COMMITHASH = commitHash;
  } catch (error) {
    console.error("Failed to get current commit hash; COMMITHASH now set to 'CommitGetFailed'. Due to: ", error);
    environmentData.COMMITHASH = 'CommitGetFailed';
  }

  // Get commit branch
  try {
    var branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().replace('\n', '');
    environmentData.GIT_BRANCH = branchName;
  } catch (error) {
    console.error("Failed to get current branch; GIT_BRANCH now set to 'unknown'. Due to: ", error);
    environmentData.GIT_BRANCH = 'unknown';
  }

  // Teamcity build number
  environmentData.BUILD_NUMBER = process.env.BUILD_NUMBER || '-1';

  // Work out build path, determine if release/debug.
  var buildOutRelative = '/build/';
  var isRelease = false;
  if (environmentData.NODE_ENV === 'production') {
    buildOutRelative += 'release/browser-mobile';
    isRelease = true;
  } else {
    buildOutRelative += 'debug/browser-mobile';
    isRelease = false;
  }

  var isSimulated = environmentData.SIMULATED === 'true';
  var isFullImageCompress = environmentData.IMAGE_COMPRESS_FULL === 'true';
  var lowResImages = environmentData.IMAGE_LOW_RES === 'false' ? false : true;
  var imageCacheLocation = environmentData.IMAGE_CACHE_LOCATION || tmpImageCacheLocation;
  var spritesheetOverrides;

  try {
    spritesheetOverrides = utils.readJSON(rootDir + '/spritesheetCompressionOverrides.json');
  } catch (e) {
    spritesheetOverrides = {};
  }

  if (buildContext.isGCFBuild) {
    environmentData.OUTPUTDIR = 'dist';
  }

  // If we have a setting in the env, override above logic. isRelease will be
  // set properly due to above checking NODE_ENV
  if (environmentData.OUTPUTDIR) {
    buildOutRelative = '/' + environmentData.OUTPUTDIR;
  }

  var buildOutPath = path.join(rootDir, buildOutRelative);

  console.log("\nOutput path is '" + buildOutPath + "'\n");

  environmentData.IS_TEST = process.env.IS_TEST; // QA - all testing
  environmentData.IS_AUTOMATED = process.env.IS_AUTOMATED; // QA - automated testing only
  // Quote all the strings in environmentData, necessary for DefinePlugin to match old behavior.
  for (let k in environmentData) {
    environmentData[k] = JSON.stringify(environmentData[k]);
  }

  // Because of current DefinePlugin behavior, we must explicitly define all process.env lookups
  //  at build time.
  // Note: Do this after stringify of environmentData, so the lookup executes at runtime.
  if (buildContext.isGCFBuild) {
    environmentData.DEBUG = 'process.env.DEBUG';
  }

  if (verbose) console.log(environmentData);

  var resourceDir = path.join(rootDir, defaultResourcePath);
  var rootPackage = utils.readJSON(rootDir + '/package.json');

  // Copy state out for rest of build.
  buildContext.outputPath = buildOutPath;
  buildContext.outputRelative = '.' + buildOutRelative;
  buildContext.environmentData = environmentData;
  buildContext.rootDir = rootDir;
  buildContext.isRelease = isRelease;
  buildContext.isFullImageCompress = isFullImageCompress;
  buildContext.lowResImages = lowResImages;
  buildContext.imageCacheLocation = imageCacheLocation;
  buildContext.spritesheetOverrides = spritesheetOverrides;
  buildContext.isSimulated = isSimulated;
  buildContext.resourceDir = resourceDir;
  buildContext.rootPackage = rootPackage;

};
