import { FishData } from '@/types';

export const FISH_TEMPLATES: Omit<FishData, 'id' | 'pathOffset'>[] = [
  {
    type: 'clownfish',
    name: '小丑鱼',
    description: '小丑鱼（Clownfish），又称海葵鱼，是雀鲷科海葵鱼亚科鱼类的俗称。它们因脸上有一条或两条白色条纹，好似京剧中的丑角而得名。小丑鱼与海葵有着密不可分的共生关系，因此又称海葵鱼。',
    color: '#ff6b35',
    secondaryColor: '#ffffff',
    size: 0.6,
    speed: 1.2,
    pathRadius: 8,
    pathHeight: 3,
  },
  {
    type: 'angelfish',
    name: '蓝色神仙鱼',
    description: '蓝色神仙鱼（Blue Angelfish），是一种美丽的热带海水鱼类。它们有着优雅的身姿和迷人的蓝色光泽，常见于珊瑚礁海域。神仙鱼性格温和，是水族馆中最受欢迎的观赏鱼之一。',
    color: '#4a9eff',
    secondaryColor: '#ffd700',
    size: 0.8,
    speed: 0.8,
    pathRadius: 10,
    pathHeight: 5,
  },
  {
    type: 'butterflyfish',
    name: '黄色蝴蝶鱼',
    description: '黄色蝴蝶鱼（Yellow Butterflyfish），蝴蝶鱼科蝴蝶鱼属的一种。它们身体呈鲜艳的黄色，有着蝴蝶翅膀般美丽的斑纹。蝴蝶鱼主要以珊瑚虫和小型无脊椎动物为食，是珊瑚礁生态系统的重要成员。',
    color: '#ffd700',
    secondaryColor: '#1a1a2e',
    size: 0.5,
    speed: 1.5,
    pathRadius: 6,
    pathHeight: 4,
  },
];

export function generateFishSchool(count: number = 15): FishData[] {
  const fishes: FishData[] = [];
  
  for (let i = 0; i < count; i++) {
    const template = FISH_TEMPLATES[i % FISH_TEMPLATES.length];
    const offset = (i / count) * Math.PI * 2;
    const angle = Math.random() * Math.PI * 2;
    const radiusVariation = 0.7 + Math.random() * 0.6;
    
    fishes.push({
      ...template,
      id: `fish-${i}`,
      pathOffset: offset + angle * 0.1,
      pathRadius: template.pathRadius * radiusVariation,
      size: template.size * (0.8 + Math.random() * 0.4),
      speed: template.speed * (0.7 + Math.random() * 0.6),
    });
  }
  
  return fishes;
}

export const FISH_COUNT = 15;
