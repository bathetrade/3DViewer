define(function() {
	const epsilon = 0.0000000001;
	return {
		compare : function(a, b) {
			var signedDist = a - b;
			if (Math.abs(signedDist) < epsilon) {
				return 0;
			}
			else if (signedDist < 0) {
				return -1;
			}
			else return 1;
		}
	};
});