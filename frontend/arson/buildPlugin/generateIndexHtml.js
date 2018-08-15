var Promise = require('bluebird');
var handlebars = require('handlebars');
var fs = require('fs');

var verbose = false;

// Generate the index.html from a template.
module.exports = function generateIndexHtml (compiler, options) {
  var rootPackage = options.rootPackage;
  var manifest = rootPackage.manifest;

  var analytics;

  if (manifest.analytics) {
    analytics = options.isRelease ? manifest.analytics.prod : manifest.analytics.dev;
  } else {
    analytics = {};
  }

  // Parameters for the template processing.
  var data = Object.assign({
    name: rootPackage.name,
    version: rootPackage.version,
    analytics: analytics,
    manifest: rootPackage.manifest,
    manifestString: JSON.stringify(rootPackage.manifest)
  }, options);

  // Initiate template process.
  return new Promise(function (resolve) {
    fs.readFile(__dirname + '/../assets/index.html', 'utf-8', function (error, contents) {
      if (!contents || error) {
        throw new Error('Failed to load index.html template: ' + error);
      }

      // Fill in the template.
      var template = handlebars.compile(contents);
      var html = template(data);

      // Write it out.
      if (verbose) console.log('Writing index.html to ', compiler.options.output.path);
      resolve(fs.writeFile(compiler.options.output.path + '/index.html', html));
    });
  });
};
