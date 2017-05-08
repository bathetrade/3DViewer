function MouseDragInput() {
		
	//Private state
	var initialized = false;
	var mouseDown = false;
	var targetRef = null;
	var mouseListeners = [];
	
	//Private methods
	var addEvent = function(obj, event, func) {
		if (obj.addEventListener) {
			obj.addEventListener(event, func, false);
		}
		else if (obj.attachEvent) {
			obj.attachEvent("on" + event, func);
		}
	};
	
	var handleMouseDown = function() {
		mouseDown = true;
	}
	
	var handleMouseUp = function() {
		mouseDown = false;
	}
	
	var handleMouseMove = function(event) {
		if (!mouseDown) {
			return;
		}
		
		var numListeners = mouseListeners.length;
		for(var i = 0; i < numListeners; ++i) {
			mouseListeners[i]({
				dx : event.movementX,
				dy : event.movementY
			});
		}
	}
	
	this.init = function(target) {
		if (initialized) {
			return;
		}
		
		if (!target) {
			throw "Invalid target";
		}
		
		targetRef = target;
		
		addEvent(target, "mousedown", handleMouseDown);
		addEvent(window, "mouseup", handleMouseUp);
		addEvent(window, "mousemove", handleMouseMove);
		
		initialized = true;
	};
	
	this.registerMouseChangeListener = function(func) {
		if (func) {
			mouseListeners.push(func);
		}
	}
}