varying vec3 vPosition;
varying float vHeightRatio;

uniform vec3 uBottomColor;
uniform vec3 uTopColor;
uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseOffset;
uniform float uPulseStrength;
uniform float uOpacity;

void main() {
  vec3 color = mix(uBottomColor, uTopColor, vHeightRatio);
  
  float pulse = sin(uTime * uPulseSpeed + uPulseOffset) * 0.5 + 0.5;
  float brightness = 0.6 + pulse * uPulseStrength * 0.4;
  color *= brightness;
  
  float dist = length(vPosition.xz);
  float alpha = (1.0 - dist) * uOpacity;
  alpha *= 0.7 + vHeightRatio * 0.3;
  
  gl_FragColor = vec4(color, alpha);
}
