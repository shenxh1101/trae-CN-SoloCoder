export interface StyleTextureData {
  id: string;
  name: string;
  nameCn: string;
  author: string;
  year: string;
  description: string;
  baseColor: string;
  accentColor: string;
  textureUrl: string;
  stylePrompt: string;
}

const API_BASE = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image';

const generateTextureUrl = (prompt: string): string => {
  const encodedPrompt = encodeURIComponent(prompt);
  return `${API_BASE}?prompt=${encodedPrompt}&image_size=square_hd`;
};

export const styleTextures: StyleTextureData[] = [
  {
    id: 'van-gogh-starry-night',
    name: 'Starry Night',
    nameCn: '星夜',
    author: 'Vincent van Gogh',
    year: '1889',
    description: '后印象派代表作，以旋涡状的夜空和明亮的星星著称，展现了梵高独特的情感表达和厚涂笔触风格。强烈的蓝黄色调对比，旋转的云层，充满动感的笔触。',
    baseColor: '#1a365d',
    accentColor: '#fbbf24',
    stylePrompt: 'Van Gogh Starry Night style painting, swirling night sky with bright yellow stars and crescent moon, thick impasto brushstrokes, dynamic swirling patterns, deep blue and vibrant yellow color palette, post-impressionist masterpiece, dramatic brushwork texture',
    textureUrl: '',
  },
  {
    id: 'picasso-cubism',
    name: 'Cubism',
    nameCn: '立体主义',
    author: 'Pablo Picasso',
    year: '1907-1920s',
    description: '打破传统透视，将物体分解为几何形状，从多个视角同时展现。棱角分明的几何碎片，多重角度叠加，扁平化空间，棕灰色调为主。',
    baseColor: '#4a1d1d',
    accentColor: '#f59e0b',
    stylePrompt: 'Pablo Picasso cubist painting, fragmented geometric shapes, multiple viewpoints simultaneously, abstract portrait with angular forms, overlapping planes, monochromatic brown and ochre tones, analytic cubism style, sharp edges and geometric fragmentation',
    textureUrl: '',
  },
  {
    id: 'ukiyo-e-hokusai',
    name: 'The Great Wave',
    nameCn: '神奈川冲浪里',
    author: 'Katsushika Hokusai',
    year: '1831',
    description: '日本浮世绘最著名的作品之一，展现了巨大海浪与富士山的对比。鲜明的蓝白色调，装饰性的波浪曲线，平面化构图，精细的线条勾勒。',
    baseColor: '#1e3a5f',
    accentColor: '#e0e7ff',
    stylePrompt: 'Katsushika Hokusai The Great Wave off Kanagawa style, Japanese ukiyo-e woodblock print, giant curling ocean wave with foamy crests, Mount Fuji in background, deep indigo blue and white color scheme, flat decorative composition, bold outline lines, traditional Japanese art',
    textureUrl: '',
  },
  {
    id: 'monet-water-lilies',
    name: 'Water Lilies',
    nameCn: '睡莲',
    author: 'Claude Monet',
    year: '1906-1926',
    description: '印象派莫奈晚年代表作，捕捉光线在水面上的变化。柔和朦胧的色彩，破碎的光影笔触，粉绿色调为主，没有明确的轮廓线。',
    baseColor: '#134e4a',
    accentColor: '#a7f3d0',
    stylePrompt: 'Claude Monet Water Lilies impressionist painting, soft dappled light on water surface, pink and white water lilies floating on green pond, broken color brushstrokes, hazy atmospheric effect, muted greens and pinks, no hard outlines, pure impressionism style',
    textureUrl: '',
  },
  {
    id: 'munch-scream',
    name: 'The Scream',
    nameCn: '呐喊',
    author: 'Edvard Munch',
    year: '1893',
    description: '表现主义杰作，以扭曲的形象和强烈的色彩传达出深刻的焦虑。橙红色的扭曲天空，波浪状的线条，惊恐的人物形象，充满情感张力。',
    baseColor: '#7c2d12',
    accentColor: '#fcd34d',
    stylePrompt: 'Edvard Munch The Scream expressionist painting, distorted screaming figure holding head, wavy undulating lines, fiery orange and blood red sky, swirling landscape, emotional tension, exaggerated forms, expressionist distortion, anxiety and anguish theme',
    textureUrl: '',
  },
  {
    id: 'dali-persistence',
    name: 'Persistence of Memory',
    nameCn: '记忆的永恒',
    author: 'Salvador Dalí',
    year: '1931',
    description: '超现实主义代表作，软化的时钟象征着时间的相对性。梦幻般的荒漠景观，精确写实的细节，荒诞的意象组合，明亮的日光照射。',
    baseColor: '#78350f',
    accentColor: '#92400e',
    stylePrompt: 'Salvador Dali Persistence of Memory surrealist painting, melting pocket watches draped over objects, dreamlike desert landscape, barren rocky terrain, clear blue sky, hyper-realistic details, absurd imagery, soft distorted clocks, surreal dreamscape',
    textureUrl: '',
  },
  {
    id: 'warhol-pop',
    name: 'Pop Art',
    nameCn: '波普艺术',
    author: 'Andy Warhol',
    year: '1960s',
    description: '波普艺术代表，将大众文化和商业图像艺术化。重复的图案，鲜艳大胆的色彩，半色调网点效果，名人肖像风格，平面化设计。',
    baseColor: '#be185d',
    accentColor: '#22d3ee',
    stylePrompt: 'Andy Warhol pop art style, vibrant bold colors, repeated pattern design, halftone dot texture, screen print aesthetic, celebrity portrait style, flat graphic design, hot pink and cyan color scheme, commercial art aesthetic, 1960s pop culture',
    textureUrl: '',
  },
  {
    id: 'rothko-color-field',
    name: 'Color Field',
    nameCn: '色域绘画',
    author: 'Mark Rothko',
    year: '1950s-1960s',
    description: '抽象表现主义分支，以大面积的纯色块和微妙的色彩过渡营造沉思和冥想的氛围。深紫色和粉色调，柔和的边缘融合，沉浸式色彩体验。',
    baseColor: '#581c87',
    accentColor: '#f0abfc',
    stylePrompt: 'Mark Rothko color field painting, large blocks of luminous color, soft blurred edges between rectangles, deep purple and magenta hues, subtle color transitions, meditative spiritual quality, abstract expressionism, immersive color experience, no recognizable objects',
    textureUrl: '',
  },
];

export const generateAllTextureUrls = (): void => {
  styleTextures.forEach((style) => {
    if (!style.textureUrl) {
      style.textureUrl = generateTextureUrl(style.stylePrompt);
    }
  });
};

export const getStyleTextureUrl = (styleId: string): string => {
  const style = styleTextures.find((s) => s.id === styleId);
  if (!style) return '';
  if (!style.textureUrl) {
    style.textureUrl = generateTextureUrl(style.stylePrompt);
  }
  return style.textureUrl;
};

generateAllTextureUrls();
