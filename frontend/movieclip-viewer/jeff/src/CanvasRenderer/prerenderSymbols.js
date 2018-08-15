var CanvasRenderer = require('./main');
var SymbolInstance = require('./SymbolInstance');
var elements       = require('../elements/');
var comparators    = require('../Helper/comparators.js');
var computeBounds  = require('../SwfObjectProcessor/computeBounds.js');

var areObjectsDifferent    = comparators.areObjectsDifferent;
var areTransformsDifferent = comparators.areTransformsDifferent;
var areColorsDifferent     = comparators.areColorsDifferent;

var Symbol = elements.Symbol;
var Sprite = elements.Sprite;
var Bounds = elements.Bounds;

var IDENTITY_TRANSFORM = [1, 0, 0, 1, 0, 0];
var IDENTITY_COLOR     = [1, 1, 1, 1, 0, 0, 0, 0];

function firstDifferentFrame (child, firstFrame, log) {
	var transforms = child.transforms;
	var colors     = child.colors;
	var blendModes = child.blendModes;
	var filters    = child.filters;

	var modelTransform = transforms[firstFrame];
	var modelColor     = colors[firstFrame];
	var modelBlendMode = blendModes && blendModes[firstFrame];
	var modelFilter    = filters    && filters[firstFrame];
	for (var f = firstFrame + 1; f < transforms.length; f += 1) {
		if (areTransformsDifferent(transforms[f], modelTransform) ||
			areColorsDifferent(colors[f], modelColor) ||
			modelBlendMode && (modelBlendMode !== blendModes[f]) ||
			modelFilter && areObjectsDifferent(modelFilter, filters[f])
		) {
			break;
		}
	}

	return f;
}

function multiplyTransforms(t0, t1) {
	var a0 = t0[0];
	var b0 = t0[1];
	var c0 = t0[2];
	var d0 = t0[3];
	var e0 = t0[4];
	var f0 = t0[5];

	return [
		a0 * t1[0] + c0 * t1[1],
		b0 * t1[0] + d0 * t1[1],
		a0 * t1[2] + c0 * t1[3],
		b0 * t1[2] + d0 * t1[3],
		a0 * t1[4] + c0 * t1[5] + e0,
		b0 * t1[4] + d0 * t1[5] + f0,
	];
}

function multiplyColors(parentColor, childColor) {
	// Mutliplying 2 colors:
	// mult = childColor.mult * parentColor.mult
	// add  = childColor.add  * parentColor.mult + parentColor.add
	return [
		childColor[0] * parentColor[0],
		childColor[1] * parentColor[1],
		childColor[2] * parentColor[2],
		childColor[3] * parentColor[3],
		childColor[4] * parentColor[0] + parentColor[4],
		childColor[5] * parentColor[1] + parentColor[5],
		childColor[6] * parentColor[2] + parentColor[6],
		// Clamping alpha addition between [-1, 1]
		Math.max(-1, Math.min(1, childColor[7] * parentColor[3] + parentColor[7]))
	];
}

function invertTransform (transform) {
    var a = transform[0];
    var b = transform[1];
    var c = transform[2];
    var d = transform[3];
    var e = transform[4];
    var f = transform[5];

    var determinant = a * d - b * c;
    var invDet = 1 / determinant;

    var inverse = new Array(6);
    inverse[0] = invDet * d;
    inverse[1] = invDet * -b;
    inverse[2] = invDet * -c;
    inverse[3] = invDet * a;
    inverse[4] = invDet * (c * f - d * e);
    inverse[5] = invDet * (b * e - a * f);
    return inverse;
};

function clamp (value, min, max) {
	if (value < min) {
		return min;
	}

	if (value > max) {
		return max;
	}

	return value;
}

function invertColor (color) {
	var inverse = new Array(8);
	// inverse[0] = clamp(1 / color[0], -1, 1);
	// inverse[1] = clamp(1 / color[1], -1, 1);
	// inverse[2] = clamp(1 / color[2], -1, 1);
	// inverse[3] = clamp(1 / color[3], -1, 1);
	// inverse[4] = clamp(-color[4] / color[0], -1, 1);
	// inverse[5] = clamp(-color[5] / color[1], -1, 1);
	// inverse[6] = clamp(-color[6] / color[2], -1, 1);
	// inverse[7] = clamp(-color[7] / color[3], -1, 1);
	inverse[0] = 1 / color[0];
	inverse[1] = 1 / color[1];
	inverse[2] = 1 / color[2];
	inverse[3] = 1 / color[3];
	inverse[4] = -color[4] / color[0];
	inverse[5] = -color[5] / color[1];
	inverse[6] = -color[6] / color[2];
	inverse[7] = -color[7] / color[3];

	return inverse;
};

var ERROR = 0.025;
var ERROR_TRANSLATE = 0.25;
function areTransformsEquivalent (transformA, transformB) {
	return Math.abs(transformA[0] - transformB[0]) < ERROR &&
		Math.abs(transformA[1] - transformB[1]) < ERROR &&
		Math.abs(transformA[2] - transformB[2]) < ERROR &&
		Math.abs(transformA[3] - transformB[3]) < ERROR &&
		Math.abs(transformA[4] - transformB[4]) < ERROR_TRANSLATE &&
		Math.abs(transformA[5] - transformB[5]) < ERROR_TRANSLATE;
}

function areColorsEquivalent (colorA, colorB) {
	// return Math.abs(colorA[0] - colorB[0]) < ERROR &&
	// 	Math.abs(colorA[1] - colorB[1]) < ERROR &&
	// 	Math.abs(colorA[2] - colorB[2]) < ERROR &&
	// 	Math.abs(colorA[3] - colorB[3]) < ERROR &&
	// 	Math.abs(colorA[4] - colorB[4]) < ERROR &&
	// 	Math.abs(colorA[5] - colorB[5]) < ERROR &&
	// 	Math.abs(colorA[6] - colorB[6]) < ERROR &&
	// 	Math.abs(colorA[7] - colorB[7]) < ERROR;
	return (Math.abs(colorA[0] - colorB[0]) < ERROR || (!isFinite(colorA[0]) || !isFinite(colorB[0]))) &&
		(Math.abs(colorA[1] - colorB[1]) < ERROR || (!isFinite(colorA[1]) || !isFinite(colorB[1]))) &&
		(Math.abs(colorA[2] - colorB[2]) < ERROR || (!isFinite(colorA[2]) || !isFinite(colorB[2]))) &&
		(Math.abs(colorA[3] - colorB[3]) < ERROR || (!isFinite(colorA[3]) || !isFinite(colorB[3]))) &&
		(Math.abs(colorA[4] - colorB[4]) < ERROR || (!isFinite(colorA[4]) || !isFinite(colorB[4]))) &&
		(Math.abs(colorA[5] - colorB[5]) < ERROR || (!isFinite(colorA[5]) || !isFinite(colorB[5]))) &&
		(Math.abs(colorA[6] - colorB[6]) < ERROR || (!isFinite(colorA[6]) || !isFinite(colorB[6]))) &&
		(Math.abs(colorA[7] - colorB[7]) < ERROR || (!isFinite(colorA[7]) || !isFinite(colorB[7])));
}

