define(["app/camera", "app/shaderManager", "lib/glmatrix"], function(camera, shaderManager, glmatrix) {
	
	return function Scene(glContext) {
		
		var entityInfo = {};
		var entities = [];
		var worldMatrix = glmatrix.mat4.create();
		
		var program = shaderManager.createShaderProgram(glContext);
		glContext.useProgram(program);
		
		//TODO: change near and far after mapping scene to normalized cube
		camera.setLens(Math.PI / 4, glContext.viewportWidth / glContext.viewportHeight, 0.1, 100.0);
		
		var updateUniforms = function() {
			//TODO: optimize later
			glContext.uniformMatrix4fv(program.worldMatrix, false, worldMatrix);
			glContext.uniformMatrix4fv(program.viewMatrix, false, camera.getViewMatrix());
			glContext.uniformMatrix4fv(program.projectionMatrix, false, camera.getProjectionMatrix());
		};
		
		var clearBackbufferAndSetViewport = function() {
			glContext.viewport(0, 0, glContext.viewportWidth, glContext.viewportHeight);
			glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
		};
		
		this.addEntity = function(entity, id) {
			if (entities.hasOwnProperty(id)) {
				throw "id '" + id + "' is already registered with the scene";
			}
			entityInfo[id] = entities.length;
			entities.push(entity);
		};
		
		this.hasEntity = function(id) {
			return entityInfo.hasOwnProperty(id);
		};
		
		this.removeEntity = function(id) {
			var entityIndex = entityInfo[id];
			if (entityIndex) {
				entities.splice(entityIndex, 1);
				delete entityInfo[id];
			}
		};
		
		this.draw = function() {
			clearBackbufferAndSetViewport();
			var numEntities = entities.length;
			if (numEntities > 0) {
				updateUniforms();
			}
			for (var entityIndex = 0; entityIndex < numEntities; ++entityIndex) {
				entities[entityIndex].draw(program);
			}
		};
		
		this.rotate = function(theta, axis) {
			// Force glmatrix to do a left multiplication instead of its default of right.
			// This is to prevent the new rotation from being applied first.
			// (e.g., we want R_new * R_old * vertex, not R_old * R_new * vertex)
			var rotateMatrix = glmatrix.mat4.create();
			glmatrix.mat4.fromRotation(rotateMatrix, theta, axis);
			glmatrix.mat4.multiply(worldMatrix, rotateMatrix, worldMatrix);
			//glmatrix.mat4.rotate(worldMatrix, worldMatrix, theta, axis);
		};
		
		this.zoom = function(amount) {
			camera.advance(amount);
		};
		
	};
	
});