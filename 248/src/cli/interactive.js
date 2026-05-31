const inquirer = require('inquirer');
const chalk = require('chalk');
const { generateComponent } = require('../generators/componentGenerator');
const { generateASCII } = require('../utils/asciiArt');
const { checkWCAG } = require('../utils/wcagChecker');
const { exportComponent } = require('../utils/exporter');
const { 
  saveInitialVersion, 
  openInEditor, 
  getComponent 
} = require('../utils/versionControl');
const { detectAmbiguities } = require('../utils/ambiguityDetector');
const { getAIConfig } = require('../utils/config');
const aiService = require('../utils/aiService');

async function runInteractive() {
  console.log(chalk.cyan('\n🤖 Welcome to Interactive Component Generator!\n'));

  try {
    const aiConfig = getAIConfig();
    const isConfigured = aiService.isConfigured();
    console.log(chalk.gray(`Using AI provider: ${isConfigured ? `${aiConfig.provider} (${aiConfig.model})` : 'rule-based (no API key configured)'}\n`));

    const mainAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Describe the component you want to generate:',
        default: 'a yellow button with search icon that shows alert on click'
      },
      {
        type: 'list',
        name: 'framework',
        message: 'Choose target framework:',
        choices: ['native', 'react', 'vue'],
        default: 'native'
      },
      {
        type: 'confirm',
        name: 'showASCII',
        message: 'Show ASCII visual preview?',
        default: true
      },
      {
        type: 'confirm',
        name: 'showWCAG',
        message: 'Show WCAG accessibility tips?',
        default: true
      },
      {
        type: 'confirm',
        name: 'doExport',
        message: 'Export as separate component file?',
        default: false
      }
    ]);

    console.log(chalk.gray('\n🔍 Analyzing description for ambiguities...'));
    const ambiguities = await detectAmbiguities(mainAnswers.description);

    if (ambiguities.length > 0) {
      console.log(chalk.yellow('\n⚠️  I need some clarifications:\n'));
      
      const clarificationQuestions = ambiguities.map((item, index) => ({
        type: item.options && item.options.length > 0 ? 'list' : 'input',
        name: `clarification_${index}`,
        message: `${index + 1}. ${item.category}: ${item.question}`,
        choices: item.options && item.options.length > 0 ? item.options : undefined,
        default: item.default || (item.options && item.options[0]) || ''
      }));

      const clarifications = await inquirer.prompt(clarificationQuestions);

      const clarifiedDescription = applyClarifications(
        mainAnswers.description, 
        clarifications, 
        ambiguities
      );
      
      mainAnswers.description = clarifiedDescription;
      console.log(chalk.green('\n✅ Clarifications applied!'));
      console.log(chalk.gray(`   Final description: ${clarifiedDescription}\n`));
    }

    console.log(chalk.gray('\n🤖 Generating component...\n'));
    const result = await generateComponent(mainAnswers.description, mainAnswers.framework);

    console.log(chalk.green(`✅ Generated ${mainAnswers.framework.toUpperCase()} component:`));
    console.log(chalk.gray(`   Component ID: ${result.componentId}`));
    console.log(chalk.gray(`   Name: ${result.name}\n`));
    
    if (mainAnswers.showASCII) {
      console.log(chalk.magenta('📐 Visual Preview (ASCII):\n'));
      const asciiArt = await generateASCII(result);
      console.log(asciiArt);
      console.log('');
    }

    if (mainAnswers.showWCAG) {
      const wcagTips = await checkWCAG(result);
      console.log(chalk.blue('♿ WCAG Accessibility Tips:\n'));
      
      if (wcagTips.summary) {
        console.log(chalk.gray(`   Total: ${wcagTips.summary.total} tips | A:${wcagTips.summary.byLevel.A} AA:${wcagTips.summary.byLevel.AA} AAA:${wcagTips.summary.byLevel.AAA}\n`));
      }
      
      wcagTips.tips.slice(0, 6).forEach((tip, i) => {
        const levelColor = tip.level === 'A' ? chalk.red : tip.level === 'AA' ? chalk.yellow : chalk.blue;
        const severityColor = tip.severity === 'critical' ? chalk.red : tip.severity === 'high' ? chalk.yellow : tip.severity === 'medium' ? chalk.cyan : chalk.gray;
        console.log(`${i + 1}. ${levelColor(`[${tip.level}]`)} ${severityColor(`(${tip.severity})`)} ${chalk.white(tip.description)}`);
        console.log(`   ${chalk.gray(tip.suggestion)}`);
        console.log('');
      });
    }

    console.log(chalk.cyan('📄 Component Code:\n'));
    console.log(result.code);

    console.log(chalk.cyan('\n📖 Usage Example:\n'));
    console.log(result.example);

    console.log(chalk.cyan('\n📝 Properties:\n'));
    Object.entries(result.props).forEach(([key, value]) => {
      console.log(`  ${chalk.yellow(key)}: ${value}`);
    });

    if (mainAnswers.doExport) {
      const exportAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'outputDir',
          message: 'Output directory:',
          default: './output'
        }
      ]);
      
      const exportedPath = await exportComponent(result, mainAnswers.framework, exportAnswers.outputDir);
      console.log(chalk.green(`\n💾 Component exported to: ${exportedPath}`));
    }

    const saved = await saveInitialVersion(mainAnswers.description, result, mainAnswers.framework);
    console.log(chalk.green(`\n💾 Version saved: v${saved.version}`));
    console.log(chalk.gray(`   Component ID: ${saved.componentId}\n`));

    await postGenerationMenu(saved.componentId, result, mainAnswers);

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\n👋 Goodbye!'));
      return;
    }
    console.error(chalk.red('Error:'), error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
  }
}

