require.config({
	paths : {
		"jquery" : "lib/jquery-3.2.1.min"
	}
});

require(["app/viewer3dApp"], function(viewer3dApp) {
	try {
		viewer3dApp.init();
	}
	catch (e) {
		alert("Error initializing app: " + e);
		return;
	}
});