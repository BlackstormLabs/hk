var CanvasRenderer = require('./main');
var SymbolInstance = require('./SymbolInstance');

CanvasRenderer.prototype._getMaxDimensions = function (sprites) {
	var spritesMaxDims = {};
	var classRatios    = this._options.classRatios || {};
	var hasFixedSize   = this._options.fixedSize !== undefined;

	var className;
	var classGroupList = this._extractor._classGroupList;

	// Updating class ratios with respect to the fixed size dimension
	if (hasFixedSize) {

		var classRatiosTmp = {};
		var fixedWidth     = this._options.fixedSize.width;
		var fixedHeight    = this._options.fixedSize.height;
		var symbols        = this._extractor._symbols;

		for (className in classGroupList) {
			var classId = classGroupList[className];
			var symbol  = symbols[classId];

			// TODO: use whole animation bounds, not just first frame
			var bounds = symbol.bounds;
			if (bounds) {
				var widthRatio  = fixedWidth  / (bounds.right  - bounds.left);
				var heightRatio = fixedHeight / (bounds.bottom - bounds.top);
				classRatiosTmp[className] = (classRatios[className] ? classRatios[className] : 1) * Math.min(widthRatio, heightRatio);
			} else {
				classRatiosTmp[className] = (classRatios[className] ? classRatios[className] : 1);
			}

		}
		classRatios = classRatiosTmp;
	}

	var maxDimForClass, classRatio;
	for (var id in sprites) {
		var sprite = sprites[id];
		var maxWidth  = 0;
		var maxHeight = 0;
		var maxDims = sprite.maxDims;
		for (className in classGroupList) {
			maxDimForClass = maxDims[className];
			if (maxDimForClass) {
				classRatio = classRatios[className] || 1;
				maxWidth  = Math.max(maxWidth,  classRatio * maxDimForClass.width);
				maxHeight = Math.max(maxHeight, classRatio * maxDimForClass.height);
			}
		}

		spritesMaxDims[id] = { width: maxWidth, height: maxHeight };
	}

	return spritesMaxDims;
};

CanvasRenderer.prototype._setSpriteDimensions = function (sprites, spritesMaxDims) {

	var spriteDims = {};
	for (var id in sprites) {
		var sprite = sprites[id];

		// Computing element dimension before scaling to ratio
		var bounds = sprite.bounds;

		var x, y, w, h;
		var rendersImage = true;
		if (sprite.isImage) {
			var image = this._images[id];
			x = 0;
			y = 0;
			w = image.width;
			h = image.height;
		} else {
			x = bounds.left;
			y = bounds.top;
			w = bounds.right  - bounds.left;
			h = bounds.bottom - bounds.top;

			// Determining if the sprite consists exclusively in images
			if (sprite.isShape) {
				var shapes = sprite.shapes;
				var s = 0;
				while (rendersImage && s < shapes.length) {
					var fills = shapes[s].fills;
					var f = 1;
					while (rendersImage && f < fills.length) {
						if (fills[f].length >= 1) {
							var fillStyle = fills[f][0].fillStyle;
							rendersImage = fillStyle && (fillStyle.type === 'pattern');
						}
						f += 1;
					}
					s += 1;
				}
			} else {
				// TODO: if an element is not renderable it should not be in the list of symbols to export
				if (this._options.verbosity >= 3) {
					console.warn('[CanvasRenderer._setSpriteDimensions] sprite ' + sprite.id + ' is empty');
				}
			}
		}

		// Computing sprite ratio for rendering
		var spriteRatio = this._extractor._fileGroupRatio;

		// Reducing the size of the element if it is bigger than the maximum allowed dimension
		var spriteMaxDim = spritesMaxDims[id];
		var maxWidth  = rendersImage ? w : spriteMaxDim.width;
		var maxHeight = rendersImage ? h : spriteMaxDim.height;

		var spriteWidth;
		var spriteHeight;
		if (maxWidth === 0 || maxHeight === 0) {
			spriteRatio  = 0;
			spriteWidth  = 1;
			spriteHeight = 1;
		} else {
			var widthRatio   = w / maxWidth;
			var heightRatio  = h / maxHeight;

			if (widthRatio > heightRatio) {
				spriteRatio /= widthRatio;
			} else {
				spriteRatio /= heightRatio;
			}

			spriteWidth  = Math.ceil(w * spriteRatio);
			spriteHeight = Math.ceil(h * spriteRatio);

			var ratioToMaxDim = Math.sqrt((this._options.maxImageDim * this._options.maxImageDim) / (spriteWidth * spriteHeight));
			if (ratioToMaxDim < 1) {
				spriteWidth  *= ratioToMaxDim;
				spriteHeight *= ratioToMaxDim;
				spriteRatio  *= ratioToMaxDim;
			}
		}

		// Saving element position and dimension in the atlas
		spriteDims[id] = {
			x:  x,
			y:  y,
			w:  w,
			h:  h,
			sx: 0,
			sy: 0,
			sw: spriteWidth,
			sh: spriteHeight,
			dx: x * spriteRatio,
			dy: y * spriteRatio,
			ratio:  spriteRatio
		};
	}

	return spriteDims;
};

