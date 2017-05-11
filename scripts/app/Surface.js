define(["lib/math", "util/Timer"], function(math, Timer) {
	
	var ctor = function(glContext) {

		// Private state
		var gl = glContext;
		var functionVertexBuffer = null;
		var functionIndexBuffer = null;
		var functionColorBuffer = null;

		if (!glContext) {
			throw "glContext is not valid";
		}
		
		var initializeBuffers = function() {
			if (!functionVertexBuffer) {
				functionVertexBuffer = gl.createBuffer();
			}
			if (!functionIndexBuffer) {
				functionIndexBuffer = gl.createBuffer();
			}
			if (!functionColorBuffer) {
				functionColorBuffer = gl.createBuffer();
			}
		};

		// gridConfig = {
		//	xConfig : {
		//		min : <float>,
		//		max : <float>,
		//		step : <float>
		//	},
		//	yConfig : {
		//		min : <float>,
		//		max : <float>,
		//		step : <float>
		//	}
		// };

		this.create = function(gridConfig, xyExpression) {

			var timer = new Timer();
			timer.start();
			
			initializeBuffers();

			var f = math.parse(xyExpression);

			var vertices = [];
			var color = [];
			var indices = [];
			var tempOutput;
			var gf = gridConfig;

			var minValue = Infinity;
			var maxValue = -Infinity;

			var zMin = gf.yConfig.min;
			var zMax = gf.yConfig.max;
			var zStep = gf.yConfig.step;
			var xMin = gf.xConfig.min;
			var xMax = gf.xConfig.max;
			var xStep = gf.xConfig.step;
			
			// Build vertices for each point in grid
			for (var z = zMin; z <= zMax; z += zStep) {
				for (var x = xMin; x <= xMax; x += xStep) {
					tempOutput = f.eval({x : x, y : z});
					if (isNaN(tempOutput)) {
						throw "Invalid x or y range. Please enter a different range.";
					}
					
					// Store min / max values for height coloring
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
				color.push(r, g, b, 1.0);
			}
			
			//Build indices
			/* If the vertices are arranged in a grid as such:
				0 1 2 
				3 4 5 
				6 7 8 ...
				Then this generates the list for the triangle strip:
				[0, 3, 1, 4, 2, 5, 5, 3, 3, 6, 4, 7, 5, 8 ... ]
			*/
			var numRows = (zMax - zMin) / zStep + 1;
			var numCols = (xMax - xMin) / xStep + 1;
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
			
			//Send vertices to GPU
			gl.bindBuffer(gl.ARRAY_BUFFER, functionVertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
			functionVertexBuffer.itemSize = 3;
			functionVertexBuffer.numItems = vertices.length / functionVertexBuffer.itemSize;
		
			//Send indices to GPU
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, functionIndexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
			functionIndexBuffer.itemSize = 1;
			functionIndexBuffer.numItems = indices.length;
		
			//Send color data to GPU
			gl.bindBuffer(gl.ARRAY_BUFFER, functionColorBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
			functionColorBuffer.itemSize = 4;
			functionColorBuffer.numItems = color.length / functionColorBuffer.itemSize;
			
			$("#dbg5").text("Everything after the vertices took " + timer.getDeltaMs() + " ms");
		};
		
		//TODO: improve shader <==> renderable object design. Perhaps a shader factory
		this.draw = function(shaderProgram) {
			
			// Assumes transforms have been set
			gl.bindBuffer(gl.ARRAY_BUFFER, functionVertexBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, functionVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, functionColorBuffer);
			gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, functionColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
			
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, functionIndexBuffer);
			
			gl.drawElements(gl.TRIANGLE_STRIP, functionIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
			
		};
	};
	return ctor;
});