var CanvasRenderer = require('./main');
var filters        = require('./filters');
var blendModes     = require('./blendModes');

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
		b0 * t1[4] + d0 * t1[5] + f0
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

function applyTint(context, tint, dim, bounds) {
	var left   = Math.max(dim.left, bounds.left);
	var top    = Math.max(dim.top,  bounds.top);
	var right  = Math.min(left + dim.width,  bounds.right);
	var bottom = Math.min(top  + dim.height, bounds.bottom);
	var width  = right  - left;
	var height = bottom - top;

	if (width <= 0 || height <= 0) {
		return;
	}

	var pixelBuffer = context.getImageData(left, top, width, height);
	var pixelData   = pixelBuffer.data;
	var nBytes      = pixelData.length;

	var rm = tint[0];
	var gm = tint[1];
	var bm = tint[2];

	var ra = tint[4] * 255;
	var ga = tint[5] * 255;
	var ba = tint[6] * 255;

	for (var i = 0; i < nBytes; i += 4) {
		pixelData[i]     = Math.max(0, Math.min(pixelData[i]     * rm + ra, 255)); // red
		pixelData[i + 1] = Math.max(0, Math.min(pixelData[i + 1] * gm + ga, 255)); // green
		pixelData[i + 2] = Math.max(0, Math.min(pixelData[i + 2] * bm + ba, 255)); // blue

		// Alpha is managed using globalAlpha for performance purpose
		// n.b tints are applied only if a component red, green or blue differs from default
		// pixelData[i + 3] = Math.max(0, Math.min(pixelData[i + 3] * multA + addA, 255)); // alpha
	}

	context.putImageData(pixelBuffer, left, top);
}

CanvasRenderer.prototype._renderMaskGroup = function(children, maskStart, globalCanvas, globalContext, parentTransform, parentColor, frame, isMask) {
	var maskChild = children[maskStart];

	// Creating an intermediary canvas to apply the mask
	var maskCanvas  = this._getCanvas(globalCanvas.width, globalCanvas.height);
	var maskContext = maskCanvas.getContext('2d');

	this._renderSymbol(maskCanvas, maskContext, parentTransform, parentColor, maskChild, frame - maskChild.frames[0], true);

	var clipCanvas  = this._getCanvas(globalCanvas.width, globalCanvas.height);
	var clipContext = clipCanvas.getContext('2d');

	// To support masked layers with blend mode
	clipContext.drawImage(globalCanvas, 0, 0);

	var maskContext = 1;
	var c = maskStart;
	while (maskContext > 0) {
		var child = children[--c];
		if (frame < child.frames[0] || child.frames[1] < frame) {
			continue;
		}

		if (child.maskStart) {
			maskContext += 1;
			c = this._renderMaskGroup(children, c, clipCanvas, clipContext, parentTransform, parentColor, frame, isMask);
			continue;
		}

		if (child.maskEnd) {
			maskContext -= 1;
			continue;
		}

		this._renderSymbol(clipCanvas, clipContext, parentTransform, parentColor, child, frame - child.frames[0], isMask);
	}

	// Setting the global composite operation that is equivalent to applying a mask
	clipContext.globalCompositeOperation = 'destination-in';

	// Applying mask
	clipContext.globalAlpha = 1;
	clipContext.setTransform(1, 0, 0, 1, 0, 0);
	clipContext.drawImage(maskCanvas, 0, 0);

	// Rendering clipped elements onto final canvas
	globalContext.globalAlpha = 1;
	globalContext.setTransform(1, 0, 0, 1, 0, 0);
	globalContext.drawImage(clipCanvas, 0, 0);
	// globalContext.drawImage(maskCanvas, 0, 0);

	return c + 1;
};

