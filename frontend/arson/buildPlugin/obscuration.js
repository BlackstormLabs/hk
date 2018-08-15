//obscuration.js
//Custom obscuring.
//
//Goal: mangle as many identifiers as possible
//Current capabilities:
//  * Renames functions of the type a=function() and function b() to a string like $_, $_$, $_0, $_a, $_A, $_00 (over 4000 function
//     names will fit before we start having 5 character mangled names)
//  * Blacklists JavaScript keywords (see the "reservedIdentifier" array)
//  * Blacklisted user list (see the "blacklist" variable)
//  * Blacklisted prefixes (see the "exclusionPrefixes" variable) For example, "a" will exclude any identifier that starts with the
//     letter "a", "an" will exclude any identifier that starts with the string "an".

var fs = require('fs');
var path = require('path');

//javascript files that will get processed
var file_list = ['browser-mobile.js', 'bootstrap.js', 'devkit_modules.chunk.js', 'node_thirdParty.chunk.js'];

//console colors
const Reset = '\x1b[0m'; const Bright = '\x1b[1m'; const Dim = '\x1b[2m'; const Underscore = '\x1b[4m'; const Blink = '\x1b[5m';
const Reverse = '\x1b[7m'; const Hidden = '\x1b[8m'; const FgBlack = '\x1b[30m'; const FgRed = '\x1b[31m'; const FgGreen = '\x1b[32m';
const FgYellow = '\x1b[33m'; const FgBlue = '\x1b[34m'; const FgMagenta = '\x1b[35m'; const FgCyan = '\x1b[36m'; const FgWhite = '\x1b[37m';
const BgBlack = '\x1b[40m'; const BgRed = '\x1b[41m'; const BgGreen = '\x1b[42m'; const BgYellow = '\x1b[43m'; const BgBlue = '\x1b[44m';
const BgMagenta = '\x1b[45m'; const BgCyan = '\x1b[46m'; const BgWhite = '\x1b[47m';

var validChars = '_$0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
var exclusionPrefixes = [];
var blacklist = [
  //these killed Tsuri-Star
  'sounds', 'metadata', 'header', 'getTime',
  //these killed debug EW
  'warn', 'Group', 'join', 'appendChild', 'apply', 'body', 'concat', 'createProgram', 'createTexture', 'call', 'disable',
  'defineProperties', 'deleteTexture', 'drawImage', 'enable', 'exec', 'finish', 'forEach', 'freeze', 'getContext', 'getName',
  'getByNames', 'groupEnd', 'getType', 'has', 'insertBefore', 'isArray', 'keys', 'log', 'logger', 'lastIndexOf', 'min', 'merge',
  'now', 'onPause', 'onInputMove', 'parse', 'reduce', 'restore', 'stringify', 'spread', 'save', 'subscribe', 'stop', 'send',
  'setLoadingProgress', 'setTransform', 'then', 'useProgram', 'using', 'reverse', 'reject', 'Event', 'module',
  //these killed release EW
  'LeaderboardViewController', 'ShopViewController', 'result', '_interopRequireDefault', '_classCallCheck',
  '_possibleConstructorReturn', '_inherits', 'find', 'fillRect', 'exports', 'Application',
  //these were in EW strings
  'some', 'clone', 'check', 'before', 'every', 'collectReward', 'Support', 'same', 'after', 'values', 'Size', 'once', 'rest',
];
var reservedIdentifiers = [ //https://www.w3schools.com/js/js_reserved.asp
  //JavaScript Reserved Words
  'abstract', 'arguments', 'await', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'double', 'else', 'enum', 'eval', 'export', 'extends', 'false', 'final', 'finally', 'float', 'for',
  'function', 'goto', 'if', 'implements', 'import', 'in', 'instanceof', 'int', 'interface', 'let', 'long', 'native', 'new', 'null',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'super', 'switch', 'synchronized', 'this', 'throw',
  'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while', 'with', 'yield',

  //JavaScript Objects, Properties, and Methods
  'hasOwnProperty', 'Infinity', 'isFinite', 'isNaN', 'isPrototypeOf', 'length', 'Math', 'NaN', 'name', 'Number', 'Object',
  'prototype', 'String', 'toString', 'undefined', 'valueOf',

  //Other Reserved Words
  'alert', 'all', 'anchor', 'anchors', 'area', 'assign', 'blur', 'button', 'checkbox', 'clearInterval', 'clearTimeout',
  'clientInformation', 'close', 'closed', 'confirm', 'constructor', 'crypto', 'decodeURI', 'decodeURIComponent', 'defaultStatus',
  'document', 'element', 'elements', 'embed', 'embeds', 'encodeURI', 'encodeURIComponent', 'escape', 'event', 'fileUpload',
  'focus', 'form', 'forms', 'frame', 'innerHeight', 'innerWidth', 'layer', 'layers', 'link', 'location', 'mimeTypes', 'navigate',
  'navigator', 'frames', 'frameRate', 'hidden', 'history', 'image', 'images', 'offscreenBuffering', 'open', 'opener', 'option',
  'outerHeight', 'outerWidth', 'packages', 'pageXOffset', 'pageYOffset', 'parent', 'parseFloat', 'parseInt', 'password',
  'pkcs11', 'plugin', 'prompt', 'propertyIsEnum', 'radio', 'reset', 'screenX', 'screenY', 'scroll', 'secure', 'select', 'self',
  'setInterval', 'setTimeout', 'status', 'submit', 'taint', 'text', 'textarea', 'top', 'unescape', 'untaint', 'window',

  //HTML Event Handlers
  'onblur', 'onclick', 'onerror', 'onfocus', 'onkeydown', 'onkeypress', 'onkeyup', 'onmouseover', 'onload', 'onmouseup',
  'onmousedown', 'onsubmit'
];
var functions = [];
var skipped = [];
var inp = '';
var mvcnames = [];
var mapping = [];
var numReservedSymbols = 1; //"GC"

