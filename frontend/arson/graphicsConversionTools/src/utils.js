const crypto = require('crypto');
const fs = require('fs');
const childProcess = require('child_process');

const Promise = require('bluebird');
const debug = require('debug');
const asyncRetry = require('async-retry');


const log = debug('coretech_frontend:graphicsConversionTools:utils');


const MS_MIN = 1000 * 60;
const DEFAULT_TIMEOUT = 4 * MS_MIN;


const getHash = data => {
  var hash = crypto.createHash('sha256');
  hash.write(data);
  return hash.digest('hex');
};


// For consistency, we want to read and calculate hashes for files in a specific
// way. If we read with encoding: 'binary', then High Sierra gets proper results
// but older Mac OSX does not. If we do it as shown here, things seem to work
// consistently.
const getFileHash = path => {

  // Enable me if you start getting "file not found" errors and want to know if
  // they are coming from the hashing code.
  /*
  if (!fs.existsSync(path)) {
    console.trace();
    throw new Error("Could not find '" + path + "'");
  }*/

  return getHash(fs.readFileSync(path));
};


const copyFile = (inFile, outFile) => {
  fs.writeFileSync(outFile, fs.readFileSync(inFile));
};


const getHashAndSize = function (filePath) {
  const contents = fs.readFileSync(filePath, { encoding: 'binary' });
  const hash = getFileHash(filePath);
  const size = contents.length;
  return {
    contents: contents,
    hash: hash,
    size: size
  };
};


/** Note: Actually uses spawn. */
const execFile = function (file, args, options) {
  log('execFile: file=', file, 'args=', args, 'options=', options);
  options = options || {};
  options.timeout = options.timeout || DEFAULT_TIMEOUT;

  let lastChild;

  const cleanupLastChild = () => {
    if (!lastChild) { return; }
    log('> > cleaning up lastChild');
    lastChild.kill('SIGKILL');
    lastChild = null;
  };

  const doRun = (bail, attempt) => {
    log('> execFile: attempt=', attempt);
    return new Promise((resolve, reject) => {
      let child;

      cleanupLastChild();

      const onError = (error) => {
        // Only handle errors for current child, avoid handling errors from lastChild.kill
        if (lastChild !== child) { return; }
        // No more executing this promise chain
        reject(error);
      };

      child = childProcess.spawn(file, args);
      lastChild = child;

      child.stdout.on('data', (data) => {
        log('> stdout:', data.toString());
      });

      child.stderr.on('data', (data) => {
        log('> stderr:', data.toString());
      });

      child.on('error', (error) => {
        // Do not retry startup errors
        error.bail = true;
        onError(error);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          log('> failed: code=', code);
          const error = new Error(`child process "${file}" failed with code ${code}`);
          // Only bail if ImageOptim gives a real error code.  null is an unexpected error.
          error.bail = code !== null;
          onError(error);
          // Exit this function
          return;
        }
        resolve();
      });
    })
    .timeout(options.timeout, `child process "${file}" timed out`)
    .tapCatch((error) => {
      log('> error=', error);
      cleanupLastChild();
    });
  };

  // Wrap with bluebird promise for consistency
  return Promise.resolve(asyncRetry(doRun, {
    // Only let 1 retry run if timeout is large
    retries: options.timeout > DEFAULT_TIMEOUT ? 1 : 2,
    // Backoff is not very important in this case
    factor: 1.1
  }));
};


module.exports = {
  getFileHash: getFileHash,
  getHash: getHash,
  copyFile: copyFile,
  getHashAndSize: getHashAndSize,
  execFile: execFile
};
