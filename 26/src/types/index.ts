export type ShoePart = 'upper' | 'sole' | 'laces' | 'logo' | 'heel' | 'tongue' | 'lining';

export type UpperMaterial = 'leather' | 'mesh' | 'suede' | 'reflective';
export type SoleMaterial = 'rubber' | 'eva' | 'carbon';
export type MaterialType = UpperMaterial | SoleMaterial;

export type TexturePattern = 'solid' | 'stripes' | 'dots' | 'camouflage' | 'carbon';

export type LightingPreset = 'indoor' | 'outdoor' | 'stage';

export type DecalFont = 'arial' | 'impact' | 'script' | 'bold';

export interface PartConfig {
  color: string;
  material: MaterialType;
  texture: TexturePattern;
}

export interface DecalConfig {
  id: string;
  text: string;
  font: DecalFont;
  color: string;
  position: { x: number; y: number };
  scale: number;
  badgeImage?: string;
}

export interface LightingConfig {
  preset: LightingPreset;
  mainLightIntensity: number;
  mainLightPosition: { x: number; y: number; z: number };
  ambientIntensity: number;
}

export interface ShoeConfig {
  id: string;
  name: string;
  parts: Record<ShoePart, PartConfig>;
  decals: DecalConfig[];
  lighting: LightingConfig;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryState {
  past: ShoeConfig[];
  present: ShoeConfig;
  future: ShoeConfig[];
}

export interface PresetScheme {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  config: Partial<ShoeConfig>;
}

export interface MaterialPreset {
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  transparent?: boolean;
  opacity?: number;
  normalScale?: number;
  wireframe?: boolean;
}

export interface PartInfo {
  id: ShoePart;
  name: string;
  nameEn: string;
  description: string;
  availableMaterials: MaterialType[];
  availableTextures: TexturePattern[];
}

export const SHOE_PARTS_INFO: Record<ShoePart, PartInfo> = {
  upper: {
    id: 'upper',
    name: '鞋面主体',
    nameEn: 'Upper',
    description: '鞋子的主要部分，覆盖脚面',
    availableMaterials: ['leather', 'mesh', 'suede', 'reflective'],
    availableTextures: ['solid', 'stripes', 'dots', 'camouflage', 'carbon']
  },
  sole: {
    id: 'sole',
    name: '鞋底',
    nameEn: 'Sole',
    description: '鞋子底部，提供抓地力和缓冲',
    availableMaterials: ['rubber', 'eva', 'carbon'],
    availableTextures: ['solid', 'carbon']
  },
  laces: {
    id: 'laces',
    name: '鞋带',
    nameEn: 'Laces',
    description: '用于固定鞋子的带子',
    availableMaterials: ['mesh'],
    availableTextures: ['solid', 'stripes']
  },
  logo: {
    id: 'logo',
    name: 'Logo标志',
    nameEn: 'Logo',
    description: '品牌标识区域',
    availableMaterials: ['leather', 'reflective'],
    availableTextures: ['solid']
  },
  heel: {
    id: 'heel',
    name: '后跟支撑片',
    nameEn: 'Heel Counter',
    description: '后跟部位的支撑结构',
    availableMaterials: ['rubber', 'carbon', 'leather'],
    availableTextures: ['solid', 'carbon']
  },
  tongue: {
    id: 'tongue',
    name: '鞋舌',
    nameEn: 'Tongue',
    description: '鞋带下方的软垫部分',
    availableMaterials: ['mesh', 'leather', 'suede'],
    availableTextures: ['solid', 'dots', 'stripes']
  },
  lining: {
    id: 'lining',
    name: '内衬',
    nameEn: 'Lining',
    description: '鞋子内部的衬里材料',
    availableMaterials: ['mesh', 'suede'],
    availableTextures: ['solid']
  }
};

export const COLOR_PALETTE = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00',
  '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FF3366', '#FF9900', '#9933FF', '#33CCFF',
  '#33FF99', '#CC3333', '#666666', '#CCCCCC'
];

export const UPPER_MATERIALS: { value: UpperMaterial; label: string; description: string }[] = [
  { value: 'leather', label: '皮革', description: '经典耐用，质感高级' },
  { value: 'mesh', label: '网眼布', description: '轻便透气，适合运动' },
  { value: 'suede', label: '麂皮', description: '柔软舒适，复古风格' },
  { value: 'reflective', label: '反光材料', description: '夜间反光，科技感强' }
];

export const SOLE_MATERIALS: { value: SoleMaterial; label: string; description: string }[] = [
  { value: 'rubber', label: '橡胶', description: '耐磨防滑，经典耐用' },
  { value: 'eva', label: 'EVA发泡', description: '轻便缓冲，弹性好' },
  { value: 'carbon', label: '碳纤维', description: '轻量化，高强度' }
];

export const TEXTURE_PATTERNS: { value: TexturePattern; label: string }[] = [
  { value: 'solid', label: '纯色' },
  { value: 'stripes', label: '条纹' },
  { value: 'dots', label: '波点' },
  { value: 'camouflage', label: '迷彩' },
  { value: 'carbon', label: '碳纤维编织' }
];

export const LIGHTING_PRESETS: { value: LightingPreset; label: string }[] = [
  { value: 'indoor', label: '室内展示光' },
  { value: 'outdoor', label: '室外自然光' },
  { value: 'stage', label: '舞台聚光灯' }
];

export const DECAL_FONTS: { value: DecalFont; label: string }[] = [
  { value: 'arial', label: 'Arial' },
  { value: 'impact', label: 'Impact' },
  { value: 'script', label: '手写体' },
  { value: 'bold', label: '粗体' }
];
