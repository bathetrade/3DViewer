define(function() {
	return {
		getConstants : function(mathFunc) {
			var constants = new Set();
			mathFunc.traverse(function(node) {
				if (node.isSymbolNode && node.name != "x" && node.name != "y") {
					constants.add(node.name);
				}
			});
			return constants;
		}
	};
});