var env = {};
var paths = [];

/**
 * Creates a list of names that need to be munged. Every time they show up in a string they will be altered.
 * No parameters.
 * No return.
 * Relies on: inp[].
 * Side effect: alters mvcnames[].
 */
function getMVCNames() {
  var searchStrings = ['.NAME = "', '.NAME="', ".NAME = '", ".NAME='"];
  var matchTermination = ['"', '"', "'", "'"];

  for (var i = 0; i < searchStrings.length; i++) {
    var pos;
    do {
      pos = inp.indexOf(searchStrings[i], pos);
      if (pos > -1) {
        var t = pos + searchStrings[i].length;
        pos = inp.indexOf(matchTermination[i], t);
        var name = inp.slice(t, pos);
        if (!isBlacklisted(name)) {
          mvcnames[mvcnames.length] = name;
        }
      }
    } while (pos > -1);
  }
}

/**
 * Munge the names of the mvc strings.
 * No return.
 * Side effect: alters mvcnames[].
 * @param {number} code value from 0 - 1023, generated based on the length of the source file
 */
function replaceMVCNames(code) {
  for (var i = 0; i < mvcnames.length; i++) {
    var replacementSymbol = generateSymbol(i, '$$', code);
    replace(mvcnames[i], replacementSymbol);
    mapping.push([mvcnames[i], replacementSymbol]);
  }
}

/**
 * See if the symbol starts with an excluded prefix.
 * Relies on exclusionPrefixes[].
 * @param {string} s symbol
 * @returns boolean
 */
function excludedPrefix(s) {
  for (var i = 0; i < exclusionPrefixes.length; i++) {
    var pre = exclusionPrefixes[i];
    if (s.substring(0, pre.length) == pre) {
      return true;
    }
  }
  return false;
}

/**
 * See if the symbol is in the excluded list.
 * Relies on: blacklist[]
 * @param {string} s symbol
 * @returns {boolean}
 */
function isBlacklisted(s) {
  return (blacklist.indexOf(s) >= 0);
}

/**
 * Add a symbol to the list of skipped names.
 * Side effect: Alters Skipped[].
 * @param {string} s symbol
 */
function addToSkipped(s) {
  if (skipped.indexOf(s) < 0) {
    skipped[skipped.length] = s;
  }
}

/**
 * Given a unique number, a prefix, and a scramble code, generate a unique string.
 * Relies on: validChars[].
 * @param {number} n
 * @param {string} prefix
 * @param {number} code
 * @returns {string} unique replacement symbol
 */
