define(["lib/glmatrix"], function(glmatrix) {
	
	var mat4 = glmatrix.mat4;
	var vec3 = glmatrix.vec3;
	
	var viewMatrix = mat4.create();
	var projMatrix = mat4.create();
	
	var vFov = Math.PI / 4;
	var aspect = null;
	var near = null;
	var far = null;
	var lensChanged = false;
	
	// Initialize camera motion vector
	var t = 5.0;
	var minT = 1.0;
	var maxT = 20.0;
	var cameraPosition = vec3.create();
	var cameraMotionVector = vec3.fromValues(0, 1, 2);
	vec3.normalize(cameraMotionVector, cameraMotionVector);
	
	var cross = function(output, a, b) {
		var ax = a[0], ay = a[1], az = a[2];
		var bx = b[0], by = b[1], bz = b[2];

		output[0] = ay * bz - az * by;
		output[1] = az * bx - ax * bz;
		output[2] = ax * by - ay * bx;
		
		return output;
	};
	
	var buildCameraChangeOfCoordMatrix = function(outputMatrix, cameraPosition, lookAtPoint, up) {
	
		//Build z axis 
		var w = vec3.create();
		w[0] = cameraPosition[0] - lookAtPoint[0];
		w[1] = cameraPosition[1] - lookAtPoint[1];
		w[2] = cameraPosition[2] - lookAtPoint[2];
		vec3.normalize(w, w);
		
		//Build x axis
		var u = vec3.create();
		cross(u, w, up);
		vec3.normalize(u, u); //In case of floating point imprecision. Probably unneccessary.
		
		//Build y axis
		var v = vec3.create();
		cross(v, u, w);
		vec3.normalize(v, v); //Probably unnecessary
		
		var a = -vec3.dot(cameraPosition, u);
		var b = -vec3.dot(cameraPosition, v);
		var c = -vec3.dot(cameraPosition, w);
		
		//Build inverse
		outputMatrix[0]  = u[0], outputMatrix[1]  = v[0], outputMatrix[2]  = w[0], outputMatrix[3]  = 0,
		outputMatrix[4]  = u[1], outputMatrix[5]  = v[1], outputMatrix[6]  = w[1], outputMatrix[7]  = 0,
		outputMatrix[8]  = u[2], outputMatrix[9]  = v[2], outputMatrix[10] = w[2], outputMatrix[11] = 0,
		outputMatrix[12] = a,    outputMatrix[13] = b,    outputMatrix[14] = c,    outputMatrix[15] = 1;
		
		return outputMatrix;
	};
	
	var setCameraPosition = function(t) {
		vec3.scale(cameraPosition, cameraMotionVector, t);
		buildCameraChangeOfCoordMatrix(viewMatrix, cameraPosition, [0,0,0], [0,1,0]);
	};
	
	// Initialize camera position
	setCameraPosition(t);
	
	return {
		
		advance : function(amt) {
			
			// Clamp t to [minT, maxT]
			t = Math.max(t + amt, minT);
			t = Math.min(t, maxT);
			
			setCameraPosition(t);
		},
		
		getViewMatrix : function() {
			return viewMatrix;
		},
		
		getProjectionMatrix : function() {
			
			if (vFov == null || aspect == null || near == null || far == null) {
					throw "Must call setLens() first";
			}
			
			// Recreate matrix if lens has changed
			if (lensChanged) {
				mat4.perspective(projMatrix, vFov, aspect, near, far);
				lensChanged = false;
			}
			
			return projMatrix;
		},
		
		setLens : function(fovy, aspectRatio, nearDist, farDist) {
			vFov = fovy;
			aspect = aspectRatio;
			near = nearDist;
			far = farDist;
			lensChanged = true;
		}
	};
});