CanvasRenderer.prototype._getSpritesToRender = function () {
	var sprites = this._extractor._sprites;
	var images = this._images;
	var spritesToRender = {};
	for (var spriteId in sprites) {
		var sprite = sprites[spriteId];
		if (sprite.isImage) {
			var image = images[spriteId];
			if (!image) {
				console.warn('[CanvasRenderer.getSpritesToRender] sprite image not rendered', spriteId);
				continue;
			}
		}
		spritesToRender[spriteId] = sprite;
	}
	return spritesToRender;
};

CanvasRenderer.prototype._renderSprites = function (sprites, spriteDims, imageMap) {
	for (var id in sprites) {
		var sprite     = sprites[id];
		var dimensions = spriteDims[id];
		if (sprite.isShape) {
			if (sprite.images && sprite.images.length === 1) {
				// Determining if only a single full image is being rendered
				var onlyRendersFullImage = true; // until proven false

				var fillImageId = sprite.images[0].id;
				var shapes = sprite.shapes;
				for (var s = 0; s < shapes.length; s += 1) {
					var fills = shapes[s].fills;
					var lines = shapes[s].lines;

					for (var f = 1; f < fills.length; f += 1) {
						var fill = fills[f] && fills[f][0];
						var fillStyle = fill && fill.fillStyle;
						if (fillStyle) {
							if (fillStyle.type !== 'pattern') {
								onlyRendersFullImage = false;
								break;
							}

							var fillRecords = fill.records;
							if (fillRecords.length !== 4) {
								onlyRendersFullImage = false;
								break;
							}

							var matrix = fillStyle.matrix;
							if (matrix.skewX !== 0 || matrix.skewY !== 0) {
								onlyRendersFullImage = false;
								break;
							}

							var imageData = fillStyle.image;
							var imageWidth  = imageData.width;
							var imageHeight = imageData.height;

							var record0 = fillRecords[0];
							var record2 = fillRecords[2];

							var dx0 = record0.x1 - matrix.moveX;
							var dy0 = record0.y1 - matrix.moveY;
							var dx1 = record0.x2 - (matrix.moveX + matrix.scaleX * imageWidth);
							var dy1 = record0.y2 - matrix.moveY;
							var dx2 = record2.x1 - (matrix.moveX + matrix.scaleX * imageWidth);
							var dy2 = record2.y1 - (matrix.moveY + matrix.scaleY * imageHeight);
							var dx3 = record2.x2 - matrix.moveX;
							var dy3 = record2.y2 - (matrix.moveY + matrix.scaleY * imageHeight);

							var error = 0.1;
							if (
								Math.abs(dx0) > error ||
								Math.abs(dy0) > error ||
								Math.abs(dx1) > error ||
								Math.abs(dy1) > error ||
								Math.abs(dx2) > error ||
								Math.abs(dy2) > error ||
								Math.abs(dx3) > error ||
								Math.abs(dy3) > error
							) {
								onlyRendersFullImage = false;
								break;
							}
						}
					}

					for (var l = 1; l < lines.length; l += 1) {
						if(lines[l].length !== 0 && lines[l][0].lineStyle) {
							onlyRendersFullImage = false;
							break;
						}
					}

					if (!onlyRendersFullImage) {
						break;
					}
				}

				if (onlyRendersFullImage) {
					// no need to render, pointing to existing image
					imageMap[id] = this._images[fillImageId];
					continue;
				}
			}

			var canvas  = this._getCanvas(dimensions.sw, dimensions.sh);
			var context = canvas.getContext('2d');

			var transform = [dimensions.ratio, 0, 0, dimensions.ratio, - dimensions.dx, - dimensions.dy];
			this._drawShapes(sprite.shapes, canvas, context, transform);

			if (sprite.isImage) {
				var image = this._images[id];
				if (!image) {
					continue;
				}

				context.drawImage(image, - dimensions.dx, - dimensions.dy, dimensions.sw, dimensions.sh);
			}

			imageMap[id] = canvas;
			continue;
		}

		if (sprite.isImage) {
			var image = this._images[id];
			if (!image) {
				continue;
			}

			imageMap[id] = image;
		}

	}
};

