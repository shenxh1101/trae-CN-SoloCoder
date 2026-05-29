varying vec3 vPosition;
varying float vHeightRatio;

uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseOffset;
uniform float uPulseStrength;

void main() {
  vPosition = position;
  vHeightRatio = (position.y + 1.0) / 2.0;
  
  float pulse = sin(uTime * uPulseSpeed + uPulseOffset) * 0.5 + 0.5;
  vec3 pos = position;
  pos.y *= 1.0 + pulse * uPulseStrength * 0.1;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
