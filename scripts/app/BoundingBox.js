define(function() {
	
	return function BoundingBox(point1, point2) {
		
		var _minX, _minY, _minZ;
		var _maxX, _maxY, _maxZ;
		
		var _bounds = [ [0,0,0], [0,0,0] ];
		var _center = [0,0,0];
		var _centerCached = false;
		
		var verifyArguments = function(point1, point2) {
			if (point1.length != 3 || point2.length != 3) {
				throw "Arguments were not 3D vectors";
			}
		};
		
		this.add = function(boundingBox) {
			var bb = boundingBox;
			
			_minX = Math.min(_minX, bb.getMinX());
			_minY = Math.min(_minY, bb.getMinY());
			_minZ = Math.min(_minZ, bb.getMinZ());
			
			_maxX = Math.max(_maxX, bb.getMaxX());
			_maxY = Math.max(_maxY, bb.getMaxY());
			_maxZ = Math.max(_maxZ, bb.getMaxZ());
			
			_centerCached = false;
		};
		
		this.contains = function(boundingBox) {
			var bb = boundingBox;
			return bb.getMinX() >= _minX && bb.getMinY() >= _minY && bb.getMinZ() >= _minZ && bb.getMaxX() <= _maxX && bb.getMaxY() <= _maxY && bb.getMaxZ() <= _maxZ;
		};
		
		this.getXLength = function() {
			return _maxX - _minX;
		};
		
		this.getYLength = function() {
			return _maxY - _minY;
		};
		
		this.getZLength = function() {
			return _maxZ - _minZ;
		};
		
		this.getMinX = function() {
			return _minX;
		};
		
		this.getMinY = function() {
			return _minY;
		};
		
		this.getMinZ = function() {
			return _minZ;
		};
		
		this.getMaxX = function() {
			return _maxX;
		};
		
		this.getMaxY = function() {
			return _maxY;
		};
		
		this.getMaxZ = function() {
			return _maxZ;
		};
		
		this.getCenter = function() {
			
			if (_centerCached) {
				return _center;
			}
			
			var xCenter = _minX + (_maxX - _minX) * 0.5;
			var yCenter = _minY + (_maxY - _minY) * 0.5;
			var zCenter = _minZ + (_maxZ - _minZ) * 0.5;
			
			_center[0] = xCenter;
			_center[1] = yCenter;
			_center[2] = zCenter;
			
			_centerCached = true;
			
			return _center;
		};
		
		this.getBounds = function() {
			_bounds[0][0] = _minX;
			_bounds[0][1] = _minY;
			_bounds[0][2] = _minZ;
			_bounds[1][0] = _maxX;
			_bounds[1][1] = _maxY;
			_bounds[1][2] = _maxZ;
			return _bounds;
		};
		
		this.set = function(point1, point2) {
			
			verifyArguments(point1, point2);
			
			_minX = Math.min(point1[0], point2[0]);
			_minY = Math.min(point1[1], point2[1]);
			_minZ = Math.min(point1[2], point2[2]);
			
			_maxX = Math.max(point1[0], point2[0]);
			_maxY = Math.max(point1[1], point2[1]);
			_maxZ = Math.max(point1[2], point2[2]);
			
			_centerCached = false;
		};
		
		// Invariant
		verifyArguments(point1, point2);
		
		// Initialize
		this.set(point1, point2);
	};
});