var IDENTITY_TRANSFORM = [1, 0, 0, 1, 0, 0];
var IDENTITY_COLOR     = [1, 1, 1, 1, 0, 0, 0, 0];

CanvasRenderer.prototype._renderFrames = function (imageMap, spriteProperties) {

	var fixedSize = this._options.fixedSize;
	var ratio     = this._extractor._fileGroupRatio;

	for (var className in this._extractor._classGroupList) {

		var classId = this._extractor._classGroupList[className];
		var symbol  = this._extractor._symbols[classId];

		var bounds = symbol.containerBounds || symbol.bounds;
		if (!bounds) {
			continue;
		}

		var frameCount = symbol.frameCount;
		var instance = new SymbolInstance(classId, bounds);

		var f, frames = [];
		if (this._options.renderFrames instanceof Array) {
			var framesToRender  = this._options.renderFrames;
			var nFramesToRender = framesToRender.length;
			for (f = 0; f < nFramesToRender; f += 1) {
				frames.push(framesToRender[f] - 1);
			}
		} else {
			for (f = 0; f < frameCount; f += 1) {
				frames.push(f);
			}
		}

		var nFrames = frames.length;
		for (f = 0; f < nFrames; f += 1) {
			var frame = frames[f];

			var frameCanvas = instance.constructFrame(this._getCanvas, frame, ratio, fixedSize);
			if (!frameCanvas) {
				continue;
			}

			var canvas = frameCanvas.canvas;
			var context = frameCanvas.context;
			this._renderSymbol(canvas, context, IDENTITY_TRANSFORM, IDENTITY_COLOR, instance, frame, false);

			var frameId = this._options.onlyOneFrame ? symbol.className : symbol.frameNames[frame];
			imageMap[frameId] = canvas;
			spriteProperties[frameId] = {
				x: frameCanvas.x,
				y: frameCanvas.y,
				w: frameCanvas.w,
				h: frameCanvas.h,
				sx: 0, sy: 0,
				sw: canvas.width,
				sh: canvas.height,
				frameId: frameId
			};
		}
	}
};

CanvasRenderer.prototype._renderImages = function () {
	var imageMap = {};
	var spriteProperties = {};
	if (this._options.renderFrames) {
		this._renderFrames(imageMap, spriteProperties);
	} else {
		// 1 - Generating list of sprites to render
		var sprites = this._getSpritesToRender();

		// 2 - Computing minimum rendering size that will guarantee lossless quality for each sprite
		var spritesMaxDims = this._getMaxDimensions(sprites);

		// 3 - Computing sprite dimensions with respect to their maximum dimensions and required ratios
		spriteProperties = this._setSpriteDimensions(sprites, spritesMaxDims);

		// 4 - Rendering sprites and storing in imageMap
		this._renderSprites(sprites, spriteProperties, imageMap);
	}

	// End of the rendering
	// All swf objects should have been correctly rendered at this point
	this._rendering = false;
	if (this._callback) {
		this._callback(imageMap, spriteProperties);
	}
};
