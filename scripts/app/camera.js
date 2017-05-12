define(["lib/glmatrix"], function(glmatrix) {
	var mat4 = glmatrix.mat4;
	var vec3 = glmatrix.vec3;
	var dThetaY = 0.0;
	var orbitRadius = 10.0;
	var cameraHeight = 5.0;
	var viewMatrix = mat4.create();
	var projMatrix = null;
	
	var vFov = Math.PI / 4;
	var aspect = null;
	var near = null;
	var far = null;
	var lensChanged = false;
	
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
	
	var orbitYPrivate = function(dTheta) {
		dThetaY = (dThetaY + dTheta) % (2*Math.PI);
		var x = orbitRadius * -Math.sin(dThetaY);
		var z = orbitRadius * Math.cos(dThetaY);
		buildCameraChangeOfCoordMatrix(viewMatrix, [x, cameraHeight, z], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
	};
	
	// Initialize camera
	orbitYPrivate(0);
	
	return {
		reset : function() {
			mat4.identity(viewMatrix);
		},
		
		orbitY : orbitYPrivate,
		
		getViewMatrix : function() {
			return viewMatrix;
		},
		
		getProjectionMatrix : function() {
			
			if (vFov == null || aspect == null || near == null || far == null) {
					throw "Must call setLens() first";
			}
			
			// Recreate matrix if lens has changed
			if (lensChanged) {
				projMatrix = mat4.create();
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