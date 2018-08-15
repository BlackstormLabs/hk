// versioning invalidates the cache
const versionString = require('../package.json').version;


const cacheDataFile = 'data.json';


module.exports = {
  versionString: versionString,
  cacheDataFile: cacheDataFile
};
