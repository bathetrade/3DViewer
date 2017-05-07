function ShaderUtil() {
	
	this.getShader = function(glContext, shaderId) {
        var shaderScript = $('#' + shaderId)[0];
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = glContext.createShader(glContext.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = glContext.createShader(glContext.VERTEX_SHADER);
        } else {
            return null;
        }

        glContext.shaderSource(shader, str);
        glContext.compileShader(shader);

        if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
            alert(glContext.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }
	
}