import type { KeywordMatch, LightingConfig, PoemAnalysis, FlowDirection, ParticleType } from '@/types';

const KEYWORD_MAP: KeywordMatch[] = [
  { word: '落霞', category: 'color', mapping: '橙红色光照', colorHex: '#FF6B35' },
  { word: '晚霞', category: 'color', mapping: '橙红色光照', colorHex: '#FF6B35' },
  { word: '朝霞', category: 'color', mapping: '粉橙色光照', colorHex: '#FF8C69' },
  { word: '孤鹜', category: 'creature', mapping: '飞鸟粒子', particleType: 'bird' },
  { word: '飞鸟', category: 'creature', mapping: '飞鸟粒子', particleType: 'bird' },
  { word: '归鸟', category: 'creature', mapping: '飞鸟粒子', particleType: 'bird' },
  { word: '白鹭', category: 'creature', mapping: '飞鸟粒子', particleType: 'bird' },
  { word: '鸿雁', category: 'creature', mapping: '飞鸟粒子', particleType: 'bird' },
  { word: '蝴蝶', category: 'creature', mapping: '蝴蝶粒子', particleType: 'butterfly' },
  { word: '蝶', category: 'creature', mapping: '蝴蝶粒子', particleType: 'butterfly' },
  { word: '秋水', category: 'nature', mapping: '蓝色水光', colorHex: '#4A90D9' },
  { word: '长天', category: 'nature', mapping: '天蓝环境光', colorHex: '#87CEEB' },
  { word: '碧空', category: 'nature', mapping: '天蓝环境光', colorHex: '#87CEEB' },
  { word: '明月', category: 'nature', mapping: '月白光照', colorHex: '#F5E6CA' },
  { word: '月', category: 'nature', mapping: '月白光照', colorHex: '#E8DFC8' },
  { word: '春风', category: 'nature', mapping: '绿色暖风', colorHex: '#90EE90', flowDirection: 'left-to-right' },
  { word: '残阳', category: 'color', mapping: '暗红光照', colorHex: '#DC3545' },
  { word: '夕阳', category: 'color', mapping: '暗红光照', colorHex: '#DC3545' },
  { word: '斜阳', category: 'color', mapping: '暗红光照', colorHex: '#C44D56' },
  { word: '飞雪', category: 'nature', mapping: '雪白粒子', colorHex: '#E8E8E8' },
  { word: '雪', category: 'nature', mapping: '雪白粒子', colorHex: '#E8E8E8' },
  { word: '桃花', category: 'nature', mapping: '粉色光照', colorHex: '#FFB6C1' },
  { word: '花', category: 'nature', mapping: '粉色光照', colorHex: '#FFB6C1' },
  { word: '烟雨', category: 'nature', mapping: '灰蓝雾效', colorHex: '#708090' },
  { word: '雨', category: 'nature', mapping: '灰蓝雾效', colorHex: '#708090' },
  { word: '寒霜', category: 'color', mapping: '冷蓝光照', colorHex: '#B0C4DE' },
  { word: '霜', category: 'color', mapping: '冷蓝光照', colorHex: '#B0C4DE' },
  { word: '青山', category: 'nature', mapping: '青绿色光', colorHex: '#2E8B57' },
  { word: '山', category: 'nature', mapping: '青黛色光', colorHex: '#3B6B3B' },
  { word: '江', category: 'nature', mapping: '碧蓝水光', colorHex: '#4682B4' },
  { word: '河', category: 'nature', mapping: '碧蓝水光', colorHex: '#4682B4' },
  { word: '云', category: 'nature', mapping: '素白云光', colorHex: '#F0F8FF' },
  { word: '风', category: 'nature', mapping: '淡青风色', colorHex: '#AFEEEE', flowDirection: 'left-to-right' },
  { word: '夜', category: 'nature', mapping: '深紫夜色', colorHex: '#191970' },
  { word: '星', category: 'nature', mapping: '星辉银光', colorHex: '#C0C0C0' },
  { word: '日', category: 'nature', mapping: '金色阳光', colorHex: '#FFD700' },
  { word: '柳', category: 'nature', mapping: '翠绿柳色', colorHex: '#6B8E23' },
  { word: '愁', category: 'emotion', mapping: '灰紫愁色', colorHex: '#7B68AE' },
  { word: '思', category: 'emotion', mapping: '淡紫思色', colorHex: '#9370DB' },
  { word: '梦', category: 'emotion', mapping: '梦幻紫色', colorHex: '#DA70D6' },
  { word: '醉', category: 'emotion', mapping: '醺红醉色', colorHex: '#CD5C5C' },
  { word: '离', category: 'emotion', mapping: '暗灰离色', colorHex: '#696969' },
  { word: '红豆', category: 'nature', mapping: '红色暖光', colorHex: '#FF4444' },
  { word: '荷', category: 'nature', mapping: '碧绿荷光', colorHex: '#00CED1' },
  { word: '梅', category: 'nature', mapping: '淡粉梅光', colorHex: '#FFB7C5' },
];

