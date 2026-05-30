import * as THREE from 'three';
import { CreatureGenome } from '../types/creature';
import { deserializeGenome, serializeGenome, genomeToGeneSequence } from './genetics';
import { downloadFile, exportToOBJ } from './objExporter';

export function exportAsJSON(genome: CreatureGenome, filename?: string): void {
  const json = serializeGenome(genome);
  const safeFilename = filename || `creature_gen${genome.generation}_${Date.now()}.json`;
  downloadFile(json, safeFilename, 'application/json');
}

export async function importFromJSON(file: File): Promise<CreatureGenome> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const genome = deserializeGenome(content);
        if (!genome.geneSequence || genome.geneSequence.length < 32) {
          genome.geneSequence = genomeToGeneSequence(genome);
        }
        resolve(genome);
      } catch (error) {
        reject(new Error('Invalid creature JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function takeScreenshot(gl: THREE.WebGLRenderer, filename?: string): void {
  const dataURL = gl.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename || `creature_${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportCreatureAsOBJ(
  creatureGroup: THREE.Group,
  filename?: string,
): void {
  creatureGroup.updateMatrixWorld(true);
  const safeFilename = filename || `creature_${Date.now()}.obj`;
  exportToOBJ(creatureGroup, safeFilename);
}

export function triggerFileInput(accept: string = '.json'): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.top = '-1000px';
    input.style.left = '-1000px';
    input.style.opacity = '0';
    document.body.appendChild(input);

    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try { document.body.removeChild(input); } catch {}
      }
    };

    input.onchange = () => {
      const file = input.files?.[0];
      cleanup();
      if (file) {
        resolve(file);
      } else {
        reject(new Error('No file selected'));
      }
    };

    const handleCancel = () => {
      setTimeout(() => {
        if (!resolved) {
          cleanup();
          reject(new Error('File selection cancelled'));
        }
      }, 300);
    };

    input.addEventListener('cancel', handleCancel);

    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!resolved) {
            cleanup();
            reject(new Error('File selection cancelled'));
          }
        }, 1000);
      },
      { once: true },
    );

    input.click();
  });
}
