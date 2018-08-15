const fs = require('fs');
const express = require('express');
const https = require('https');

var verbose = false;

var EXPRESS_PORT = 8052;

module.exports = function (outputDir) {
  if (!outputDir) {
    outputDir = '.';
  }

  // We can use a simple local server for running inside of facebook. Make
  // sure to accept the dummy cert to make it work. (ie visit localhost:8082 once)
  const app = express();
  app.use(express.static(outputDir));

  // If our attempt to start fails, we call this endpoint to try to terminate the subprocess.
  app.get('/shutdownWatchServer', function (req, res) {
    res.status(200).end();
    console.log('Got shutdown request from another instance webpack... Terminating.');
    process.exit(0);
  });

  // We use some self signed certs to provide https; users will have to accept them
  // before they can access the dev server.
  const httpsOptions = {
    key: fs.readFileSync(__dirname + '/../assets/ssl.pem'),
    cert: fs.readFileSync(__dirname + '/../assets/cert.pem')
  };

  // Create the actual https server.
  var httpsServer = https.createServer(httpsOptions, app);

  // We want to handle EADDRINUSE which means that someone else is already using
  // our port (typically another instance of us that didn't get shut down).
  httpsServer.on('error', function (e) {
    if (e.code !== 'EADDRINUSE') {
      throw new Error('Got error from https server: ' + e);
    }

    console.log('Port ' + EXPRESS_PORT + ' in use, attempting to shut down existing webpack instance...');

    // Configuration for our shutdown request.
    var options = {
      host: 'localhost',
      port: EXPRESS_PORT,
      path: '/shutdownWatchServer',
      method: 'GET',
      rejectUnauthorized: false // We are using self-signed certs so we want to allow just anything.
    };

    // Fire the request.
    var req = https.request(options, function (res) {
      console.log('Got shutdown response (STATUS=' + res.statusCode + ')');

      if (res.statusCode === 200) {
        console.log('Killed old webpack instance; please run again to get clean dev environment.');
        process.exit(0);
      }
    });

    // Report errors if this fails.
    req.on('error', function (re) {
      throw new Error('Couldn\'t request shutdown: ' + re.message);
    });

    // Fire off the request.
    req.end();

    // It should resolve pretty fast, so we'll try again in a second.
    setTimeout(function () {
      httpsServer.close();
      initServer();
    }, 1000);

  });

  // Start the HTTPS server.
  function initServer () {
    httpsServer.listen(EXPRESS_PORT, function () {
      if (verbose) console.log('Express server now up on port ' + EXPRESS_PORT + '.');
    });
  }

  // Actually do it!
  initServer();

  return httpsServer;
};
