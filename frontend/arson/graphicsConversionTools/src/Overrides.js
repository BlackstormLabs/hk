const minimatch = require('minimatch');


const defaultJPEGQuality = 85;
const defaultRGBAmount = 32;
const defaultAlphaAmount = 32;


class Overrides {
  constructor (params) {
    this.params = params;
    this.regex = {};

    // Cache compiled regular expressions for faster processing later on
    for (const pattern in params)
      this.regex[pattern] = minimatch.makeRe(pattern);
  }

  /**
   * Given a png spritesheet, return the proper compression paramaters to be fed into pngquant.
   * parameters are contained in a json file in the root directory.
   *
   * @param filename name of the spritesheet file
   * @returns a string with compression parameters for pngquant
   */
  getParamsForFile (filename, defaultParams) {
    for (const pattern in this.regex)
      if (this.regex[pattern].test(filename))
        return this.parseParams(this.params[pattern]);

    return this.parseParams(defaultParams);
  }

  parseParams (data) {
    // Init result with default values
    var result = {
      quality: defaultJPEGQuality,
      rgb_amount: defaultRGBAmount,
      alpha_amount: defaultAlphaAmount
    };

    // Process only the string version of params
    if (typeof data !== 'string') {
      return Object.assign(result, data);
    }

    // Set appropriate flags
    if (data === 'pass_through') {
      result.pass_through = true;
    } else if (data === 'lossless') {
      result.lossless = true;
    } else if (data === 'posterize') {
      result.posterize = true;
    } else if (data === 'force_jpg') {
      result.force_jpg = true;
    } else if (data === 'solid_font') {
      result.solid_font = true;
    }

    // Store default string params to be used later
    result.raw = data;

    return result;
  }
}


module.exports = Overrides;
