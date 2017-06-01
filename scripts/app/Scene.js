define(["app/camera", "app/shaderManager", "app/BoundingBox", "lib/glmatrix"], function(camera, shaderManager, BoundingBox, glmatrix) {
	
	return function Scene(glContext) {
		
		var _entityInfo = {};
		var _entities = [];
		
		var _worldMatrix = glmatrix.mat4.create();
		var _viewboxMappingMatrix = glmatrix.mat4.create();
		var _inverseViewboxMappingMatrix = glmatrix.mat4.create();
		var _rotationMatrixTemp = glmatrix.mat4.create();
		var _program = shaderManager.createShaderProgram(glContext);
		
		var _viewingBox = null;
		var _scalingVector = null;
		var _sceneBoundingBox = null;
		
		glContext.useProgram(_program);
		
		camera.setLens(Math.PI / 4, glContext.viewportWidth / glContext.viewportHeight, 0.1, 50.0);
		
		var updateUniforms = function() {
			glContext.uniformMatrix4fv(_program.worldMatrix, false, _worldMatrix);
			glContext.uniformMatrix4fv(_program.viewMatrix, false, camera.getViewMatrix());
			glContext.uniformMatrix4fv(_program.projectionMatrix, false, camera.getProjectionMatrix());
		};
		
		// The box (whose center is (0,0,0)) to which all surfaces will be mapped
		var getCenteredViewingBox = function() {
			if (!_viewingBox) {
				_viewingBox = new BoundingBox();
				_viewingBox.set([-1.0, -0.5, -1.0], [1.0, 0.5, 1.0]);
			}
			return _viewingBox;
		};
		
		var resetScene = function() {
			glmatrix.mat4.identity(_viewboxMappingMatrix);
			glmatrix.mat4.identity(_inverseViewboxMappingMatrix);
			glmatrix.mat4.identity(_worldMatrix);
		};
		
		var applyNewViewboxMappingMatrix = function() {
			
			// Rebuild bounding box
			setSceneBoundingBox();
			
			// Recalculate scaling vector
			setScalingVector();
			
			var sceneCenter = _sceneBoundingBox.getCenter();
			var viewboxCenter = getCenteredViewingBox().getCenter();
			
			// Vector to translate scene's bounding box to viewbox
			var offsetX = viewboxCenter[0] - sceneCenter[0];
			var offsetY = viewboxCenter[1] - sceneCenter[1];
			var offsetZ = viewboxCenter[2] - sceneCenter[2];
			
			var scaleX = _scalingVector[0];
			var scaleY = _scalingVector[1];
			var scaleZ = _scalingVector[2];
			
			// Compute the product ST, where S is the scaling matrix and T is the 
			// translation matrix.
			
			// Column 1
			_viewboxMappingMatrix[0] = scaleX;
			_viewboxMappingMatrix[1] = 0;
			_viewboxMappingMatrix[2] = 0;
			_viewboxMappingMatrix[3] = 0;
			
			// Column 2
			_viewboxMappingMatrix[4] = 0;
			_viewboxMappingMatrix[5] = scaleY;
			_viewboxMappingMatrix[6] = 0;
			_viewboxMappingMatrix[7] = 0;
			
			// Column 3
			_viewboxMappingMatrix[8] = 0;
			_viewboxMappingMatrix[9] = 0;
			_viewboxMappingMatrix[10] = scaleZ;
			_viewboxMappingMatrix[11] = 0;
			
			// Column 4
			_viewboxMappingMatrix[12] = scaleX * offsetX;
			_viewboxMappingMatrix[13] = scaleY * offsetY;
			_viewboxMappingMatrix[14] = scaleZ * offsetZ;
			_viewboxMappingMatrix[15] = 1;
			
			// Undo the old ST transformation, and apply the new one.
			glmatrix.mat4.multiply(_worldMatrix, _worldMatrix, _inverseViewboxMappingMatrix);
			glmatrix.mat4.multiply(_worldMatrix, _worldMatrix, _viewboxMappingMatrix);
			
			// Compute the inverse of the new ST, to be used next time this method is called.
			
			var iOffsetX = -offsetX;
			var iOffsetY = -offsetY;
			var iOffsetZ = -offsetZ;
			
			// Inverse scale 
			var iScaleX = 1.0 / scaleX;
			var iScaleY = 1.0 / scaleY;
			var iScaleZ = 1.0 / scaleZ;
			
			// Column 1
			_inverseViewboxMappingMatrix[0] = iScaleX;
			_inverseViewboxMappingMatrix[1] = 0;
			_inverseViewboxMappingMatrix[2] = 0;
			_inverseViewboxMappingMatrix[3] = 0;
			
			// Column 2
			_inverseViewboxMappingMatrix[4] = 0;
			_inverseViewboxMappingMatrix[5] = iScaleY;
			_inverseViewboxMappingMatrix[6] = 0;
			_inverseViewboxMappingMatrix[7] = 0;
			
			// Column 3
			_inverseViewboxMappingMatrix[8] = 0;
			_inverseViewboxMappingMatrix[9] = 0;
			_inverseViewboxMappingMatrix[10] = iScaleZ;
			_inverseViewboxMappingMatrix[11] = 0;
			
			// Column 4
			_inverseViewboxMappingMatrix[12] = iOffsetX;
			_inverseViewboxMappingMatrix[13] = iOffsetY;
			_inverseViewboxMappingMatrix[14] = iOffsetZ;
			_inverseViewboxMappingMatrix[15] = 1;
		};
		
		var setSceneBoundingBox = function() {
			if (!_sceneBoundingBox) {
				_sceneBoundingBox = new BoundingBox();
			}
			else {
				_sceneBoundingBox.reset();
			}
			
			var numEntities = _entities.length;
			var entity;
			for (var entityIndex = 0; entityIndex < numEntities; ++entityIndex) {
				entity = _entities[entityIndex];
				_sceneBoundingBox.add(entity.getBoundingBox());
			}
			
		};
		
		var setScalingVector = function() {
			var viewingBox = getCenteredViewingBox();
			
			var xLenVb = viewingBox.getXLength();
			var yLenVb = viewingBox.getYLength();
			var zLenVb = viewingBox.getZLength();
			
			var xLenScene = _sceneBoundingBox.getXLength();
			var yLenScene = _sceneBoundingBox.getYLength();
			var zLenScene = _sceneBoundingBox.getZLength();
			
			if (!_scalingVector) {
				_scalingVector = [0,0,0];
			}
			
			// Set the scale factors used for mapping the scene to the viewbox.
			// For instance, if the scene's bounding box has a length along the x axis
			// of 10, and the viewbox has a width of 2.5, then we want to shrink the
			// scene's bounding box so it fits snugly in the viewbox. Therefore, each
			// vertex in the scene will have its x coordinate scaled by 2.5/10 = 1/4.
			// This happens after the scene's bounding box is translated to the viewbox.
			//
			// If one of the entities is degenerate in some way, for instance, the surface
			// f(x,z) = 3, we don't want to scale the scene's bounding box in that
			// direction of degeneracy (in this case, the height, y). Since, scaling
			// a bounding box amounts to expanding or shrinking this box, if the scene's
			// bounding box is a rectangle with sides x and z, then we don't want to scale
			// the height (in fact, we can't, since the height is 0). In this case,
			// the scale factor is simply one (nothing is done to the vertex in the direction
			// of degeneracy).
			_scalingVector[0] = xLenScene != 0 ? xLenVb / xLenScene : 1;
			_scalingVector[1] = yLenScene != 0 ? yLenVb / yLenScene : 1;
			_scalingVector[2] = zLenScene != 0 ? zLenVb / zLenScene : 1;
		};
		
		var clearBackbufferAndSetViewport = function() {
			glContext.viewport(0, 0, glContext.viewportWidth, glContext.viewportHeight);
			glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);
		};
		
		this.addEntity = function(entity, id) {
			if (_entityInfo.hasOwnProperty(id)) {
				throw "id '" + id + "' is already registered with the scene";
			}
			_entityInfo[id] = _entities.length;
			_entities.push(entity);
		};
		
		this.hasEntity = function(id) {
			return _entityInfo.hasOwnProperty(id);
		};
		
		this.getEntity = function(id) {
			if (this.hasEntity(id)) {
				return _entities[_entityInfo[id]];
			}
			return null;
		};
		
		this.removeEntity = function(id) {
			var entityIndex = _entityInfo[id];
			if (entityIndex != null) {
				
				// Remove entity from list and remove entity ID from _entityInfo
				_entities.splice(entityIndex, 1);
				delete _entityInfo[id];
			}
		};
		
		// Necessary to call if an entity is modified by an external component.
		// Recomputes the ST transformations.
		this.refresh = function() {
			var numEntities = _entities.length;
			if (numEntities == 0) {
				resetScene();
				return;
			}
			applyNewViewboxMappingMatrix();
		};
		
		this.draw = function() {
			clearBackbufferAndSetViewport();
			var numEntities = _entities.length;
			if (numEntities == 0) {
				return;
			}
			updateUniforms();
			for (var entityIndex = 0; entityIndex < numEntities; ++entityIndex) {
				_entities[entityIndex].draw(_program);
			}
		};
		
		// Force glmatrix to do a left multiplication instead of its default of right.
		// This is to prevent the new rotation from being applied first.
		// (e.g., we want R_new * R_old * vertex, not R_old * R_new * vertex)
		this.rotate = function(theta, axis) {
			glmatrix.mat4.fromRotation(_rotationMatrixTemp, theta, axis);
			glmatrix.mat4.multiply(_worldMatrix, _rotationMatrixTemp, _worldMatrix);
		};
		
		this.zoom = function(amount) {
			camera.advance(amount);
		};
		
	};
	
});