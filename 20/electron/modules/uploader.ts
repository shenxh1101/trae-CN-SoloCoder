import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { clipboard, nativeImage } from 'electron';

export interface QiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  domain: string;
  region: string;
}

export interface UpyunConfig {
  serviceName: string;
  operatorName: string;
  operatorPassword: string;
  domain: string;
}

export interface LocalConfig {
  localPath: string;
}

export type UploadConfig =
  | { type: 'local'; config: LocalConfig }
  | { type: 'qiniu'; config: QiniuConfig }
  | { type: 'upyun'; config: UpyunConfig };

function generateFileName(originalName: string): string {
  const ext = path.extname(originalName) || '.png';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6);
  return `${timestamp}-${random}${ext}`;
}

export async function uploadImage(imagePath: string, uploadConfig: UploadConfig): Promise<string> {
  if (!fs.existsSync(imagePath)) {
    throw new Error('Image file not found');
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const fileName = generateFileName(path.basename(imagePath));

  switch (uploadConfig.type) {
    case 'local':
      return uploadLocal(imageBuffer, fileName, uploadConfig.config);
    case 'qiniu':
      return uploadQiniu(imageBuffer, fileName, uploadConfig.config);
    case 'upyun':
      return uploadUpyun(imageBuffer, fileName, uploadConfig.config);
    default:
      throw new Error('Unsupported upload type');
  }
}

async function uploadLocal(buffer: Buffer, fileName: string, config: LocalConfig): Promise<string> {
  const outputPath = path.join(config.localPath, fileName);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, buffer);
  return `file://${outputPath}`;
}

async function uploadQiniu(buffer: Buffer, fileName: string, config: QiniuConfig): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), fileName);
    formData.append('token', generateQiniuToken(config));

    const uploadUrl = `https://upload-${config.region}.qiniup.com`;
    const response = await axios.post(uploadUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data.key) {
      return `${config.domain}/${response.data.key}`;
    }
    throw new Error('Upload failed');
  } catch (error) {
    console.error('Qiniu upload error:', error);
    throw error;
  }
}

function generateQiniuToken(config: QiniuConfig): string {
  const putPolicy = {
    scope: config.bucket,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  };
  const encodedPutPolicy = Buffer.from(JSON.stringify(putPolicy)).toString('base64');
  const crypto = require('crypto');
  const sign = crypto
    .createHmac('sha1', config.secretKey)
    .update(encodedPutPolicy)
    .digest('base64');
  return `${config.accessKey}:${sign}:${encodedPutPolicy}`;
}

async function uploadUpyun(buffer: Buffer, fileName: string, config: UpyunConfig): Promise<string> {
  try {
    const auth = `Basic ${Buffer.from(`${config.operatorName}:${config.operatorPassword}`).toString('base64')}`;
    const url = `https://v0.api.upyun.com/${config.serviceName}/${fileName}`;

    await axios.put(url, buffer, {
      headers: {
        Authorization: auth,
        'Content-Type': 'application/octet-stream',
      },
    });

    return `${config.domain}/${fileName}`;
  } catch (error) {
    console.error('Upyun upload error:', error);
    throw error;
  }
}

export async function getClipboardImage(): Promise<string | null> {
  const image = clipboard.readImage();
  if (image.isEmpty()) {
    return null;
  }

  const tempDir = require('os').tmpdir();
  const tempPath = path.join(tempDir, `clipboard-${Date.now()}.png`);
  const pngData = image.toPNG();
  fs.writeFileSync(tempPath, pngData);
  return tempPath;
}

export function saveClipboardImageToFile(outputPath: string): boolean {
  try {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
      return false;
    }
    const pngData = image.toPNG();
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, pngData);
    return true;
  } catch {
    return false;
  }
}
