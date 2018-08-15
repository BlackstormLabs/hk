
var processShape = require('./processShape');
var elements = require('../elements');
var Sprite = elements.Sprite;

function interpolateColor(colors, a, b) {
	var colorA = colors[0];
	var colorB = colors[1];
	return {
		red:   Math.round(colorA.red   * b + colorB.red   * a),
		green: Math.round(colorA.green * b + colorB.green * a),
		blue:  Math.round(colorA.blue  * b + colorB.blue  * a),
		alpha: colorA.alpha * b + colorB.alpha * a
	};
}

function interpolateGradient(gradients, a, b) {
	// Interpolation of transforms and colors stops
	var startMatrix = gradients.matrix[0];
	var endMatrix   = gradients.matrix[1];

	// Not proper way of doing matrix interpolation
	// However it is a good enough approximation for gradients
	var newMatrix = {
		scaleX: startMatrix.scaleX * b + endMatrix.scaleX * a,
		scaleY: startMatrix.scaleY * b + endMatrix.scaleY * a,
		skewX:  startMatrix.skewX  * b + endMatrix.skewX  * a,
		skewY:  startMatrix.skewY  * b + endMatrix.skewY  * a,
		moveX:  Math.round(startMatrix.moveX * b + endMatrix.moveX  * a),
		moveY:  Math.round(startMatrix.moveY * b + endMatrix.moveY  * a)
	};

	var stops    = gradients.stops;
	var newStops = [];
	for (var s = 0; s < stops.length; s += 1) {
		var stop = stops[s];
		var color = interpolateColor(stop.color, a , b);

		var offset = stop.offset[0] * b + stop.offset[1] * a;
		newStops.push({offset: offset, color: color });
	}

	return  {
		type:          gradients.type,
		matrix:        newMatrix,
		stops:         newStops,
		spread:        gradients.spread,
		interpolation: gradients.interpolation
	};
}