async function postGenerationMenu(componentId, result, options) {
  while (true) {
    const menuAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '\nWhat would you like to do next?',
        choices: [
          { name: '✏️  Edit code in external editor', value: 'edit' },
          { name: '📦 Regenerate with different description', value: 'regenerate' },
          { name: '💾 Export component to file', value: 'export' },
          { name: '📋 Show component details', value: 'show' },
          { name: '🎉 Finish and exit', value: 'exit' }
        ]
      }
    ]);

    switch (menuAnswer.action) {
      case 'edit':
        await handleEditAction(componentId);
        break;
      case 'regenerate':
        return await runInteractive();
      case 'export':
        await handleExportAction(componentId);
        break;
      case 'show':
        await handleShowAction(componentId);
        break;
      case 'exit':
        console.log(chalk.green('\n🎉 Done! Thank you for using AI Component Generator.'));
        console.log(chalk.gray(`   Component ID: ${componentId}`));
        console.log(chalk.gray(`   To view later: aicg show ${componentId}`));
        console.log(chalk.gray(`   To edit later: aicg edit ${componentId}\n`));
        return;
    }
  }
}

async function handleEditAction(componentId) {
  try {
    const result = await openInEditor(componentId);
    
    if (result.hasChanges) {
      console.log(chalk.green(`\n✅ Changes saved as v${result.newVersion}\n`));
      console.log(chalk.yellow('📊 Changes made:\n'));
      console.log(result.diff);
      
      const showAnswer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'showNew',
          message: 'Show the new version code?',
          default: true
        }
      ]);
      
      if (showAnswer.showNew) {
        const component = getComponent(componentId);
        const newVersion = component.versions[`v${result.newVersion}`];
        console.log(chalk.cyan(`\n📄 v${result.newVersion} Code:\n`));
        console.log(newVersion.code);
      }
    } else {
      console.log(chalk.yellow('\n⚠️  No changes detected. Component was not modified.\n'));
    }
  } catch (error) {
    console.error(chalk.red('Error editing component:'), error.message);
  }
}

async function handleExportAction(componentId) {
  const component = getComponent(componentId);
  if (!component) {
    console.log(chalk.red('Component not found'));
    return;
  }
  
  const versionChoices = Object.keys(component.versions)
    .sort((a, b) => parseInt(b.replace('v', '')) - parseInt(a.replace('v', '')))
    .map(vKey => ({
      name: `${vKey} ${component.versions[vKey].metadata.type === 'original' ? '(original)' : '(modified)'}`,
      value: parseInt(vKey.replace('v', ''))
    }));
  
  const exportAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'version',
      message: 'Which version to export?',
      choices: versionChoices
    },
    {
      type: 'input',
      name: 'outputDir',
      message: 'Output directory:',
      default: './output'
    }
  ]);
  
  const version = component.versions[`v${exportAnswers.version}`];
  const exportResult = {
    name: component.name,
    code: version.code,
    example: version.example
  };
  
  const exportedPath = await exportComponent(exportResult, component.framework, exportAnswers.outputDir);
  console.log(chalk.green(`\n💾 v${exportAnswers.version} exported to: ${exportedPath}\n`));
}

async function handleShowAction(componentId) {
  const component = getComponent(componentId);
  if (!component) {
    console.log(chalk.red('Component not found'));
    return;
  }
  
  console.log(chalk.cyan(`\n📦 Component: ${component.name}`));
  console.log(chalk.gray(`ID: ${component.id}`));
  console.log(chalk.gray(`Framework: ${component.framework}`));
  console.log(chalk.gray(`Description: ${component.description}\n`));
  
  console.log(chalk.magenta(`📚 Version History (${component.versions.length} versions):\n`));
  
  Object.entries(component.versions).forEach(([vKey, vData]) => {
    const meta = vData.metadata;
    const typeIcon = meta.type === 'original' ? '🤖' : '✏️';
    const date = new Date(meta.createdAt).toLocaleString();
    console.log(`  ${vKey} ${typeIcon} ${meta.type} ${chalk.gray('|')} ${date}`);
    if (meta.parentVersion) {
      console.log(`     ${chalk.gray('← derived from v' + meta.parentVersion)}`);
    }
  });
  
  console.log('');
}

function applyClarifications(description, clarifications, ambiguities) {
  let result = description;
  
  Object.entries(clarifications).forEach(([key, value]) => {
    const index = parseInt(key.replace('clarification_', ''));
    const ambiguity = ambiguities[index];
    
    if (!value) return;
    
    const category = ambiguity.category.toLowerCase();
    const valueLower = value.toString().toLowerCase();
    const descLower = result.toLowerCase();
    
    if (!descLower.includes(valueLower)) {
      if (category === 'color') {
        result = `${value} ${result}`;
      } else if (category === 'size') {
        result = `${value} ${result}`;
      } else if (category === 'type') {
        if (!descLower.includes('button') && !descLower.includes('input') && !descLower.includes('card')) {
          result = `${value} ${result}`;
        }
      } else if (category === 'interaction') {
        if (!descLower.includes('click') && !descLower.includes('hover')) {
          result = `${result} that ${value}`;
        }
      } else if (category === 'layout') {
        result = `${result} with ${value} layout`;
      } else if (category === 'content') {
        result = `${result} with content: "${value}"`;
      } else if (category === 'accessibility') {
        result = `${result} (${value})`;
      } else {
        result = `${value} ${result}`;
      }
    }
  });
  
  return result;
}

module.exports = { runInteractive };
