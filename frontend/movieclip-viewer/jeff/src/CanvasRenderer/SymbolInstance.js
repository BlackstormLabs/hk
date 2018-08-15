var IDENTITY_COLOR = [1, 1, 1, 1, 0, 0, 0, 0];

function SymbolInstance(id, bounds, filters, blendModes) {
	this.id = id;
	this.bounds = bounds;
	this.transforms = [];
	this.colors     = [];

	this.filters    = filters;
	this.blendModes = blendModes;
}
module.exports = SymbolInstance;

SymbolInstance.prototype.constructFrame = function (getCanvas, frame, ratio, fixedSize) {
	var frameBounds = this.bounds[frame];
	if (!frameBounds) {
		return null;
	}

	var x = frameBounds.left;
	var y = frameBounds.top;
	var w = frameBounds.right  - frameBounds.left;
	var h = frameBounds.bottom - frameBounds.top;

	var filters = this.filters && this.filters[frame];
	if (filters) {
		for (var f = 0; f < filters.length; f += 1) {
			var filter = filters[f];
			var radiusX = filter.blurX || 0;
			var radiusY = filter.blurY || 0;
			x -= radiusX;
			y -= radiusY;
			w += 2 * radiusX;
			h += 2 * radiusY;
		}
	}

	var scaleX = ratio;
	var scaleY = ratio;
	if (fixedSize) {
		scaleX *= fixedSize.width  / w;
		scaleY *= fixedSize.height / h;
	}

	var canvas = getCanvas(Math.ceil(scaleX * w), Math.ceil(scaleY * h));
	if (canvas.width === 0 || canvas.height === 0) {
		return null;
	}

	this.transforms[frame] = [scaleX, 0, 0, scaleY, - scaleX * x, - scaleY * y];
	this.colors[frame]     = IDENTITY_COLOR;

	return {
		x: x, y: y,
		w: w, h: h,
		bounds: frameBounds,
		transform: this.transforms[frame],
		canvas: canvas,
		context: canvas.getContext('2d'),
	};
};