function generateSymbol(n, prefix, code) {
  var out = prefix;
  var t = n ^ code;
  while (t > 0) {
    var old = t;
    t = Math.floor(t / validChars.length);
    var delta = old - t * validChars.length;
    out += validChars.charAt(delta);
  }
  return out;
}

/**
 * See if there is an equals sign before s[index] (might be spaces as well)
 * @param {string} s
 * @param {number} index
 * @returns {boolean}
 */
function isPrecededByEquals(s, index) {
  for (var i = index - 1; i >= 0; i++) {
    c = s.charAt(i);
    if (c == '=') {
      return true;
    } else if (c !== ' ') {
      return false;
    }
  }
  return false;
}

/**
 * See is s[index] is a valid character for a JavaScript identifier
 * Relies on: validChars[]
 * @param {string} s
 * @param {number} index
 * @returns {boolean}
 */
function isIdentifierChar(s, index) {
  return (validChars.indexOf(s.charAt(index)) >= 0);
}

/**
 * Get the name of the function (found before the equals sign before the "function" which is at s[index])
 * @param {string} s
 * @param {number} index
 * @returns {string} function name
 */
function typeAName(s, index) {
  var name = '';
  var loc = index;
  var c;

  //step back to find the = sign
  for (var i = loc - 1; i >= 0; i++) {
    c = s.charAt(i);
    if (c == '=') {
      loc = i;
      break;
    }
  }

  //step back to skip any white space
  do {
    loc--;
    c = s.charAt(loc);
  } while (c == ' ');

  //step back picking up the characters in the identifier
  var collecting = true;
  do {
    c = s.charAt(loc);
    if (isIdentifierChar(s, loc)) {
      name = c + name;
      loc--;
    } else {
      collecting = false;
    }
  } while (collecting);

  return name;
}

/**
 * Get the name of the function (found after the "function" which is at s[index])
 * @param {string} s
 * @param {number} index
 * @returns {string}
 */
function typeBName(s, index) {
  var i = index + 9;
  var name = '';
  while (s.charAt(i) == ' ') {
    i++;
  }
  while (isIdentifierChar(s, i)) {
    name += s.charAt(i);
    i++;
  }
  return name;
}

/**
 * Add a symbol to the function list
 * Side effect: Alters functions[].
 * @param {string} name
 */
function addFunctionName(name) {
  if (functions.indexOf(name) == -1) {
    functions[functions.length] = name;
  }
}

/**
 * Check to see if the symbol occurs in single or double quotes. If so, assume it's dangerous to replace and return false.
 * Relies on: inp[].
 * @param {string} s
 * @returns {boolean}
 */
function validToReplace(s) {
  if (inp.indexOf("'" + s + "'") >= 0) {
    return false;
  } else if (inp.indexOf('"' + s + '"') >= 0) {
    return false;
  }
  return true;
}

/**
 * Replace all occurences of originalString with replacementString
 * Relies on: inp[].
 * Side effect: alters inp[].
 * @param {string} originalString
 * @param {string} replacementString
 */
function replace(originalString, replacementString) {
  var index = 0;
  var oldIndex = 0;
  var newString = '';
  var delta = originalString.length - replacementString.length;
  while (index != -1) {
    index = inp.indexOf(originalString, index);
    if (index != -1) {
      //make sure we don't have the string embedded in a bigger string
      if (!(isIdentifierChar(inp, index - 1) || isIdentifierChar(inp, index + originalString.length))) {
        newString += inp.slice(oldIndex, index) + replacementString;
        oldIndex = index + originalString.length;
      }
      index++;
    }
  }
  inp = newString + inp.slice(oldIndex, inp.length);
}

/**
 * Mangle the GC variable and the mvc variables
 * @param {number} code
 */
function mangleMVC(code) {
  //mangle GC in browser-Mobile.js
  console.log(FgBlue + '\tMangle GC & MVC properties' + Reset);
  var replacement = generateSymbol(0, '$_', code);
  console.log('\t\tMangling GC to ' + replacement);
  replace('GC', replacement);
  mapping.push(['GC', replacement]);

  //get mvc names
  console.log('\t\tCollecting mvc names...');
  getMVCNames();
  console.log('\t\tMangling mvc names...');
  replaceMVCNames(code);
}

/**
 * Mangle the function names
 * @param {number} code
 */
