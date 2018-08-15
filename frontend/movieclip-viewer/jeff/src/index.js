/* jshint camelcase: false */ //for js_beautify and indent_size

var fs       = require('fs-extra');
var glob     = require('glob');
var path     = require('path');
var async    = require('async');
var beautify = require('js-beautify').js_beautify;

var helper         = require('./Helper/index.js');
var SwfParser      = require('./Gordon/parser.js');
var processSwf     = require('./SwfObjectProcessor/index.js');
var CanvasRenderer = require('./CanvasRenderer/index.js');
var packageJson    = require('../package.json');

// For non-ascii characters in SWF class names
var JSON_WRITE_OPTIONS = { encoding:'binary' };
var DEFAULT_FRAME_RATE = 25;

// Jeff's only API method
module.exports = function extractSwf(exportParams, cb, getCanvas, Image) {
	var jeff = new Jeff(exportParams, getCanvas, Image);
	jeff._extract(cb);
};

function Jeff(options, getCanvas, Image) {
	// If not specified Jeff will use default canvas getter and Image constructor
	this._getCanvas = getCanvas || function (w, h) {
		var Canvas = document.createElement('canvas');
		Canvas.width  = (w === null || w === undefined) ? 300 : w;
		Canvas.height = (h === null || h === undefined) ? 150 : h;
		return Canvas;
	};
	this._Image = Image || window.Image;

	this._parser   = new SwfParser();      // Parser of swf files
	this._renderer = new CanvasRenderer(); // Renderer for swf images and vectorial shapes

	// Extraction options
	this._options = new JeffOptions(options);

	this._frameRate = DEFAULT_FRAME_RATE;
	this._frameSize = null;

	// Information about source files
	this._fileHeaderInfo         = undefined;

	// Parameters applying to the file group being processed
	this._fileGroupName          = undefined; // Name
	this._fileGroupRatio         = undefined; // Export ratio
	this._swfObjectsPerFileGroup = undefined; // Array holding swf objects per file
	this._swfObjects             = undefined; // Merged swf objects

	this._symbols                = undefined; // Symbols corresponding to the swfObjects
	this._sprites                = undefined;
	this._items                  = undefined;

	this._frameRates = {};

	// Parameters applying to the class group being processed
	this._classGroupName         = undefined; // Name
	this._classGroupList         = undefined; // Classes
	this._hierarchy              = undefined; // Hierarchy of the symbols
}

function JeffOptions(params) {
	// Primary options
	this.inputDir            = (params.inputDir === null  || params.inputDir === undefined) ? '.' : '';
	this.outDir              = params.outDir              || null;
	this.source              = params.source              || '*.swf';

	// Secondary options
	this.scope               = params.scope               || 'main';
	this.renderFrames        = params.renderFrames        || false;
	this.ratio               = params.ratio               || 1;

	// Optimisation options
	this.createAtlas         = params.createAtlas         || false;
	this.powerOf2Images      = params.powerOf2Images      || false;
	this.maxImageDim         = params.maxImageDim         || 2048;
	this.beautify            = params.beautify            || false;
	this.collapse            = params.collapse            || false;
	this.prerenderBlendings  = params.prerenderBlendings  || false;

	// Advanced options
	this.bundle              = params.bundle              || false;
	this.exportAtRoot        = params.exportAtRoot        || false;
	this.splitClasses        = params.splitClasses        || false;
	this.ignoreImages        = params.ignoreImages        || false;
	this.ignoreData          = params.ignoreData          || false;
	this.minificationFilter  = params.minificationFilter  || 'linear';
	this.magnificationFilter = params.magnificationFilter || 'linear';
	this.outlineEmphasis     = params.outlineEmphasis     || 1;

	// Advanced++ options
	// Not usable as command line options
	this.defaultGroupRatio   = params.defaultGroupRatio   || 1;
	this.classGroups         = params.classGroups         || {};
	this.fileGroups          = params.fileGroups          || {};
	this.fileGroupRatios     = params.fileGroupRatios     || {};
	this.returnData          = params.returnData          || false;
	this.attributeFilter     = params.attributeFilter;
	this.classRatios         = params.classRatios;
	this.container           = params.container;
	this.ignoreExpression    = params.ignoreExpression;
	this.ignoreList          = params.ignoreList;
	this.removeList          = params.removeList;
	this.exclusiveList       = params.exclusiveList;
	this.postProcess         = params.postProcess;
	this.customWriteFile     = params.customWriteFile;
	this.customReadFile      = params.customReadFile;
	this.fixedSize           = params.fixedSize;
	this.fallbackFrameRate   = params.fallbackFrameRate   || 25;
	// 1: minimal log level, 10: maximum log level. TODO: needs to be implemented on every console.warn/log/error
	this.verbosity           = params.verbosity           || 3;

	// Whether only one frame is being rendered
	// Boolean used for naming purpose
	this.onlyOneFrame = (this.renderFrames instanceof Array) && (this.renderFrames.length === 1);

	if (this.outDir === null) {
		// Returning data if output directory not specified
		this.returnData = true;

		this.writeToDisk = false;
	} else {
		// Writing to disk only if output directory is specified
		this.writeToDisk = true;
	}

	// Checking for uncompatible options
	if (this.renderFrames) {
		if (this.collapse) {
			this.collapse = false;
			// console.warn('[Jeff] Option to collapse will be ignored');
		}
	}
}

