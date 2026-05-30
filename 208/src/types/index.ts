export interface ArtStyle {
  id: string;
  name: string;
  nameCn: string;
  author: string;
  year: string;
  description: string;
  baseColor: string;
  accentColor: string;
}

export type CubeFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export interface FaceStyleMap {
  front: ArtStyle;
  back: ArtStyle;
  left: ArtStyle;
  right: ArtStyle;
  top: ArtStyle;
  bottom: ArtStyle;
}

export interface AppState {
  styleIntensity: number;
  faceStyles: FaceStyleMap;
  selectedFace: CubeFace;
  contentImage: string | null;
  backgroundType: 'solid' | 'stars';
  autoRotate: boolean;
  rotationSpeed: number;
}
