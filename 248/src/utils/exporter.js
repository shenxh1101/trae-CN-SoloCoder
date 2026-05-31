const fs = require('fs');
const path = require('path');

async function exportComponent(result, framework, outputDir = './output') {
  const outputPath = path.resolve(outputDir);
  
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  let fileName, content;

  switch (framework.toLowerCase()) {
    case 'react':
      fileName = `${result.name}.jsx`;
      content = result.code;
      break;
    case 'vue':
      fileName = `${result.name}.vue`;
      content = result.code;
      break;
    case 'native':
    default:
      fileName = `${result.name}.html`;
      content = generateHTMLFile(result);
      break;
  }

  const filePath = path.join(outputPath, fileName);
  fs.writeFileSync(filePath, content, 'utf8');

  return filePath;
}

function generateHTMLFile(result) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${result.name} - Component Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background-color: #f5f5f5;
    }
    .preview-container {
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body>
  <div class="preview-container">
    ${result.code}
  </div>
</body>
</html>`;
}

module.exports = { exportComponent };