CanvasRenderer.prototype._renderSymbol = function (globalCanvas, globalContext, parentTransform, parentColor, instance, frame, isMask) {
	/* jshint maxcomplexity: 60 */
	/* jshint maxstatements: 150 */
	var id = instance.id;

	// Rendering the first frame, thus getting data of index 0
	var transform      = instance.transforms[frame];
	var tint           = instance.colors[frame];
	var appliedFilters = instance.filters    ? instance.filters[frame]    : undefined;
	var blendMode      = instance.blendModes ? instance.blendModes[frame] : undefined;

	var matrix = multiplyTransforms(parentTransform, transform);
	var color  = multiplyColors(parentColor, tint);

	var sprite = this._extractor._sprites[id];
	var symbol = this._extractor._symbols[id];
	if (!sprite && !symbol) {
		// element not found!
		return;
	}

	// Checking for pixel operations
	var hasTint   = (tint[0] !== 1) || (tint[1] !== 1) || (tint[2] !== 1) || (tint[4] !== 0) || (tint[5] !== 0) || (tint[6] !== 0);
	var hasFilter = appliedFilters ? (appliedFilters.length > 0) : false;
	var hasBlend  = (blendMode && (2 <= blendMode && blendMode <= 14)) ? true : false;
	var hasPixelManipulation = hasTint || hasFilter || hasBlend;

	var localCanvas, localContext;
	if (hasPixelManipulation) {
		localCanvas  = this._getCanvas(globalCanvas.width, globalCanvas.height);
		localContext = localCanvas.getContext('2d');
	} else {
		localCanvas  = globalCanvas;
		localContext = globalContext;
	}

	var elementBounds = symbol ? symbol.bounds : sprite.bounds;
	var bbox = elementBounds instanceof Array ? elementBounds[frame] : elementBounds;

	var alphaMul, alphaAdd;
	if (hasPixelManipulation) {
		// Pixel manipulation should be done pre-alpha blending
		alphaMul = color[3];
		alphaAdd = color[7];
		color[3] = 1;
		color[7] = 0;
	}

	var alpha = Math.max(0, Math.min(color[3] + color[7], 1));
	if (sprite) {
		if (sprite.isShape) {
			localContext.globalAlpha = alpha;
			localContext.setTransform(1, 0, 0, 1, 0, 0);

			// Transformation is applied within the drawshape function
			this._drawShapes(sprite.shapes, localCanvas, localContext, matrix, isMask);
		}

		if (sprite.isImage) {
			localContext.globalAlpha = alpha;
			localContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);

			var image = this._images[id];
			var x = bbox.left;
			var y = bbox.top;
			var width  = bbox.right  - x;
			var height = bbox.bottom - y;
			if (isMask) {
				// If it is a mask, the rendered image should be a completely opaque rectangle
				localContext.globalAlpha = 1;
				localContext.fillStyle = '#ffffff';
				localContext.fillRect(x, y, width, height);
			} else {
				localContext.drawImage(image, x, y, width, height);
			}
		}
	}

	if (symbol) {
		var children = symbol.children;
		frame = frame % symbol.frameCount;
		for (var c = children.length - 1; c >= 0; c -= 1) {
			var child = children[c];
			if (frame < child.frames[0] || child.frames[1] < frame || child.maskEnd) {
				// Child is not visible at given frame
				continue;
			}

			if (child.maskStart) {
				c = this._renderMaskGroup(children, c, localCanvas, localContext, matrix, color, frame, isMask);
			} else {
				this._renderSymbol(localCanvas, localContext, matrix, color, child, frame - child.frames[0], isMask);
			}
		}
	}

	if (hasPixelManipulation) {
		if (!bbox) {
			// console.warn(element.id, 'has no bounds!');
			return;
		}

		alpha = Math.max(0, Math.min(alphaMul + alphaAdd, 1));

		var l = bbox.left;
		var r = bbox.right;
		var t = bbox.top;
		var b = bbox.bottom;

		var ax = l * matrix[0] + t * matrix[2] + matrix[4];
		var ay = l * matrix[1] + t * matrix[3] + matrix[5];

		var bx = r * matrix[0] + t * matrix[2] + matrix[4];
		var by = r * matrix[1] + t * matrix[3] + matrix[5];

		var cx = l * matrix[0] + b * matrix[2] + matrix[4];
		var cy = l * matrix[1] + b * matrix[3] + matrix[5];

		var dx = r * matrix[0] + b * matrix[2] + matrix[4];
		var dy = r * matrix[1] + b * matrix[3] + matrix[5];

		// Bounding box is defined by left, top, right, bottom
		var left   = Math.min(Math.min(ax, bx), Math.min(cx, dx));
		var right  = Math.max(Math.max(ax, bx), Math.max(cx, dx));
		var top    = Math.min(Math.min(ay, by), Math.min(cy, dy));
		var bottom = Math.max(Math.max(ay, by), Math.max(cy, dy));

		// Minimum area on which to apply pixel manipulation
		var dim = {
			left:   Math.floor(left),
			top:    Math.floor(top),
			right:  Math.ceil(right),
			bottom: Math.ceil(bottom),
			width:  Math.ceil(right  - Math.floor(left)),
			height: Math.ceil(bottom - Math.floor(top))
		};

		// Boundaries of the canvas on which to apply pixel manipulations
		var bounds = {
			left:   0,
			top:    0,
			right:  localCanvas.width,
			bottom: localCanvas.height,
			width:  localCanvas.width,
			height: localCanvas.height
		};

		if (hasFilter) {
			// Applying filters in reverse order
			for (var f = 0; f < appliedFilters.length; f += 1) {
				var filter = appliedFilters[f];
				switch (filter.type) {
				case 'color matrix':
					filters.colorMatrix(localContext, filter, dim, bounds);
					break;
				case 'drop shadow':
					filters.dropShadow(localContext, filter, dim, bounds);
					break;
				case 'glow':
					filters.glow(localContext, filter, dim, bounds);
					break;
				case 'blur':
					filters.blur(localContext, filter, dim, bounds);
					break;
				case 'bevel':
					filters.bevel(localContext, filter, dim, bounds);
					break;
				case 'gradient glow':
					filters.glow(localContext, filter, dim, bounds);
					break;
				default:
					console.warn('[CanvasRenderer.renderSymbol] Filter', filter.type, 'not supported. (' + id + ')');
				}
			}
		}

		if (hasTint) {
			applyTint(localContext, tint, dim, bounds);
		}

		if (hasBlend) {
			// Blends local canvas with parent canvas
			switch (blendMode) {
			case 2: // 2 = layer
				// Simple draw of local canvas into parent canvas
				globalContext.globalAlpha = alpha;
				globalContext.setTransform(1, 0, 0, 1, 0, 0);
				globalContext.drawImage(localCanvas, 0, 0);
				break;
			case 3: // 3 = multiply
				blendModes.multiply(localContext, globalContext, alpha, dim, bounds);
				break;
			case 4: // 4 = screen
				blendModes.screen(localContext, globalContext, alpha, dim, bounds);
				break;
			case 5: // 5 = lighten
				blendModes.lighten(localContext, globalContext, alpha, dim, bounds);
				break;
			case 6:  // 6 = darken
				blendModes.darken(localContext, globalContext, alpha, dim, bounds);
				break;
			case 7: // 7 = difference
				blendModes.difference(localContext, globalContext, alpha, dim, bounds);
				break;
			case 8: // 8 = add
				blendModes.add(localContext, globalContext, alpha, dim, bounds);
				break;
			case 9: // 9 = subtract
				blendModes.substract(localContext, globalContext, alpha, dim, bounds);
				break;
			case 10: // 10 = invert
				blendModes.invert(localContext, globalContext, alpha, dim, bounds);
				break;
			case 11: // 11 = alpha
				blendModes.alpha(localContext, globalContext, alpha, dim, bounds);
				break;
			case 12: // 12 = erase
				blendModes.erase(localContext, globalContext, alpha, dim, bounds);
				break;
			case 13: // 13 = overlay
				blendModes.overlay(localContext, globalContext, alpha, dim, bounds);
				break;
			case 14: // 14 = hardlight
				blendModes.hardlight(localContext, globalContext, alpha, dim, bounds);
				break;
			default:
				// Should not happen
				console.log('[CanvasRenderer.renderSymbol] Applying invalid blend mode', blendMode);

				// Draw local canvas into parent canvas
				globalContext.globalAlpha = alpha;
				globalContext.setTransform(1, 0, 0, 1, 0, 0);
				globalContext.drawImage(localCanvas, 0, 0);
				break;
			}
		} else {
			// Draw local canvas into parent canvas
			globalContext.globalAlpha = alpha;
			globalContext.setTransform(1, 0, 0, 1, 0, 0);
			globalContext.drawImage(localCanvas, 0, 0);
		}
	}
};
