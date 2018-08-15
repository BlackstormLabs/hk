// Object to capture process exits and call app specific cleanup function
// from https://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits?utm_medium=organic&utm_source=google_rich_qa&utm_campaign=google_rich_qa

function noCallback () {}

exports.onExit = function onExit (callback) {

  // attach user callback to the process event emitter
  // if no callback, it will still exit gracefully on Ctrl-C
  callback = callback || noCallback;
  process.on('onExitCallback',callback);

  // do app specific cleaning before exiting
  process.on('exit', function () {
    process.emit('onExitCallback');
  });

  // catch ctrl+c event and exit normally
  process.on('SIGINT', function () {
    //console.log('Ctrl-C...');
    process.exit(2);
  });

  //catch uncaught exceptions, trace, then exit normally
  process.on('uncaughtException', function (e) {
    console.log('Uncaught Exception...');
    console.log(e.stack);
    process.exit(99);
  });
};
