import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { URL } from 'url';
import sizeOf from 'image-size';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ImageDownloader {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.outputDir = options.outputDir || './images';
    this.minWidth = options.minWidth || 0;
    this.minHeight = options.minHeight || 0;
    this.delay = options.delay || 0;
    this.selector = options.selector || 'img';
    this.recursive = options.recursive || false;
    this.maxDepth = options.maxDepth || 2;
    this.visitedUrls = new Set();
    this.downloadedImages = new Set();
    this.allImages = [];
    
    this.axios = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
  }

  async init() {
    await fs.mkdir(this.outputDir, { recursive: true });
    const manifestPath = path.join(this.outputDir, 'manifest.json');
    try {
      const manifest = await fs.readFile(manifestPath, 'utf8');
      const data = JSON.parse(manifest);
      this.downloadedImages = new Set(data.downloaded || []);
      this.visitedUrls = new Set(data.visited || []);
    } catch (e) {
      
    }
  }

  async saveManifest() {
    const manifestPath = path.join(this.outputDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify({
      downloaded: Array.from(this.downloadedImages),
      visited: Array.from(this.visitedUrls)
    }, null, 2));
  }

  resolveUrl(href, baseUrl = this.baseUrl) {
    try {
      return new URL(href, baseUrl).href;
    } catch (e) {
      return href;
    }
  }

  sanitizeFilename(url) {
    try {
      const urlObj = new URL(url);
      let filename = path.basename(urlObj.pathname);
      if (!filename || !path.extname(filename)) {
        filename = `img_${Buffer.from(url).toString('base64url').slice(0, 20)}.jpg`;
      }
      filename = filename.replace(/[<>:"/\\|?*]/g, '_');
      return filename;
    } catch (e) {
      return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async downloadPage(url) {
    try {
      const response = await this.axios.get(url, { responseType: 'text' });
      return response.data;
    } catch (e) {
      console.error(`下载页面失败: ${url}`, e.message);
      return null;
    }
  }

  async downloadImage(url) {
    const imageKey = url;
    if (this.downloadedImages.has(imageKey)) {
      console.log(`跳过已下载: ${url}`);
      return null;
    }

    try {
      const response = await this.axios.get(url, { 
        responseType: 'arraybuffer',
        maxContentLength: 50 * 1024 * 1024
      });
      
      const buffer = Buffer.from(response.data);
      
      if (this.minWidth > 0 || this.minHeight > 0) {
        try {
          const dimensions = sizeOf(buffer);
          if (dimensions.width < this.minWidth || dimensions.height < this.minHeight) {
            console.log(`跳过小图片: ${url} (${dimensions.width}x${dimensions.height})`);
            this.downloadedImages.add(imageKey);
            return null;
          }
        } catch (e) {
          
        }
      }

      const filename = this.sanitizeFilename(url);
      const filepath = path.join(this.outputDir, filename);
      
      let finalPath = filepath;
      let counter = 1;
      while (fsSync.existsSync(finalPath)) {
        const ext = path.extname(filename);
        const name = path.basename(filename, ext);
        finalPath = path.join(this.outputDir, `${name}_${counter}${ext}`);
        counter++;
      }

      await fs.writeFile(finalPath, buffer);
      this.downloadedImages.add(imageKey);
      this.allImages.push({
        url,
        filename: path.basename(finalPath),
        filepath: finalPath
      });
      
      console.log(`下载成功: ${path.basename(finalPath)}`);
      return finalPath;
    } catch (e) {
      console.error(`下载图片失败: ${url}`, e.message);
      return null;
    }
  }

  extractImagesFromHtml(html, pageUrl) {
    const $ = cheerio.load(html);
    const images = [];
    
    $(this.selector).each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
      if (src) {
        const absoluteUrl = this.resolveUrl(src, pageUrl);
        images.push(absoluteUrl);
      }
    });

    $('style').each((i, el) => {
      const css = $(el).html();
      const bgImages = this.extractImagesFromCss(css, pageUrl);
      images.push(...bgImages);
    });

    $('link[rel="stylesheet"]').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        const cssUrl = this.resolveUrl(href, pageUrl);
        this.pendingCssUrls.add(cssUrl);
      }
    });

    return [...new Set(images)];
  }

  extractImagesFromCss(css, baseUrl) {
    const images = [];
    const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
    let match;
    
    while ((match = urlRegex.exec(css)) !== null) {
      if (match[1] && !match[1].startsWith('data:')) {
        const absoluteUrl = this.resolveUrl(match[1], baseUrl);
        images.push(absoluteUrl);
      }
    }
    
    return images;
  }

  extractLinks(html, pageUrl) {
    const $ = cheerio.load(html);
    const links = [];
    
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const absoluteUrl = new URL(href, pageUrl);
          if (absoluteUrl.protocol === 'http:' || absoluteUrl.protocol === 'https:') {
            const pageBase = new URL(pageUrl);
            if (absoluteUrl.hostname === pageBase.hostname) {
              links.push(absoluteUrl.href.split('#')[0]);
            }
          }
        } catch (e) {
          
        }
      }
    });

    return [...new Set(links)];
  }

  async downloadCssFile(url) {
    try {
      const response = await this.axios.get(url, { responseType: 'text' });
      return this.extractImagesFromCss(response.data, url);
    } catch (e) {
      console.error(`下载CSS失败: ${url}`, e.message);
      return [];
    }
  }

  async processPage(url, depth = 0) {
    if (depth > this.maxDepth) return [];
    if (this.visitedUrls.has(url)) return [];
    
    this.visitedUrls.add(url);
    console.log(`\n处理页面 (深度${depth}): ${url}`);

    const html = await this.downloadPage(url);
    if (!html) return [];

    this.pendingCssUrls = new Set();
    let images = this.extractImagesFromHtml(html, url);

    const cssUrls = Array.from(this.pendingCssUrls);
    for (const cssUrl of cssUrls) {
      const cssImages = await this.downloadCssFile(cssUrl);
      images.push(...cssImages);
    }

    images = [...new Set(images)];
    console.log(`找到 ${images.length} 张图片`);

    for (const imgUrl of images) {
      await this.downloadImage(imgUrl);
      if (this.delay > 0) {
        await this.sleep(this.delay);
      }
    }

    if (this.recursive && depth < this.maxDepth) {
      const links = this.extractLinks(html, url);
      console.log(`找到 ${links.length} 个链接用于递归`);
      
      for (const link of links) {
        await this.processPage(link, depth + 1);
        if (this.delay > 0) {
          await this.sleep(this.delay);
        }
      }
    }

    return images;
  }

  async generateHtmlGallery() {
    const galleryPath = path.join(this.outputDir, 'gallery.html');
    
    const imageCards = this.allImages.map((img, index) => `
      <div class="image-card" onclick="openModal(${index})">
        <img src="${img.filename}" alt="${img.filename}" loading="lazy">
        <div class="image-info">${img.filename}</div>
      </div>
    `).join('');

    const modalImages = this.allImages.map((img, index) => `
      <div class="modal-image" id="modal-${index}">
        <img src="${img.filename}" alt="${img.filename}">
      </div>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>图片下载库 - 共 ${this.allImages.length} 张</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 2rem;
      margin-bottom: 10px;
    }
    .header p {
      opacity: 0.9;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .image-card {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.3s, box-shadow 0.3s;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .image-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    }
    .image-card img {
      width: 100%;
      height: 150px;
      object-fit: cover;
    }
    .image-info {
      padding: 10px;
      font-size: 12px;
      color: #666;
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    .modal.active {
      display: flex;
    }
    .modal-content {
      max-width: 90%;
      max-height: 90%;
      position: relative;
    }
    .modal-content img {
      max-width: 100%;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 5px;
    }
    .close {
      position: absolute;
      top: -40px;
      right: 0;
      color: white;
      font-size: 35px;
      cursor: pointer;
    }
    .nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      color: white;
      font-size: 50px;
      cursor: pointer;
      padding: 20px;
      user-select: none;
    }
    .nav.prev { left: -60px; }
    .nav.next { right: -60px; }
    .nav:hover { color: #667eea; }
    .modal-info {
      color: white;
      text-align: center;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📸 图片下载库</h1>
    <p>共下载 ${this.allImages.length} 张图片</p>
  </div>
  <div class="gallery">
    ${imageCards}
  </div>
  
  <div class="modal" id="modal">
    <div class="modal-content">
      <span class="close" onclick="closeModal()">&times;</span>
      <span class="nav prev" onclick="prevImage()">&#10094;</span>
      <span class="nav next" onclick="nextImage()">&#10095;</span>
      <div id="modal-image-container"></div>
      <div class="modal-info" id="modal-info"></div>
    </div>
  </div>

  <script>
    const images = ${JSON.stringify(this.allImages)};
    let currentIndex = 0;
    const modal = document.getElementById('modal');
    const container = document.getElementById('modal-image-container');
    const info = document.getElementById('modal-info');

    function openModal(index) {
      currentIndex = index;
      showImage();
      modal.classList.add('active');
    }

    function closeModal() {
      modal.classList.remove('active');
    }

    function showImage() {
      const img = images[currentIndex];
      container.innerHTML = '<img src="' + img.filename + '" alt="' + img.filename + '">';
      info.textContent = (currentIndex + 1) + ' / ' + images.length + ' - ' + img.filename;
    }

    function prevImage() {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      showImage();
    }

    function nextImage() {
      currentIndex = (currentIndex + 1) % images.length;
      showImage();
    }

    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('active')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  </script>
</body>
</html>`;

    await fs.writeFile(galleryPath, html);
    console.log(`\n✅ 图库已生成: ${galleryPath}`);
    return galleryPath;
  }

  async run(startUrl) {
    this.baseUrl = startUrl;
    await this.init();
    
    console.log('🚀 开始下载图片...');
    console.log(`📁 输出目录: ${this.outputDir}`);
    console.log(`📏 最小尺寸: ${this.minWidth}x${this.minHeight}`);
    console.log(`⏱️  下载间隔: ${this.delay}ms`);
    if (this.recursive) {
      console.log(`🔄 递归深度: ${this.maxDepth}`);
    }
    
    await this.processPage(startUrl, 0);
    await this.saveManifest();
    
    console.log(`\n🎉 下载完成！共下载 ${this.allImages.length} 张新图片`);
    
    if (this.allImages.length > 0) {
      await this.generateHtmlGallery();
    }
  }
}
