#! /usr/bin/env node

// INCLUDES --------------------------------------------------------------------
// const process   = require('process'); // unneccessary
const path      = require('path');
const fs        = require('fs');
const https     = require('https');
const Mocha     = require('mocha');
const envParser = require('node-env-file');
const webpack   = require('webpack');

// GLOBALS and CONFIGURATION ---------------------------------------------------
const PROJECT_ROOT      = process.cwd();
const TEST_HARNESS_ROOT = path.join(__dirname, '..');
let TEST_LIST_MOCHA     = [];                             // array of mocha tests to execute
let TEST_LIST_PYTHON    = [];                             // array of python tests to execute
let BUILD_TYPE          = 'development';                  // match an envs/ file
let BUILD_PATH          = 'build/debug/browser-mobile/';  // match OUTPUTDIR in an envs/ file
let VERBOSE_EXECUTION   = false;
let COMPILE_ON          = true;

let SERVER              = null;
let PORT                = 8082;
let PORT_WEBPACK        = [8052,8082];                    // this is an array because this is different in different games
let PROTOCOL            = 'https://';
let HOST                = PROTOCOL+'localhost:'+PORT+'/';

let MOCHA_BAIL          = false;
let MOCHA_TEST_REPORTER = 'spec'; // default reporter PUT here to enable dynamic swapping in future (TODO)
//                                // see: https://mochajs.org/#reporters

// FUNCTIONS -------------------------------------------------------------------

// onExit handling - callback defined here cleans up, kills the webserver if we made one
require(TEST_HARNESS_ROOT+'/src/onExit').onExit(() => {
  // cleanup

  if (SERVER){
    // killing it appears unnecessary as it is gone when this script exits
    // console.log(SERVER);
  }

  console.log('==================================');
  console.log();
});


const parseEnvsData = function (envsFilePath) {
  let parsedEnvironmentData = envParser(envsFilePath);
  // if (!parsedEnvironmentData)
  // {
  //   console.log();
  //   console.log('(ERR) --build-type '+BUILD_TYPE);
  //   console.log('Failed to parse or find environment config: '+envsFilePath);
  //   console.log();
  //   process.exit();
  // }

  // Fix up any lines starting with export.
  let exportStr = 'export ';
  let exportStrLength = exportStr.length;
  var environmentData = {};

  for (let k in parsedEnvironmentData) {

    // Just copy any keys starting with export into their correct values. No one
    // is going to look up 'export FOO' when they want 'FOO'. (Famous last words.)
    let realKey = k;
    if (k.indexOf(exportStr) !== -1) {
      realKey = k.substr(exportStrLength);
    }

    // TODO: Don't allow multiple assign to same key. EnvParser silently
    // resolves this so we can't just check if assigning same key twice
    // to environmentData.

    // Copy de-exportified key into the final environment data.
    environmentData[realKey] = parsedEnvironmentData[k];
  }

  return environmentData;
};

const getReportFileInformation = function () {
  let reportInformation = '';

  // TODO:
  // when we work out actual reporting methods, make adjustments here
  if (MOCHA_TEST_REPORTER!=='spec') {
    reportInformation = 'See results in '+path.join(PROJECT_ROOT,'tests')+' for more information.';
  }

  return reportInformation;
};

const displayCommandHelp = function () {
  console.log('');
  console.log('Usage: npm test -- [--mocha-bail] [-f|--file <file>] [-b|--build-type <env>] [-v|--verbose] [-h|--help]');
  console.log('');
  console.log(' -f <file>     Only run tests specified by <file> which is one or more files in ./tests.');
  console.log(' -b <type>     Target <env>: file name of ./envs');
  console.log(' --mocha-bail  Mocha bails after the first test fails. Recommended for smoke tests.');
  // console.log(' -n            Skip test script compilation (unless missing ./dist/tests)');
  console.log(' -v            Display output of test script compilation (unless compilation is skipped)');
  // console.log(' -k            Keep game server alive after exit.');
  console.log(' -h            Display this help text.');
  console.log('');
  console.log('Typical Behavior:');
  console.log(' Test scripts compiled.');
  console.log(' The game is served from '+BUILD_PATH);
  console.log(' All tests in ./tests are executed unless only one or more are explicitly called for with -f.');
  console.log(' A summary of the results is output to the console.');
  console.log('');
  console.log('Important:');
  console.log(' Automated tests require a build with IS_TEST set to true.');
  console.log(' A suitable build is generated by npm run serveTest or npm run build-test.');
  console.log(' When in development, npm run serveTest is optimal.');
  console.log('');
};


const addTestToList = function (test) {
  if ( /\.[jJtT][sS]$/.test(path.extname(test)) ) {
    TEST_LIST_MOCHA.push(test);
  } else if ( /\.[pP][yY]$/.test(path.extname(test)) ) {
    TEST_LIST_PYTHON.push(test);
  }
};


