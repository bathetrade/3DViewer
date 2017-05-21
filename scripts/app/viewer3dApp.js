define(["jquery", "app/Surface", "app/Scene", "app/MouseInput", "lib/math", "lib/webgl-utils", "util/Timer"], function($, Surface, Scene, MouseInput, math, glutils, Timer) {
	
	var surface = null;
	var gl = null;
	var scene = null;
	var program = null;
	var mouseInput = null;
	
	var lastTime = 0;
	var mouseSensitivityScale = 0.01;
	var mouseZoomSensitivityScale = 0.01;
	
	var initialized = false;
	var running = false;
	
	var initHandlers = function() {
		// Generate surface
		$("#plotButton").click(addSurface);

		// Press button when 'enter' key is pressed
		$("#functionInput").on("keydown", function(event) {
			if (event.which == 13) {
				$("#plotButton").trigger("click");
			}
		});
		// Disable selection (prevents undesirable highlighting while the user is dragging the mouse with the left mouse button depressed)
		$(document).on("selectstart", function() {
			return false;
		});
	};
	
	var addSurface = function() {
		
		var timer = new Timer();
		timer.start();
		
		$("#dbg1").text("Before initial surface check");
		if (!surface) {
			surface = new Surface(gl);
		}
		
		$("#dbg2").text("After initial surface check. " + timer.getDeltaMs() + " ms");
		timer.restart();
		
		//TODO: allow user to config xy settings
		//TODO: change to xz
		surface.create({
			xConfig : {
				min : -5,
				max : 5,
				resolution : 50
			},
			yConfig : {
				min : -5,
				max : 5,
				resolution : 50
			}
		}, $("#functionInput")[0].value);
		
		//TODO: add real ID
		if (!scene.hasEntity("functionInput")) {
			scene.addEntity(surface, "functionInput");
		}
		scene.refresh();
		
		$("#dbg3").text("Time to create surface: " + timer.getDeltaMs() + " ms");
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
	
	var initScene = function() {
		scene = new Scene(gl);
	};
	
	var initGlState = function() {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.enable(gl.DEPTH_TEST);
	};
	
	// Animation / drawing functions
	var tick = function() {
		requestAnimFrame(tick);
        scene.draw();
	};
	
	var initInput = function() {
		mouseInput = new MouseInput();
		mouseInput.init($("#glCanvas")[0]);
		mouseInput.registerMouseDragListener(function(data) {
			var dx = data.dx;
			var dy = data.dy;
			var theta = math.sqrt(dx * dx + dy * dy) * mouseSensitivityScale;
			
			$("#dbg9").text("dx,dy = (" + dx + "," + dy + ")");
			
			// Example of why this works: imagine the user dragging the mouse along the line t(1,1).
			// Then, the surface will rotate along the orthogonal axis described by t(-1,1).
			// The axis of rotation always lies in the xy plane.
			scene.rotate(-theta, [-dy, dx, 0]);
		});
		
		mouseInput.registerMouseScrollListener(function(data) {
			scene.zoom(data.dy * mouseZoomSensitivityScale);
		});
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
				initScene();
				initGlState();
				initInput();
				tick();
			});
			initialized = true;
		}
	};
});