function mangleFunctions(code) {
  console.log(FgBlue + '\tMangle function names' + Reset);

  //get function names
  var index = 0;
  var totalFunctionCount = 0;
  console.log('\t\tCollecting function names...');
  while (index != -1) {
    index = inp.indexOf('function', index);
    if (index != -1) {
      var name = '';
      if (isPrecededByEquals(index)) {  //found a function of the form: a=function()
        name = typeAName(inp, index);
      } else {                          //found a function of the form: function b()
        name = typeBName(inp, index);
      }
      totalFunctionCount++;
      if (name.length > 0) {            // if length is zero, it's an anonymous function and we skip it
        if (!isBlacklisted(name)) {     // skip blacklisted functions
          if (!excludedPrefix(name)) {  // skip functions that start with designated prefixes
            if (validToReplace(name)) { // true if name never appears in a string like 'this' or "this"
              addFunctionName(name);
            } else {
              addToSkipped(name + ' (quoted)');
            }
          } else {
            addToSkipped(name + ' (prefix)');
          }
        } else {
          addToSkipped(name + ' (keyword or blacklist)');
        }
      }
      index++;
    }
  }

  //mangle
  console.log('\t\tMangling function names...');
  for (var i = 0; i < functions.length; i++) {
    var a = functions[i];
    var b = generateSymbol(i + numReservedSymbols, '$_', code);
    if (b.length <= a.length) {
      replace(a, b);
      mapping.push([a, b]);
    }
  }

  console.log('\t\t' + functions.length + ' uniques out of ' + totalFunctionCount + ' definitions.');
  console.log('\t\tSkipped function names: ' + skipped.length);
}

/**
 * Write all mappings to a file.
 * @param {string} path
 */
function writeMappingToFile(path) {
  console.log(FgBlue + '\tWriting Mappings to obscuration_mapping_log.csv' + Reset);
  console.log('\t\tNumber of symbols remapped: ' + mapping.length);

  var out = 'original symbol,mangled symbol\n';
  for (var i = 0; i < mapping.length; i++) {
    var line = mapping[i][0] + ',' + mapping[i][1] + '\n';
    out += line;
  }

  fs.writeFileSync(path + 'obscuration_mapping_log.csv', out, 'utf8');
}

/**
 * Find the environment variable file in envs.
 * Looks here, up a directory, up two directories, etc.
 * @returns {string} address of envs/obscuration/obscuration
 */
function getEnvFilePath() {
  //find the environment variable folder "envs"

  var envPath = 'envs';
  var found_env = false;
  var envFile;
  for (var i = 0; i < 6; i++) {
    if (fs.existsSync(envPath)) {
      envFile = path.join(envPath, 'obscuration', 'obscuration');
      if (fs.existsSync(envFile)) {
        return envFile;
      }
    }
    envPath = path.join('..', envPath);
  }
  return '';
}

/**
 * Parse envs/obscuration/obscuration file
 * @param {string} contents 
 */
function parseEnvFile(contents) {
  console.log('\tParsing environment data...');
  var env = {};
  var lines = contents.split('\n');
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].substring(0, 'mvcMangle='.length) == 'mvcMangle=') {
      env.mvcMangle = (lines[i].substring('mvcMangle='.length, lines[i].length)) == 'true';
      console.log('\t\tmvcMangle = ' + env.mvcMangle);
    } else if (lines[i].substring(0, 'functionMangle='.length) == 'functionMangle=') {
      env.functionMangle = (lines[i].substring('functionMangle='.length, lines[i].length)) == 'true';
      console.log('\t\tfunctionMangle = ' + env.functionMangle);
    } else if (lines[i].substring(0, 'path='.length) == 'path=') {
      var p = path.join(__dirname, '..', '..', '..', lines[i].substring('path='.length, lines[i].length));
      paths.push(p);
      console.log('\t\tadded path : ' + paths[paths.length - 1]);
    } else if (lines[i].substring(0, 'type='.length) == 'type=') {
      env.type = lines[i].substring('type='.length, lines[i].length);
      console.log('\t\ttype = ' + env.type);
    }
  }
  return env;
}

/**
 * remap the js files
 * @param {string} p 
 */
