#version 300 es
in vec4 a_position;
in vec4 a_color;
uniform vec4 u_color;
in vec2 a_texCoord;

uniform mat4 u_matrix;
out vec4 v_color;
out vec2 v_texCoord;

void main() {
    gl_Position = u_matrix * a_position; // Transform position to clip space
    v_color = u_color;                  // Pass color to fragment shader
    v_texCoord = a_texCoord;

}