function FactoredChild (child, index) {
	this.children   = [];
	this.frames     = child.frames;
	this.transforms = child.transforms;
	this.colors     = child.colors;

	this.childrenIndexes = [index];

	this.inverseTransforms = new Array(this.transforms.length);
	for (var t = 0; t < this.transforms.length; t += 1) {
		this.inverseTransforms[t] = invertTransform(this.transforms[t]);
	}

	this.inverseColors = new Array(this.colors.length);
	for (var c = 0; c < this.colors.length; c += 1) {
		this.inverseColors[c] = invertColor(this.colors[c]);
	}

	this._addSingleFrameChild(child, IDENTITY_TRANSFORM.slice(), IDENTITY_COLOR.slice());
}

FactoredChild.prototype.clampColors = function () {
	var multipliers = [
		1, 1, 1, 1
	];

	for (var c = 0; c < this.children.length; c += 1) {
		// each child has only one color
		var color = this.children[c].colors[0];
		if (color[0] > 1) { multipliers[0] = Math.max(multipliers[0], color[0]); }
		if (color[1] > 1) { multipliers[1] = Math.max(multipliers[1], color[1]); }
		if (color[2] > 1) { multipliers[2] = Math.max(multipliers[2], color[2]); }
		if (color[3] > 1) { multipliers[3] = Math.max(multipliers[3], color[3]); }
	}

	for (var c = 0; c < this.children.length; c += 1) {
		var color = this.children[c].colors[0];
		color[0] /= multipliers[0];
		color[1] /= multipliers[1];
		color[2] /= multipliers[2];
		color[3] /= multipliers[3];
	}

	for (var c = 0; c < this.colors.length; c += 1) {
		var color = this.colors[c];
		color[0] *= multipliers[0];
		color[1] *= multipliers[1];
		color[2] *= multipliers[2];
		color[3] *= multipliers[3];
	}
};

FactoredChild.prototype._addSingleFrameChild = function (child, transform, color) {
	var singleFrameChild = {
		id: 		child.id,
		frames:     [0, 0],
		transforms: [transform],
		colors:     [color]
	};

	if (child.blendModes) { singleFrameChild.blendModes = [child.blendModes[0]]; }
	if (child.filters)    { singleFrameChild.filters    = [child.filters[0]]; }
	if (child.maskStart)  { singleFrameChild.maskStart  = child.maskStart; }
	if (child.maskEnd)    { singleFrameChild.maskEnd    = child.maskEnd; }

	this.children.push(singleFrameChild);
};

function fixColor(color, fix) {
	if (!isFinite(color[0])) {
		color[0] = fix[0];
		color[4] = fix[4];
	}
	if (!isFinite(color[1])) {
		color[1] = fix[1];
		color[5] = fix[5];
	}
	if (!isFinite(color[2])) {
		color[2] = fix[2];
		color[6] = fix[6];
	}
	if (!isFinite(color[3])) {
		color[3] = fix[3];
		color[7] = fix[7];
	}
}

FactoredChild.prototype.tryAndAddSingleFrameChild = function (child, index) {
	var transforms = child.transforms;
	var colors     = child.colors;

	var firstColorInverseFixed = this.inverseColors[0].slice();
	fixColor(firstColorInverseFixed, invertColor(colors[0]));

	var firstTransform = multiplyTransforms(this.inverseTransforms[0], transforms[0]);
	var firstColor     = multiplyColors(firstColorInverseFixed, colors[0]);

	// Verifying homomorphism
	this.inverseColorsFixed = [firstColorInverseFixed];
	for (var f = 1; f < transforms.length; f += 1) {
		var inverseColorFixed = this.inverseColors[f].slice();
		fixColor(inverseColorFixed, invertColor(colors[f]));

		var transform = multiplyTransforms(this.inverseTransforms[f], transforms[f]);
		var color     = multiplyColors(inverseColorFixed, colors[f]);

		var differentTransforms = !areTransformsEquivalent(transform, firstTransform);
		var differentColors = !areColorsEquivalent(color, firstColor);
		if (differentTransforms || differentColors) {
			return false;
		}

		this.inverseColorsFixed[f] = inverseColorFixed;
	}

	this.inverseColors = this.inverseColorsFixed;

	this._addSingleFrameChild(child, firstTransform, firstColor);
	this.childrenIndexes.push(index);
	return true;
};

