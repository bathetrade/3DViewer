require.config({
	paths : {
		"jquery" : "lib/jquery-ui/external/jquery/jquery",
		"jquery-ui" : "lib/jquery-ui/jquery-ui"
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