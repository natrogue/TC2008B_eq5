#version 300 es
precision highp float;

in vec4 v_color;
out vec4 outColor;

in vec2 v_texCoord;

uniform sampler2D u_texture;

void main() {
    outColor = v_color; // Use the vertex color directly
    //outColor = texture(u_texture, v_texCoord);

}