function remapSourceFiles(p) {
  console.log(FgBlue + "\tObfuscating files" + Reset)
  for (var j = 0; j < file_list.length; j++) {
    if (fs.existsSync(p + file_list[j], 'utf8')) {
      console.log('\t\tmangling ' + file_list[j] + '...');
      inp = fs.readFileSync(p + file_list[j], 'utf8');
      for (var i = 0; i < mapping.length; i++) {
        replace(mapping[i][0], mapping[i][1]);
      }
      fs.writeFileSync(p + file_list[j], inp, 'utf8');
    }
  }
}

/**
 * Perform whitelisting. Obfuscate the labels that come from envs/obscurate/obscuration_whitelist.csv
 * @param {string} p 
 */
function white(p) {
  //see if the whitelist exists
  console.log("\tLooking for obscuration_whitelist.csv...");
  var mapping_file_path = path.join(p, "obscuration_whitelist.csv");
  console.log("\t\tlooking for " + mapping_file_path + "...");
  if (fs.existsSync(mapping_file_path)) {
    //read mapping
    whitelist_map = fs.readFileSync(mapping_file_path, 'utf8');
    var lines = whitelist_map.split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(' ') < 0) { //no spaces in a real line (or else it's a header)
        var t = lines[i].split(',');
        if (t.length == 2) { //one comma is correct
          mapping.push([t[0], t[1]]);
        }
      }
    }
    console.log("\t\t" + mapping.length + " whitelisted symbols will be substituted into the js files");
  } else {
    console.log("\t\tdidn't find mapping file. It should be called 'envs/obscuration/obscuration_whitelist.csv'");
  }
}

/**
 * Obscure the source. You can choose whether to obscure the function names and/or the mvc names.
 *
 * @param {string} build ('RELEASE' or 'DEBUG')
 */
function obscuration(pathIn) {
  var env;
  var envFile = getEnvFilePath();
  var envFolder = path.dirname(envFile);
  var p = pathIn + path.sep;
  var mvcMangle = false;
  var functionMangle = false;

  if (envFile != '') {
    console.log(FgCyan + '\nObscuration version 0.02' + Reset);
    console.log('\tFound environment folder at: ' + envFolder);
    console.log('\tFound environment variable file at: ' + envFile);
    env = parseEnvFile(fs.readFileSync(envFile, 'utf8'));
    var foundPath = false;
    for (var i = 0; i < paths.length; i++) {
      if (paths[i] == p) {
        foundPath = true;
      }
    }
    if (foundPath) {
      mvcMangle = env.mvcMangle;
      functionMangle = env.functionMangle;

      inp = fs.readFileSync(p + 'browser-mobile.js', 'utf8');
      var originalLength = inp.length;
      var len = inp.length;
      var scrambleCode = len & 1023;

      blacklist = blacklist.concat(reservedIdentifiers);
      if (env.type == 'whitelist') {
        white(envFolder);
        remapSourceFiles(p);
      } else {
        console.log('\tpath = ', p);
        console.log('\toptions:');
        console.log('\t\tmangle GC variable and MVC names:' + FgMagenta, mvcMangle, Reset);
        console.log('\t\tmangle function names:' + FgMagenta, functionMangle, Reset);
        console.log('\tscrambleCode: ' + scrambleCode + ' (binary ' + scrambleCode.toString(2) + ')');

        //Proceed with mangling only if my special prefixes $_ and $$ are safe
        if ((inp.indexOf('$_') == -1) || (inp.indexOf('$$') == -1)) {
          if (functionMangle) {
            mangleFunctions(scrambleCode);
          }
          if (mvcMangle) {
            mangleMVC(scrambleCode);
          }
          writeMappingToFile(p);
          remapSourceFiles(p);
        } else {
          console.log(FgRed + "Warning -- File contains '$_' and/or '$$' so it cannot be obscured.");
          console.log('Something was named with one of these prefixes, or else you have already run Obscuration.js on the file.' + Reset);
        }
      }
    } else {
      console.log(FgYellow + '\tNotice -- The path for this build was not found in envs/obscuration. No obfuscation will be done for this build.' + Reset);
    }
  } else {
    //for now, hush this helpful message so we don't scare other Arson-based games
    //console.log(FgYellow + "\tWarning: " + Reset + "Could not find environment variable file 'envs/obscuration'\n\tSkipping Obscuration...");
  }
}

module.exports = obscuration;
