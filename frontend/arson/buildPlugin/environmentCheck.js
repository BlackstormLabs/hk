var fs = require('fs');
var path = require('path');
var semver = require('semver');
var childProcess = require('child_process');

const FgRed = '\x1b[31m';
const Reset = '\x1b[0m';
const webpackRequiredVersion = '3.5.0';

var verbose = false;

module.exports.runEnvironmentChecks = function () {

  // FIXME: disabled for now, it's preventing some devs from serving the game
  // @Joe has a good understanding of the issue
  return;



  // Detect if we are running in a deleted folder.
  try {
    process.cwd();
  } catch (err) {
    console.log('Getting the CWD failed. Are you running from a deleted folder? Try spawning a new terminal and re-entering this folder.');
  }

  // See if we are ignoring the check to see if node_modules is up to date.
  const isDisablingNpmInstallCheck = process.argv.find(v => v.indexOf('--ignore-npm') !== -1);
  if (isDisablingNpmInstallCheck) console.log('Skipping NPM check.');

  if (!isDisablingNpmInstallCheck) {
    // Make sure our npm package state is clean when we are imported. Do it here
    // so we can respect enable param from webpack.config if we are to disable
    // ourselves.
    const npmJsonCmd = 'npm install --dry-run --json';
    const npmVersionCmd = 'npm --version';
    var npmJsonReport;
    try {

      // Make sure we have a fairly recent NPM version.
      const npmVersion = childProcess.execSync(npmVersionCmd) + '';
      if (verbose) console.log('NPM version: ' + npmVersion);
      var npmSplitVersion = npmVersion.split('.');

      if (parseInt(npmSplitVersion[0]) < 5) { throw new Error("Can't run package validity check on NPM version (" + npmVersion + ") that isn't 5.0 or better."); }

      // We can get npm to report what it would do if install was run in JSON
      // format. If we see out of date packages we can complain and abort.
      npmJsonReport = childProcess.execSync(npmJsonCmd);

      var npmJson = JSON.parse(npmJsonReport);

      // See if install would have changed anything.
      var totalChanges =
        npmJson.added.length
        + npmJson.removed.length
        + npmJson.updated.length
        + npmJson.moved.length
        + npmJson.failed.length;

      if (totalChanges > 0) {
        // You can ignore this error by removing the process.exit(1) call below.
        // HOWEVER you should really consider whether you have an issue with your
        // packages before doing so!
        console.error('Aborting build due to ' + totalChanges + ' pending npm install actions.\n' +
          'If you are sure you want to run without using the packages in package.json,\n' +
          'you can run webpack -- --ignore-npm to suppress this message.\n\n' +
          '**** Please run npm install before trying to build. ****\n');
        process.exit(1);
      }

    } catch (err) {
      console.error('******************************************************************');
      console.error(npmJsonCmd + ' returned:\n' + npmJsonReport);
      console.error('Failed to check npm package install status due to: ' + err);
      console.error('--- Proceeding anyway - please consider updating npm!         ----');
      console.error('******************************************************************');
    }
  }

  // @TODO Skip guetzli check here to pass server builds where guetzli isn't
  // needed. If we're bringing this check back, make sure the guetzli is compiled
  // with the statically linked libpng.

  // Make sure version of guetzli is reasonable
  // const execFileSync = require('child_process').execSync;
  // const name = './frontend/arson/graphicsConversionTools/bin/whiteSquare.jpg';
  // console.log(process.cwd());
  // try {
  //   execFileSync('./frontend/arson/graphicsConversionTools/bin/guetzli ' + name + ' /dev/null');
  // } catch (err) {
  //   console.log(FgRed + 'Error: Guetzli failed, probably due to incompatible version of libpng. To fix, try "brew install guetzli". Aborting...' + Reset);
  //   process.exit(1);
  // }

  // Make sure version of webpack is reasonable when we are imported.
  try {
    const webpackDir = path.resolve(path.dirname(require.resolve('webpack')), '..');
    const webpackPackageJsonPath = path.join(webpackDir, 'package.json');
    const webpackPackageJson = JSON.parse(fs.readFileSync(webpackPackageJsonPath));

    var webpackActualVersion = webpackPackageJson.version;

    if (verbose) console.log('Webpack version: ' + webpackActualVersion);

    if (semver.gt(webpackRequiredVersion, webpackActualVersion)) {
      console.error("Can't run on webpack version (" + webpackActualVersion + ") that isn't 3.5 or better, aborting...");
      process.exit(1);
    }
  } catch (err) {
    console.error('Failed to check webpack version due to: ' + err);
    process.exit(1);
  }

};
