define(["app/Surface", "app/Scene", "app/MouseInput", "app/functionUtility", "app/GridConfig", "app/gui/GuiManager", "lib/math", "jquery", "util/Timer", "lib/webgl-utils"], function(Surface, Scene, MouseInput, funcUtil, GridConfig, GuiManager, math, $, Timer) {
	
	var _gl = null;
	var _scene = null;
	var _mouseInput = null;
	var _gui = null;
	
	var _mouseSensitivityScale = 0.01;
	var _mouseZoomSensitivityScale = 0.01;
	
	var _initialized = false;
	
	
	
	var initGui = function() {
		var container = $("#inputContainer");
		
		if (container.length == 0) {
			throw "Could not find element with id 'inputContainer'";
		}
		
		_gui = new GuiManager(container);
		
		
		_gui.plotButtonClicked(function(input, id) {
			addSurface(input, id);
		});
		
		_gui.sliderChanged(function(symbol, value, ids) {
			ids.forEach(function(id) {
				_scene.getEntity(id).update(_gui.getConstantScope(id));
			});
		});
		
		_gui.initialize();
	};
	
	
	var initHandlers = function() {
		// Disable selection (prevents undesirable highlighting while the user is 
		// dragging the mouse with the left mouse button depressed)
		$(document).on("selectstart", function() {
			return false;
		});
		
		// Prevents scrolling the window while using the scroll wheel over the surface
		$("#glCanvas").on("wheel", function(event) {
			event.preventDefault();
		});
	};
	
	var addSurface = function(input, id) {
		
		var exprTree = math.parse(input);
		var compiledFunction = exprTree.compile();
		
		var constants = funcUtil.getConstants(exprTree);
		var constScope = {};
		
		_gui.updateSliders(constants, id);
		
		if (constants.size > 0) {
			constScope = _gui.getConstantScope(id);
		}
		
		var surface = _scene.getEntity(id);
		if (!surface) {
			surface = new Surface(_gl);
			_scene.addEntity(surface, id);
		}
		try {
			surface.create(new GridConfig(-5,5,50, -5, 5, 50), compiledFunction, constScope);
		}
		catch (e) {
			_scene.removeEntity(id);
			alert(e);
		}
		
		_scene.refresh();
	};
	
	var initGl = function() {
		try {
			var canvas = $("#glCanvas")[0];
            _gl = canvas.getContext("experimental-webgl");
            _gl.viewportWidth = canvas.width;
            _gl.viewportHeight = canvas.height;
        } 
		catch (e) {
        }
		
        if (!_gl) {
            throw "Could not initialize WebGL";
        }
	};
	
	var initScene = function() {
		_scene = new Scene(_gl);
	};
	
	var initGlState = function() {
		_gl.clearColor(0.0, 0.0, 0.0, 1.0);
        _gl.enable(_gl.DEPTH_TEST);
	};
	
	var tick = function() {
		requestAnimFrame(tick);
        _scene.draw();
	};
	
	var initInput = function() {
		_mouseInput = new MouseInput();
		_mouseInput.init($("#glCanvas")[0]);
		_mouseInput.registerMouseDragListener(function(data) {
			var dx = data.dx;
			var dy = data.dy;
			var theta = math.sqrt(dx * dx + dy * dy) * _mouseSensitivityScale;
			_scene.rotate(-theta, [-dy, dx, 0]);
		});
		
		_mouseInput.registerMouseScrollListener(function(data) {
			_scene.zoom(data.dy * _mouseZoomSensitivityScale);
		});
	};

	return {
		init : function() {
			if (_initialized) {
				return;
			}
			$(function() {
				initHandlers();
				initGl();
				initScene();
				initGlState();
				initInput();
				initGui();
				tick();
			});
			_initialized = true;
		}
	};
	
});