function createMorphedShape(items, sprites, symbol, ratio) {
	/* jshint maxstatements: 100 */
	var symbolMorphings = symbol.morphings;
	if (!symbolMorphings) {
		symbolMorphings = {};
		symbol.morphings = symbolMorphings;
	}

	if (symbolMorphings[ratio]) {
		// morphed element has already been created
		return symbolMorphings[ratio];
	}

	var morphId = items.length;
	symbolMorphings[ratio] = morphId;

	var swfObject = symbol.swfObject;
	var morphedSprite = new Sprite();
	morphedSprite.id        = morphId;
	morphedSprite.isShape   = true;
	morphedSprite.isMorphed = true;
	morphedSprite.swfObject = swfObject;

	items.push(morphedSprite);
	sprites[morphId] = morphedSprite;

	// interpolating the shape
	var shapes = [];
	var startBounds = swfObject.startBounds;
	var startEdges  = swfObject.startEdges;

	var a = ratio / 65535; // ratio in float
	var b = 1 - a; // inverse ratio
	var endBounds = swfObject.endBounds;
	var endEdges  = swfObject.endEdges;

	morphedSprite.bounds = {
		left:   (startBounds.left   * b + endBounds.left   * a) / 20,
		right:  (startBounds.right  * b + endBounds.right  * a) / 20,
		top:    (startBounds.top    * b + endBounds.top    * a) / 20,
		bottom: (startBounds.bottom * b + endBounds.bottom * a) / 20
	};

	var startEdgeOffset = 0;
	var endEdgeOffset   = 0;
	var startEdgeIdx    = 0;
	var endEdgeIdx      = 0;
	while (startEdgeIdx < startEdges.length && endEdgeIdx < endEdges.length) {

		var startEdge = startEdges[startEdgeIdx];
		var endEdge   = endEdges[endEdgeIdx]; // All the records for end edges are mixed to make things easier (<- irony)

		var startLeftFill  = startEdge.leftFill;
		var startRightFill = startEdge.rightFill;
		var startLine      = startEdge.lineStyle;

		var newShape = { styleIdx: startEdge.styleIdx };

		if (startLeftFill) {
			// Interpolation of left fill style
			if (startLeftFill.type) {
				newShape.leftFill = interpolateGradient(startLeftFill, a, b);
			} else {
				newShape.leftFill = interpolateColor(startLeftFill, a, b);
			}
			newShape.leftFillIdx = startEdge.leftFillIdx;
		}

		if (startRightFill) {
			// Interpolation of right fill style
			if (startRightFill.type) {
				newShape.rightFill = interpolateGradient(startRightFill, a, b);
			} else {
				newShape.rightFill = interpolateColor(startRightFill, a, b);
			}
			newShape.rightFillIdx = startEdge.rightFillIdx;
		}

		if (startLine) {
			// Interpolation of line style
			var newLine = {
				width:        startLine.width[0] * b + startLine.width[1] * a,
				noHScale:     startLine.noHScale,
				noVScale:     startLine.noVScale,
				pixelHinting: startLine.pixelHinting,
				noClose:      startLine.noClose,
				capStart:     startLine.capStart,
				join:         startLine.join,
				capEnd:       startLine.capEnd
			};

			if (startLine.fill) {
				newLine.fill = interpolateGradient(startLine.fill, a, b);
			} else {
				newLine.color = interpolateColor(startLine.color, a, b);
			}

			newShape.lineIdx = startEdge.lineIdx;
			newShape.lineStyle = newLine;
		}

		// Interpolation of edges
		var startRecords = startEdge.records;
		var endRecords   = endEdge.records;
		var newRecords   = [];
		var r1 = startEdgeOffset;
		var r2 = endEdgeOffset;
		while (r1 < startRecords.length && r2 < endRecords.length) {
			var startRecord = startRecords[r1];
			var endRecord   = endRecords[r2];

			var newRecord = {
				f: startRecord.f,
				x1: Math.round(startRecord.x1 * b + endRecord.x1 * a),
				y1: Math.round(startRecord.y1 * b + endRecord.y1 * a),
				x2: Math.round(startRecord.x2 * b + endRecord.x2 * a),
				y2: Math.round(startRecord.y2 * b + endRecord.y2 * a)
			};

			// Checking if at least one record is a bezier curve
			if (startRecord.c || endRecord.c) {
				// Computing the bezier curve
				var cx1, cy1, cx2, cy2;
				if (startRecord.c) {
					cx1 = startRecord.cx;
					cy1 = startRecord.cy;
				} else {
					cx1 = (startRecord.x1 + startRecord.x2) / 2;
					cy1 = (startRecord.y1 + startRecord.y2) / 2;
				}

				if (endRecord.c) {
					cx2 = endRecord.cx;
					cy2 = endRecord.cy;
				} else {
					cx2 = (endRecord.x1 + endRecord.x2) / 2;
					cy2 = (endRecord.y1 + endRecord.y2) / 2;
				}

				newRecord.cx = Math.round(cx1 * b + cx2 * a);
				newRecord.cy = Math.round(cy1 * b + cy2 * a);
				newRecord.c  = true;
			}

			newRecords.push(newRecord);
			r1 += 1;
			r2 += 1;
		}

		var startEdgeOffsetTmp = startEdgeOffset;
		if (endEdgeOffset + startRecords.length > startEdgeOffset + endRecords.length) {
			startEdgeOffset += endRecords.length - endEdgeOffset;
		} else {
			startEdgeOffset = 0;
			startEdgeIdx += 1;
		}

		if (startEdgeOffsetTmp + endRecords.length > endEdgeOffset + startRecords.length) {
			endEdgeOffset += startRecords.length - startEdgeOffsetTmp;
		} else {
			endEdgeOffset = 0;
			endEdgeIdx += 1;
		}

		newShape.records = newRecords;
		shapes.push(newShape);
	}

	morphedSprite.shapes = processShape(shapes);
	return morphId;
}

