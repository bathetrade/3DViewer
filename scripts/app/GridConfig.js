define(function() {
	return function GridConfig(xMin, xMax, xRes, yMin, yMax, yRes) {
		this.xConfig = {
			min : xMin,
			max : xMax,
			resolution : xRes
		};
		this.yConfig = {
			min : yMin,
			max : yMax,
			resolution : yRes
		};
		this.equals = function(gridConfig) {
			if (!gridConfig) {
				return false;
			}
			var x1 = xConfig;
			var y1 = yConfig;
			var x2 = gridConfig.xConfig;
			var y2 = gridConfig.yConfig;
			if (!x2 || !y2) {
				return false;
			}
			return x1.min === x2.min && x1.max === x2.max && x1.resolution === x2.resolution && y1.min === y2.min && y1.max === y2.max && y1.resolution === y2.resolution;
		};
	};
});