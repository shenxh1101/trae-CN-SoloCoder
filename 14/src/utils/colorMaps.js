export const massLossColorMap = [
  { value: -500, color: [0, 100, 0, 200] },
  { value: -300, color: [34, 139, 34, 200] },
  { value: -100, color: [144, 238, 144, 200] },
  { value: 0, color: [255, 255, 255, 200] },
  { value: 50, color: [255, 200, 150, 200] },
  { value: 150, color: [255, 140, 0, 200] },
  { value: 300, color: [255, 69, 0, 200] },
  { value: 500, color: [220, 20, 60, 200] }
];

export const stabilityColorMap = [
  { value: 0, color: [220, 20, 60, 180] },
  { value: 0.2, color: [255, 99, 71, 180] },
  { value: 0.4, color: [255, 165, 0, 180] },
  { value: 0.6, color: [255, 215, 0, 180] },
  { value: 0.8, color: [144, 238, 144, 180] },
  { value: 1.0, color: [34, 139, 34, 180] }
];

export const velocityColorMap = [
  { value: 0, color: [65, 105, 225, 200] },
  { value: 50, color: [0, 191, 255, 200] },
  { value: 150, color: [0, 255, 127, 200] },
  { value: 300, color: [255, 255, 0, 200] },
  { value: 500, color: [255, 140, 0, 200] },
  { value: 1000, color: [255, 0, 0, 200] }
];

export const elevationColorMap = [
  { value: 0, color: [70, 130, 180, 200] },
  { value: 500, color: [107, 142, 35, 200] },
  { value: 1000, color: [218, 165, 32, 200] },
  { value: 2000, color: [205, 92, 92, 200] },
  { value: 3000, color: [220, 220, 220, 200] },
  { value: 4000, color: [255, 255, 255, 200] }
];

export const seaLevelColorMap = [
  { value: 0, color: [0, 0, 139, 120] },
  { value: 1, color: [0, 0, 205, 150] },
  { value: 2, color: [30, 144, 255, 180] },
  { value: 3, color: [0, 191, 255, 200] }
];

export function interpolateColor(colorMap, value) {
  if (value <= colorMap[0].value) {
    return colorMap[0].color;
  }
  if (value >= colorMap[colorMap.length - 1].value) {
    return colorMap[colorMap.length - 1].color;
  }

  for (let i = 0; i < colorMap.length - 1; i++) {
    const lower = colorMap[i];
    const upper = colorMap[i + 1];

    if (value >= lower.value && value <= upper.value) {
      const t = (value - lower.value) / (upper.value - lower.value);
      return [
        Math.round(lower.color[0] + t * (upper.color[0] - lower.color[0])),
        Math.round(lower.color[1] + t * (upper.color[1] - lower.color[1])),
        Math.round(lower.color[2] + t * (upper.color[2] - lower.color[2])),
        Math.round(lower.color[3] + t * (upper.color[3] - lower.color[3]))
      ];
    }
  }

  return [255, 255, 255, 200];
}

export function rgbaToString(rgba) {
  return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3] / 255})`;
}

export function generateGradientCSS(colorMap) {
  const stops = colorMap.map((item, index) => {
    const percent = (index / (colorMap.length - 1)) * 100;
    return `rgba(${item.color[0]}, ${item.color[1]}, ${item.color[2]}, ${item.color[3] / 255}) ${percent}%`;
  });
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