Jeff.prototype._extract = function (cb) {
	this._extractedData = [];
	this._fileHeaderInfo = {};

	// Making sure the input directory exists
	if (this._options.inputDir !== '' && !fs.existsSync(this._options.inputDir)) {
		throw new Error('Directory not found: ' + this._options.inputDir);
	}

	// Creating output directory if inexistant
	if (this._options.outDir && !fs.existsSync(this._options.outDir)) {
		fs.mkdirsSync(this._options.outDir);
	}

	// Starting extraction on source file(s)
	if (this._options.source instanceof Array) {
		this._extractFileGroups(this._options.source, cb);
	} else {
		var self = this;
		glob(this._options.source, { cwd: this._options.inputDir }, function (error, uris) {
			self._extractFileGroups(uris, cb);
		});
	}
};

Jeff.prototype._extractFileGroups = function (swfUris, endExtractionCb) {
	var nbFiles  = 0;
	var nbErrors = 0;

	var filesPerGroup = helper.groupFiles(swfUris, this._options.fileGroups);
	console.log('Starting conversion of', swfUris.length, 'file(s)');

	var self = this;
	async.eachSeries(filesPerGroup,
		function (fileGroup, next) {
			// Logging number of processed files
			if ((nbFiles % Math.floor(swfUris.length / 10)) === 0) {
				console.log((nbFiles * 100 / swfUris.length).toFixed(0) + '% of', swfUris.length, ' files done...');
			}
			nbFiles += fileGroup.input.length;
			self._parseFileGroup(fileGroup, next);
		},
		function (error) {
			if (error) {
				if (endExtractionCb) {
					return endExtractionCb(error);
				} else {
					throw new Error('Error!', error);
				}
			}

			console.log('Jeff Converted ' + nbFiles + ' swf files out of ' + swfUris.length + '. Failures: ' + nbErrors);
			if (endExtractionCb) {
				endExtractionCb(null, { files: nbFiles, errors: nbErrors, filePaths: swfUris }, self._extractedData);
			}
		}
	);
};

Jeff.prototype._parseFileGroup = function (fileGroup, nextGroupCb) {
	this._swfObjectsPerFileGroup = [];
	this._fileGroupName          = fileGroup.output;
	this._fileGroupRatio         = this._options.ratio * (this._options.fileGroupRatios[this._fileGroupName] || this._options.defaultGroupRatio);
	var self = this;
	async.eachSeries(fileGroup.input,
		function (swfName, next) {
			self._parseFile(swfName, next);
		},
		function (error) {
			if (error) return nextGroupCb(error);
			self._processFileGroup(nextGroupCb);
		}
	);
};

Jeff.prototype._parseFile = function (swfName, nextSwfCb) {
	if (this._options.verbosity >= 5) {
		console.log('parsing: ' + swfName);
	}

	var self = this;
	var swfObjects = [];
	var classes = [];
	function onFileRead(error, swfData) {
		if (error) return nextSwfCb(error);
		self._parser.parse(swfName, swfData,
			function (swfObject) {
				var id = swfObject.id;

				if (swfObject.symbolClasses) {
					Array.prototype.push.apply(classes, Object.keys(swfObject.symbolClasses));
				}

				if (id === undefined) {

					if (swfObject.type === 'scalingGrid') {
						swfObjects[swfObject.appliedTo].scalingGrid = swfObject.rect;
						return;
					}

					if (swfObject.type === 'header') {
						self._frameRate = swfObject.frameRate;

						self._frameSize = swfObject.frameSize;
						self._frameSize.left   /= 20;
						self._frameSize.right  /= 20;
						self._frameSize.top    /= 20;
						self._frameSize.bottom /= 20;
						return;
					}

					// TODO: handle labels
					if (swfObject.type === 'labels') {
						return;
					}

					// TODO: handle DoAbc
					if (swfObject.type === 'DoAbc') {
						return;
					}

					// TODO: handle DoAction
					if (swfObject.type === 'DoAction') {
						return;
					}

					if (this._options.verbosity >= 3) {
						console.warn('[Jeff.parseFile] swfObject not handled. Id = ' + swfObject.id);
					}
					return;
				}

				swfObjects[id] = swfObject;
			},
			function (error) {
				if (error) {
					if (self._options.verbosity >= 1) {
						console.error(error);
					}
					nextSwfCb(error);
					return;
				}

				// keeping track of frame rate
				for (var c = 0; c < classes.length; c += 1) {
					self._frameRates[classes[c]] = self._frameRate;
				}

				swfObjects[0].frameSize = self._frameSize;

				self._swfObjectsPerFileGroup.push(swfObjects);
				nextSwfCb(error);
			}
		);
	}

	if (this._options.customReadFile) {
		this._options.customReadFile(swfName, onFileRead);
	} else {
		fs.readFile(path.join(this._options.inputDir, swfName), onFileRead);
	}
};

