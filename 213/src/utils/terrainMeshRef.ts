import type { Mesh } from 'three'

let _terrainMeshRef: Mesh | null = null

export function setTerrainMesh(mesh: Mesh | null) {
  _terrainMeshRef = mesh
}

export function getTerrainMesh(): Mesh | null {
  return _terrainMeshRef
}
