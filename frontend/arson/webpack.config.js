const webpack = require('webpack');
const fs = require('fs');
const url = require('url');
const path = require('path');
const { CheckerPlugin } = require('awesome-typescript-loader');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const WriteFilePlugin = require('write-file-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BlackstormBuild = require('./buildPlugin/blackstormBuild');
const launchExpressServer = require('./webpackConfigHelpers/expressServer');
const generateBuildContext = require('./webpackConfigHelpers/generateBuildContext');

// Check everything is cool first off!
var environmentCheck = require('./buildPlugin/environmentCheck');
environmentCheck.runEnvironmentChecks();

// Incredibly lame way of detecting if we are watching so we don't stall build
// forever by launching express.
const isWebpackDevServer = process.argv.find(v => v.indexOf('webpack-dev-server') !== -1);
const isWatchArg = process.argv.find(v => v.indexOf('watch') !== -1);
const isWatching = isWebpackDevServer || isWatchArg;
if (isWatching) console.log('Watch mode.');

const DEV_SERVER_PORT = 8020;

// The main function which configures webpack.
module.exports = function (env, options) {
  options = options || {};
  options.useCommonsChunk = options.useCommonsChunk === undefined ? true : options.useCommonsChunk;

  // Webpack prefers absolute paths, so generate the reference point for all
  // paths to follow.
  var rootDir = process.cwd() + '/';

  // Also see if we are building the game's supporting Google Cloud Function,
  // not the game.
  const isGCFBuild = env && (env.GCF === 'true' || env.GCF === true);
  if (isGCFBuild) console.log('Building GCF');

  // We set this up so we have a single convenient place to store various
  // pieces of states related to a build. This is a big chunk of code that's
  // easier to follow by itself.
  var buildContext = {
    isWatching: isWatching,
    isGCFBuild: isGCFBuild
  };

  // We have a bunch of standardized logic around env files, detecting release
  // builds, getting commit hash, and so on. We process it here, and add it to
  // the buildContext defined above.
  generateBuildContext(rootDir, env, buildContext);

  // Launch express if appropriate. (We can probably move this to the plugin
  // someday after considering the right callback.)
  if (isWatching) {
    buildContext.httpsServer = launchExpressServer(buildContext.outputRelative);
  }

  // We have some common config blocks, which we define here. By sharing them,
  // we simplify changing behavior, shorten the definitions later on, and prevent
  // inconsistencies.

  // Common ifdef-loader.
  var ifDefLoader = {
    loader: 'ifdef-loader',
    options: {
      GCF_BUILD: buildContext.isGCFBuild,
      IS_DEVELOPMENT: env.IS_DEVELOPMENT || buildContext.isSimulated || false,
      IS_CUSTOMER_SUPPORT: env.IS_CUSTOMER_SUPPORT,
      IS_TEST: process.env.IS_TEST === 'true', // QA - all testing
      IS_AUTOMATED: process.env.IS_AUTOMATED === 'true' // QA - only automated testing
    }
  };

  // TS and JS code uses the same babel config, so let's define it once.
  var babelLoader = {
    loader: 'babel-loader',
    options: {
      presets: [
        // We need loose mode for better obfuscation. Changing mode to strict
        // requires modifications to timestep code.
        [
          require.resolve('babel-preset-es2015'),
          { loose: true, options: { modules: true } }
        ]
      ],
      plugins: [
        require.resolve('babel-plugin-transform-object-assign'),
        require.resolve('babel-plugin-transform-object-rest-spread')
      ],
      cacheDirectory: rootDir + '.cache/babel-cache/'
    }
  };

  // The directories containing code we want to process (ie babel, uglify, tsc).
  // TODO: This should be built automatically from project's tsconfig.json (at least for ts-loader config).
  var codeIncludes = [
    /gcf\/(?:[^/]*(?:\/|$))*$/,
    /src\/(?:[^/]*(?:\/|$))*$/,
    /frontend\/(?:[^/]*(?:\/|$))*$/,
    /vendor\/(?:[^/]*(?:\/|$))*$/,
    /tests\/(?:[^/]*(?:\/|$))*$/
  ];

  // Set up common build config.
  var config = {
    node: {
      setImmediate: false
    },

    resolve: {

      symlinks: false,

      extensions: ['.js', '.ts'],

      modules: [
        rootDir + 'src',
        rootDir + 'frontend/devkit-core',
        rootDir + 'frontend/devkit-core/timestep/src',
        rootDir + 'frontend/flatline/src',
        rootDir + 'frontend/freeside-client/src',
        rootDir + 'frontend/stormcloud-client/src',
        rootDir + 'frontend/devkit-core/src/clientapi',
        rootDir + 'frontend/jsio',
        rootDir + 'frontend/',
        rootDir + 'vendor',
        rootDir + 'node_modules',
        rootDir + 'frontend/node_modules',
        rootDir
      ],

      alias: {
        devkitCore: rootDir + 'frontend/devkit-core/src',
        devkit: rootDir + 'frontend/devkit-core/src/clientapi',
        devtools: rootDir + 'frontend/devtools-bridge',
        squill: rootDir + 'frontend/devkit-core/modules/squill',
        facebook: rootDir + 'frontend/devkit-fbinstant/js',
        'facebook-pixel': rootDir + 'frontend/devkit-fbpixel/js',
        child_process: rootDir + 'frontend/devkit-core/src/build/shim/empty.js',
        jsio: rootDir + (
          buildContext.isGCFBuild
          ? 'frontend/jsio/jsio.js'
          : 'frontend/jsio/jsio-web.js'
        )
      }

    },

    resolveLoader: {
      modules: [
        rootDir + 'node_modules',
        rootDir + 'frontend/node_modules'
      ]
    },

    // TSL: this seems to be the most consistent way to track browser (transpiled) code back to sources.
    devtool: 'eval-source-map',

    plugins: [

      // Type checking.
      new CheckerPlugin(),

      // Show progress in an appealing way.
      new webpack.ProgressPlugin(),

      // If running in webpack-dev-server we want to write build files out
      // to disk to avoid a working build (in live dev) turning into a
      // failing build (if you run it later w/ webpack-dev-server).
      new WriteFilePlugin(),

      // Enforce case sensitive paths to make sure we're not running into any
      // weird cache issues
      new CaseSensitivePathsPlugin()

      // More plugins are added below in the game and GCF specific sections.
    ],

    module: {
      rules: [
        // Handle JS files.
        {
          test: /\.js$/,
          include: codeIncludes,
          use: [
            ifDefLoader,
            {
              loader: 'unlazy-loader',
              options: {}
            },
            babelLoader
          ]
        },

        // Handle typescript.
        {
          test: /\.ts$/,
          include: codeIncludes,
          use: [
            babelLoader,
            {
              loader: 'awesome-typescript-loader',
              options: {
                silent: true,
                visualStudioErrorFormat: true,
                ignoreDiagnostics: [1192, 2305, 2307],
                useBabel: false,
                useCache: true,
                babelCore: require.resolve('babel-core'),
                cacheDirectory: rootDir + '.cache/awesome-typescript-loader-cache/',
                reportFiles: ['src/*.{ts,tsx}', 'src/**/*.{ts,tsx}']
              }
            },
            ifDefLoader
          ]
        },

        // Allow import of JSON files.
        {
          test: /^[^.]+?(?!\.schema)\.json$/,
          use: ['json-loader', 'webpack-comment-remover-loader']
        },

        // Copy worker cache in theoretically.
        {
          test: /\.worker\\\.js$/,
          use: [
            {
              loader: 'worker-loader',
              options: {
                inline: true
              }
            },
            ifDefLoader
          ]
        },

        // Allow import of CSV.
        {
          test: /\.(csv)$/,
          loader: 'dsv-loader'
        },

        // Allow import of XML.
        {
          test: /\.(xml)$/,
          loader: 'xml-loader'
        },

        // Allow import of images.
        {
          test: /\.(jpe?g|gif|png)$/,
          use: {
            loader: 'file-loader',
            options: {
              name: '[name].[hash].[ext]',
              outputPath: 'files/images/'
            }
          }
        },

        // Allow import of sound data.
        {
          test: /\.(wav|mp3|ogg|mp4|webm|ogv)$/,
          use: {
            loader: 'file-loader',
            options: {
              name: '[name].[hash].[ext]',
              outputPath: 'files/media/'
            }
          }
        }
      ]
    }
  };

  if (buildContext.isGCFBuild === true) {

    // We are building the GCF.

    // Some modules should not be bundled, these are called externals
    var externalsBlacklist = [
      // Random files that get picked up in scan
      '.bin',
      '.DS_Store',
      '@blackstormlabs',
      '@google-cloud',
      '@types',
      // Add things you do not want excluded here...
      'redux-diff-logger',
      'base'
    ];

    var nodeModules = {};
    fs.readdirSync('node_modules')
      .filter(function (x) {
        return externalsBlacklist.indexOf(x) === -1;
      })
      .forEach(function (mod) {
        nodeModules[mod] = 'commonjs ' + mod;
      });

    // added REGEX's for modules that may have submodules as well
    var regexedNodeModules = [];
    regexedNodeModules.push(new RegExp('^@google-cloud.*'));
    regexedNodeModules.push(new RegExp('selenium-webdriver.*$'));

    config.externals = [nodeModules, regexedNodeModules];

    // We are building for node.
    config.target = 'node';

    // Do not mock or polyfill anything
    config.node = false;

    config.entry = {
      'serverIndex': buildContext.environmentData.BUILD_GCF_ENTRY
        || path.resolve(rootDir, 'src', 'server', 'index'),
      'clientSchema': buildContext.environmentData.BUILD_GCF_SCHEMA
        || path.resolve(rootDir, 'src', 'stormcloud', 'clientSchema')
    };

    config.output = {
      filename: '[name].js',
      path: path.resolve(rootDir, 'dist'),
      publicPath: '/dist/',
      libraryTarget: 'commonjs'
    };

    // We have to pass these explicitly. The DefinePlugin appears to try to look
    // up every
    buildContext.environmentData.DEBUG_DATA = 'process.env.DEBUG_DATA';
    buildContext.environmentData.PWD = 'process.cwd()';

    // We need to pass build config into code compilation.
    config.plugins.unshift(
      new webpack.DefinePlugin({ 'process.env': buildContext.environmentData })
    );

  } else {
    // We are building the game.

    // Configure the main dev server for live dev.
    config.devServer = {
      https: true,
      openPage: buildContext.outputRelative.substr(1),
      overlay: true,
      contentBase: buildContext.outputRelative,
      port: DEV_SERVER_PORT
    };

    config.entry = {
      'main': buildContext.environmentData.BUILD_BROWSER_ENTRY
        || path.resolve(rootDir, 'src', 'Application'),
      'bootstrap': path.resolve(
        rootDir, 'frontend', 'devkit-core', 'src', 'clientapi', 'bootstrap'
      )
    };

    config.output = {
      filename: '[name].js',
      path: buildContext.outputPath,
      publicPath: './',
      chunkFilename: '[name]-[id].js',
      pathinfo: true
    };

    // Copy font data files.
    config.plugins.unshift(
      new CopyWebpackPlugin([
        {
          from: 'resources/**/*.fnt',
          to: '.'
        }
      ])
    );

    // And fbapp config
    config.plugins.unshift(
      new CopyWebpackPlugin([
        {
          from: 'fbapp-config.json',
          to: '.'
        }
      ])
    );

    // Custom plugin to coordinate asset build steps.
    config.plugins.unshift(
      new BlackstormBuild({
        isWatch: buildContext.isWatching,
        isRelease: buildContext.isRelease,
        isFacebookMode: !buildContext.environmentData.DEV_FACEBOOK_EMBED,
        imageCacheLocation: buildContext.imageCacheLocation,
        spritesheetOverrides: buildContext.spritesheetOverrides,
        isFullImageCompress: buildContext.isFullImageCompress,
        isSimulated: buildContext.isSimulated,
        resourceDir: buildContext.resourceDir,
        rootPackage: buildContext.rootPackage,
        serverAddresses: function () {
          // Return nice usable URLs for the web servers.
          return [
            'https://localhost:' + buildContext.httpsServer.address().port + '/',
            'https://localhost:' + DEV_SERVER_PORT + '/webpack-dev-server/'
          ];
        }
      })
    );

    // We need to pass build config into code compilation.
    config.plugins.unshift(
      new webpack.DefinePlugin({ 'process.env': buildContext.environmentData })
    );

    if (options.useCommonsChunk) {
      // Because we produce bootstrap and main code modules, we have to split
      // shared code into a common chunk. Only game should do this.
      config.plugins.unshift(
        new webpack.optimize.CommonsChunkPlugin({
          name: 'devkit_modules',
          filename: 'devkit_modules.chunk.js'
        })
      );
    }

    if (buildContext.isRelease) {
      // Release builds uglify.
      config.plugins.unshift(new webpack.optimize.UglifyJsPlugin({
        mangle: {
          keep_fnames: true
        },
        compress: {
          warnings: false
        },
        sourceMap: {
          url: 'main.js.map'
        },
        cache: '.cache/uglifyjs',
        parallel: true,
        uglifyOptions: {

        }
      }));
    }

  }

  // Release builds will have some add'l settings.
  if (buildContext.isRelease) {
    // Don't emit source map.
    config.devtool = false;
  }

  // Include stats about resulting build
  config.stats = 'verbose';

  // Great - fully configured!
  return config;
};
