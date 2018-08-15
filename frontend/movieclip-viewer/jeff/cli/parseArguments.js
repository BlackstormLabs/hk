var commander = require('commander');

module.exports = function parseArguments (argv) {
	// So many options!
	// But don't worry, Jeff can handle them all

	// for some reason commander crashes when the second argument is "."
	// so working around it
	if (argv[1] === '.') { argv[1] = 'jeff'; }

	commander

	// Primary options
	.option('-s, --source <src file/glob expression>',      'Source of the file(s) to export. Can be defined as a regular expression', '*.swf')
	.option('-i, --inputDir <dir>',                         'Input directory, directory must exist', '.')
	.option('-o, --outDir <dir>',                           'Output directory', '.')

	// Secondary options
	.option('-S, --scope <scope>',                          'Scope of the animation to export, either \'library\' or \'main\'', 'main')
	.option('-r, --ratio <ratio>',                          'Image scale', '1')
	.option('-f, --renderFrames <boolean/array of frames>', 'To extract specified frames of the animations as PNGs', 'false')

	// Optimisation options
	.option('-a, --createAtlas <boolean>',                  'To extract all the images of an animation into a single atlas', 'false')
	.option('-p, --powerOf2Images <boolean>',               'To set the dimensions of output images to powers of 2', 'false')
	.option('-M, --maxImageDim <number>',                   'Maximum image dimension', '2048')
	.option('-b, --beautify <boolean>',                     'To beautify JSON output', 'false')
	.option('-c, --collapse <boolean>',                     'To extract a colapsed flat animation structure rather than a hierarchical structure', 'false')
	.option('-B, --prerenderBlendings <boolean>',           'To prerender sprites with blend modes', 'false')

	// Advanced options
	.option('-R, --exportAtRoot <boolean>',                 'To export everything at the root of the output directory', 'false')
	.option('-C, --splitClasses <boolean>',                 'To split the different library classes of the animation into several outputs', 'false')
	.option('-d, --ignoreData <boolean>',                   'Not to export JSON meta-data', 'false')
	.option('-I, --ignoreImages <boolean>',                 'Not to export images', 'false')
	.option('-F, --filtering <filtering method>',           'Filtering that should be used when rendering the animation', 'linear')
	.option('-e, --outlineEmphasis <coefficient>',          'Emphasis of outlines when rendering Flash vectorial drawings', '1')

	.parse(argv);

	var exportParams = {
		// Primary options
		inputDir:           commander.inputDir,
		outDir:             commander.outDir || '.', // By default, always writing to disk when JEFF used in command line
		source:             commander.source,

		// Secondary options
		scope:              commander.scope,
		ratio:              JSON.parse(commander.ratio),
		renderFrames:       JSON.parse(commander.renderFrames),

		// Optimisation options
		createAtlas:        JSON.parse(commander.createAtlas),
		powerOf2Images:     JSON.parse(commander.powerOf2Images),
		maxImageDim:        JSON.parse(commander.maxImageDim),
		beautify:           JSON.parse(commander.beautify),
		collapse:           JSON.parse(commander.collapse),
		prerenderBlendings: JSON.parse(commander.prerenderBlendings),

		// Advanced options
		splitClasses:       JSON.parse(commander.splitClasses),
		exportAtRoot:       JSON.parse(commander.exportAtRoot),
		ignoreData:         JSON.parse(commander.ignoreData),
		ignoreImages:       JSON.parse(commander.ignoreImages),
		filtering:          commander.filtering,
		outlineEmphasis:    JSON.parse(commander.outlineEmphasis)
	};

	return exportParams;
}