function factorizeChildrenAt (childIndex, children, sprites, elementOccurences, symbolId) {
	var child = children[childIndex];
	var childId = child.id;
	var frames = child.frames;

	var factoredChild = new FactoredChild(child, childIndex);

	var maskContext = child.maskEnd ? 1 : 0;

	// Determining longest sequence of prerenderable elements with equivalent transformations with respect to first child's transformation
	while (childIndex + 1 < children.length) {
		childIndex += 1;

		var candidateChild = children[childIndex];
		var candidateFrames = candidateChild.frames;
		if (candidateFrames[1] < frames[0] || frames[1] < candidateFrames[0]) {
			continue;
		}

		if (candidateChild.maskStart && maskContext === 0) {
			break;
		}

		var candidateChildId = candidateChild.id;
		var sprite = sprites[candidateChildId];
		if (!sprite || sprite.className) {
			break;
		}

		if (candidateFrames[0] !== frames[0] || candidateFrames[1] !== frames[1]) {
			if (maskContext <= 0) {
				break;
			} else {
				// breaking the child so that it fits within the frame
				var commonFrames = [Math.max(frames[0], candidateFrames[0]), Math.min(candidateFrames[1], frames[1])];
				var commonLength = commonFrames[1] - commonFrames[0];

				var leftLength = frames[0] - candidateFrames[0];
				var rightLength = candidateFrames[1] - frames[1];
				if (leftLength < 0 || rightLength < 0) {
					break;
				}

				if (leftLength > 0) {
					var leftChild = JSON.parse(JSON.stringify(candidateChild));
					var splitIndex = leftLength;

					leftChild.frames[1] = commonFrames[0] - 1;
					leftChild.transforms = leftChild.transforms.slice(0, splitIndex);
					leftChild.colors = leftChild.colors.slice(0, splitIndex);

					candidateChild.frames[0] = commonFrames[0];
					candidateChild.transforms = candidateChild.transforms.slice(splitIndex);
					candidateChild.colors = candidateChild.colors.slice(splitIndex);

					if (leftChild.blendModes) {
						leftChild.blendModes = leftChild.blendModes.slice(0, splitIndex);
						candidateChild.blendModes = candidateChild.blendModes.slice(splitIndex);
					}

					if (leftChild.filters) {
						leftChild.filters = leftChild.filters.slice(0, splitIndex);
						candidateChild.filters = candidateChild.filters.slice(splitIndex);
					}

					elementOccurences[candidateChild.id][symbolId] += 1;
					children.splice(childIndex + 1, 0, leftChild);
				}

				if (rightLength > 0) {
					var rightChild = JSON.parse(JSON.stringify(candidateChild));
					var splitIndex = commonLength + 1;

					rightChild.frames[0] = commonFrames[1] + 1;
					rightChild.transforms = rightChild.transforms.slice(splitIndex);
					rightChild.colors = rightChild.colors.slice(splitIndex);

					candidateChild.frames[1] = commonFrames[1];
					candidateChild.transforms = candidateChild.transforms.slice(0, splitIndex);
					candidateChild.colors = candidateChild.colors.slice(0, splitIndex);

					if (rightChild.blendModes) {
						rightChild.blendModes = rightChild.blendModes.slice(splitIndex);
						candidateChild.blendModes = candidateChild.blendModes.slice(0, splitIndex);
					}

					if (rightChild.filters) {
						rightChild.filters = rightChild.filters.slice(splitIndex);
						candidateChild.filters = candidateChild.filters.slice(0, splitIndex);
					}

					elementOccurences[candidateChild.id][symbolId] += 1;
					children.splice(childIndex + 1, 0, rightChild);
				}
			}
		}

		if (!factoredChild.tryAndAddSingleFrameChild(candidateChild, childIndex)) {
			break;
		}

		if (candidateChild.maskStart) {
			maskContext -= 1;
			if (maskContext === 0) {
				// Do not combine more than what is inside a mask
				break;
			}
		}

		if (candidateChild.maskEnd) {
			maskContext += 1;
		}

	}

	return factoredChild;
}

