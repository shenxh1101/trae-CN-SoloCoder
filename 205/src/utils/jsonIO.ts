import type { GalaxyConfig } from '../types/galaxy';

export function exportConfig(config: GalaxyConfig): void {
  const dataStr = JSON.stringify(config, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `galaxy-config-${Date.now()}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function importConfig(onLoad: (config: GalaxyConfig) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string) as GalaxyConfig;
        if (validateConfig(config)) {
          onLoad(config);
        } else {
          alert('配置文件格式不正确');
        }
      } catch {
        alert('无法解析配置文件');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function validateConfig(config: unknown): config is GalaxyConfig {
  if (typeof config !== 'object' || config === null) return false;

  const c = config as Record<string, unknown>;
  return (
    typeof c.particleCount === 'number' &&
    (c.armCount === 2 || c.armCount === 3 || c.armCount === 4) &&
    typeof c.rotationSpeed === 'number' &&
    typeof c.armTightness === 'number' &&
    typeof c.randomSize === 'boolean' &&
    typeof c.showBackground === 'boolean' &&
    typeof c.fogEnabled === 'boolean' &&
    typeof c.autoRotate === 'boolean'
  );
}
