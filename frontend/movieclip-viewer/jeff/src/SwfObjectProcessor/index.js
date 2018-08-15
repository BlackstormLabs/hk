
var createItems       = require('./createItems');
var addClassNames     = require('./addClassNames');
var generateChildren  = require('./generateChildren');
var addContainer      = require('./addContainer');
var removeSymbols     = require('./removeSymbols');
var computeBounds     = require('./computeBounds');
var computeDimensions = require('./computeDimensions');

function processSwfObjects(swfObjects, allClasses, extractor) {

	// Creating items from swfObjects
	var items = createItems(swfObjects, extractor._options.verbosity >= 4);
	var symbols = items.symbols;
	var sprites = items.sprites;
	var itemsById = items.itemsById;

	// Adding class names to symbols
	var classSymbols = addClassNames(symbols, allClasses);

	// Generating symbols' lists of children over time from swfObject timeline
	generateChildren(symbols, sprites, itemsById);

	// Adding animation container, if any
	if (extractor._options.container) addContainer(symbols, classSymbols, extractor._options.container);

	// Removing elements with respect to removeList, if any
	if (extractor._options.removeList) removeSymbols(symbols, classSymbols, extractor._options.removeList);

	// Computing bounds per frame for each symbol
	computeBounds(symbols, sprites);

	// Computing maximum dimensions per class for each sprite
	computeDimensions(itemsById, allClasses);

	return items;
}
module.exports = processSwfObjects;
