import { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { defaultLevels, cloneLevel } from '@/data/levels'
import { Level, Vector3 } from '@/types/game'
import {
  GRAVITY,
  JUMP_POWER_MIN,
  JUMP_POWER_MAX,
  CHARGE_RATE,
  checkPlatformCollision,
  checkSphereCollision,
  addVectors,
  normalizeVector,
  generateRandomWind,
} from '@/utils/physics'
import { playJumpSound, playStarSound, playTargetSound, playWinSound, playFallSound } from '@/utils/audio'
import Ball from './Ball'
import Platform from './Platform'
import TargetPoint from './TargetPoint'
import StarItem from './StarItem'
import WindIndicator from './WindIndicator'

function GameLogic() {
  const {
    isPlaying,
    isPaused,
    isGrounded,
    isCharging,
    chargePower,
    jumpDirection,
    soundEnabled,
    currentLevel,
    customLevels,
    ballPosition,
    ballVelocity,
    setBallPosition,
    setBallVelocity,
    setIsGrounded,
    setIsCharging,
    setChargePower,
    setJumpDirection,
    incrementJumpCount,
    updateTime,
    gameOver,
    levelComplete,
    resetLevel,
  } = useStore()

  const [levelData, setLevelData] = useState<Level | null>(null)
  const [currentWind, setCurrentWind] = useState<{ direction: Vector3; strength: number } | null>(null)
  const [chargeStartTime, setChargeStartTime] = useState<number | null>(null)
  const { camera, gl } = useThree()

  useEffect(() => {
    const allLevels = [...defaultLevels, ...customLevels]
    if (currentLevel >= 0 && currentLevel < allLevels.length) {
      const level = cloneLevel(allLevels[currentLevel])
      setLevelData(level)
      if (level.wind.enabled) {
        setCurrentWind({
          direction: { ...level.wind.direction },
          strength: level.wind.strength,
        })
      } else {
        setCurrentWind(null)
      }
    }
  }, [currentLevel, customLevels])

  useEffect(() => {
    if (!isPlaying || isPaused) return

    const windInterval = setInterval(() => {
      if (levelData?.wind.enabled) {
        const newWind = generateRandomWind()
        setCurrentWind(newWind)
      }
    }, 5000)

    return () => clearInterval(windInterval)
  }, [isPlaying, isPaused, levelData?.wind.enabled])

  const handleJump = useCallback(() => {
    if (!isPlaying || isPaused || !isGrounded || isCharging) return

    setIsCharging(true)
    setChargeStartTime(Date.now())
    setChargePower(0)
  }, [isPlaying, isPaused, isGrounded, isCharging, setIsCharging, setChargePower])

  const releaseJump = useCallback(() => {
    if (!isCharging || !isGrounded) return

    const power = JUMP_POWER_MIN + chargePower * (JUMP_POWER_MAX - JUMP_POWER_MIN)
    const normalizedDir = normalizeVector(jumpDirection)
    const jumpVel: Vector3 = {
      x: normalizedDir.x * power * 1.5,
      y: power * 2.5,
      z: normalizedDir.z * power * 1.5,
    }

    setBallVelocity(jumpVel)
    setIsGrounded(false)
    setIsCharging(false)
    setChargePower(0)
    setChargeStartTime(null)
    incrementJumpCount()
    playJumpSound(soundEnabled, chargePower)
  }, [isCharging, isGrounded, chargePower, jumpDirection, setBallVelocity, setIsGrounded, setIsCharging, setChargePower, incrementJumpCount, soundEnabled])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        handleJump()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        releaseJump()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleJump, releaseJump])

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      handleJump()
    }

    const handleMouseUp = () => {
      releaseJump()
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      if (isGrounded) {
        const dir: Vector3 = normalizeVector({
          x: x,
          y: 0,
          z: y,
        })
        setJumpDirection(dir)
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
      })
      handleMouseDown(mouseEvent)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      handleMouseUp()
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
      })
      handleMouseMove(mouseEvent)
    }

    const canvas = gl.domElement
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseUp)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseUp)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
      canvas.removeEventListener('touchmove', handleTouchMove)
    }
  }, [gl, handleJump, releaseJump, isGrounded, setJumpDirection])

  useFrame((state, delta) => {
    if (!levelData) return

    if (isCharging && chargeStartTime) {
      const elapsed = (Date.now() - chargeStartTime) / 1000
      const newPower = Math.min(1, elapsed * CHARGE_RATE * 10)
      setChargePower(newPower)
    }

    if (isPlaying && !isPaused) {
      updateTime(delta)

      let newVel = { ...ballVelocity }
      newVel.y += GRAVITY

      if (currentWind) {
        newVel.x += currentWind.direction.x * currentWind.strength
        newVel.z += currentWind.direction.z * currentWind.strength
      }

      newVel.x *= 0.995
      newVel.z *= 0.995

      let newPos = addVectors(ballPosition, newVel)

      const collision = checkPlatformCollision(newPos, newVel, levelData.platforms)
      newPos = collision.newPosition
      newVel = collision.newVelocity

      if (collision.grounded && !isGrounded) {
        setIsGrounded(true)
      } else if (!collision.grounded && isGrounded) {
        setIsGrounded(false)
      }

      if (newPos.y < -20) {
        playFallSound(soundEnabled)
        gameOver()
        return
      }

      let updated = false
      const newTargets = [...levelData.targets]
      for (let i = 0; i < newTargets.length; i++) {
        if (!newTargets[i].reached) {
          if (checkSphereCollision(newPos, newTargets[i].position, 0.5, 0.5)) {
            const isFirstUnreached = newTargets.slice(0, i).every((t) => t.reached)
            if (isFirstUnreached) {
              newTargets[i] = { ...newTargets[i], reached: true }
              playTargetSound(soundEnabled)
              updated = true

              if (newTargets.every((t) => t.reached)) {
                playWinSound(soundEnabled)
                setTimeout(() => levelComplete(), 500)
                return
              }
            }
          }
        }
      }

      const newStars = [...levelData.stars]
      for (let i = 0; i < newStars.length; i++) {
        if (!newStars[i].collected) {
          if (checkSphereCollision(newPos, newStars[i].position, 0.5, 0.4)) {
            newStars[i] = { ...newStars[i], collected: true }
            playStarSound(soundEnabled)
            updated = true
          }
        }
      }

      if (updated) {
        setLevelData({ ...levelData, targets: newTargets, stars: newStars })
      }

      setBallPosition(newPos)
      setBallVelocity(newVel)
    }

    const targetCamPos = new THREE.Vector3(
      ballPosition.x - jumpDirection.x * 8,
      ballPosition.y + 6,
      ballPosition.z - jumpDirection.z * 8
    )
    camera.position.lerp(targetCamPos, 0.05)
    camera.lookAt(ballPosition.x, ballPosition.y + 1, ballPosition.z)
  })

  if (!levelData) return null

  const nextTargetIndex = levelData.targets.findIndex((t) => !t.reached)

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#00d4ff" />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0a0a1a" transparent opacity={0.3} />
      </mesh>

      {levelData.platforms.map((platform, index) => (
        <Platform key={`platform-${index}`} platform={platform} index={index} />
      ))}

      {levelData.targets.map((target, index) => (
        <TargetPoint
          key={`target-${target.id}`}
          target={target}
          index={index}
          isNext={index === nextTargetIndex}
        />
      ))}

      {levelData.stars.map((star, index) => (
        <StarItem key={`star-${star.id}`} star={star} index={index} />
      ))}

      {currentWind && (
        <WindIndicator wind={{ enabled: true, direction: currentWind.direction, strength: currentWind.strength }} />
      )}

      <Ball
        position={ballPosition}
        isCharging={isCharging}
        chargePower={chargePower}
        jumpDirection={jumpDirection}
      />
    </>
  )
}

export default function GameScene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 12], fov: 60 }}
      gl={{ antialias: true }}
      className="game-canvas"
    >
      <fog attach="fog" args={['#0a0a1a', 30, 80]} />
      <color attach="background" args={['#0a0a1a']} />
      <GameLogic />
    </Canvas>
  )
}
