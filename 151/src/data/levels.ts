import { Level } from '@/types/game'

export const defaultLevels: Level[] = [
  {
    id: 1,
    name: '新手村',
    platforms: [
      { position: { x: 0, y: 0, z: 0 }, size: { x: 4, y: 0.5, z: 4 } },
      { position: { x: 6, y: 0.5, z: 0 }, size: { x: 3, y: 0.5, z: 3 } },
      { position: { x: 12, y: 1, z: 2 }, size: { x: 3, y: 0.5, z: 3 } },
    ],
    targets: [
      { id: 1, position: { x: 6, y: 1.5, z: 0 }, reached: false },
      { id: 2, position: { x: 12, y: 2, z: 2 }, reached: false },
    ],
    stars: [
      { id: 1, position: { x: 3, y: 3, z: 0 }, collected: false },
    ],
    startPosition: { x: 0, y: 2, z: 0 },
    wind: { enabled: false, direction: { x: 0, y: 0, z: 0 }, strength: 0 },
  },
  {
    id: 2,
    name: '空中阶梯',
    platforms: [
      { position: { x: 0, y: 0, z: 0 }, size: { x: 3, y: 0.5, z: 3 } },
      { position: { x: 5, y: 1.5, z: 0 }, size: { x: 2.5, y: 0.5, z: 2.5 } },
      { position: { x: 10, y: 3, z: 0 }, size: { x: 2.5, y: 0.5, z: 2.5 } },
      { position: { x: 10, y: 4.5, z: 5 }, size: { x: 2.5, y: 0.5, z: 2.5 } },
      { position: { x: 5, y: 6, z: 5 }, size: { x: 2.5, y: 0.5, z: 2.5 } },
    ],
    targets: [
      { id: 1, position: { x: 5, y: 2.5, z: 0 }, reached: false },
      { id: 2, position: { x: 10, y: 4, z: 0 }, reached: false },
      { id: 3, position: { x: 10, y: 5.5, z: 5 }, reached: false },
    ],
    stars: [
      { id: 1, position: { x: 7.5, y: 5, z: 0 }, collected: false },
      { id: 2, position: { x: 10, y: 7, z: 2.5 }, collected: false },
    ],
    startPosition: { x: 0, y: 2, z: 0 },
    wind: { enabled: false, direction: { x: 0, y: 0, z: 0 }, strength: 0 },
  },
  {
    id: 3,
    name: '风力挑战',
    platforms: [
      { position: { x: 0, y: 0, z: 0 }, size: { x: 4, y: 0.5, z: 4 } },
      { position: { x: 8, y: 0, z: 0 }, size: { x: 3, y: 0.5, z: 3 } },
      { position: { x: 16, y: 0, z: 0 }, size: { x: 3, y: 0.5, z: 3 } },
      { position: { x: 24, y: 0, z: 0 }, size: { x: 3, y: 0.5, z: 3 } },
    ],
    targets: [
      { id: 1, position: { x: 8, y: 1, z: 0 }, reached: false },
      { id: 2, position: { x: 16, y: 1, z: 0 }, reached: false },
      { id: 3, position: { x: 24, y: 1, z: 0 }, reached: false },
    ],
    stars: [
      { id: 1, position: { x: 4, y: 4, z: 0 }, collected: false },
      { id: 2, position: { x: 12, y: 4, z: 0 }, collected: false },
      { id: 3, position: { x: 20, y: 4, z: 0 }, collected: false },
    ],
    startPosition: { x: 0, y: 2, z: 0 },
    wind: { enabled: true, direction: { x: 0, y: 0, z: 1 }, strength: 0.08 },
  },
  {
    id: 4,
    name: '迷宫平台',
    platforms: [
      { position: { x: 0, y: 0, z: 0 }, size: { x: 3, y: 0.5, z: 3 } },
      { position: { x: 0, y: 0, z: 6 }, size: { x: 3, y: 0.5, z: 3 } },
      { position: { x: 6, y: 1, z: 6 }, size: { x: 3, y: 0.5, z: 3 } },
      { position: { x: 6, y: 1, z: 0 }, size: { x: 3, y: 0.5, z: 3 } },
      { position: { x: 12, y: 2, z: 0 }, size: { x: 3, y: 0.5, z: 3 } },
      { position: { x: 12, y: 2, z: 6 }, size: { x: 3, y: 0.5, z: 3 } },
    ],
    targets: [
      { id: 1, position: { x: 0, y: 1, z: 6 }, reached: false },
      { id: 2, position: { x: 6, y: 2, z: 6 }, reached: false },
      { id: 3, position: { x: 6, y: 2, z: 0 }, reached: false },
      { id: 4, position: { x: 12, y: 3, z: 6 }, reached: false },
    ],
    stars: [
      { id: 1, position: { x: 3, y: 3, z: 3 }, collected: false },
      { id: 2, position: { x: 9, y: 4, z: 3 }, collected: false },
    ],
    startPosition: { x: 0, y: 2, z: 0 },
    wind: { enabled: true, direction: { x: -0.5, y: 0, z: 0.5 }, strength: 0.05 },
  },
  {
    id: 5,
    name: '终极挑战',
    platforms: [
      { position: { x: 0, y: 0, z: 0 }, size: { x: 2.5, y: 0.5, z: 2.5 } },
      { position: { x: 5, y: 1, z: 3 }, size: { x: 2, y: 0.5, z: 2 } },
      { position: { x: 10, y: 2, z: 0 }, size: { x: 2, y: 0.5, z: 2 } },
      { position: { x: 15, y: 3, z: 4 }, size: { x: 2, y: 0.5, z: 2 } },
      { position: { x: 20, y: 4, z: 0 }, size: { x: 2, y: 0.5, z: 2 } },
      { position: { x: 25, y: 5, z: -3 }, size: { x: 2, y: 0.5, z: 2 } },
      { position: { x: 30, y: 6, z: 0 }, size: { x: 3, y: 0.5, z: 3 } },
    ],
    targets: [
      { id: 1, position: { x: 5, y: 2, z: 3 }, reached: false },
      { id: 2, position: { x: 10, y: 3, z: 0 }, reached: false },
      { id: 3, position: { x: 15, y: 4, z: 4 }, reached: false },
      { id: 4, position: { x: 20, y: 5, z: 0 }, reached: false },
      { id: 5, position: { x: 30, y: 7, z: 0 }, reached: false },
    ],
    stars: [
      { id: 1, position: { x: 7.5, y: 4, z: 1.5 }, collected: false },
      { id: 2, position: { x: 17.5, y: 6, z: 2 }, collected: false },
      { id: 3, position: { x: 27.5, y: 8, z: -1.5 }, collected: false },
    ],
    startPosition: { x: 0, y: 2, z: 0 },
    wind: { enabled: true, direction: { x: 0.3, y: 0, z: 0.7 }, strength: 0.1 },
  },
]

export const cloneLevel = (level: Level): Level => {
  return JSON.parse(JSON.stringify(level))
}

export const createEmptyLevel = (): Level => ({
  id: Date.now(),
  name: '自定义关卡',
  platforms: [{ position: { x: 0, y: 0, z: 0 }, size: { x: 4, y: 0.5, z: 4 } }],
  targets: [],
  stars: [],
  startPosition: { x: 0, y: 2, z: 0 },
  wind: { enabled: false, direction: { x: 0, y: 0, z: 0 }, strength: 0 },
  isCustom: true,
})
