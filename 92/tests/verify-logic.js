function generatePositions(count, radius) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * Math.random() - 1)
    const theta = Math.random() * Math.PI * 2
    const r = radius * Math.cbrt(Math.random())
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)
  }
  return positions
}

function generateColors(count) {
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const t = i / count
    const hue = t * 0.7
    const h = hue * 6
    const c = 1
    const x = c * (1 - Math.abs((h % 2) - 1))
    let r1 = 0, g1 = 0, b1 = 0
    if (h < 1) { r1 = c; g1 = x }
    else if (h < 2) { r1 = x; g1 = c }
    else if (h < 3) { g1 = c; b1 = x }
    else if (h < 4) { g1 = x; b1 = c }
    else if (h < 5) { r1 = x; b1 = c }
    else { r1 = c; b1 = x }
    colors[i * 3] = r1
    colors[i * 3 + 1] = g1
    colors[i * 3 + 2] = b1
  }
  return colors
}

function testPositions() {
  const count = 3000
  const radius = 5
  const positions = generatePositions(count, radius)
  if (positions.length !== count * 3) {
    console.error(`❌ Position array length: expected ${count * 3}, got ${positions.length}`)
    return false
  }
  let maxDist = 0
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2]
    const dist = Math.sqrt(x * x + y * y + z * z)
    if (dist > maxDist) maxDist = dist
  }
  if (maxDist > radius * 1.01) {
    console.error(`❌ Max distance ${maxDist.toFixed(2)} exceeds radius ${radius}`)
    return false
  }
  console.log(`✅ Positions: ${count} particles, max dist ${maxDist.toFixed(2)} <= radius ${radius}`)
  return true
}

function testColors() {
  const count = 3000
  const colors = generateColors(count)
  if (colors.length !== count * 3) {
    console.error(`❌ Color array length: expected ${count * 3}, got ${colors.length}`)
    return false
  }
  const r0 = colors[0]
  if (r0 < 0.9) {
    console.error(`❌ First color should be near red (r > 0.9), got r=${r0.toFixed(3)}`)
    return false
  }
  const lastB = colors[(count - 1) * 3 + 2]
  if (lastB < 0.5) {
    console.error(`❌ Last color should have blue (b > 0.5), got b=${lastB.toFixed(3)}`)
    return false
  }
  console.log(`✅ Colors: ${count} particles, first=(${colors[0].toFixed(2)},${colors[1].toFixed(2)},${colors[2].toFixed(2)}), last blue=${lastB.toFixed(2)}`)
  return true
}

function testLineConnections() {
  const particleCount = 3000
  const sphereRadius = 5
  const positions = generatePositions(particleCount, sphereRadius)
  const maxConnections = 2000
  const threshold = sphereRadius * 0.55
  const linePositions = []
  const lineColors = []
  let connectionCount = 0
  const step = Math.max(1, Math.floor(particleCount / 400))
  for (let i = 0; i < particleCount && connectionCount < maxConnections; i += step) {
    for (let j = i + step; j < particleCount && connectionCount < maxConnections; j += step) {
      const xi = positions[i * 3], yi = positions[i * 3 + 1], zi = positions[i * 3 + 2]
      const xj = positions[j * 3], yj = positions[j * 3 + 1], zj = positions[j * 3 + 2]
      const dx = xi - xj, dy = yi - yj, dz = zi - zj
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < threshold) {
        linePositions.push(xi, yi, zi, xj, yj, zj)
        const opacity = 1 - dist / threshold
        lineColors.push(0.3 * opacity, 0.6 * opacity, 1.0 * opacity, 0.3 * opacity, 0.6 * opacity, 1.0 * opacity)
        connectionCount++
      }
    }
  }
  const posVertexCount = linePositions.length / 3
  const colorVertexCount = lineColors.length / 3
  if (posVertexCount !== colorVertexCount) {
    console.error(`❌ Line data mismatch: position vertices=${posVertexCount}, color vertices=${colorVertexCount}`)
    return false
  }
  console.log(`✅ Line connections: ${connectionCount} connections, ${posVertexCount} vertices, data consistent`)
  return true
}

function testLinePerformance() {
  const start = Date.now()
  const count = 10000
  const radius = 5
  const positions = generatePositions(count, radius)
  const maxConnections = 2000
  const threshold = radius * 0.55
  let connCount = 0
  const step = Math.max(1, Math.floor(count / 400))
  for (let i = 0; i < count && connCount < maxConnections; i += step) {
    for (let j = i + step; j < count && connCount < maxConnections; j += step) {
      const dx = positions[i * 3] - positions[j * 3]
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < threshold) connCount++
    }
  }
  const elapsed = Date.now() - start
  if (elapsed > 100) {
    console.error(`❌ Line calculation too slow: ${elapsed}ms for ${count} particles`)
    return false
  }
  console.log(`✅ Line performance: ${elapsed}ms for ${count} particles (${connCount} connections found)`)
  return true
}

console.log('\n🧪 Running particle sphere verification tests...\n')
let allPassed = true
allPassed = testPositions() && allPassed
allPassed = testColors() && allPassed
allPassed = testLineConnections() && allPassed
allPassed = testLinePerformance() && allPassed
if (allPassed) {
  console.log('\n✅ All tests passed!\n')
} else {
  console.log('\n❌ Some tests failed!\n')
  process.exit(1)
}
