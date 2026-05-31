const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { generateComponent } = require('./componentGenerator');

async function batchGenerate(inputFile, outputDir = './output') {
  try {
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const components = Array.isArray(data) ? data : data.components;

    if (!components || components.length === 0) {
      console.log(chalk.yellow('No components found in the input file.'));
      return;
    }

    console.log(chalk.cyan(`\n📦 Batch generating ${components.length} components...\n`));

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = [];

    for (let i = 0; i < components.length; i++) {
      const comp = components[i];
      const framework = comp.framework || 'native';
      
      console.log(chalk.gray(`  [${i + 1}/${components.length}] Generating: ${comp.name || comp.description}`));
      
      try {
        const result = await generateComponent(comp.description, framework);
        
        const fileName = getFileName(comp.name || result.name, framework);
        const filePath = path.join(outputDir, fileName);
        
        fs.writeFileSync(filePath, result.code, 'utf8');
        
        results.push({
          name: comp.name || result.name,
          framework,
          outputFile: filePath,
          success: true
        });
        
        console.log(chalk.green(`    ✅ Saved to: ${filePath}`));
      } catch (error) {
        results.push({
          name: comp.name,
          framework,
          error: error.message,
          success: false
        });
        console.log(chalk.red(`    ❌ Error: ${error.message}`));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(chalk.green(`\n🎉 Batch generation complete!`));
    console.log(chalk.green(`   Success: ${successCount}`));
    if (failCount > 0) {
      console.log(chalk.red(`   Failed: ${failCount}`));
    }
    console.log(chalk.cyan(`   Output directory: ${path.resolve(outputDir)}\n`));

    return results;
  } catch (error) {
    console.error(chalk.red('Error in batch generation:'), error.message);
    throw error;
  }
}

function getFileName(name, framework) {
  const baseName = name.replace(/[^a-zA-Z0-9]/g, '_');
  
  switch (framework.toLowerCase()) {
    case 'react':
      return `${baseName}.jsx`;
    case 'vue':
      return `${baseName}.vue`;
    case 'native':
    default:
      return `${baseName}.html`;
  }
}

module.exports = { batchGenerate };