CanvasRenderer.prototype.factorizeAndPrerenderChildren = function (symbol, symbols, sprites, imageMap, spriteProperties, elementIds, elementOccurences, symbolIds) {
	var ratio = this._extractor._fileGroupRatio;



	var children = symbol.children;
	for (var c = 0; c < children.length; c += 1) {
		var child = children[c];
		var childId = child.id;
		var sprite = sprites[childId];
		if (!sprite || sprite.className) {
			continue;
		}

		var d, factoredChildData;
		var factoredChild = factorizeChildrenAt(c, children, sprites, elementOccurences, symbol.id);

		var factoredChildren = factoredChild.children;
		if (factoredChildren.length === 1) {
			continue;
		}


		// Making sure that children can be factored with respect to element occurences
		// N.B children can be factored only if they exclusively appear in sequences that can be factored
		// var canFactorChildren = true;

		// Determining if sequence exists somewhere else
		var factoredChildrenData = [{
			factoredChild: factoredChild,
			symbol: symbol
		}];

		var spriteOccurences = elementOccurences[childId];
		for (var symbolId in spriteOccurences) {
			var occurenceCount = spriteOccurences[symbolId];
			if (!occurenceCount) {
				continue;
			}

			var factoredSymbol = symbols[symbolId];
			var factoredSymbolChildren = factoredSymbol.children;

			var start = symbolId === symbol.id ? c + factoredChildren.length : 0;
			for (var c1 = start; c1 < factoredSymbolChildren.length; c1 += 1) {
				var otherChild = factoredSymbolChildren[c1];
				if (otherChild.id !== childId) {
					continue;
				}

				if (otherChild === child) {
					continue;
				}

				var otherFactoredChild = factorizeChildrenAt(c1, factoredSymbolChildren, sprites, elementOccurences, symbolId);

				var otherFactoredChildren = otherFactoredChild.children;
				if (otherFactoredChildren.length === 1) {
					canFactorChildren = false;
					break;
				}

				if (otherFactoredChildren.length > factoredChildren.length) {
					otherFactoredChildren.length = factoredChildren.length;
					otherFactoredChild.childrenIndexes.length = factoredChildren.length;
				}

				for (var c2 = 0; c2 < otherFactoredChildren.length; c2 += 1) {
					var referenceChild = factoredChildren[c2];
					var otherChild = otherFactoredChildren[c2];

					if (referenceChild.id !== otherChild.id) {
						otherFactoredChild = null;
						break;
					}

					var otherColor = otherChild.colors[0];
					var colorFixed = referenceChild.colors[0].slice();
					fixColor(colorFixed, invertColor(otherColor));

					if (
						!areTransformsEquivalent(referenceChild.transforms[0], otherChild.transforms[0])
						|| !areColorsEquivalent(colorFixed, otherColor)
					) {
						otherFactoredChild = null;
						break;
					}

					referenceChild.colors[0] = colorFixed;
				}

				if (otherFactoredChild) {
					factoredChildrenData.push({
						factoredChild: otherFactoredChild,
						symbol: factoredSymbol
					});

					for (d = 0; d < factoredChildrenData.length; d += 1) {
						factoredChildData = factoredChildrenData[d];
						var factoredChild2 = factoredChildData.factoredChild;
						if (otherFactoredChildren.length !== factoredChild2.children.length) {
							factoredChild2.children.length = otherFactoredChildren.length;
							factoredChild2.childrenIndexes.length = otherFactoredChildren.length;
						}
					}

					c1 += otherFactoredChildren.length - 1;
				}
			}
		}

		// Removing occurences of factored children from their symbols

		for (d = factoredChildrenData.length - 1; d >= 0; d -= 1) {
			factoredChildData = factoredChildrenData[d];
			var factoredSymbol = factoredChildData.symbol;
			var factoredSymbolId = factoredSymbol.id;
			for (var c3 = 0; c3 < factoredChildren.length; c3 += 1) {
				elementOccurences[factoredChildren[c3].id][factoredSymbolId] -= 1;
			}
		}

		// Creating a symbol (product of factored children)
		var product = new Symbol();
		product.children = factoredChildren;
		product.frameCount = 1;

		var productId = elementIds[elementIds.length - 1] + 1;
		product.id = productId;
		elementIds.push(productId);

		symbols[productId] = product;

		// Determining if element should be prerendered or not
		// it depends on whether different constituents are used somewhere else
		// if at least one constituent exclusively exists within the factoredSprite then the sprite is prerendered
		var savedArea = 0;
		var totalArea = 0;
		var consideredInSavedArea = {};
		for (var c4 = 0; c4 < factoredChildren.length; c4 += 1) {
			var child1 = factoredChildren[c4];
			var childId1 = child1.id;

			var otherOccurences = false;
			var occurences = elementOccurences[childId1];
			for (var symboldId1 in occurences) {
				if (occurences[symboldId1]) {
					otherOccurences = true;
					break;
				}
			}

			var bounds = sprites[childId1].bounds;
			area = (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
			if (!otherOccurences && !consideredInSavedArea[childId1]) {
				savedArea += area;
				consideredInSavedArea[childId1] = true;
				// break;
			}
			totalArea += area;
		}

		// Only one frame needs to be rendered
		// TODO: choose the frame wisely
		var selectedFrame = 0;

		var prerender = true;

		// Computing bounds of new symbol
		var tmpSymbols = {};
		tmpSymbols[productId] = product;
		computeBounds(tmpSymbols, sprites);

		var spriteBounds = product.bounds[selectedFrame];
		var spriteArea = (spriteBounds.right - spriteBounds.left) * (spriteBounds.bottom - spriteBounds.top);
		if (spriteArea > savedArea * 1.5
			// && spriteArea > totalArea * 0.1
		) {
			// forget about prerendering, not worth it
			prerender = false;
		}

		var factoredColors = child.colors;

		if (prerender) {
			for (var d = 0; d < factoredChildrenData.length; d += 1) {
				factoredChildrenData[d].factoredChild.clampColors();
			}

			var instance = new SymbolInstance(productId, product.bounds);
			var frameCanvas = instance.constructFrame(this._getCanvas, selectedFrame, ratio);
			var canvas  = frameCanvas.canvas;
			var context = frameCanvas.context;
			this._renderSymbol(canvas, context, IDENTITY_TRANSFORM, IDENTITY_COLOR, instance, selectedFrame, false);

			delete symbols[productId];

			// Creating a new sprite for each symbol
			createSprite(productId, 1, product.bounds[selectedFrame], null, this._images, imageMap, sprites, spriteProperties, frameCanvas, canvas);
		} else {
			if (factoredChildren.length === children.length) {
				// No need to create a new symbol
				return;
			}

			symbolIds.push(productId);
		}

		// Creating a new sprite for each symbol with a class name
		for (d = factoredChildrenData.length - 1; d >= 0; d -= 1) {
			factoredChildData = factoredChildrenData[d];
			factoredChild = factoredChildData.factoredChild;
			var factoredSymbol = factoredChildData.symbol;
			var factoredSymbolChildren = factoredSymbol.children;

			var replacementChild = {
				id:         productId,
				frames:     factoredChild.frames,
				transforms: factoredChild.transforms,
				colors:     factoredChild.colors
			};

			var childrenIndexes = factoredChild.childrenIndexes;

			// Fixing factored child colors
			var factoredChildren = factoredChild.children;
			for (var c5 = 0; c5 < factoredChildren.length; c5 += 1) {
				var otherChild = factoredChildren[c5];
				var otherColor = otherChild.colors[0];

				var originalColors = factoredSymbolChildren[childrenIndexes[c5]].colors;
				for (var c6 = 0; c6 < 4; c6 += 1) {
					var component = otherColor[c6];
					if (!isFinite(component)) {
						// searching for the right color to replace it with
						for (var f = 0; f < originalColors.length; f += 1) {
							var originalColor = originalColors[f];
							if (originalColor[c6] !== 0) {
								otherColor[c6] = originalColor[c6] / factoredColors[f][c6];
								otherColor[c6 + 4] = originalColor[c6 + 4] / factoredColors[f][c6];
								break;
							}
						}

						if (f === originalColors.length) {
							otherColor[c6] = 0;
							otherColor[c6 + 4] = 0;
						}
					}
				}
			}

			for (var i = childrenIndexes.length - 1; i >= 0; i -= 1) {
				var index = childrenIndexes[i];
				if (i === 0) {
					factoredSymbolChildren[index] = replacementChild;
				} else {
					factoredSymbolChildren.splice(index, 1);
				}
			}

			elementOccurences[productId] = {};
			if (elementOccurences[productId][factoredSymbol.id]) {
				elementOccurences[productId][factoredSymbol.id] += 1;
			} else {
				elementOccurences[productId][factoredSymbol.id] = 1;
			}
		}
	}

	return;
};

function createSprite (id, duration, bounds, className, images, imageMap, sprites, spriteProperties, frameCanvas, canvas) {
	var sprite = new Sprite();

	sprite.id        = id;
	sprite.isImage   = true;
	sprite.duration  = duration;
	sprite.className = className || undefined;
	sprite.bounds    = bounds;

	// Referencing image associated with sprite
	images[id]   = canvas;
	sprites[id]  = sprite;
	imageMap[id] = canvas;

	spriteProperties[id] = {
		x: frameCanvas.x,
		y: frameCanvas.y,
		w: frameCanvas.w,
		h: frameCanvas.h,
		sx: 0, sy: 0,
		sw: canvas.width,
		sh: canvas.height
	};
}

CanvasRenderer.prototype.prerenderSymbols = function (symbols, sprites, imageMap, spriteProperties) {
	// Prerendering symbols when possible for optimized runtime performance
	var frame = 0;
	var ratio = this._extractor._fileGroupRatio;
	var prerenderBlendings = this._extractor._options.prerenderBlendings;
	var collapseAnimations = this._extractor._options.collapse;

	// list of prerendered filtered elements
	var prerenderedFilteredElements = {};

	var s, symbol, symbolId;
	var c, child, children, childId, childSprite;

	// Going through symbols in order
	var symbolIds = [];
	for (symbolId in symbols) {
		symbolIds.push(parseInt(symbolId));
	}

	symbolIds.sort(function (a, b) { return a - b; });

	var elementIds = symbolIds.slice();
	for (var spriteId in sprites) {
		elementIds.push(parseInt(spriteId));
	}

	elementIds.sort(function (a, b) { return a - b; });

	// "main" symbol placed at the end if exist
	if (symbolIds[0] === 0) {
		symbolIds.shift();
		symbolIds.push(0);
	}

	// Counting number of occurences of each element
	// i.e how many different symbols each element belongs to
	var elementInstances  = {};
	var elementOccurences = {};
	for (s = 0; s < symbolIds.length; s += 1) {
		symbolId = symbolIds[s];
		symbol = symbols[symbolId];
		children = symbol.children;

		for (c = 0; c < children.length; c += 1) {
			child = children[c];
			// if (child.maskStart || child.maskEnd) {
			// 	continue;
			// }

			childId = child.id;
			if (!elementInstances[childId]) {
				elementInstances[childId] = [child];
				elementOccurences[childId] = {};
			} else {
				elementInstances[childId].push(child);
			}

			if (!elementOccurences[childId][symbolId]) {
				elementOccurences[childId][symbolId] = 1;
			} else {
				elementOccurences[childId][symbolId] += 1;
			}
		}
	}

	// // Trimming symbol frames in opposite order of appearance
	// for (s = symbolIds.length - 1; s >= 0; s -= 1) {
	// 	symbolId = symbolIds[s];
	// 	symbol = symbols[symbolId];
	// 	if (symbol.className || symbol.frameCount === 1) {
	// 		// cannot be trimmed
	// 		continue;
	// 	}

	// 	// getting maximum playable duration
	// 	var maxFrameCount = 1;
	// 	var appearances = elementInstances[symbolId];
	// 	for (a = 0; a < appearances.length; a += 1) {
	// 		var appearance = appearances[a];
	// 		var frameCount = appearance.frames[1] - appearance.frames[0] + 1;
	// 		if (maxFrameCount < frameCount) {
	// 			maxFrameCount = frameCount;
	// 		}
	// 	}

	// 	if (maxFrameCount >= symbol.frameCount) {
	// 		// cannot be trimmed
	// 		continue;
	// 	}

	// 	children = symbol.children;
	// 	for (c = 0; c < children.length; c += 1) {
	// 		child = children[c];
	// 		if (child.frames[0] >= maxFrameCount) {
	// 			children.splice(c, 1);
	// 			c -= 1;
	// 		} else if (child.frames[1] >= maxFrameCount) {
	// 			var firstFrame = child.frames[0];
	// 			var sliceSize = maxFrameCount - firstFrame;
	// 			child.frames 	 = [firstFrame, firstFrame + sliceSize - 1];
	// 			child.transforms = child.transforms.slice(0, sliceSize);
	// 			child.colors     = child.colors.slice(0, sliceSize);
	// 			if (child.filters)    child.filters    = child.filters.slice(0, sliceSize);
	// 			if (child.blendModes) child.blendModes = child.blendModes.slice(0, sliceSize);
	// 		}
	// 	}

	// 	symbol.frameCount = maxFrameCount;
	// }

	var instance, frameCanvas;
	var collapseableSprites = {};

	// List of symbols that can be merged
	for (s = 0; s < symbolIds.length; s += 1) {
		symbolId = symbolIds[s];
		symbol = symbols[symbolId];

		var bounds = symbol.containerBounds || symbol.bounds;
		if (!bounds) {
			continue;
		}

		instance = new SymbolInstance(symbolId, bounds);
		frameCanvas = instance.constructFrame(this._getCanvas, frame, ratio);

		var isPrerenderable = false;
		var canCollapseAsSprite = false;
		if (frameCanvas) {
			isPrerenderable = true; // until proven otherwise

			// prerendering only if all children are sprites with no class identification
			var frameCount = symbol.frameCount;
			var childrenFrameCount = 1;
			var isSymbolStatic  = true;
			var mergeableElements = [];

			// reasons for not being able to prerender the symbol
			var frameDiscrepancy      = false;
			var containsSymbol        = false;
			var tooManyFramcs         = false;
			var spriteInOtherSymbol   = false;
			var hasIdentifiedInstance = false;
			var hasBlendedSprite      = false;
			var hasIdentifiedSprite   = false;

			children = symbol.children;
			for (c = 0; c < children.length; c += 1) {
				child = children[c];
				childId = child.id;

				var frames = child.frames;
				var childFrameCount = frames[1] - frames[0] + 1;
				if (childFrameCount !== frameCount) {
					isSymbolStatic  = false;
					isPrerenderable = false;
					frameDiscrepancy = true;
					break;
				}

				var childElement = sprites[childId];
				if (!childElement) {
					containsSymbol = true;
					isSymbolStatic  = false;
					isPrerenderable = false;
					break;
				}

				if (frameCount > 1 && isSymbolStatic) {
					if (firstDifferentFrame(child, 0) !== frameCount) {
						isSymbolStatic  = false;
						isPrerenderable = false;
						tooManyFramcs = true;
						break;
					}
				}

				if (child.name) {
					isPrerenderable = false;
					hasIdentifiedInstance = true;
				}

				if (child.blendModes && !prerenderBlendings) {
					isPrerenderable = false;
					hasBlendedSprite = true;
				}

				if (childElement.className) {
					isPrerenderable = false;
					hasIdentifiedSprite = true;
				}

				if (Object.keys(elementOccurences[childId]).length > 1 && !child.filters) {
					// if child has a filter, it can be considered unique
					isPrerenderable = false;
					spriteInOtherSymbol = true;
				}

				if (isPrerenderable) {
					mergeableElements.push(childId);
				}
			}

			// For debug purpose:
			// if (!isPrerenderable) {
			// 	console.error('	frameDiscrepancy', frameDiscrepancy);
			// 	console.error('	containsSymbol', containsSymbol);
			// 	console.error('	tooManyFramcs', tooManyFramcs);
			// 	console.error('	spriteInOtherSymbol', spriteInOtherSymbol);
			// 	console.error('	hasIdentifiedInstance', hasIdentifiedInstance);
			// 	console.error('	hasBlendedSprite', hasBlendedSprite);
			// 	console.error('	hasIdentifiedSprite', hasIdentifiedSprite);
			// }

			if (collapseAnimations && isSymbolStatic && frameCount > 1) {
				// Can collapse the frames!
				collapseFrames(symbol);
				frameCount = 1;
			}

			var firstChild = children[0];
			if (collapseAnimations &&
				isPrerenderable &&
				children.length === 1 &&
				frameCount === 1 &&
				!firstChild.filters &&
				!firstChild.blendModes &&
				sprites[firstChild.id]
			) {

				var transform = firstChild.transforms[0];
				var color     = firstChild.colors[0];
				canCollapseAsSprite =
					transform[0] === 1 &&
					transform[1] === 0 &&
					transform[2] === 0 &&
					transform[3] === 1 &&
					color[0] === 1 &&
					color[1] === 1 &&
					color[2] === 1 &&
					color[3] === 1 &&
					color[4] === 0 &&
					color[5] === 0 &&
					color[6] === 0 &&
					color[7] === 0;
			}
		}

		if (isPrerenderable && !canCollapseAsSprite) {
			var canvas  = frameCanvas.canvas;
			var context = frameCanvas.context;
			this._renderSymbol(canvas, context, IDENTITY_TRANSFORM, IDENTITY_COLOR, instance, frame, false);

			// Creating sprite replacing symbol
			createSprite(
				symbolId,
				symbol.duration,
				symbol.bounds[0],
				symbol.className,
				this._images,
				imageMap,
				sprites,
				spriteProperties,
				frameCanvas,
				canvas
			);

			delete symbols[symbolId];
		} else {
			if (collapseAnimations) {

				if (canCollapseAsSprite) {
					var firstChildId = firstChild.id;
					var newSprite = JSON.parse(JSON.stringify(sprites[firstChildId]));
					var newSpriteProperties = JSON.parse(JSON.stringify(spriteProperties[firstChildId]));

					newSprite.id = symbolId;
					newSprite.duration = symbol.duration;
					newSprite.className = symbol.className;

					var offsetX = firstChild.transforms[0][4];
					var offsetY = firstChild.transforms[0][5];
					newSpriteProperties.x += offsetX;
					newSpriteProperties.y += offsetY;

					// Referencing image associated with sprite
					this._images[symbolId] = this._images[firstChildId];

					// Adding sprite to list of sprites
					sprites[symbolId] = newSprite;
					imageMap[symbolId] = imageMap[firstChildId];
					spriteProperties[symbolId] = newSpriteProperties;

					collapseSprite(symbolId, firstChild, symbols, elementOccurences[symbolId]);

					delete symbols[symbolId];

					delete elementOccurences[firstChildId][symbolId];
				} else {
					if (children.length > 1) {
						// Whole symbol could not be preredenred, maybe a subset of the symbol can be prerendered
						this.factorizeAndPrerenderChildren(symbol, symbols, sprites, imageMap, spriteProperties, elementIds, elementOccurences, symbolIds);
					}

					// Collapsing the animation hierarchy
					this.collapseSymbol(symbol, symbols, sprites, imageMap, spriteProperties, elementIds, prerenderedFilteredElements, prerenderBlendings);

					this.prerenderMaskedChildren(symbol, symbols, sprites, imageMap, spriteProperties, elementIds);
				}
			}
		}

	}

	// Prerendering all filtered children that could be not prerendered so far
	this.prerenderFilteredChildren(symbols, sprites, imageMap, spriteProperties, elementIds, prerenderedFilteredElements);
	this.trimUnnecessaryElements(symbols, sprites, imageMap, spriteProperties);
};

function MaskGroup (startIndex, endIndex, startFrame, endFrame) {
	this.startIndex = startIndex;
	this.endIndex   = endIndex;
	this.startFrame = startFrame;
	this.endFrame   = endFrame;
}

CanvasRenderer.prototype.prerenderMaskedChildren = function (symbol, symbols, sprites, imageMap, spriteProperties, elementIds) {
	var ratio = this._extractor._fileGroupRatio;
	var children = symbol.children;

	// checking for existence of masks
	var masks = [];
	var isMasked = false;
	var maskStartIndex = 0;
	var maskContext    = 0;
	var maskStartFrame = 0;
	var maskEndFrame   = 0;

	var canPrerender = false;
	for (var c = children.length - 1; c >= 0; c -= 1) {
		var child = children[c];
		if (child.maskStart) {
			maskContext += 1;
			if (maskContext === 1) {
				isMasked     = true;
				canPrerender = true;
				maskStartIndex = c;
				maskStartFrame = child.frames[0];
				maskEndFrame   = child.frames[1];
			} else {
				maskStartFrame = Math.min(maskStartFrame, child.frames[0]);
				maskEndFrame   = Math.max(maskEndFrame,   child.frames[1]);
			}
			continue;
		}

		if (child.maskEnd) {
			maskContext -= 1;
			if (maskContext === 0) {
				isMasked = false;
				if (canPrerender) {
					masks.push(new MaskGroup(maskStartIndex, c, maskStartFrame, maskEndFrame));
				}
			}
			continue
		}

		if (isMasked && canPrerender) {
			var childId = child.id;
			var sprite = sprites[childId];
			canPrerender = (!!sprite || !sprite.className);
		}

	}

	// Removing masked groups from symbol
	// and creating a new symbol for each masked group
	for (var m = 0; m < masks.length; m += 1) {
		var maskGroup = masks[m];
		var maskData = children[maskGroup.startIndex];
		var frameCount = maskGroup.endFrame - maskGroup.startFrame + 1;

		// Creating symbol for current group
		var maskGroupSymbol = new Symbol(frameCount);
		var maskGroupId = elementIds[elementIds.length - 1] + 1;
		elementIds.push(maskGroupId);
		maskGroupSymbol.id = maskGroupId;

		var maskGroupChildren = maskGroupSymbol.children;

		var maskedChildrenIndexes = [];

		// N.B mask definition start and end are in reverse array order
		for (c = maskGroup.endIndex; c <= maskGroup.startIndex; c += 1) {
			var child = children[c];
			var childFrames = child.frames;
			if (childFrames[0] > maskGroup.endFrame || maskGroup.startFrame > childFrames[1]) {
				continue;
			}

			var maskChild = JSON.parse(JSON.stringify(child));

			maskChild.frames[0] = childFrames[0] - maskGroup.startFrame;
			maskChild.frames[1] = childFrames[1] - maskGroup.startFrame;
			maskGroupChildren.push(maskChild);
			maskedChildrenIndexes.push(c);
		}

		// Removing children of mask group from original symbol
		children.splice(maskGroup.endIndex, maskGroup.startIndex - maskGroup.endIndex + 1);

		// Computing bounds of new symbol
		var tmpSymbols = {};
		tmpSymbols[maskGroupId] = maskGroupSymbol;
		computeBounds(tmpSymbols, sprites);

		// Temporarily adding mask group symbol to list of symbols for rendering purpose
		symbols[maskGroupId] = maskGroupSymbol;
		var instance = new SymbolInstance(maskGroupId, maskGroupSymbol.bounds);

		// Creating new symbols, one for each frame of the originally masked sub-animation
		for (var frame = 0; frame < frameCount; frame += 1) {

			frameCanvas = instance.constructFrame(this._getCanvas, frame, ratio);
			var canvas  = frameCanvas.canvas;
			var context = frameCanvas.context;
			this._renderSymbol(canvas, context, IDENTITY_TRANSFORM, IDENTITY_COLOR, instance, frame, false);

			newSpriteId = elementIds[elementIds.length - 1] + 1;
			elementIds.push(newSpriteId);

			// Creating sprite for frame
			createSprite(newSpriteId, 1, maskGroupSymbol.bounds[frame], null, this._images, imageMap, sprites, spriteProperties, frameCanvas, canvas);

			// Determining how many frames the currently prerendered frame is valid
			var lastIdenticalFrame = frameCount;
			for (c = 0; c < maskGroupChildren.length; c += 1) {
				var maskGroupChild = maskGroupChildren[c];
				var maskGroupChildFirstFrame = maskGroupChild.frames[0];
				if (maskGroupChild.frames[1] < frame || frame < maskGroupChildFirstFrame) {
					continue;
				}

				var maskGroupChildFirstDifferentFrame = firstDifferentFrame(maskGroupChild, frame - maskGroupChildFirstFrame);
				lastIdenticalFrame = Math.min(lastIdenticalFrame, maskGroupChildFirstFrame + maskGroupChildFirstDifferentFrame - 1);
			}

			var nbFrames = lastIdenticalFrame - frame + 1;

			var firstChildFrame = maskGroup.startFrame + frame;
			var lastChildFrame  = firstChildFrame + nbFrames - 1;

			var transform = IDENTITY_TRANSFORM.slice();
			var color     = IDENTITY_COLOR.slice();

			children.splice(maskGroup.endIndex, 0, {
				id: newSpriteId,
				frames: [firstChildFrame, lastChildFrame],
				transforms: Array(nbFrames).fill(transform),
				colors: Array(nbFrames).fill(color)
			});

			frame += nbFrames - 1;
		}

		// Removing mask group symbol from list of symbols
		delete symbols[maskGroupId];
	}

};

CanvasRenderer.prototype.trimUnnecessaryElements = function (symbols, sprites, imageMap, spriteProperties) {
	// Making list of unused elements to remove from list of symbols and sprites
	// And prerendering sprites that have a filters applied
	// for improved runtime performance

	var symbolRemoved;
	var usedElements;

	do {
		symbolRemoved = false;
		usedElements = {};
		for (var symbolId in symbols) {
			var symbol = symbols[symbolId];
			var children = symbol.children;
			for (var c = 0; c < children.length; c += 1) {
				usedElements[children[c].id] = true;
			}
		}

		for (symbolId in symbols) {
			if (!usedElements[symbolId] && !symbols[symbolId].className) {
				delete symbols[symbolId];
				symbolRemoved = true;
			}
		}
	} while (symbolRemoved)

	for (var spriteId in sprites) {
		if (!usedElements[spriteId] && !sprites[spriteId].className) {
			delete sprites[spriteId];
			delete imageMap[spriteId];
			delete spriteProperties[spriteId];
		}
	}
};

CanvasRenderer.prototype.collapseSymbol = function (symbol, symbols, sprites, imageMap, spriteProperties, elementIds, prerenderedFilteredElements, prerenderBlendings) {
	// Moving any element that is not referenced by a className up the heirarchy
	// by precomputing its transformation in each animation it appears in

	var newChildren = [];
	var children = symbol.children;
	for (var c = 0; c < children.length; c += 1) {
		var child = children[c];
		var childId = child.id;

		if (sprites[childId]) {
			newChildren.push(child);
			continue;
		}

		var childSymbol = symbols[childId];
		if (!childSymbol || childSymbol.className || child.name) {
			newChildren.push(child);
			continue;
		}


		// // Above a given number of children the memory overhead becomes too high with respect to the relative performance gain
		// // (which decreases as the number of children increase)
		// var collapsableChildren = childSymbol.children;
		// if (collapsableChildren.length > 2) {
		// 	newChildren.push(child);
		// 	continue;
		// }

		var hasRenderingConstraints = child.blendModes || child.filters;
		if (hasRenderingConstraints && childSymbol.children.length > 1 ||
			child.blendModes && !prerenderBlendings) {
			newChildren.push(child);
			continue;
		}

		if (child.filters) {
			// child needs to be prerendered
			this.prerenderFilteredChild(child, symbols, sprites, imageMap, spriteProperties, elementIds, prerenderedFilteredElements);
			newChildren.push(child);
			continue;
		}

		if (childSymbol.frameCount > child.frames[1] - child.frames[0] + 1) {
			newChildren.push(child);
			continue;
		}

		// instance can be collapsed!
		Array.prototype.push.apply(newChildren, collapseInstance(childSymbol, child));
	}

	symbol.children = newChildren;
}

CanvasRenderer.prototype.prerenderFilteredChild = function (child, symbols, sprites, imageMap, spriteProperties, elementIds, prerenderedFilteredElements, prerenderBlendings) {
	var childFilters = child.filters;
	var childId = child.id;

	var sprite = sprites[childId];
	var symbol = sprite ? null : symbols[childId];

	if (symbol && symbol.swfObject && symbol.swfObject.type === 'text') {
		return;
	}

	var frame = 0;
	var ratio = this._extractor._fileGroupRatio;
	var blendModes = this._extractor._options.prerenderBlendings ? child.blendModes : null;

	delete child.filters;
	if (blendModes) {
		delete child.blendModes;
	}

	var bounds = symbol ? symbol.bounds : [sprite.bounds];
	var instance = new SymbolInstance(childId, bounds, childFilters, blendModes);
	var frameCanvas = instance.constructFrame(this._getCanvas, frame, ratio);

	// Testing whether sprite has already been rendered with higher dimensions
	var newSpriteId;
	if (prerenderedFilteredElements[childId]) {
		var prerenders = prerenderedFilteredElements[childId];
		var prerenderId = null;
		var prerenderTooSmall = false;
		for (var p = 0; p < prerenders.length; p += 1) {
			var prerender = prerenders[p];

			prerenderTooSmall = prerender.dimensions.w < frameCanvas.w && prerender.dimensions.h < frameCanvas.h;
			if (prerenderTooSmall ||
				(prerender.blendMode === (blendModes && blendModes[0]) && 
				!areObjectsDifferent(prerender.filters, childFilters[0]))
			) {
				prerenderId = prerender.spriteId;
				break;
			}
		}

		if (prerenderTooSmall) {
			newSpriteId = prerenderId;
		} else if (prerenderId) {
			child.id = prerenderId;
			return;
		}
	} 

	if (!newSpriteId) {
		newSpriteId = elementIds[elementIds.length - 1] + 1;
		elementIds.push(newSpriteId);
	}

	child.id = newSpriteId;

	this._renderSymbol(
		frameCanvas.canvas,
		frameCanvas.context,
		IDENTITY_TRANSFORM,
		IDENTITY_COLOR,
		instance,
		frame,
		false,
		true
	);

	createSprite(
		newSpriteId,
		1,
		bounds[frame],
		symbol ? symbol.className : sprite.className,
		this._images,
		imageMap,
		sprites,
		spriteProperties,
		frameCanvas,
		frameCanvas.canvas
	);

	if (!prerenderedFilteredElements[childId]) {
		prerenderedFilteredElements[childId] = [];
	}

	prerenderedFilteredElements[childId].push({
		filters: childFilters[0],
		blendMode: blendModes && blendModes[0],
		dimensions: spriteProperties[newSpriteId],
		spriteId: newSpriteId
	});
};

CanvasRenderer.prototype.prerenderFilteredChildren = function (symbols, sprites, imageMap, spriteProperties, elementIds, prerenderedFilteredElements) {
	for (var symbolId in symbols) {
		var symbol = symbols[symbolId];
		var frameCount = symbol.frameCount;
		var children = symbol.children;
		for (var c = 0; c < children.length; c += 1) {
			var child = children[c];
			var childId = child.id;

			var sprite = sprites[childId];
			if (sprite) {
				if (child.filters) {
					this.prerenderFilteredChild(child, symbols, sprites, imageMap, spriteProperties, elementIds, prerenderedFilteredElements);
				}
			}
		}
	}
};



function transformMultiplication(transformA, transformB) {
	var a0 = transformA[0];
	var b0 = transformA[1];
	var c0 = transformA[2];
	var d0 = transformA[3];
	var e0 = transformA[4];
	var f0 = transformA[5];

	var a1 = transformB[0];
	var b1 = transformB[1];
	var c1 = transformB[2];
	var d1 = transformB[3];
	var e1 = transformB[4];
	var f1 = transformB[5];

	return [
		a0 * a1 + c0 * b1,
		b0 * a1 + d0 * b1,
		a0 * c1 + c0 * d1,
		b0 * c1 + d0 * d1,
		a0 * e1 + c0 * f1 + e0,
		b0 * e1 + d0 * f1 + f0
	];
}

function colorMultiplication(colorA, colorB) {
	var rm0 = colorA[0];
	var gm0 = colorA[1];
	var bm0 = colorA[2];
	var am0 = colorA[3];
	var ra0 = colorA[4];
	var ga0 = colorA[5];
	var ba0 = colorA[6];
	var aa0 = colorA[7];

	var rm1 = colorB[0];
	var gm1 = colorB[1];
	var bm1 = colorB[2];
	var am1 = colorB[3];
	var ra1 = colorB[4];
	var ga1 = colorB[5];
	var ba1 = colorB[6];
	var aa1 = colorB[7];

	return [
		rm1 * rm0,
		gm1 * gm0,
		bm1 * bm0,
		am1 * am0,
		ra1 * rm0 + ra0,
		ga1 * gm0 + ga0,
		ba1 * bm0 + ba0,
		aa1 * am0 + aa0
	];
}

function collapseSprite(spriteId, collapseableSprite, symbols, occurences) {
	// Propagating transformations of collapseble sprite
	var spriteTransform = collapseableSprite.transforms[0];
	var spriteColor     = collapseableSprite.colors[0];
	// var spriteFilter    = collapseableSprite.filters && collapseableSprite.filters[0];
	// var spriteBlendMode = collapseableSprite.blendModes && collapseableSprite.blendModes[0];

	spriteTransform[4] = 0;
	spriteTransform[5] = 0;

	for (var symbolId in occurences) {
		// In this case the children are instances of the given sprite within the symbol of id symbolId
		var children = symbols[symbolId].children;
		for (var c = 0; c < children.length; c += 1) {
			var child = children[c];
			if (child.id === spriteId) {
				var transforms = child.transforms;
				var colors     = child.colors;

				// var filters    = [];
				// var blendModes = [];
				// if (spriteFilter)    { child.filters    = filters; }
				// if (spriteBlendMode) { child.blendModes = blendModes; }

				for (var f = 0; f < transforms.length; f += 1) {
					transforms[f] = transformMultiplication(transforms[f], spriteTransform);
					colors[f]     = colorMultiplication(colors[f], spriteColor);
					// if (spriteFilter)    { filters[f]    = spriteFilter; }
					// if (spriteBlendMode) { blendModes[f] = spriteBlendMode; }
				}
			}
		}
	}
}

function collapseFrames(symbol) {
	var children = symbol.children;
	for (var c = 0; c < children.length; c += 1) {
		var child = children[c];
		child.transforms = [child.transforms[0]];
		child.colors     = [child.colors[0]];
		child.frames     = [0, 0];

		if (child.blendModes) { child.blendModes = [child.blendModes[0]]; }
		if (child.filters)    { child.filters    = [child.filters[0]]; }
		if (child.name)       { child.name       = child.name; }
	}
	symbol.frameCount = 1;
}

function collapseInstance(symbol, instance) {
	var firstFrameParent = instance.frames[0];
	var transforms       = instance.transforms;
	var colors           = instance.colors;

	// Applying transformation propagation on each child
	var a0, b0, c0, d0, e0, f0;
	var a1, b1, c1, d1, e1, f1;

	var rm0, gm0, bm0, am0, ra0, ga0, ba0, aa0;
	var rm1, gm1, bm1, am1, ra1, ga1, ba1, aa1;

	var instanceFrameCount = instance.frames[1] - instance.frames[0] + 1;
	var frameCount = symbol.frameCount;
	var collapsedChildren  = [];
	var children = symbol.children;
	for (var c = 0; c < children.length; c += 1) {
		var childInstance = children[c];

		var childTransforms = childInstance.transforms;
		var childColors     = childInstance.colors;
		var childFrameCount = childInstance.frames[1] - childInstance.frames[0] + 1;

		var newTransforms   = [];
		var newColors       = [];
		var firstFrameChild = 0;

		var collapsedChild;
		for (var f = 0; f < instanceFrameCount; f += 1) {

			// child transformation
			var childFrame = f % frameCount - childInstance.frames[0];
			if (childFrame < 0 || childFrameCount <= childFrame) {
				if (newTransforms.length > 0) {
					collapsedChild = JSON.parse(JSON.stringify(childInstance));
					collapsedChild.transforms = newTransforms;
					collapsedChild.colors     = newColors;
					collapsedChild.frames     = [firstFrameParent + firstFrameChild, firstFrameParent + f - 1];

					if (instance.blendModes) { collapsedChild.blendModes = instance.blendModes; }
					if (instance.filters)    { collapsedChild.filters = instance.filters; }

					collapsedChildren.push(collapsedChild);

					newTransforms = [];
					newColors     = [];
				}
				firstFrameChild = f + 1;
				continue;
			}

			newTransforms.push(transformMultiplication(transforms[f], childTransforms[childFrame]));
			newColors.push(colorMultiplication(colors[f], childColors[childFrame]));
		}

		// Replacing child transforms
		if (newTransforms.length > 0) {
			collapsedChild = JSON.parse(JSON.stringify(childInstance));
			collapsedChild.transforms = newTransforms;
			collapsedChild.colors     = newColors;
			collapsedChild.frames     = [firstFrameParent + firstFrameChild, firstFrameParent + f - 1];

			if (instance.blendModes) { collapsedChild.blendModes = instance.blendModes; }
			if (instance.filters)    { collapsedChild.filters = instance.filters; }

			collapsedChildren.push(collapsedChild);
		}
	}

	return collapsedChildren;
}