import * as THREE from 'three'
import { ParticleShape } from '@/types'

export const PARTICLE_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  attribute float aOpacity;
  
  uniform float uTime;
  uniform float uPointSize;
  uniform float uMotionMode;
  uniform float uGlobalOpacity;
  
  varying vec3 vColor;
  varying float vOpacity;
  
  void main() {
    vColor = aColor;
    vOpacity = aOpacity * uGlobalOpacity;
    
    vec3 pos = position;
    
    if (uMotionMode > 0.5 && uMotionMode < 1.5) {
      pos.x += sin(uTime * 0.5 + aPhase) * 0.3;
      pos.y += cos(uTime * 0.7 + aPhase * 1.3) * 0.25;
      pos.z += sin(uTime * 0.3 + aPhase * 0.7) * 0.15;
    } else if (uMotionMode > 1.5) {
      float angle = uTime * 2.0 + aPhase * 0.1;
      float dist = length(pos.xz);
      float origAngle = atan(pos.z, pos.x);
      pos.x = dist * cos(angle + origAngle);
      pos.z = dist * sin(angle + origAngle);
      pos.y += sin(uTime * 3.0 + aPhase) * 0.2;
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uPointSize * aSize * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

export const PARTICLE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vOpacity;
  
  uniform float uShape;
  
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    
    if (uShape < 0.5) {
      float dist = length(center);
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.15, dist) * vOpacity;
      gl_FragColor = vec4(vColor * 1.2, alpha);
    } else if (uShape < 1.5) {
      vec2 absC = abs(center);
      if (absC.x > 0.45 || absC.y > 0.45) discard;
      float edge = max(absC.x, absC.y);
      float alpha = smoothstep(0.45, 0.3, edge) * vOpacity;
      gl_FragColor = vec4(vColor * 1.1, alpha);
    } else {
      float angle = atan(center.y, center.x);
      float dist = length(center);
      float star = cos(angle * 5.0) * 0.18 + 0.32;
      if (dist > star) discard;
      float alpha = smoothstep(star, star * 0.4, dist) * vOpacity;
      gl_FragColor = vec4(vColor * 1.3, alpha);
    }
  }
`

export function shapeToUniform(shape: ParticleShape): number {
  switch (shape) {
    case 'circle': return 0
    case 'square': return 1
    case 'star': return 2
  }
}

export function motionToUniform(mode: string): number {
  switch (mode) {
    case 'static': return 0
    case 'float': return 1
    case 'rotate': return 2
    default: return 0
  }
}

export function createGradientColors(
  count: number,
  minX: number,
  maxX: number,
  colorStart: string,
  colorEnd: string
): Float32Array {
  const colors = new Float32Array(count * 3)
  const cStart = new THREE.Color(colorStart)
  const cEnd = new THREE.Color(colorEnd)
  const range = maxX - minX || 1

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count - 1, 1)
    const c = cStart.clone().lerp(cEnd, t)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  return colors
}

export function createGradientColorsByPosition(
  positions: Float32Array,
  count: number,
  colorStart: string,
  colorEnd: string
): Float32Array {
  const colors = new Float32Array(count * 3)
  const cStart = new THREE.Color(colorStart)
  const cEnd = new THREE.Color(colorEnd)

  let minX = Infinity, maxX = -Infinity
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
  }
  const range = maxX - minX || 1

  for (let i = 0; i < count; i++) {
    const t = (positions[i * 3] - minX) / range
    const c = cStart.clone().lerp(cEnd, t)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  return colors
}
