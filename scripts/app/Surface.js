define(["app/BoundingBox", "app/floatingPointHelper", "lib/glmatrix", "lib/math", "util/Timer"], function(BoundingBox, floatUtil, glmatrix, math, Timer) {
	
	return function Surface(glContext) {

		// Private state
		var _gl = glContext;
		var _functionVertexBuffer = null;
		var _functionIndexBuffer = null;
		var _functionWireframeIndexBuffer = null;
		var _functionColorBuffer = null;
		var _boundingBox = null;
		var _func = null;
		var _gridConfig = null;
		var _scope = null;
		
		var _minValue = Infinity;
		var _maxValue = -Infinity;
		
		var _vertices = [];
		var _color = [];
		var _indices = [];
		var _wireframeIndices = [];
		
		if (!glContext) {
			throw "glContext is not valid";
		}
		
		// Merges constScope properties into varScope
		var mergeScopes = function(varScope, constScope) {
			var symbols = Object.keys(constScope);
			for (var i = 0; i < symbols.length; ++i) {
				var symbol = symbols[i];
				varScope[symbol] = constScope[symbol];
			}
		};
		
		var initializeBuffers = function() {
			if (!_functionVertexBuffer) {
				_functionVertexBuffer = _gl.createBuffer();
			}
			if (!_functionIndexBuffer) {
				_functionIndexBuffer = _gl.createBuffer();
			}
			if (!_functionWireframeIndexBuffer) {
				_functionWireframeIndexBuffer = _gl.createBuffer();
			}
			if (!_functionColorBuffer) {
				_functionColorBuffer = _gl.createBuffer();
			}
		};

		var createVertices = function(constScope) {
			
			_vertices.length = 0;
			
			var zMin = _gridConfig.yConfig.min;
			var zMax = _gridConfig.yConfig.max;
			var zRes = _gridConfig.yConfig.resolution;
			var xMin = _gridConfig.xConfig.min;
			var xMax = _gridConfig.xConfig.max;
			var xRes = _gridConfig.xConfig.resolution;
			var xStep = (xMax - xMin) / xRes;
			var zStep = (zMax - zMin) / zRes;
			
			var scope = {
				x : NaN,
				y : NaN
			};
			mergeScopes(scope, constScope);
			
			// Build vertices for each point in grid
			for (var z = zMin; floatUtil.compare(z, zMax) <= 0; z += zStep) {
				for (var x = xMin; floatUtil.compare(x, xMax) <= 0; x += xStep) {
					
					scope.x = x;
					scope.y = z;
					
					tempOutput = _func.eval(scope);
					
					if (isNaN(tempOutput)) {
						throw "Invalid x or y range. Please enter a different range.";
					}
					
					// Store min / max values for height coloring and bounding box
					if (tempOutput < _minValue) {
						_minValue = tempOutput;
					}
					
					if (tempOutput > _maxValue) {
						_maxValue = tempOutput;
					}
					
					// Let 'y' be the 'z' coordinate. People usually think of xy as the ground plane, but
					// OpenGL thinks of xz as the ground plane.
					_vertices.push(x, tempOutput, z);
				}
			}
		};
		
		var createColorBuffer = function() {
			
			_color.length = 0;
			
			var averageValue = (_minValue + _maxValue) / 2.0;
			var halfDistance = (_maxValue - _minValue) / 2.0;
			var distanceFromMin = 0.0;
			var distanceFromMax = 0.0;
			var distanceFromAverage = 0.0;
			var minParameter;
			var maxParameter;
			var midParameter;
			var r, g, b;
			var numVertices = _vertices.length;
			
			// Edge case for constant surfaces (height does not vary)
			if (halfDistance == 0) {
				for (var valueIndex = 1; valueIndex < numVertices; valueIndex += 3) {
					_color.push(0,1,0,1);
				}
			}
			
			// Normal case (height varies)
			else {
				for (var valueIndex = 1; valueIndex < numVertices; valueIndex += 3) {
					r = g = b = 1.0;
					tempOutput = _vertices[valueIndex];
					
					distanceFromMin = tempOutput - _minValue;
					distanceFromMax = _maxValue - tempOutput;
					distanceFromAverage = Math.abs(averageValue - tempOutput);
					
					minParameter = Math.max(1 - distanceFromMin / halfDistance, 0);
					maxParameter = Math.max(1 - distanceFromMax / halfDistance, 0);
					midParameter = 1 - distanceFromAverage / halfDistance;
					
					r *= maxParameter;
					g *= midParameter;
					b *= minParameter;
					
					_color.push(r, g, b, 1);
				}
			}
		};
		
		var createTrianglestripIndices = function(numRows, numCols) {
			
		_indices.length = 0;
			
		/* If the vertices are arranged in a grid as such:
			0 1 2 
			3 4 5 
			6 7 8 ...
			Then this generates the list for the triangle strip:
			[0, 3, 1, 4, 2, 5, 5, 3, 3, 6, 4, 7, 5, 8 ... ]
		*/
			var firstIndexOfLastRow = numCols * (numRows - 1);
			var index = 0;
			var last = 0;
			
			while ( index < firstIndexOfLastRow ) {
				for (var col = 0; col < numCols; ++col, ++index) {
					_indices.push(index);
					last = index + numCols;
					_indices.push(last);
				}
				
				//Add degenerate triangles
				_indices.push(last);
				_indices.push(index);
			}
		};
		
		var createWireframeIndices = function(numRows, numCols) {

			_wireframeIndices.length = 0;
			
			// Build wireframe indices, one quad at a time
			// ul == upper left of quad, br == bottom right, etc.
			var finalColIndex = numCols - 1;
			var firstIndexOfLastRow = numCols * (numRows - 1);
			var ul = 0;
			var ur = 1;
			var bl = ul + numCols;
			var br = bl + 1;
			
			while ( ul < firstIndexOfLastRow ) {
				
				// Left line of quad
				_wireframeIndices.push(ul);
				_wireframeIndices.push(bl);
				
				for (var col = 0; col < finalColIndex; ++col) {
					
					// Top line of quad
					_wireframeIndices.push(ul);
					_wireframeIndices.push(ur);
					
					// Right line of quad
					_wireframeIndices.push(br);
					_wireframeIndices.push(ur);
					
					// Diagonal of quad
					_wireframeIndices.push(bl);
					_wireframeIndices.push(ur);
					
					// Advance quad
					++ul;
					++ur;
					++bl;
					++br;
				}
				
				// Reached final quad on the given row.
				// Advance again to place the quad on the next row.
				++ul;
				++ur;
				++bl;
				++br;
			}
			
			// Finish the final row
			for (var col = 0; col < finalColIndex; ++col) {
				_wireframeIndices.push(ul++);
				_wireframeIndices.push(ul);
			}
		};
		
		var verticesToGpu = function() {
			_gl.bindBuffer(_gl.ARRAY_BUFFER, _functionVertexBuffer);
			_gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(_vertices), _gl.STATIC_DRAW);
			_functionVertexBuffer.itemSize = 3;
			_functionVertexBuffer.numItems = _vertices.length / _functionVertexBuffer.itemSize;
		};
		
		var indicesToGpu = function() {
			_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _functionIndexBuffer);
			_gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_indices), _gl.STATIC_DRAW);
			_functionIndexBuffer.itemSize = 1;
			_functionIndexBuffer.numItems = _indices.length;
		};
		
		var wireframeIndicesToGpu = function() {
			_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _functionWireframeIndexBuffer);
			_gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(_wireframeIndices), _gl.STATIC_DRAW);
			_functionWireframeIndexBuffer.itemSize = 1;
			_functionWireframeIndexBuffer.numItems = _wireframeIndices.length;
		};
		
		var colorToGpu = function() {
			_gl.bindBuffer(_gl.ARRAY_BUFFER, _functionColorBuffer);
			_gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(_color), _gl.STATIC_DRAW);
			_functionColorBuffer.itemSize = 4;
			_functionColorBuffer.numItems = _color.length / _functionColorBuffer.itemSize;
		};
		
		this.create = function(gridConfig, compiledFunction, constantScope) {

			initializeBuffers();

			_func = compiledFunction;
			_gridConfig = gridConfig;
			var xConfig = _gridConfig.xConfig;
			var yConfig = _gridConfig.yConfig;
			
			_minValue = Infinity;
			_maxValue = -Infinity;
			
			// Create geometry
			var numCols = xConfig.resolution + 1;
			var numRows = yConfig.resolution + 1;
			createVertices(constantScope);
			createColorBuffer();
			createTrianglestripIndices(numRows, numCols);
			createWireframeIndices(numRows, numCols);
			
			// Bounding box in local coordinate space
			if (!_boundingBox) {
				_boundingBox = new BoundingBox();
			}
			_boundingBox.set([xConfig.min, _minValue, yConfig.min], [xConfig.max, _maxValue, yConfig.max]);
			
			verticesToGpu();
			indicesToGpu();
			wireframeIndicesToGpu();
			colorToGpu();
		};
		
		// Scope:
		// {
		//    a : 3,
		//    b : 8
		// },
		// where a and b are constant symbols in the f(x,y) that was passed to create().
		// Any name and number of constant symbols can be in the object, not just a and b.
		this.update = function(constantScope) {

			var xConfig = _gridConfig.xConfig;
			var yConfig = _gridConfig.yConfig;
			
			_minValue = Infinity;
			_maxValue = -Infinity;
			
			// Recreate geometry
			createVertices(constantScope);
			createColorBuffer();
			
			// Bounding box in local coordinate space
			if (!_boundingBox) {
				_boundingBox = new BoundingBox();
			}
			_boundingBox.set([xConfig.min, _minValue, yConfig.min], [xConfig.max, _maxValue, yConfig.max]);
			
			verticesToGpu();
			colorToGpu();
		};
		
		this.draw = function(shaderProgram) {
			
			_gl.bindBuffer(_gl.ARRAY_BUFFER, _functionVertexBuffer);
			_gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, _functionVertexBuffer.itemSize, _gl.FLOAT, false, 0, 0);
			
			_gl.bindBuffer(_gl.ARRAY_BUFFER, _functionColorBuffer);
			_gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, _functionColorBuffer.itemSize, _gl.FLOAT, false, 0, 0);
			
			_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _functionWireframeIndexBuffer);
			
			_gl.drawElements(_gl.LINES, _functionWireframeIndexBuffer.numItems, _gl.UNSIGNED_SHORT, 0);
			
		};
		
		// Returns bounding box of surface in local coordinate space
		this.getBoundingBox = function() {
			return _boundingBox;
		};
	};
	
});
