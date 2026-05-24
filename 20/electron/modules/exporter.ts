import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';

export async function exportPdf(html: string, outputPath: string): Promise<boolean> {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 1.5em; }
    pre { background: #f5f5f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
    const htmlPath = outputPath.replace(/\.pdf$/, '.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
    fs.writeFileSync(outputPath, htmlContent, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export async function exportHtml(html: string, outputPath: string, includeStyles = true): Promise<boolean> {
  try {
    let htmlContent = html;
    if (includeStyles) {
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #333; }
    h1 { font-size: 2em; font-weight: 700; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; }
    h3 { font-size: 1.25em; font-weight: 600; margin-top: 1.25em; margin-bottom: 0.5em; }
    p { margin-bottom: 1em; }
    ul, ol { padding-left: 1.5em; margin-bottom: 1em; }
    li { margin-bottom: 0.25em; }
    pre { background: #f8f9fa; padding: 16px; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; }
    code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.9em; background: #f1f3f5; padding: 2px 6px; border-radius: 4px; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #1e40af; margin: 1em 0; padding: 0.5em 1em; background: #f8fafc; color: #475569; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    a { color: #1e40af; text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 2em 0; }
  </style>
</head>
<body>
${html}
</body>
</html>`;
    }
    fs.writeFileSync(outputPath, htmlContent, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

export async function exportImage(imageData: string, outputPath: string): Promise<boolean> {
  try {
    const data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(outputPath, buffer);
    return true;
  } catch {
    return false;
  }
}

export async function exportZip(notebookPath: string, outputPath: string): Promise<boolean> {
  try {
    const zip = new JSZip();

    function addDirectoryToZip(dirPath: string, zipFolder: JSZip) {
      const entries = fs.readdirSync(dirPath);
      entries.forEach(entry => {
        if (entry.startsWith('.')) return;
        const fullPath = path.join(dirPath, entry);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          const newFolder = zipFolder.folder(entry);
          if (newFolder) {
            addDirectoryToZip(fullPath, newFolder);
          }
        } else {
          const content = fs.readFileSync(fullPath);
          zipFolder.file(entry, content);
        }
      });
    }

    addDirectoryToZip(notebookPath, zip);
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(outputPath, content);
    return true;
  } catch {
    return false;
  }
}
