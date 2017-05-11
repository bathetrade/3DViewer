define(function() {
	return function Timer() {
		
		// State
		var curTime;
		var lastTime;
		var deltaMs = 0;
		
		// Private methods
		var resetState = function() {
			curTime = Date.now();
			lastTime = curTime;
		};
		
		// Public methods
		this.start = function() {
			resetState();
		};
		
		this.getDeltaMs = function() {
			return Date.now() - lastTime;
		};
		
		this.restart = function() {
			resetState();
		};
	};
});