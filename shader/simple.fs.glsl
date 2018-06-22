precision mediump float;


varying vec3 v_color;
uniform float u_alpha;
uniform vec4 fColor;


void main()
{
  gl_FragColor = vec4(v_color, u_alpha);
}
