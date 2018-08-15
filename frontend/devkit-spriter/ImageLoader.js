var ImageBuffer = require('./ImageBuffer');
var ImageInfo = require('./ImageInfo');
var Promise = require('bluebird');
var Queue = require('promise-queue');

Queue.configure(Promise);

var maxConcurrent = (
  process.env.DEVKIT_SPRITER_LOADING_CONCURRENCY
    ? parseInt(process.env.DEVKIT_SPRITER_LOADING_CONCURRENCY)
    : 200
);

var queue = new Queue(maxConcurrent, Infinity);

module.exports = ImageLoader;

function ImageLoader () {}

ImageLoader.prototype.load = function (images, scale) {
  var errors = {};
  return Promise.resolve(images)
    .bind(this)
    .map(function (image) {
      var filename = typeof image == 'string' ? image : image && image.path;
      return this.get(filename, scale[filename])
        .catch(function (err) {
          errors[filename] = err;
        });
    })
    .filter(Boolean)
    .then(function (images) {
      return {
        images: images,
        errors: errors
      };
    });
};

ImageLoader.prototype.get = function (filename, scale) {
  return queue.add(function () {
    return new ImageBuffer({filename: filename})
      .load()
      .then(function (buffer) {
        if (scale && scale !== 1) {
          var width = Math.ceil(buffer.bitmap.width * scale);
          var height = Math.ceil(buffer.bitmap.height * scale);
          buffer.resize(width, height);
        }

        return new ImageInfo(filename, buffer, scale);
      });
  });
};
