export default function Lights() {
  return (
    <>
      <directionalLight
        position={[20, 5, 10]}
        intensity={2}
        color={0xffffff}
      />
      <ambientLight intensity={0.15} color={0x404060} />
      <pointLight
        position={[-10, -5, -10]}
        intensity={0.1}
        color={0x4466ff}
      />
    </>
  )
}
