module.exports = {
	// Primary options
	source:             { value: '', desc: 'Source of the file(s) to export. Can be defined as a regular expression' },
	inputDir:           { value: '', desc: 'Input directory, directory must exist.' },
	outDir:             { value: null, desc: 'Output directory' },

	// Secondary options
	scope:              { value: 'library', type: 'dropdown', values: ['library', 'main'], desc: 'Scope of the animation to export' },
	ratio:              { value: 1, type: 'number', desc: 'Image scale' },
	renderFrames:       { value: false, type: 'toggle', desc: 'Extract prerendered animation frames' },

	// Optimisation options
	collapse:           { value: true, type: 'toggle', desc: 'Collapse animations (usually reduces the number of symbols)' },
	beautify:           { value: false, type: 'toggle', desc: 'Beautify JSON output' },
	prerenderBlendings: { value: true, type: 'toggle', desc: 'Prerender sprites with blend modes' },

	// Advanced options
	splitClasses:       { value: false, type: 'toggle', desc: 'Split the library classes into several files' },
	ignoreImages:       { value: false, type: 'toggle', desc: 'Not to export images' },
	bundle:             { value: true, type: 'toggle', desc: 'Whether to bundle all exported files in a folder' },
	returnData:         { value: true, desc: 'Whether to return result of export under JavaScript format' }
};