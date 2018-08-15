var Promise = require('bluebird');
var fs = require('graceful-fs');

var readFile = Promise.promisify(fs.readFile);
var writeFile = Promise.promisify(fs.writeFile);

module.exports = DiskCache;

module.exports.load = function (filename) {
  return readFile(filename, 'utf-8')
    .then(function (contents) {
      return JSON.parse(contents);
    })
    .catch(function () {
      return {};
    })
    .then(function (data) {
      return new DiskCache(filename, data);
    });
};

function DiskCache(filename, data) {
  this._filename = filename;
  this._data = data;
}

DiskCache.prototype.get = function (key) {
  return this._data[key] || (this._data[key] = {});
};

DiskCache.prototype.set = function (key, value) {
  this._data[key] = JSON.parse(JSON.stringify(value));
};

DiskCache.prototype.remove = function (key) {
  delete this._data[key];
};

DiskCache.prototype.save = function () {
  return writeFile(this._filename, JSON.stringify(this._data));
};
