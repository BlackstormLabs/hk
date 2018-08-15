const webpack = require('webpack');

module.exports = function (env) {
  var rootDir = process.cwd() + '/';
  var buildPath = '/js-builds/';

  config = {
    entry: {
      'viewer': './src/viewer/index.js'
    },

    output: {
      filename: '[name].js',
      path: __dirname + buildPath,
      publicPath: './',
      chunkFilename: '[name]-[id].js',
      pathinfo: true
    },

    context: __dirname,

    resolve: {
      modules: [
        rootDir + 'src',
        rootDir + '../devkit-core/timestep/src',
        rootDir + '../jsio',
        rootDir + 'node_modules/',
        rootDir
      ],
      symlinks: false,
      extensions: ['.js']
    },

    // Note: should be able to specify electron as target
    // instead of using the externals replacement trick
    // but seems impossible due to some magic in jsio.js
    // (see line: "var req = util.bind(parent, parent && parent.require || require);")
    // target: 'electron-main',
    externals: [{
      fs: 'require(\'fs\');'
    }],

    resolveLoader: {
      modules: [
        rootDir + 'node_modules',
      ]
    },

    devtool: false,
    
    module: {
      rules: [
        // Handle JS files.
        {
          test: /\.js$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  [
                  rootDir + 'node_modules/babel-preset-es2015/lib/index.js',
                    { loose: true, options: { modules: true } }
                  ]
                ]
              }
            }
          ],
          include: [
            /src\/(?:[^\/]*(?:\/|$))*$/,
            /..\/(?:[^\/]*(?:\/|$))*$/
          ]
        },

      ]
    }
  };

  return config;
}