const DEFAULT_LIGHTING: LightingConfig = {
  ambientColor: '#4a5568',
  ambientIntensity: 0.4,
  directionalColor: '#e2e8f0',
  directionalIntensity: 0.8,
  fogColor: '#0a0e1a',
  fogNear: 10,
  fogFar: 200,
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [128, 128, 128];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function blendColors(colors: string[]): string {
  if (colors.length === 0) return DEFAULT_LIGHTING.ambientColor;
  const rgbas = colors.map(hexToRgb);
  const r = Math.round(rgbas.reduce((s, c) => s + c[0], 0) / rgbas.length);
  const g = Math.round(rgbas.reduce((s, c) => s + c[1], 0) / rgbas.length);
  const b = Math.round(rgbas.reduce((s, c) => s + c[2], 0) / rgbas.length);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function parsePoem(poem: string): PoemAnalysis {
  const keywords: KeywordMatch[] = [];

  for (const entry of KEYWORD_MAP) {
    if (poem.includes(entry.word)) {
      keywords.push(entry);
    }
  }

  const colorKeywords = keywords.filter(k => k.colorHex);
  const creatureKeywords = keywords.filter(k => k.particleType);

  const ambientColor = colorKeywords.length > 0
    ? blendColors(colorKeywords.map(k => k.colorHex!))
    : DEFAULT_LIGHTING.ambientColor;

  const directionalColor = colorKeywords.length > 0
    ? colorKeywords[0].colorHex!
    : DEFAULT_LIGHTING.directionalColor;

  const fogColor = colorKeywords.length > 0
    ? blendColors([DEFAULT_LIGHTING.fogColor, ...colorKeywords.map(k => k.colorHex!)])
    : DEFAULT_LIGHTING.fogColor;

  const flowDirEntry = keywords.find(k => k.flowDirection);
  const flowDirection: FlowDirection = flowDirEntry?.flowDirection || 'left-to-right';

  let particleType: ParticleType = 'none';
  let particleCount = 0;
  let particleColor = '#ffffff';
  let particleSpeed = 1;

  if (creatureKeywords.length > 0) {
    const creature = creatureKeywords[0];
    particleType = creature.particleType!;
    particleCount = particleType === 'bird' ? 30 : 50;
    particleColor = particleType === 'bird' ? '#1a1a2e' : colorKeywords[0]?.colorHex || '#FFB6C1';
    particleSpeed = particleType === 'bird' ? 2 : 0.5;
  }

  const hasEmotion = keywords.some(k => k.category === 'emotion');
  const ambientIntensity = hasEmotion ? 0.3 : 0.5;
  const directionalIntensity = colorKeywords.length > 0 ? 1.0 : 0.8;

  return {
    keywords,
    lighting: {
      ambientColor,
      ambientIntensity,
      directionalColor,
      directionalIntensity,
      fogColor,
      fogNear: colorKeywords.length > 0 ? 5 : 10,
      fogFar: 180,
    },
    flowDirection,
    particles: {
      type: particleType,
      count: particleCount,
      color: particleColor,
      speed: particleSpeed,
    },
  };
}

export const PRESET_POEMS = [
  '落霞与孤鹜齐飞',
  '春风又绿江南岸',
  '明月松间照',
  '烟雨暗千家',
  '飞雪迎春到',
  '蝶恋花',
];