Jeff.prototype._processFileGroup = function (nextGroupCb) {
	var exportMain = (this._options.scope === 'main');

	// Merging symbols in swfObjectsPerGroup with respect to their priorities (the lower the index the higher the priority)
	var swfObjects = helper.groupSwfObjects(this._swfObjectsPerFileGroup);
	var allClasses = helper.getClasses(swfObjects, exportMain);
	var items      = processSwf(swfObjects, allClasses, this);

	// Generating a list of classes to export with respect to options
	var classList;
	if (exportMain) {
		classList = helper.getMains(swfObjects);
	} else {
		classList = helper.filterClasses(allClasses, this._options.exclusiveList, this._options.ignoreList, this._options.ignoreExpression);
	}

	// Making separation of the symbols with respect to the classGroups and splitClasses options
	var classGroups = helper.groupClasses(classList, this._options.classGroups, this._options.splitClasses);

	this._swfObjects = swfObjects;
	this._symbols    = items.symbols;
	this._sprites    = items.sprites;
	this._items      = items.itemsById;

	var self = this;
	async.eachSeries(classGroups,
		function (classGroup, nextClassListCb) {
			self._classGroupName = classGroup.name;
			self._classGroupList = classGroup.list;
			var itemList = helper.generateExportList(self._items, self._classGroupList, self._options.attributeFilter);

			// Removing unnecessary elements from sprites and symbols
			for (var spriteId in self._sprites) { if (!itemList[spriteId]) { delete self._sprites[spriteId]; } }
			for (var symbolId in self._symbols) { if (!itemList[symbolId]) { delete self._symbols[symbolId]; } }

			self._renderer.renderSymbols(self,
				function (imageMap, spriteProperties) {
					self._extractClassGroup(imageMap, spriteProperties);
					nextClassListCb();
				}
			);
		},
		nextGroupCb
	);
};

Jeff.prototype._extractClassGroup = function (spriteImages, spriteProperties) {
	// Constructing symbols data that will be included in the export
	var exportItemsData;
	if (this._options.renderFrames) {
		exportItemsData = helper.generateFrameByFrameData(this._symbols, spriteProperties, this._options.onlyOneFrame);
	} else {
		this._renderer.prerenderSymbols(this._symbols, this._sprites, spriteImages, spriteProperties);
		this._renderer.prerenderSymbols(this._symbols, this._sprites, spriteImages, spriteProperties);
		exportItemsData = helper.generateMetaData(this._sprites, this._symbols, spriteProperties, this._frameRates, this._frameRate);
	}

	// Applying post-process, if any
	if (this._options.postProcess) {
		if (this._options.postProcess instanceof Array) {
			var nProcesses = this._options.postProcess.length;
			for (var p = 0; p < nProcesses; p += 1) {
				this._options.postProcess[p](exportItemsData, this._items, this._symbols, this._sprites);
			}
		} else {
			this._options.postProcess(exportItemsData, this._items, this._symbols, this._sprites);
		}
	}

	// Constructing metadata
	var exportData = {
		meta: {
			app: 'https://www.npmjs.com/package/jeff',
			version: packageJson.version,
			frameRate:        this._frameRate,
			scale:            this._options.ratio,
			filtering:       [this._options.minificationFilter, this._options.magnificationFilter],
			mipmapCompatible: this._options.powerOf2Images,
			prerendered:      this._options.renderFrames ? true : false
		}
	};

	var imageArray = [];
	if (this._options.ignoreImages !== true) { // could be a regular expression
		var createAtlas = this._options.createAtlas;

		if (createAtlas) {
			exportData.meta.imageMargin = 1;
		}

		// Removing ignored images
		if (this._options.ignoreImages) {
			helper.removeIgnoredImages(this._symbols, this._sprites, spriteImages, this._options.ignoreImages);
		}

		var sprites = exportItemsData.sprites;
		var spritesImages = helper.formatSpritesForExport(
			this._getCanvas,
			spriteImages,
			spriteProperties,
			createAtlas,
			this._options.powerOf2Images,
			this._options.maxImageDim,
			this._classGroupName
		);

		// Making link between sprites and images
		var images = new Array(spritesImages.length);
		for (var i = 0; i < spritesImages.length; i += 1) {
			var spritesImage = spritesImages[i];
			var alias = this._generateImageName(spritesImage.name);
			images[i] = alias;
			spritesImage.name = alias;

			var spriteIds = spritesImage.sprites;
			for (var s = 0; s < spriteIds.length; s += 1) {
				var spriteId = spriteIds[s];
				var sprite = sprites[spriteId];
				sprite.image = i;

				if (createAtlas) {
					var atlasDimensions = spriteProperties[spriteId];
					sprite.sx = atlasDimensions.sx;
					sprite.sy = atlasDimensions.sy;
					sprite.sw = atlasDimensions.sw;
					sprite.sh = atlasDimensions.sh;
				}
			}

			imageArray[i] = spritesImage.image;
		}

		if (this._options.writeToDisk) {
			this._writeImagesToDisk(spritesImages);
		}

		exportData.images = images;
	}

	exportData.sprites = exportItemsData.sprites;
	exportData.symbols = exportItemsData.symbols;

	if (!this._options.renderFrames) {
		helper.delocateMatrices(exportData);
	}

	var outputName = this._generateOutputName();
	if (!this._options.ignoreData && this._options.writeToDisk) {
		this._writeDataToDisk(outputName, exportData);
	}

	if (this._options.returnData) {
		this._extractedData.push({
			images: imageArray,
			data: exportData,
			name: outputName
		});
	}
};

