// Transfer execution to the frontend submodule

try {
  var webpackConfig = require(__dirname + '/frontend/arson/webpack.config.js');
} catch (e) {
  console.error(e);
  console.error('------------------------------------------------------------------------------');
  console.error('Failed to load webpack scripts from frontend/ folder. Did you run npm install? It could also be due to an error - see above for exception details.');
  process.exit(1);
}

module.exports = function (env) {
  // If you need to alter the env you can do so here.
  env.IS_DEVELOPMENT = env.buildType === 'development' ||
                       env.buildType === 'developmentFacebook' ||
                       env.buildType === 'RC0' ||
                       env.buildType === 'RC1' ||
                       env.buildType === 'RC2';
  env.IS_CUSTOMER_SUPPORT = env.buildType === 'development' ||
                            env.buildType === 'developmentFacebook' ||
                            env.buildType === 'CS';

  var config = webpackConfig(env);

  // If you need to alter the config you can do so here.

  return config;
};
