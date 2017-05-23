define(["app/BoundingBox", "app/floatingPointHelper", "lib/glmatrix", "lib/math", "util/Timer"], function(BoundingBox, floatUtil, glmatrix, math, Timer) {
	
	return function Surface(glContext) {

		// Private state
		var _gl = glContext;
		var _functionVertexBuffer = null;
		var _functionIndexBuffer = null;
		var _functionWireframeIndexBuffer = null;
		var _functionColorBuffer = null;
		var _boundingBox = null;
		
		if (!glContext) {
			throw "glContext is not valid";
		}
		
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

		// gridConfig = {
		//	xConfig : {
		//		min : <float>,
		//		max : <float>,
		//		resolution : <float>
		//	},
		//	yConfig : {
		//		min : <float>,
		//		max : <float>,
		//		resolution : <float>
		//	}
		// };
		// Resolution is how many times the distance between min and max is subdivided.
		// For instance, there will be (resolution + 1) points between on the interval [min,max].
		// The step size will be (max - min) / resolution
		this.create = function(gridConfig, xyExpression) {

			var timer = new Timer();
			timer.start();
			
			initializeBuffers();

			var node = math.parse(xyExpression);
			var f = node.compile();

			var vertices = [];
			var color = [];
			var indices = [];
			var wireframeIndices = [];
			var tempOutput;
			var gf = gridConfig;

			var minValue = Infinity;
			var maxValue = -Infinity;

			var zMin = gf.yConfig.min;
			var zMax = gf.yConfig.max;
			var zRes = gf.yConfig.resolution;
			var xMin = gf.xConfig.min;
			var xMax = gf.xConfig.max;
			var xRes = gf.xConfig.resolution;
			var xStep = (xMax - xMin) / xRes;
			var zStep = (zMax - zMin) / zRes;
			
			// Build vertices for each point in grid
			for (var z = zMin; floatUtil.compare(z, zMax) <= 0; z += zStep) {
				for (var x = xMin; floatUtil.compare(x, xMax) <= 0; x += xStep) {
					tempOutput = f.eval({x : x, y : z});
					if (isNaN(tempOutput)) {
						throw "Invalid x or y range. Please enter a different range.";
					}
					
					// Store min / max values for height coloring and bounding box
					if (tempOutput < minValue) {
						minValue = tempOutput;
					}
					if (tempOutput > maxValue) {
						maxValue = tempOutput;
					}
					
					// Let 'y' be the 'z' coordinate. People usually think of xy as the ground plane, but
					// OpenGL thinks of xz as the ground plane.
					vertices.push(x, tempOutput, z);
				}
			}
			
			// Bounding box in local coordinate space
			if (!_boundingBox) {
				_boundingBox = new BoundingBox([xMin, minValue, zMin], [xMax, maxValue, zMax]);
			}
			else {
				_boundingBox.set([xMin, minValue, zMin], [xMax, maxValue, zMax]);
			}
			
			$("#dbg4").text("Creating position vertices took " + timer.getDeltaMs() + " ms");
			timer.restart();
			
			// Build color (higher points are red, mid points are green, lower points are blue, intermediate points are interpolated)
			var averageValue = (minValue + maxValue) / 2.0;
			var halfDistance = (maxValue - minValue) / 2.0;
			var distanceFromMin = 0.0;
			var distanceFromMax = 0.0;
			var distanceFromAverage = 0.0;
			var minParameter;
			var maxParameter;
			var midParameter;
			var r, g, b;
			var numVertices = vertices.length;
			
			// Edge case for constant surfaces (height does not vary)
			if (halfDistance == 0) {
				for (var valueIndex = 1; valueIndex < numVertices; valueIndex += 3) {
					color.push(0,1,0,1);
				}
			}
			
			// Normal case (height varies)
			else {
				for (var valueIndex = 1; valueIndex < numVertices; valueIndex += 3) {
					r = g = b = 1.0;
					tempOutput = vertices[valueIndex];
					distanceFromMin = tempOutput - minValue;
					distanceFromMax = maxValue - tempOutput;
					distanceFromAverage = Math.abs(averageValue - tempOutput);
					minParameter = Math.max(1 - distanceFromMin / halfDistance, 0);
					maxParameter = Math.max(1 - distanceFromMax / halfDistance, 0);
					midParameter = 1 - distanceFromAverage / halfDistance;
					
					r *= maxParameter;
					g *= midParameter;
					b *= minParameter;
					color.push(r, g, b, 1);
				}
			}
			
			//Build indices
			/* If the vertices are arranged in a grid as such:
				0 1 2 
				3 4 5 
				6 7 8 ...
				Then this generates the list for the triangle strip:
				[0, 3, 1, 4, 2, 5, 5, 3, 3, 6, 4, 7, 5, 8 ... ]
			*/
			var numRows = xRes + 1;
			var numCols = zRes + 1;
			var firstIndexOfLastRow = numCols * (numRows - 1);
			var index = 0;
			var last = 0;
			
			while ( index < firstIndexOfLastRow ) {
				for (var col = 0; col < numCols; ++col, ++index) {
					indices.push(index);
					last = index + numCols;
					indices.push(last);
				}
				
				//Add degenerate triangles
				indices.push(last);
				indices.push(index);
			}
			
			// Build wireframe indices, one quad at a time
			// ul == upper left of quad, br == bottom right, etc.
			var finalColIndex = numCols - 1;
			var ul = 0;
			var ur = 1;
			var bl = ul + numCols;
			var br = bl + 1;
			
			while ( ul < firstIndexOfLastRow ) {
				
				// Left line of quad
				wireframeIndices.push(ul);
				wireframeIndices.push(bl);
				
				for (var col = 0; col < finalColIndex; ++col) {
					
					// Top line of quad
					wireframeIndices.push(ul);
					wireframeIndices.push(ur);
					
					// Right line of quad
					wireframeIndices.push(br);
					wireframeIndices.push(ur);
					
					// Diagonal of quad
					wireframeIndices.push(bl);
					wireframeIndices.push(ur);
					
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
				wireframeIndices.push(ul++);
				wireframeIndices.push(ul);
			}
			
			//Send vertices to GPU
			_gl.bindBuffer(_gl.ARRAY_BUFFER, _functionVertexBuffer);
			_gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(vertices), _gl.STATIC_DRAW);
			_functionVertexBuffer.itemSize = 3;
			_functionVertexBuffer.numItems = vertices.length / _functionVertexBuffer.itemSize;
		
			//Send indices to GPU
			_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _functionIndexBuffer);
			_gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), _gl.STATIC_DRAW);
			_functionIndexBuffer.itemSize = 1;
			_functionIndexBuffer.numItems = indices.length;
		
			//Send wireframe indices to GPU
			_gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, _functionWireframeIndexBuffer);
			_gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wireframeIndices), _gl.STATIC_DRAW);
			_functionWireframeIndexBuffer.itemSize = 1;
			_functionWireframeIndexBuffer.numItems = wireframeIndices.length;
			
			//Send color data to GPU
			_gl.bindBuffer(_gl.ARRAY_BUFFER, _functionColorBuffer);
			_gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array(color), _gl.STATIC_DRAW);
			_functionColorBuffer.itemSize = 4;
			_functionColorBuffer.numItems = color.length / _functionColorBuffer.itemSize;
			
			$("#dbg5").text("Everything after the vertices took " + timer.getDeltaMs() + " ms");
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