function generateChildren(symbol, sprites, items) {
	/* jshint maxcomplexity: 50 */
	/* jshint maxstatements: 160 */

	var f;
	var objectTransform;
	var objectColor, color;
	var objectLayerData = {}; // An object containing the last object data for each depth
	var objectData, objectId;
	var depths = {}; // Contains element mapped by depth
	var depth, d, depthArray, nDepths;
	var timeline = symbol.swfObject.timeline;
	// var frameCount = timeline.length;
	var frameCount = symbol.frameCount;
	var morphedShapeReplacements = [];
	for (f = 0; f < frameCount; f += 1) {

		if (timeline[f] !== undefined) {
			var displayList = timeline[f].displayList;
			morphedShapeReplacements = [];
			for (d = 0, depthArray = Object.keys(displayList), nDepths = depthArray.length; d < nDepths; d += 1) {
				depth = depthArray[d];
				objectData = displayList[depth];
				if (objectData === null) {
					objectLayerData[depth] = null;
					continue;
				}

				// objects are not redefined every frame
				// In objectData, if an object remains unchanged from a frame A to a frame B then it does not appear in frame B
				if (!objectLayerData[depth]) {
					// no object was previously defined for the given depth
					objectLayerData[depth] = objectData;
				} else {
					if (objectData.id) {
						// changing object id
						// only keeping transformation matrix, if none specified
						if (objectData.matrix === undefined) {
							objectData.matrix = objectLayerData[depth].matrix;
						}
						objectLayerData[depth] = objectData;
					} else {
						for (var a = 0, attributeArray = Object.keys(objectData), nAttributes = attributeArray.length; a < nAttributes; a += 1) {
							var attribute = attributeArray[a];

							// the object attribute has changed
							objectLayerData[depth][attribute] = objectData[attribute];
						}
					}

				}

				// Testing for special case when object is a morphing
				objectData = objectLayerData[depth];
				var childItem = items[objectData.id];

				if (childItem && childItem.isMorphing) {
					var ratio = objectData.ratio || 0;

					// Creating a new graphic that correspond to interpolation of the morphing with respect to the given ratio
					var morphedShapeId = createMorphedShape(items, sprites, childItem, ratio);

					// Replacing symbol id
					morphedShapeReplacements.push({ depth: depth, morphId: morphedShapeId, originalId: childItem.id });
				}
			}
		}

		// Replacing IDs of morphed shapes
		var m, replacement;
		for (m = 0; m < morphedShapeReplacements.length; m += 1) {
			replacement = morphedShapeReplacements[m];
			objectLayerData[replacement.depth].id = replacement.morphId;
		}

		for (d = 0, depthArray = Object.keys(objectLayerData), nDepths = depthArray.length; d < nDepths; d += 1) {
			depth = depthArray[d];
			objectData = objectLayerData[depth];

			if (objectData) {
				objectColor     = objectData.cxform;
				objectTransform = objectData.matrix;
				objectId        = objectData.id;

				if (depths[depth] === undefined) {
					depths[depth] = {};
					depths[depth][objectId] = [];
				} else {
					if (depths[depth][objectId] === undefined) {
						depths[depth][objectId] = [];
					}
				}

				if (!objectTransform) {
					objectTransform = { scaleX: 1, scaleY: 1, moveX: 0, moveY: 0, skewX: 0, skewY: 0 };
				}

				var transform = [objectTransform.scaleX, objectTransform.skewX, objectTransform.skewY, objectTransform.scaleY, objectTransform.moveX / 20, objectTransform.moveY / 20];

				if (objectColor) { // object color is not always defined
					var rMult = objectColor.multR;
					var gMult = objectColor.multG;
					var bMult = objectColor.multB;
					var aMult = objectColor.multA;

					var rAmnt = objectColor.addR;
					var gAmnt = objectColor.addG;
					var bAmnt = objectColor.addB;
					var aAmnt = objectColor.addA;

					color = [rMult, gMult, bMult, aMult, rAmnt, gAmnt, bAmnt, aAmnt];
				} else {
					// There is no object color, pushing the color identity
					color = [1, 1, 1, 1, 0, 0, 0, 0];
				}

				var childData = {
					frame:     f,
					transform: transform,
					color:     color,
					id:        objectId
				};

				if (objectData.clipDepth) {
					var maskEndData = JSON.parse(JSON.stringify(childData));
					childData.maskStart = true;
					maskEndData.maskEnd = true;

					var maskEndDepth = objectData.clipDepth;
					if (depths[maskEndDepth] === undefined) {
						depths[maskEndDepth] = {};
					}

					if (depths[maskEndDepth][objectId] === undefined) {
						depths[maskEndDepth][objectId] = [];
					}

					depths[maskEndDepth][objectId].push(maskEndData);
				}

				if (objectData.filters) {
					childData.filters = objectData.filters;
				}

				if (objectData.blendMode) {
					childData.blendMode = objectData.blendMode;
				}

				if (objectData.name) {
					childData.name = objectData.name;
				}

				// Supported but not exported as such
				// if (objectData.ratio) {
				// 	childData.ratio = objectData.ratio;
				// }

				for (var p in objectData) {
					if (p !== 'clipDepth' &&
						p !== 'cxform' &&       // supported
						p !== 'matrix' &&       // supported
						p !== 'id' &&           // supported
						p !== 'depth' &&        // supported
						p !== 'filters' &&      // supported
						p !== 'blendMode' &&    // supported
						p !== 'ratio' &&        // supported
						p !== 'name' &&         // supported
						p !== 'bitmapCache'     // not supported, should it be? might improve extraction speed (it optimises blending operations)
					) {
						console.log('found unused property!', p, objectData[p], objectData.id);
					}
				}

				depths[depth][objectId].push(childData);
			}
		}

		// Setting IDs of morphed shape back to their orignal IDs
		for (m = 0; m < morphedShapeReplacements.length; m += 1) {
			replacement = morphedShapeReplacements[m];
			objectLayerData[replacement.depth].id = replacement.originalId;
		}
	}

	// Ordering layers by depth
	var orderedDepths = [];
	for (d = 0, depthArray = Object.keys(depths), nDepths = depthArray.length; d < nDepths; d += 1) {
		depth = depthArray[d];
		orderedDepths.push({ content: depths[depth], depth: parseInt(depth, 10) });
	}
	orderedDepths.sort(function (a, b) { return b.depth - a.depth; });

	var child;
	var children = symbol.children;
	for (var i = 0; i < orderedDepths.length; i += 1) {
		var content = orderedDepths[i].content;
		depth = orderedDepths[i].depth;
		for (var idString in content) {
			var animData   = content[idString];
			var idInt      = animData[0].id;
			var start      = animData[0].frame;
			var transforms = [];
			var colors     = [];
			var filters    = [];
			var blendModes = [];

			var nFrames = animData.length;
			for (f = 0; f < nFrames; f += 1) {
				var frameData = animData[f];
				var frame = frameData.frame;

				if (frameData.transform) transforms.push(frameData.transform);
				if (frameData.color)     colors.push(frameData.color);
				if (frameData.filters)   filters.push(frameData.filters);
				if (frameData.blendMode) blendModes.push(frameData.blendMode);

				var nextFrame;
				if (f < nFrames - 1) {
					nextFrame = animData[f + 1].frame;
					if (nextFrame === frame + 1) {
						continue;
					}
				}

				// There is an interuption in the display of the object
				// Adding sequence of transforms
				child = {
					id: idInt,
					frames: [start, frame]
				};

				if (frameData.name)      child.name      = frameData.name;
				if (frameData.maskStart) child.maskStart = frameData.maskStart;
				if (frameData.maskEnd)   child.maskEnd   = frameData.maskEnd;

				if (transforms.length > 0) child.transforms = transforms;
				if (colors.length     > 0) child.colors     = colors;
				if (filters.length    > 0) child.filters    = filters;
				if (blendModes.length > 0) child.blendModes = blendModes;

				children.push(child);

				// Creating a new sequence of transforms
				transforms = [];
				colors     = [];
				filters    = [];
				blendModes = [];
				start = nextFrame;
			}
		}
	}

	// Creating a list of children per frame
	var frames = [];
	symbol.frames = frames;
	symbol.frameNames = [];
	for (f = 0; f < frameCount; f += 1) {
		frames[f] = [];
		symbol.frameNames[f] = symbol.className + '_frame' + f;
	}

	var c;
	for (c = 0; c < children.length; c += 1) {
		child = children[c];
		var childId     = child.id;
		var childFrames = child.frames;
		var startFrame  = childFrames[0];
		var endFrame    = childFrames[1];

		var childTransforms = child.transforms;
		var childColors     = child.colors;
		for (f = startFrame; f <= endFrame; f += 1) {
			frames[f].push({
				id:         childId,
				transforms: childTransforms[f - startFrame],
				color:      childColors[f - startFrame]
			});
		}
	}

	// Adding parent id to each symbol present in children
	var symbolId = symbol.id;
	for (c = 0; c < children.length; c += 1) {
		var item = items[children[c].id];
		item.parents[symbolId] = symbolId;
	}
}

module.exports = function generateAllChildren(symbols, sprites, items) {
	for (var symbolId in symbols) {
		generateChildren(symbols[symbolId], sprites, items);
	}
};
