#!/usr/bin/env node

import { Command } from 'commander';
import { ImageDownloader } from './downloader.js';

const program = new Command();

program
  .name('img-downloader')
  .description('批量网页图片下载工具 - 支持尺寸过滤、CSS提取、递归下载、断点续传')
  .version('1.0.0');

program
  .argument('<url>', '要下载图片的网页URL')
  .option('-o, --output <dir>', '输出文件夹路径', './images')
  .option('-w, --min-width <pixels>', '最小图片宽度（像素）', '0')
  .option('-H, --min-height <pixels>', '最小图片高度（像素）', '0')
  .option('-d, --delay <ms>', '下载间隔毫秒数', '0')
  .option('-s, --selector <selector>', 'CSS选择器，只下载匹配的img标签', 'img')
  .option('-r, --recursive', '递归下载链接页面的图片')
  .option('--depth <number>', '递归深度限制', '2')
  .action(async (url, options) => {
    try {
      const downloader = new ImageDownloader({
        outputDir: options.output,
        minWidth: parseInt(options.minWidth),
        minHeight: parseInt(options.minHeight),
        delay: parseInt(options.delay),
        selector: options.selector,
        recursive: options.recursive,
        maxDepth: parseInt(options.depth)
      });

      await downloader.run(url);
    } catch (error) {
      console.error('\n❌ 发生错误:', error.message);
      process.exit(1);
    }
  });

program.addHelpText('after', `

示例:
  # 基本用法 - 下载网页所有图片
  $ img-downloader https://example.com

  # 指定输出目录
  $ img-downloader https://example.com -o ./my-images

  # 只下载宽度大于200像素的图片
  $ img-downloader https://example.com -w 200

  # 设置下载间隔1秒，避免请求过快
  $ img-downloader https://example.com -d 1000

  # 使用CSS选择器过滤
  $ img-downloader https://example.com -s ".content img"

  # 递归下载（深度2）
  $ img-downloader https://example.com -r --depth 2

  # 完整功能示例
  $ img-downloader https://example.com -o ./images -w 200 -d 500 -r --depth 2
`);

program.parse();
