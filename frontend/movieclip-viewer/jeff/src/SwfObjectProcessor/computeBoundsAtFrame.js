

function Bounds (left, right, top, bottom) {
	this.left   = left;
	this.right  = right;
	this.top    = top;
	this.bottom = bottom;
}

var transformBound = function (transform, bounds) {
	var a = transform[0];
	var b = transform[1];
	var c = transform[2];
	var d = transform[3];
	var e = transform[4];
	var f = transform[5];

	var x, y;

	// Top Left
	x = a * bounds.left + c * bounds.top + e;
	y = b * bounds.left + d * bounds.top + f;

	var left    = x;
	var top     = y;
	var right   = x;
	var bottom  = y;

	// Top Right
	x = a * bounds.right + c * bounds.top + e;
	y = b * bounds.right + d * bounds.top + f;

	left    = Math.min(x, left);
	top     = Math.min(y, top);
	right   = Math.max(x, right);
	bottom  = Math.max(y, bottom);

	// Bottom Right
	x = a * bounds.right + c * bounds.bottom + e;
	y = b * bounds.right + d * bounds.bottom + f;

	left    = Math.min(x, left);
	top     = Math.min(y, top);
	right   = Math.max(x, right);
	bottom  = Math.max(y, bottom);

	// Bottom Right
	x = a * bounds.left + c * bounds.bottom + e;
	y = b * bounds.left + d * bounds.bottom + f;

	left    = Math.min(x, left);
	top     = Math.min(y, top);
	right   = Math.max(x, right);
	bottom  = Math.max(y, bottom);

	return new Bounds(left, right, top, bottom);
};

function computeInstanceBounds(child, symbols, sprites, frame) {
	var bbox = computeBoundsAtFrame(child.id, symbols, sprites, frame - child.frames[0]);
	if (bbox === null) {
		return null;
	}

	var transform = child.transforms[frame - child.frames[0]];
	var bounds = transformBound(transform, bbox);

	var filters = child.filters && child.filters[frame];
	if (filters) {
		for (var f = 0; f < filters.length; f += 1) {
			var filter = filters[f];
			var radiusX = filter.blurX || 0;
			var radiusY = filter.blurY || 0;
			bounds.left   -= radiusX;
			bounds.top    -= radiusY;
			bounds.right  += radiusX;
			bounds.bottom += radiusY;
		}
	}

	return bounds;
}

function computeMaskGroupBounds(itemId, symbols, sprites, frame, children, maskStart) {

	var left   = Infinity;
	var top    = Infinity;
	var right  = - Infinity;
	var bottom = - Infinity;

	var c = maskStart;
	var maskContext = 1;
	while (maskContext > 0) {
		var child = children[--c];
		if (frame < child.frames[0] || child.frames[1] < frame) {
			continue;
		}

		if (child.maskEnd) {
			maskContext -= 1;
			continue;
		}

		var childBounds;
		if (child.maskStart) {
			maskContext += 1;
			maskGroupData = computeMaskGroupBounds(itemId, symbols, sprites, frame, children, c);
			c = maskGroupData.index;
			childBounds = maskGroupData.bounds;
		} else {
			childBounds = computeInstanceBounds(child, symbols, sprites, frame)
		}

		if (!childBounds) {
			continue;
		}

		left   = Math.min(childBounds.left,   left);
		top    = Math.min(childBounds.top,    top);
		right  = Math.max(childBounds.right,  right);
		bottom = Math.max(childBounds.bottom, bottom);
	}


	var maskChild = children[maskStart];
	var maskBounds = computeInstanceBounds(maskChild, symbols, sprites, frame);
	left   = Math.max(left,   maskBounds.left);
	top    = Math.max(top,    maskBounds.top);
	right  = Math.min(right,  maskBounds.right);
	bottom = Math.min(bottom, maskBounds.bottom);

	if (left >= right || top >= bottom) {
		return null;
	}

	return {
		bounds: new Bounds(left, right, top, bottom),
		index: c + 1
	};

}

function computeBoundsAtFrame(itemId, symbols, sprites, frame) {
	/* jshint maxstatements: 100 */
	var sprite = sprites[itemId];
	if (sprite) {
		return sprite.bounds;
	}

	var symbol = symbols[itemId];
	if (!symbol) {
		return null;
	}

	var frameCount = symbol.frameCount || 1;
	frame = frame % frameCount;

	if (symbol.bounds && symbol.bounds[frame]) {
		return symbol.bounds[frame];
	}

	// frame bounds
	var fLeft   = Infinity;
	var fTop    = Infinity;
	var fRight  = - Infinity;
	var fBottom = - Infinity;

	var children = symbol.children;
	for (var c = children.length - 1; c >= 0; c -= 1) {
		var child = children[c];

		// Verifying that the child exists for given frame
		if (frame < child.frames[0] || child.frames[1] < frame) {
			continue;
		}

		if (child.maskEnd) {
			continue;
		}

		// Verifying that the child exists for given frame
		var bounds;
		if (child.maskStart) {
			// Computing bounding box of masked elements
			maskGroupData = computeMaskGroupBounds(itemId, symbols, sprites, frame, children, c);
			bounds = maskGroupData.bounds;
			c = maskGroupData.index;
		} else {
			bounds = computeInstanceBounds(child, symbols, sprites, frame);
		}

		if (!bounds) {
			continue;
		}

		fLeft   = Math.min(bounds.left,   fLeft);
		fTop    = Math.min(bounds.top,    fTop);
		fRight  = Math.max(bounds.right,  fRight);
		fBottom = Math.max(bounds.bottom, fBottom);
	}

	var frameBounds;
	if (fLeft <= fRight && fTop <= fBottom) {
		frameBounds = new Bounds(fLeft, fRight, fTop, fBottom);
	} else {
		frameBounds = null;
	}

	symbol.bounds[frame] = frameBounds;
	return frameBounds;
}

module.exports = computeBoundsAtFrame;