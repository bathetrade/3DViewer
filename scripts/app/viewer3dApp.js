define(["jquery", "app/Surface", "app/camera", "app/shaderManager", "lib/glmatrix", "lib/webgl-utils", "util/Timer"], function($, Surface, camera, shaderManager, glmatrix, glutils, Timer) {
	
	var mat4 = glmatrix.mat4;
	var surface = null;
	var gl = null;
	var lastTime = 0;
	var surfaceActive = false;
	var program = null;
	var initialized = false;
	var running = false;
	var worldMatrix = mat4.create();
	mat4.identity(worldMatrix);
	
	var initHandlers = function() {
		// Generate surface
		$("#plotButton").click(initSurface);
		
		// Disable selection (prevents undesirable highlighting while the user is dragging the mouse with the left mouse button depressed)
		$(document).on("selectstart", function() {
			return false;
		});
	};
	
	var testObject = {
		test : function() {
			var f = math.parse($("#functionInput")[0].value);
			
			var vertices = [];
			var color = [];
			var indices = [];
			var tempOutput;

			var minValue = Infinity;
			var maxValue = -Infinity;

			var xMin = -5;
			var xMax = 5;
			var zMin = -5;
			var zMax = 5;
			var xStep = 0.25;
			var zStep = 0.25;
			
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
		}
	};
	
	var createSurfaceTest = function() {
		
		var dMs = 0;
		var lastTime = Date.now();
		var curTime = lastTime;
		
		var f = math.parse($("#functionInput")[0].value);
		
		var vertices = [];
		var color = [];
		var indices = [];
		var tempOutput;

		var minValue = Infinity;
		var maxValue = -Infinity;

		var xMin = -5;
		var xMax = 5;
		var zMin = -5;
		var zMax = 5;
		var xStep = 0.25;
		var zStep = 0.25;
		
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
		
		dMs = Date.now() - lastTime;
		$("#dbg6").text("Test surface creation took " + dMs + " ms");
	};
	
	var createSurfaceTest2 = function() {
		var dMs = 0;
		var lastTime = Date.now();
		var curTime = lastTime;
		
		testObject.test();
		
		dMs = Date.now() - lastTime;
		$("#dbg7").text("Test surface creation (#2) took " + dMs + " ms");
	};
	
	var initSurface = function() {
		
		var timer = new Timer();
		timer.start();
		
		$("#dbg1").text("Before initial surface check");
		if (!surface) {
			surface = new Surface(gl);
		}
		
		$("#dbg2").text("After initial surface check. " + timer.getDeltaMs() + " ms");
		timer.restart();
		
		//TODO: allow user to config xy settings
		surface.create({
			xConfig : {
				min : -10,
				max : 10,
				step : 0.5
			},
			yConfig : {
				min : -10,
				max : 10,
				step : 0.5
			}
		}, $("#functionInput")[0].value);
		
		$("#dbg3").text("Time to create surface: " + timer.getDeltaMs() + " ms");
		
		surfaceActive = true;
	};
	
	var initGl = function() {
		try {
			var canvas = $("#glCanvas")[0];
            gl = canvas.getContext("experimental-webgl");
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
        } 
		catch (e) {
        }
		
        if (!gl) {
            throw "Could not initialise WebGL, sorry :-(";
        }
	};
	
	var initGlState = function() {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
	};
	
	var initShaders = function() {
		program = shaderManager.createShaderProgram(gl);
		gl.useProgram(program);
	};
	
	var initCamera = function() {
		
		camera.setLens(Math.PI / 4, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
		
		// Send project / world matrices to shader, since they don't change (only the view matrix changes)
		gl.uniformMatrix4fv(program.projectionMatrix, false, camera.getProjectionMatrix());
		gl.uniformMatrix4fv(program.worldMatrix, false, worldMatrix);
	}
	
	// Animation / drawing functions
	var tick = function() {
		requestAnimFrame(tick);
        drawScene();
        animate();
	};
	
	var animate = function() {
		var timeNow = new Date().getTime();
        if (lastTime != 0) {
            var elapsed = timeNow - lastTime;
        }
        lastTime = timeNow;
	};
	
	//TODO: make this much more efficient (don't need to set projection matrix or world matrix every time)
	var setUniforms = function() {
		gl.uniformMatrix4fv(program.viewMatrix, false, camera.getViewMatrix());
	};
	
	var clearBackbufferAndSetViewport = function() {
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	};
	
	var drawScene = function() {
		clearBackbufferAndSetViewport();
		if (surfaceActive) {
			setUniforms();
			surface.draw(program);
		}
	};
	
	// Note: all functions registered with $(function() { }) will execute in the order they were registered.
	// $(function() { }) is equivalent to $(document).ready(function() { })
	return {
		init : function() {
			if (initialized) {
				return;
			}
			$(function() {
				initHandlers();
				initGl();
				initGlState();
				initShaders();
				initCamera();
				tick();
			});
			initialized = true;
		}
	};
});