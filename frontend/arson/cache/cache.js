var crypto = require('crypto');
var fs = require('fs');
var mkdirp = require('mkdirp');
var verbose = false;

// Where do we write output relative to the project root?
const CACHE_FOLDER = '.cache/';

// Bump to invalidate all cached data.
const VERSION = '2';

// In addition to the disk cache we want to identify when we (in watch mode)
// can skip processing. We will do that by keeping a dictionary by file path
// and storing hash of mtime and length. First time through we populate. For
// subsequent builds we look at this before reading and writing.
var fileStateCache = {};

// Returns null if file same, otherwise new state hash.
function checkFileStateCache (path) {
  var curHash;

  try {
    var state = fs.lstatSync(path);
    curHash = calculateHash(state.mtime + ':' + state.size);
  } catch (err) {
    console.warn("Failed to lstat '" + path + "', generating dummy value");
    curHash = path + '!lstatfailure';
  }

  if (curHash === fileStateCache[path]) {
    return null;
  }

  return curHash;
}

// Indicate we've taken action and no longer want to detect a file as changed.
// Hash is the hash returned by checkFileStateCache. If not present we will
// calculate it ourselves.
function updateFileStateCache (path, hash) {
  if (!hash) {
    var state = fs.lstatSync(path);
    hash = calculateHash(state.mtime + ':' + state.size);
  }
  fileStateCache[path] = hash;
}

// Helper to allow JSON deserialize to revivify buffers. (Internal.)
function jsonVivifier (k, v) {
  if (
    v !== null &&
    typeof v === 'object' &&
    'type' in v &&
    v.type === 'Buffer' &&
    'data' in v &&
    Array.isArray(v.data)) {
    return Buffer.from(v.data);
  }
  return v;
}

// Return SHA hash of a string or Buffer, synchronously.
function calculateHash (value) {
  var hash = crypto.createHash('sha256');
  hash.write(VERSION);
  hash.write(value);
  return hash.digest('hex');
}

// Synchronously alculate hash of a file.
function hashFile (path, cb) {
  var fileBuff = fs.readFileSync(path, { encoding: 'binary' });

  var hash = crypto.createHash('sha256');
  hash.update(fileBuff);
  hash.end();

  var strHash = hash.read().toString('hex');
  if (cb) cb(null, strHash);
  return strHash;
}

// Given a list of paths, hashes all of them and returns a hash identifying
// their collective state. Synchronous.
function hashFiles (paths) {
  var values = [];
  paths.forEach(function (path) {
    values.push(hashFile(path));
  });

  return calculateHash('group:' + values.join(':'));
}

// Lets you store and retrieve data by hash of input key. Input key will
// generally be a long combination of state information (like input file
// hashes, settings, etc). The BuildCache will hash this to determine
// where the actual data will be stored.
//
// It also includes some handy utility methods for calculating hashes (see above).
//
// Additionally, checkFileStateCache and updateFileStateCache can be used to
// implement "light" caching using file size and modified time. This isn't
// enough to be really bullet proof (ie DON'T use it at startup build) but it
// can be a useful tool during watch mode builds. The internal state for these
// methods starts empty so you don't get any caching behavior until the second
// compile in the same process.
//
// You can get and set with three variants, either async via Buffer (get/set),
// async using JSON (getJSON, setJSON), or sync getting a file descriptor back
// (openForReadSync/openForWriteSync).
//
// A word on performance - testing as of node 8.4/Aug 2017 shows that sync file
// IO gives best performance when running locally on an SSD. It also minimizes
// risk of resource exhaustion because you don't try to load 500 things at
// once via a complex network of promises. Instead you have a function that
// reads or writes one thing, quickly, after which those resources are avilable
// for the next user. It may be desirable to port get/getJSON and peers to be
// synchronous because of this.
module.exports.BuildCache = function () {

  // Tricky - make sure we have an output folder.
  try {
    mkdirp.sync(CACHE_FOLDER);
  } catch (e) {
    // TODO: Maybe log or something? Generally benign.
  }

  // Expose some local methods as part of this class.
  this.calculateHash = calculateHash;
  this.hashFile = hashFile;
  this.hashFiles = hashFiles;
  this.checkFileStateCache = checkFileStateCache;
  this.updateFileStateCache = updateFileStateCache;

  // Get a cached item based on an arbitrary key.
  this.get = function (key, cb) {
    var file = CACHE_FOLDER + '/' + calculateHash(key);
    var fileEncoding = {
      encoding: 'binary'
    };

    fs.readFile(file, fileEncoding, function (err, data) {
      if (verbose) console.log('*** CACHE GOT ' + (data ? 'DATA ' : 'NOTHING ') + file + ' len=' + (data ? data.length : 'N/A'));
      cb(err, data);
    });
  };

  // Get() but returning parsed JSON.
  this.getJSON = function (key, cb) {
    this.get(key, function (err, data) {
      if (err) cb(err, null);
      else cb(null, JSON.parse(data.toString(), jsonVivifier));
    });
  };

  // Returns a read file descriptor for the cache file holding key.
  this.openForReadSync = function (key) {
    try {
      var file = CACHE_FOLDER + '/' + calculateHash(key);
      if (fs.existsSync(file) === false) return null;
      var fd = fs.openSync(file, 'r');
      return fd;
    } catch (e) {
      throw new Error("Failed to open cache for '" + key + "' due to: " + e);
    }
  };

  // Returns a write file descriptor for the cache file holding key.
  this.openForWriteSync = function (key) {
    try {
      var file = CACHE_FOLDER + '/' + calculateHash(key);
      var fd = fs.openSync(file, 'w');
      return fd;
    } catch (e) {
      throw new Error("Failed to open cache for '" + key + "' due to: " + e);
    }
  };

  // Stores a value into the cache under arbitrary key.
  this.set = function (key, value, cb) {
    if (verbose) console.log('*** CACHE SET ' + calculateHash(key) + ' ' + JSON.stringify(value).substring(0, 1024));
    fs.writeFile(
      CACHE_FOLDER + '/' + calculateHash(key),
      value, { encoding: 'binary' }, cb);
  };

  // Same as set() but serializes value into JSON.
  this.setJSON = function (key, value, cb) {
    this.set(key, JSON.stringify(value),
      function (err, data) {
        if (err) cb(err);
        else cb(null);
      });
  };
};
