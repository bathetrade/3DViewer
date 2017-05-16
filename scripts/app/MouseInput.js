define(function() {
	return function MouseInput() {
		
		//Private state
		var initialized = false;
		var mouseDown = false;
		var targetRef = null;
		var mouseDragListeners = [];
		var mouseScrollListeners = [];
		
		//Private methods
		
		var fireListeners = function(listeners, data) {
			var numListeners = listeners.length;
			for (var i = 0; i < numListeners; ++i) {
				listeners[i](data);
			}
		};
		
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
		};
		
		var handleMouseUp = function() {
			mouseDown = false;
		};
		
		var handleMouseMove = function(mouseEvent) {
			if (!mouseDown) {
				return;
			}
			
			fireListeners(mouseDragListeners, {
				dx : mouseEvent.movementX,
				dy : mouseEvent.movementY
			});
			
		};
		
		var handleMouseScrollWheel = function(wheelEvent) {
			fireListeners(mouseScrollListeners, {
				dy : wheelEvent.deltaY
			});
		};
		
		this.init = function(target) {
			if (initialized) {
				return;
			}
			
			if (!target) {
				throw "Invalid target";
			}
			
			targetRef = target;
			
			addEvent(target, "mousedown", handleMouseDown);
			addEvent(target, "wheel", handleMouseScrollWheel);
			addEvent(window, "mouseup", handleMouseUp);
			addEvent(window, "mousemove", handleMouseMove);
			
			initialized = true;
		};
		
		this.registerMouseDragListener = function(func) {
			mouseDragListeners.push(func);
		};
		
		this.registerMouseScrollListener = function(func) {
			mouseScrollListeners.push(func);
		};
	};
});