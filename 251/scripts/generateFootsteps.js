import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_RATE = 44100;
const BIT_DEPTH = 16;

function writeString(buffer, offset, str) {
  for (let i = 0; i < str.length; i++) {
    buffer.writeUInt8(str.charCodeAt(i), offset + i);
  }
}

function writeWAVHeader(buffer, dataLength, sampleRate, bitDepth, channels = 1) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  
  writeString(buffer, 0, 'RIFF');
  buffer.writeUInt32LE(36 + dataLength, 4);
  writeString(buffer, 8, 'WAVE');
  writeString(buffer, 12, 'fmt ');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitDepth, 34);
  writeString(buffer, 36, 'data');
  buffer.writeUInt32LE(dataLength, 40);
}

function generateFootstep(type, duration = 0.2) {
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const data = new Float32Array(totalSamples);
  
  const attackSamples = Math.floor(totalSamples * 0.05);
  const decaySamples = Math.floor(totalSamples * 0.4);
  const sustainSamples = Math.floor(totalSamples * 0.3);
  const releaseSamples = totalSamples - attackSamples - decaySamples - sustainSamples;
  
  for (let i = 0; i < totalSamples; i++) {
    let envelope = 0;
    
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i < attackSamples + decaySamples) {
      const t = (i - attackSamples) / decaySamples;
      envelope = 1 - t * 0.5;
    } else if (i < attackSamples + decaySamples + sustainSamples) {
      envelope = 0.5;
    } else {
      const t = (i - attackSamples - decaySamples - sustainSamples) / releaseSamples;
      envelope = 0.5 * (1 - t);
    }
    
    let noise = 0;
    const random = Math.random();
    
    switch (type) {
      case 'stone': {
        const lowNoise = (Math.random() * 2 - 1) * 0.6;
        const midNoise = (Math.random() * 2 - 1) * 0.3;
        const impact = random < 0.1 ? (Math.random() * 2 - 1) * 0.8 : 0;
        noise = lowNoise + midNoise * 0.5 + impact;
        if (i < attackSamples * 0.5) {
          noise += (Math.random() * 2 - 1) * 0.5;
        }
        break;
      }
      case 'wood': {
        const lowNoise = (Math.random() * 2 - 1) * 0.5;
        const resonant = Math.sin(i * 0.2) * (Math.random() * 0.3);
        const thud = random < 0.05 ? (Math.random() * 2 - 1) * 0.7 : 0;
        noise = lowNoise + resonant + thud;
        break;
      }
      case 'metal': {
        const highFreq = (Math.random() * 2 - 1) * 0.4;
        const clink = Math.sin(i * 0.5 + Math.random() * 10) * 0.2;
        const ring = Math.sin(i * 0.05) * (Math.random() * 0.3);
        noise = highFreq + clink + ring;
        if (i < attackSamples) {
          noise += (Math.random() * 2 - 1) * 0.8;
        }
        break;
      }
      case 'glass': {
        const highFreq = (Math.random() * 2 - 1) * 0.3;
        const tinkle = Math.sin(i * 0.8) * (Math.random() * 0.4);
        const shimmer = Math.sin(i * 0.02 + Math.random() * 5) * 0.2;
        noise = highFreq + tinkle + shimmer;
        break;
      }
      default:
        noise = (Math.random() * 2 - 1) * 0.5;
    }
    
    data[i] = noise * envelope * 0.8;
  }
  
  return data;
}

function saveWAV(filename, floatData, sampleRate, bitDepth) {
  const bytesPerSample = bitDepth / 8;
  const dataLength = floatData.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataLength);
  
  writeWAVHeader(buffer, dataLength, sampleRate, bitDepth);
  
  const maxVal = (1 << (bitDepth - 1)) - 1;
  for (let i = 0; i < floatData.length; i++) {
    const sample = Math.max(-1, Math.min(1, floatData[i]));
    const intSample = Math.round(sample * maxVal);
    const offset = 44 + i * bytesPerSample;
    
    if (bitDepth === 16) {
      buffer.writeInt16LE(intSample, offset);
    } else if (bitDepth === 24) {
      buffer.writeUInt8(intSample & 0xFF, offset);
      buffer.writeUInt8((intSample >> 8) & 0xFF, offset + 1);
      buffer.writeUInt8((intSample >> 16) & 0xFF, offset + 2);
    }
  }
  
  const fullPath = path.join(__dirname, '..', 'public', 'assets', filename);
  fs.writeFileSync(fullPath, buffer);
  console.log(`✓ 生成 ${filename}`);
}

const types = [
  { name: 'stone', count: 3 },
  { name: 'wood', count: 3 },
  { name: 'metal', count: 3 },
  { name: 'glass', count: 3 },
];

console.log('正在生成高质量脚步声效...\n');

for (const type of types) {
  for (let i = 0; i < type.count; i++) {
    const data = generateFootstep(type.name);
    saveWAV(`footstep_${type.name}_${i + 1}.wav`, data, SAMPLE_RATE, BIT_DEPTH);
  }
}

console.log(`\n✓ 共生成 ${types.reduce((s, t) => s + t.count, 0)} 个脚步声文件`);
console.log(`  位置: public/assets/`);
