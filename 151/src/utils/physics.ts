import { Vector3, Platform } from '@/types/game'

export const GRAVITY = -0.015
export const BALL_RADIUS = 0.5
export const JUMP_POWER_MIN = 0.1
export const JUMP_POWER_MAX = 0.35
export const CHARGE_RATE = 0.015

export const addVectors = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
})

export const multiplyVector = (v: Vector3, scalar: number): Vector3 => ({
  x: v.x * scalar,
  y: v.y * scalar,
  z: v.z * scalar,
})

export const normalizeVector = (v: Vector3): Vector3 => {
  const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
  if (length === 0) return { x: 0, y: 0, z: 0 }
  return {
    x: v.x / length,
    y: v.y / length,
    z: v.z / length,
  }
}

export const checkPlatformCollision = (
  ballPos: Vector3,
  velocity: Vector3,
  platforms: Platform[]
): { collided: boolean; newPosition: Vector3; newVelocity: Vector3; grounded: boolean } => {
  let grounded = false
  let newPos = { ...ballPos }
  let newVel = { ...velocity }

  for (const platform of platforms) {
    const { position, size } = platform

    const minX = position.x - size.x / 2
    const maxX = position.x + size.x / 2
    const minY = position.y - size.y / 2
    const maxY = position.y + size.y / 2
    const minZ = position.z - size.z / 2
    const maxZ = position.z + size.z / 2

    const closestX = Math.max(minX, Math.min(ballPos.x, maxX))
    const closestY = Math.max(minY, Math.min(ballPos.y, maxY))
    const closestZ = Math.max(minZ, Math.min(ballPos.z, maxZ))

    const dx = ballPos.x - closestX
    const dy = ballPos.y - closestY
    const dz = ballPos.z - closestZ

    const distanceSq = dx * dx + dy * dy + dz * dz

    if (distanceSq < BALL_RADIUS * BALL_RADIUS) {
      const distance = Math.sqrt(distanceSq)
      const nx = distance > 0 ? dx / distance : 0
      const ny = distance > 0 ? dy / distance : 1
      const nz = distance > 0 ? dz / distance : 0

      const overlap = BALL_RADIUS - distance
      newPos = {
        x: ballPos.x + nx * overlap,
        y: ballPos.y + ny * overlap,
        z: ballPos.z + nz * overlap,
      }

      if (ny > 0.5 && velocity.y <= 0) {
        grounded = true
        newVel.y = 0
      } else {
        const dot = velocity.x * nx + velocity.y * ny + velocity.z * nz
        if (dot < 0) {
          newVel = {
            x: velocity.x - 2 * dot * nx * 0.3,
            y: velocity.y - 2 * dot * ny * 0.3,
            z: velocity.z - 2 * dot * nz * 0.3,
          }
        }
      }
    }
  }

  return { collided: grounded, newPosition: newPos, newVelocity: newVel, grounded }
}

export const checkSphereCollision = (
  pos1: Vector3,
  pos2: Vector3,
  radius1: number,
  radius2: number
): boolean => {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y
  const dz = pos1.z - pos2.z
  const distanceSq = dx * dx + dy * dy + dz * dz
  return distanceSq < (radius1 + radius2) * (radius1 + radius2)
}

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export const generateRandomWind = (): { direction: Vector3; strength: number } => {
  const angle = Math.random() * Math.PI * 2
  return {
    direction: {
      x: Math.cos(angle),
      y: 0,
      z: Math.sin(angle),
    },
    strength: 0.03 + Math.random() * 0.1,
  }
}
