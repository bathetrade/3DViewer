define(function() {
	var basicVertexShader = [
		"attribute vec3 vertexPosition;",
		"attribute vec4 vertexColor;",
		
		"uniform mat4 worldMatrix;",
		"uniform mat4 viewMatrix;",
		"uniform mat4 projectionMatrix;",
		
		"varying vec4 color;",

		"void main(void) {",
			"gl_Position = projectionMatrix * viewMatrix * worldMatrix * vec4(vertexPosition, 1.0);",
			"color = vertexColor;",
		"}"
	].join('\n');
	
	var basicPixelShader = [
		"precision mediump float;",

		"varying vec4 color;",

		"void main(void) {",
			"gl_FragColor = color;",
		"}",
	].join('\n');
	
	var vShader = null;
	var pShader = null;
	var shaderProgram = null;
	var initialized = false;
	
	var compileShader = function(gl, shaderType, shaderSource) {
		var shader = gl.createShader(shaderType);
		gl.shaderSource(shader, shaderSource);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			throw gl.getShaderInfoLog(shader);
		}
		return shader;
	};
		
	return {
		
		createShaderProgram : function(glContext) {
			if (initialized) {
				return shaderProgram;
			}
			if (!glContext) {
				throw "Invalid glContext";
			}
			
			var gl = glContext;
			
			// Create shaders
			vShader = compileShader(gl, gl.VERTEX_SHADER, basicVertexShader);
			pShader = compileShader(gl, gl.FRAGMENT_SHADER, basicPixelShader);
			
			// Create shader program
			shaderProgram = gl.createProgram();
			gl.attachShader(shaderProgram, vShader);
			gl.attachShader(shaderProgram, pShader);
			gl.linkProgram(shaderProgram);
			if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
				shaderProgram = null;
				throw "Could not initialize shader program";
			}
			
			//Initialize vertex attributes and uniforms
			shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertexPosition");
			gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

			shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "vertexColor");
			gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

			shaderProgram.worldMatrix = gl.getUniformLocation(shaderProgram, "worldMatrix");
			shaderProgram.viewMatrix = gl.getUniformLocation(shaderProgram, "viewMatrix");
			shaderProgram.projectionMatrix = gl.getUniformLocation(shaderProgram, "projectionMatrix");
			
			initialized = true;
			
			return shaderProgram;
		}
		
	};
	
});