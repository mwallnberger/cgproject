attribute vec3 a_position;

uniform vec3 a_color;
varying vec3 v_color;
uniform mat4 u_modelView;
uniform mat4 u_projection;

void main()
{
  gl_Position = u_projection * u_modelView * vec4(a_position, 1);
  v_color = a_color;
}
