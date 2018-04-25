define(["jquery", "jquery-ui"], function($) {
	return function GuiManager(section) {

		var _constantScope = {};
		var _sliderCallback = null;
		var _plotButtonCallback = null;
		var _initialized = false;
		
		//	{
		//		id1 : {
		//				a : 3,
		//				b : 4,
		//			  },
		//		id2 : {
		//				a : 3,
		//				c : 1
		//			  }
		//  }
		var _idToConstants = {};
		
		//	{
		//		a : {
		//				ids : Set("id1", "id2"),
		//				slider : jquerySlider
		//			},
		//      b : ...
		var _symbolMap = {};
		
		var _config = {
			sliderDefaults : {
				min : -10,
				max : 10,
				step : 0.1,
				initial : 1
			},
			defaultSurface : "sin(0.3*a*x)*sin(0.3*b*y)"
		};
		
		var createSlider = function(symbol) {
			var defaults = _config.sliderDefaults;
			var slider = $("<div class='slider'></div>");
			
			slider.slider({
				min : defaults.min,
				max : defaults.max,
				value : defaults.initial,
				step : defaults.step
			});
			
			if (_sliderCallback) {
				slider.on("slide", _sliderCallback);
			}
			
			var sliderEntry = $("<div class='entry sliderEntry'></div>");
			var sliderContainer = $("<div class='sliderContainer'></div>");
			var valueNode = $("<span class='viewer-text viewer-symbol'>" + symbol + " = <span>" + defaults.initial + "</span></span>");
			
			sliderEntry.data("symbol", symbol);
			
			slider.data("symbol", symbol);
			slider.data("valueSpan", valueNode.children("span"));
			
			sliderContainer.append("<br>");
			sliderContainer.append("<span class='viewer-text viewer-slide-left'>" + defaults.min + "</span>");
			sliderContainer.append(slider);
			sliderContainer.append("<span class='viewer-text viewer-slide-right'>" + defaults.max + "</span>");
			sliderContainer.append("<br>");
			
			sliderEntry.append(valueNode);
			sliderEntry.append(sliderContainer);
			section.append(sliderEntry);
			
			return slider;
		};
		
		this.updateSliders = function(symbols, id) {
			
			if (symbols == null) {
				throw "Symbols argument cannot be nulL. Pass empty set to clear sliders.";
			}
			if (id == null) {
				throw "Id argument cannot be null";
			}
			
			// Initialize id-to-constants map if id key doesn't exist
			if (!_idToConstants.hasOwnProperty(id)) {
				_idToConstants[id] = {};
			}
			
			var constants = _idToConstants[id];
			
			// Update maps with new entries
			symbols.forEach(function(symbol) {
				
				// If the constant hasn't been added to this id before, 
				// add it and initialize it
				if (!constants.hasOwnProperty(symbol)) {
					constants[symbol] = _config.sliderDefaults.initial;
				}
				
				// Add entry (and slider) if it didn't exist before
				if (!_symbolMap.hasOwnProperty(symbol)) {
					_symbolMap[symbol] = {};
					_symbolMap[symbol].ids = new Set();
					_symbolMap[symbol].slider = createSlider(symbol);
				}
				
				// Associate id with symbol
				_symbolMap[symbol].ids.add(id);
			});
			
			// Sort new sliders, if any
			var sliderEntries = section.children(".sliderEntry");
			sliderEntries.detach().sort(function(entry1, entry2) {
				var e1Symbol = $.data(entry1, "symbol");
				var e2Symbol = $.data(entry2, "symbol");
				if (e1Symbol < e2Symbol) {
					return -1;
				}
				else if (e1Symbol > e2Symbol) {
					return 1;
				}
				else {
					return 0;
				}
			});
			section.append(sliderEntries);
			
			var constantSymbols = Object.keys(constants);
			
			// Remove any symbols that are no longer used
			for (var i = 0; i < constantSymbols.length; ++i) {
				var symbol = constantSymbols[i];
				if (!symbols.has(symbol)) {
					delete constants[symbol];
					_symbolMap[symbol].ids.delete(id);
					
					// Delete the slider and entry when id ref count is 0
					if (_symbolMap[symbol].ids.size == 0) {
						_symbolMap[symbol].slider.parents(".sliderEntry").remove();
						delete _symbolMap[symbol];
					}
				}
			}
			
		};
		
		// callback(symbol, newValue, ids)
		// Symbol is a string representing the constant symbol, e.g., "a"
		// newValue is the value of the slider after it's been slid
		// ids is a set of ids corresponding to the slider
		this.sliderChanged = function(callback) {
			_sliderCallback = function(event, ui) {
				var symbol = $.data(event.target, "symbol");
				var valueSpan = $.data(event.target, "valueSpan");
				_symbolMap[symbol].ids.forEach(function(id) {
					_idToConstants[id][symbol] = ui.value;
				});
				valueSpan.text(ui.value);
				callback(symbol, ui.value, _symbolMap[symbol].ids);
			};
			var sliders = section.find(".slider");
			sliders.off("slide");
			sliders.on("slide", _sliderCallback);
		};
		
		// callback(value, id)
		// value is a string that contains the text of the input field
		// id is the id of the associated input field
		this.plotButtonClicked = function(callback) {
			_plotButtonCallback = function(event) {
				var button = event.target;
				var input = $.data(button, "input");
				callback(input[0].value, input.attr("id"));
			};
			var buttons = section.children("button");
			buttons.off("click");
			buttons.on("click", _plotButtonCallback);
		};
		
		this.initialize = function() {
			if (_initialized) {
				return;
			}
			
			var button = $("<button>Plot</button>");
			if (_plotButtonCallback) {
				button.on("click", _plotButtonCallback);
			}
			
			var inputEntry = $("<div class='entry'></div>");
			var input = $("<input type='text' value='" + _config.defaultSurface + "' autofocus></input>");
			input.uniqueId();
			input.on("keypress", function(event) {
				if (event.which == 13) {
					button.trigger("click");
				}
			});
			
			button.data("input", input);
			
			inputEntry.append("f(x,y) = ");
			inputEntry.append(input);
			inputEntry.append(button);
			inputEntry.append("<br>");
			
			section.append(inputEntry);
			
			button.click();
			
			_initialized = true;
		};
		
		this.getConstantScope = function(id) {
			return _idToConstants[id];
		};
	};
});