const parseArrayForTestList = function (arrayString, latestArg) {
  arrayString += latestArg.replace(/['"]+/g,'');
  // has the array ended yet?
  if (arrayString.endsWith(']')) {
    try {
      const temp = arrayString.slice(1,-1).split(',');
      while (temp.length) {
        addTestToList(temp.shift().trim());
      }
    } catch (err) {
      console.log('ERROR @ processArrayString('+arrayString+') : '+err);
    }
    arrayString = '';
  }
  // return what we have so far (if continuing) or nothing (if array is complete)
  return arrayString;
};


const parseStringForTestList = function (files) {
  files = files.replace(/['"]+/g,' ').trim();
  // first look for ,
  if (files.indexOf(',')>-1) {
    let temp = files.split(',');
    while (temp.length) {
      addTestToList(temp.shift().trim());
    }

  // then look for white space and match non-white space
  } else if (files.search(/\s+/)>-1) {
    let temp = files.match(/\S+/g) || [];
    while (temp.length) {
      addTestToList(temp.shift().trim());
    }

  // assume arg is a single file
  } else {
    addTestToList(files);
  }
};


const setBuildType = function (buildType) {
  // pre-processing for typical envs/ file names            // set envs/ file name
  let type = buildType.toLowerCase();

  if (type==='production' || type ==='prod') {
    BUILD_TYPE = 'production';
  } else if (type==='development' || type==='dev') {
    BUILD_TYPE = 'development';
  } else if (type==='rc0') {
    BUILD_TYPE = 'RC0';
  } else {
    BUILD_TYPE = buildType;
  }

  let environmentData = parseEnvsData(path.join(PROJECT_ROOT,'envs',BUILD_TYPE));
  console.log('Setting build type and path...');
  console.log();
  if (environmentData.OUTPUTDIR) {
      BUILD_PATH = environmentData.OUTPUTDIR;
  } else {
    // defaults lifted from arson's generateBuildContext.js
    if (BUILD_TYPE === 'production') {
      BUILD_PATH = 'build/release/browser-mobile';
    } else {
      BUILD_PATH = 'build/debug/browser-mobile';
    }
  }
};


const transpileTestScripts = function () {
  return new Promise( (resolve, reject) => {
    if (COMPILE_ON) {
      console.log('Transpiling test scripts:');
      console.log('');

      let configPath = path.join(PROJECT_ROOT,'tests','webpack.config.js');
      const config = require(configPath)({ 'buildType':BUILD_TYPE,'VERBOSE_EXECUTION':VERBOSE_EXECUTION });
      if ( !VERBOSE_EXECUTION ) { console.log('Standard output suppressed.');}
      // build the test scripts
      webpack(
        config,
        (err, stats) => {
          if (err) {
            console.log(err);
            reject(false);
          } else {
            if (VERBOSE_EXECUTION){ console.log(stats.toString({ chunks: true, colors: true })); } else { console.log('  ...compilation complete.'); }
            resolve(true);
          }
          console.log('');
          console.log('----------------------------------');
        }
      );
    } else { resolve(true); }
  });
};


const createServer = function () {
  var staticBasePath = path.join(PROJECT_ROOT,BUILD_PATH);
  // using the express server in arson
  const launchExpressServer = require(path.join(PROJECT_ROOT,'frontend/arson/webpackConfigHelpers/expressServer'));
  let httpsServer = launchExpressServer(staticBasePath);
  PORT = httpsServer.address().port;
  return httpsServer;
};


const getServerStatus = function (host) {
  // figure out which protocol to use
  let thisProtocol  = https;
  let rejectUnauthorized  = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

  return new Promise( (resolve,reject) => {
    thisProtocol.get(host, function (res) {
      resolve(res.statusCode);
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = rejectUnauthorized;
    })
    .on('error', function (e) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = rejectUnauthorized;
      reject(0);
    });
  }).catch(() => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = rejectUnauthorized;
    return 0;
  });
};


const findOrStartGameServer = function () {
  let firstHost;
  return new Promise(resolve => {
    firstHost = PROTOCOL+'localhost:'+PORT_WEBPACK[0]+'/';
    let serverStatus= 0;
    let serverAction= '';
    getServerStatus(firstHost)
    // try again because sometimes these games use a different PORT for webpack
    .then( (result) => {
      serverStatus = result;
      if (serverStatus!==200) {
        firstHost = PROTOCOL+'localhost:'+PORT_WEBPACK[1]+'/';
        return getServerStatus(firstHost);
      } else {
        serverAction  = 'Found game server:';
        HOST          = firstHost;
        return serverStatus;
      }
    })
    // we either found one by now or we will make one
    .then( (result) => {
      serverStatus = result;
      if (serverStatus!==200) {
        serverAction  = 'Creating game server:';
        SERVER        = createServer();
        HOST          = PROTOCOL+'localhost:'+PORT+'/';
        return getServerStatus(HOST);
      } else {
        serverAction  = 'Found game server:';
        HOST          = firstHost;
        return serverStatus;
      }
    })
    .then( (result) => {
      serverStatus = result;
      console.log(serverAction);
      console.log('');
      console.log('URL:    '+HOST);
      console.log('Status: '+serverStatus);
      console.log('');
      if ( serverStatus !== 200 ) {
        console.log('Server Failed to Launch Successfully!');
        console.log('');
      }
      console.log('----------------------------------');
      if ( serverStatus !== 200 ) {
        resolve(false);
      } else {
        resolve(serverStatus);
      }
    });
  })
  .catch((err)=>{console.log('ERROR: '+err); return err;});
};

// // Not using this right now since mocha handles test suites synchronously
// const runTest = function (test) {
//   // return a promise of testResults. // investigate whether we can run these in parallel
//   return new Promise( (resolve,reject) => {
//     //
//     let testErr = -1;
//     if ( test.endsWith('.js') || test.endsWith('.ts') ) {
//       console.log('');
//       console.log('mocha: '+test);
//       console.log('   .   .   .   .   .   ');
//       // transpiled scripts are now all .js so ...
//       test = test.slice(0,-3) + '.js';
//       let testFilePath = path.join(PROJECT_ROOT,'dist','tests',test);
//       // execute test with mocha and get the result
//       // Instantiate a Mocha instance.
//       let mocha = new Mocha({
//         bail:       true,
//         reporter:   MOCHA_TEST_REPORTER
//       });
//       mocha.addFile( testFilePath );
//       // Run the test (this is asynchronous so we resolve this)
//       mocha.run( (failures)=>{ process.on('exit', (failures)=>{ resolve(failures); }); } );
//     // } else if ( test.endsWith('.py') ) {
//     //   console.log('');
//     //   console.log('> python tests/'+test);
//     //   console.log('   .   .   .   .   .   ');
//     //   // execute test with python and get the result
//     } else {
//       console.log("Invalid test. "+test);
//       reject(testErr);
//     }
//   })
//   .then((testErr)=>{
//     if (testErr === 0) {
//       console.log('   Pass');
//     } else if (testErr >0) {
//       console.log('   Fail');
//     }
//     if (testErr >= 0) {
//       console.log('   .   .   .   .   .   ');
//       resolve(testErr);
//     }
//     else {
//       resolve(testErr);
//     }
//   })
//   .catch((err)=>{return err;});
// };


// // From: https://hackernoon.com/functional-javascript-resolving-promises-sequentially-7aac18c4431e
// // didn't have much luck using this, but keeping for reference
// const promiseSerial = funcs =>
//   funcs.reduce((promise, func) =>
//     promise.then(result => func().then(Array.prototype.concat.bind(result))),
//     Promise.resolve([])
//   );

const executeMochaTests = function (testsToExecute) {
  return new Promise(resolve => {
    // set up mocha
    let mocha = new Mocha({
      bail:       MOCHA_BAIL,
      reporter:   MOCHA_TEST_REPORTER
    });
    // throw all of these tests at mocha
    testsToExecute.forEach( (test)=> {
      mocha.addFile( test );
    });
    // Run the tests (this is asynchronous so we resolve this when the callback executes)
    mocha.run( (failures) => {
      //console.log('test resolution. errors('+failures+')');
      resolve(failures);
    });
  });
};

const executeAllTests = function () {
  console.log('Testing:');
  console.log('');

  //let testResults = { errors:0, complete:false };
  // let testEnvs    = 'GAME_HOST='+HOST+' GAME_ROOT='+PROJECT_ROOT;
  process.env.GAME_HOST = HOST;
  process.env.GAME_ROOT = PROJECT_ROOT;
  let testPromises;
  // MOCHA tests
  if ( TEST_LIST_MOCHA.length > 0 ) {
    // preprocess array first
    for (let nth=0; nth < TEST_LIST_MOCHA.length; nth++) {
      let thisTest = TEST_LIST_MOCHA[nth];
      //  convert all extensions to .js
      thisTest = thisTest.slice(0,(thisTest.lastIndexOf('.'))) + '.js';
      //  convert all relative paths to absolute: PROJECT_ROOT/dist/tests/[the test]
      if (!thisTest.startsWith('/')) {
        thisTest = path.join(PROJECT_ROOT,'dist','tests',thisTest);
      }
      // change the array at nth index
      if (fs.existsSync(thisTest)) {
        TEST_LIST_MOCHA[nth] = thisTest;
      } else {
        TEST_LIST_MOCHA.splice(nth,1);
        --nth;
      }
    }

    testPromises = executeMochaTests(TEST_LIST_MOCHA);
  } else {
    // we don't have a specified list so we are going to try to execute all tests in the tests folder

    // first let us make the list
    let TEST_LIST = [];
    // if the test file exists, and is a js or ts add it to TEST_LIST
    fs.readdirSync(path.join(PROJECT_ROOT,'tests')).forEach(thisTest => {
      if (   !thisTest.startsWith('_')
          && (thisTest.endsWith('.js') || thisTest.endsWith('.ts'))
          &&  thisTest !== 'webpack.config.js'
         ) {
         //  convert all extensions to .js
        thisTest = thisTest.slice(0,(thisTest.lastIndexOf('.'))) + '.js';
        //  convert all relative paths to absolute: PROJECT_ROOT/dist/tests/[the test]
        thisTest = path.join(PROJECT_ROOT,'dist','tests',thisTest);
        TEST_LIST.push(thisTest);
      }
    });

    testPromises = executeMochaTests(TEST_LIST);
  }
  //console.log(testPromises);

  return Promise.all([testPromises]);
};



// EXECUTION -------------------------------------------------------------------
const main = function () {
  console.log('==================================');
  // console.log('Envs: '+JSON.stringify(process.env) );

  // PARSE ARGUMENTS
  for (let nth=2;nth<process.argv.length;nth++) {
    const arg = process.argv[nth].trim();
    // console.log(nth);
    // console.log(arg);


    // // -- COMPILE MODE SWITCH --
    // if (arg==='-n' || arg==='--no-compile') {
    //   // console.log('No compiling happening here, (if we can help it).');
    //   // console.log();
    //   COMPILE_ON = false;
    // }

    if (arg==='-h' || arg==='--help') {
      // -- HELP --
      displayCommandHelp();
      process.exit();
    } else if (arg==='-v' || arg==='--verbose') {
      // -- VERBOSE FEEDBACK SWITCH --
      // console.log('verbose mode? ok then VERBOSE_EXECUTION=true');
      // console.log('*daemon sent to prepare speech*');
      // console.log();
      VERBOSE_EXECUTION = true;
    } else if (arg==='--mocha-bail') {
      MOCHA_BAIL = true;
    } else if (arg==='-f' || arg==='--file') {
      // -- IDENTIFY ONE OR MORE TESTS --
      let arrayString = '';
      // sub-loop over file list
      for (++nth ; nth<process.argv.length; nth++) {
        if (arrayString !== '') { // we are in parse array mode
          arrayString = parseArrayForTestList(arrayString,process.argv[nth].trim());
        } else if (process.argv[nth].trim().startsWith('[')) { // we found an array so start parsing an array
          arrayString = parseArrayForTestList(arrayString,process.argv[nth].trim());
        } else if (process.argv[nth].trim().startsWith('-')) { // we found a CLI argument so exit 'file mode'
          if (arrayString!=='') { arrayString = parseArrayForTestList(arrayString,']'); } // finish off the array now
          --nth; // rewind 1 to parse this arg
          break;
        } else {
          parseStringForTestList(process.argv[nth].trim());
        }
      }
    } else if (arg==='-b' || arg==='--build-type') {
      // -- SPECIFY BUILD TYPE as ./envs file --
      let buildType = process.argv[++nth];
      if (!buildType || buildType.startsWith('-')) {
        setBuildType('production');
        --nth; // rewind 1 to parse this arg
      } else {
        setBuildType(buildType);
      }
    }
  }
  // end PARSE ARGUMENTS

  // INDICATE ENVIRONMENT and BUILD
  console.log('');
  console.log('Environment: '+BUILD_TYPE);
  console.log('Game:        '+BUILD_PATH);
  console.log('');
  console.log('----------------------------------');

  // HOLD UP EXECUTION UNTIL COMPILATION
  transpileTestScripts()
  // FIND or START GAME SERVER
  .then((asExpected)=>{
    if (!asExpected) { process.exit(1);}

    return findOrStartGameServer();
  })
  // EXECUTE TESTS
  .then((gameServerStatus)=>{
    if (gameServerStatus!==200) { process.exit(1); }

    return executeAllTests();
  })
  // TEST RESULTS IN BRIEF
  .then((testResults)=>{
    console.log('');
    console.log('Testing completed!');
    console.log('');
    if (testResults !== 0 ) {
      console.log('ERRORS: '+testResults);
      let reportInfo = getReportFileInformation();
      if (reportInfo!=='') { console.log(reportInfo); }
    } else {
      console.log('STATUS: passed');
    }
    console.log('');
    console.log('----------------------------------');
    process.exit(testResults);
  });
};

main(); // let's get this started
