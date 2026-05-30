import type { ArtStyle, FaceStyleMap } from '../types';

export const artStyles: ArtStyle[] = [
  {
    id: 'van-gogh-starry-night',
    name: 'Starry Night',
    nameCn: '星夜',
    author: 'Vincent van Gogh',
    year: '1889',
    description: '后印象派代表作，以旋涡状的夜空和明亮的星星著称，展现了梵高独特的情感表达和笔触风格。',
    baseColor: '#1a365d',
    accentColor: '#fbbf24',
  },
  {
    id: 'picasso-cubism',
    name: 'Cubism',
    nameCn: '立体主义',
    author: 'Pablo Picasso',
    year: '1907-1920s',
    description: '打破传统透视，将物体分解为几何形状，从多个视角同时展现，开创了现代艺术的新纪元。',
    baseColor: '#4a1d1d',
    accentColor: '#f59e0b',
  },
  {
    id: 'ukiyo-e-hokusai',
    name: 'The Great Wave',
    nameCn: '神奈川冲浪里',
    author: 'Katsushika Hokusai',
    year: '1831',
    description: '日本浮世绘最著名的作品之一，展现了巨大海浪与富士山的对比，具有强烈的装饰性和视觉冲击力。',
    baseColor: '#1e3a5f',
    accentColor: '#e0e7ff',
  },
  {
    id: 'monet-water-lilies',
    name: 'Water Lilies',
    nameCn: '睡莲',
    author: 'Claude Monet',
    year: '1906-1926',
    description: '印象派莫奈晚年代表作，捕捉光线在水面上的变化，色彩柔和朦胧，充满诗意。',
    baseColor: '#134e4a',
    accentColor: '#a7f3d0',
  },
  {
    id: 'munch-scream',
    name: 'The Scream',
    nameCn: '呐喊',
    author: 'Edvard Munch',
    year: '1893',
    description: '表现主义杰作，以扭曲的形象和强烈的色彩传达出深刻的焦虑和存在主义情感。',
    baseColor: '#7c2d12',
    accentColor: '#fcd34d',
  },
  {
    id: 'dali-persistence',
    name: 'Persistence of Memory',
    nameCn: '记忆的永恒',
    author: 'Salvador Dalí',
    year: '1931',
    description: '超现实主义代表作，软化的时钟象征着时间的相对性，创造出梦幻般的荒诞场景。',
    baseColor: '#78350f',
    accentColor: '#92400e',
  },
  {
    id: 'warhol-pop',
    name: 'Pop Art',
    nameCn: '波普艺术',
    author: 'Andy Warhol',
    year: '1960s',
    description: '波普艺术代表，将大众文化和商业图像艺术化，重复的图案和鲜艳的色彩是其标志性特征。',
    baseColor: '#be185d',
    accentColor: '#22d3ee',
  },
  {
    id: 'rothko-color-field',
    name: 'Color Field',
    nameCn: '色域绘画',
    author: 'Mark Rothko',
    year: '1950s-1960s',
    description: '抽象表现主义分支，以大面积的纯色块和微妙的色彩过渡营造沉思和冥想的氛围。',
    baseColor: '#581c87',
    accentColor: '#f0abfc',
  },
];

export const getDefaultFaceStyles = (): FaceStyleMap => {
  return {
    front: artStyles[0],
    back: artStyles[1],
    left: artStyles[2],
    right: artStyles[3],
    top: artStyles[4],
    bottom: artStyles[5],
  };
};

export const getStyleById = (id: string): ArtStyle | undefined => {
  return artStyles.find((style) => style.id === id);
};