Jeff.prototype._generateImageName = function (imgName) {
	var imgPath = (this._options.scope === 'library' && !this._options.bundle) ? this._classGroupName : '';
	return path.join(imgPath, imgName) + '.png';
};

Jeff.prototype._writeImagesToDisk = function (spritesImages) {
	for (var i = 0; i < spritesImages.length; i += 1) {
		var spritesImage = spritesImages[i];

		var imageName = path.join(this._fileGroupName, spritesImage.name);
		if (this._options.exportAtRoot) {
			imageName = path.basename(imageName);
		}

		var imageDirectory = this._options.outDir;
		if (this._options.bundle) {
			imageDirectory = path.join(imageDirectory, this._classGroupName);
		}

		var imagePath = path.join(imageDirectory, imageName);
		this._canvasToPng(imagePath, spritesImage.image);
	}
};

Jeff.prototype._canvasToPng = function (pngName, canvas) {
	if (canvas.width === 0 || canvas.height === 0) {
		return;
	}

	var url = canvas.toDataURL();
	var header = 'data:image/png;base64,';
	var len = header.length;
	var data = url.substr(len);
	var png = new Buffer(data, 'base64');

	if (!this._options.customWriteFile || !this._options.customWriteFile(pngName, png)) {
		writeFile(pngName, png);
	}
};

Jeff.prototype._writeDataToDisk = function (outputName, data) {
	if (this._options.bundle) {
		outputName = path.join(outputName, 'data');
	}

	this._dataToJson(path.join(this._options.outDir, outputName + '.json'), data);
};

Jeff.prototype._generateOutputName = function () {
	var jsonPath = this._fileGroupName;

	if (this._options.scope === 'library') {
		jsonPath = path.join(jsonPath, this._classGroupName);
	}

	if (this._options.exportAtRoot) {
		jsonPath = path.basename(jsonPath);
	}

	return jsonPath;
};

function rounding(key, val) {
	if (typeof val === 'number') {
		if (val === 0) return 0;
		var powerOf10 = 1 + Math.max(Math.ceil(Math.log(Math.abs(val)) / Math.LN10), 2);
		var roundCoef = Math.pow(10, powerOf10);
		return Math.round(val * roundCoef) / roundCoef;
	}
	return val;
}

Jeff.prototype._dataToJson = function (jsonName, data) {
	var jsonData = JSON.stringify(data, rounding);

	if (this._options.beautify) {
		jsonData = beautify(jsonData, { indent_size: 4 });
	}

	if (!this._options.customWriteFile || !this._options.customWriteFile(jsonName, jsonData, JSON_WRITE_OPTIONS)) {
		writeFile(jsonName, jsonData, JSON_WRITE_OPTIONS);
	}
};

function writeFile(outputFileName, data, options) {
	var subDir = path.dirname(outputFileName);
	if (!fs.existsSync(subDir)) {
		fs.mkdirsSync(subDir);
	}

	fs.writeFileSync(outputFileName, data, options);
}