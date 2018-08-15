var path = require('path');
var fs = require('fs');

var verbose = false;

// Assert we see a buffer with certain hex value.
module.exports.assertBufferHex = function (buffer, hex) {
  try {
    var r = Buffer.compare(buffer, Buffer.from(hex, 'hex'));
    if (r !== 0) throw new Error("Buffers didn't match.");
  } catch (e) {
    throw new Error('Failed buffer assert (' + buffer + ' != ' + hex + '): ' + e);
  }
};

// Find all the files matching filter in startPath or its subfolders. Filter
// can be a regex or a function. Only files are filtered; we always traverse
// all subfolders. We name the function so we can call ourselves later on.
module.exports.findInPath = function findInPath (startPath, filter, callback) {

  if (verbose) console.log('Starting from dir ' + startPath + '/');

  if (!fs.existsSync(startPath)) {
    throw new Error("Could not find '" + startPath + "' to begin search.");
  }

  var files = fs.readdirSync(startPath);

  // If we got a regexp filter, wrap it as a function so below loop
  // can run consistently.
  var filterFunc;

  if (filter instanceof RegExp) {
    filterFunc = function (f) { return filter.test(f); };
  } else {
    filterFunc = filter;
  }

  for (var i = 0; i < files.length; i++) {

    var filename = path.join(startPath, files[i]);
    var stat = fs.lstatSync(filename);

    if (stat.isDirectory()) {
      // It's a directory, recurse.
      findInPath(filename, filterFunc, callback);
      continue;
    }

    // Check match with filter.
    if (!filterFunc(filename)) {
      continue;
    }

    // It's a match!
    callback(filename);
  }
};

module.exports.readJSON = function readJSON (filename) {
  if (verbose) console.log('Reading json data from file ' + filename);

  if (!fs.existsSync(filename))
    throw new Error("Could not find '" + filename + "'.");

  var data = fs.readFileSync(filename, 'utf8');

  return JSON.parse(data);
};
