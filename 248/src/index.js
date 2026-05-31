const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const { runInteractive } = require('./cli/interactive');
const { generateComponent } = require('./generators/componentGenerator');
const { batchGenerate } = require('./generators/batchGenerator');
const { exportComponent } = require('./utils/exporter');
const { parseDescription } = require('./utils/descriptionParser');
const { checkWCAG } = require('./utils/wcagChecker');
const { generateASCII } = require('./utils/asciiArt');
const { 
  saveInitialVersion, 
  openInEditor, 
  listComponents, 
  getComponent,
  getVersionById
} = require('./utils/versionControl');
const { detectAmbiguities } = require('./utils/ambiguityDetector');
const { getConfig, saveConfig, setConfigValue, getAIConfig } = require('./utils/config');
const aiService = require('./utils/aiService');

async function main() {
  console.log(chalk.cyan(figlet.textSync('AI CompGen', { horizontalLayout: 'full' })));
  console.log(chalk.gray('AI-powered Frontend Component Generator\n'));

  program
    .name('aicg')
    .description('AI-powered frontend component code generator')
    .version('1.0.0');

  program
    .command('generate')
    .description('Generate a component from natural language description')
    .option('-d, --description <text>', 'Component description')
    .option('-f, --framework <type>', 'Target framework: native|react|vue', 'native')
    .option('-o, --output <path>', 'Output directory')
    .option('--ascii', 'Generate ASCII visual preview')
    .option('--wcag', 'Show WCAG accessibility tips')
    .option('--export', 'Export as separate component file')
    .action(async (options) => {
      if (!options.description) {
        console.log(chalk.yellow('Please provide a description with -d or use interactive mode'));
        return;
      }
      await handleGenerate(options);
    });

  program
    .command('interactive')
    .description('Run in interactive mode')
    .action(async () => {
      await runInteractive();
    });

  program
    .command('batch')
    .description('Batch generate components from JSON file')
    .option('-i, --input <file>', 'Input JSON file path')
    .option('-o, --output <dir>', 'Output directory')
    .action(async (options) => {
      if (!options.input) {
        console.log(chalk.red('Please provide an input JSON file with -i'));
        return;
      }
      await batchGenerate(options.input, options.output);
    });

  program
    .command('config')
    .description('Manage configuration (API keys, model settings)')
    .option('-s, --set <key=value>', 'Set a configuration value (e.g., ai.provider=openai)')
    .option('-g, --get <key>', 'Get a configuration value')
    .option('-l, --list', 'List all configuration values')
    .action(async (options) => {
      await handleConfig(options);
    });

  program
    .command('list')
    .description('List all generated components')
    .option('-l, --limit <number>', 'Number of components to show', '20')
    .action(async (options) => {
      await handleList(options);
    });

  program
    .command('show <componentId>')
    .description('Show component details and version history')
    .option('-v, --version <number>', 'Show specific version')
    .action(async (componentId, options) => {
      await handleShow(componentId, options);
    });

  program
    .command('edit <componentId>')
    .description('Edit component code and save as new version')
    .option('-v, --version <number>', 'Edit specific version (default: latest)')
    .action(async (componentId, options) => {
      await handleEdit(componentId, options);
    });

  program
    .command('export <componentId>')
    .description('Export a component to file')
    .option('-v, --version <number>', 'Export specific version (default: latest)')
    .option('-o, --output <path>', 'Output directory')
    .action(async (componentId, options) => {
      await handleExportComponent(componentId, options);
    });

  program.parse(process.argv);

  if (process.argv.length <= 2) {
    program.outputHelp();
  }
}

async function handleGenerate(options) {
  try {
    console.log(chalk.gray('\n🔍 Analyzing description for ambiguities...'));
    const ambiguities = await detectAmbiguities(options.description);
    
    if (ambiguities.length > 0) {
      console.log(chalk.yellow('\n⚠️  Detected ambiguous points in description:'));
      ambiguities.forEach((item, i) => {
        console.log(chalk.yellow(`  ${i + 1}. ${item.category}: ${item.question}`));
        if (item.options && item.options.length > 0) {
          console.log(chalk.gray(`     Suggestions: ${item.options.join(', ')}`));
        }
      });
      console.log(chalk.gray('  Using default values. Use interactive mode for clarifying questions.\n'));
    }

    const aiConfig = getAIConfig();
    const isConfigured = aiService.isConfigured();
    console.log(chalk.gray(`\n🤖 Using AI provider: ${isConfigured ? `${aiConfig.provider} (${aiConfig.model})` : 'rule-based (no API key configured)'}\n`));

    const result = await generateComponent(options.description, options.framework);

    console.log(chalk.green(`\n✅ Generated ${options.framework.toUpperCase()} component:`));
    console.log(chalk.gray(`   Component ID: ${result.componentId}`));
    console.log(chalk.gray(`   Name: ${result.name}\n`));
    
    if (options.ascii) {
      console.log(chalk.magenta('📐 Visual Preview (ASCII):\n'));
      const asciiArt = await generateASCII(result);
      console.log(asciiArt);
      console.log('');
    }

    if (options.wcag) {
      const wcagTips = await checkWCAG(result);
      console.log(chalk.blue('♿ WCAG Accessibility Tips:\n'));
      
      if (wcagTips.summary) {
        console.log(chalk.gray(`   Total: ${wcagTips.summary.total} tips | A:${wcagTips.summary.byLevel.A} AA:${wcagTips.summary.byLevel.AA} AAA:${wcagTips.summary.byLevel.AAA}\n`));
      }
      
      wcagTips.tips.slice(0, 8).forEach((tip, i) => {
        const levelColor = tip.level === 'A' ? chalk.red : tip.level === 'AA' ? chalk.yellow : chalk.blue;
        const severityColor = tip.severity === 'critical' ? chalk.red : tip.severity === 'high' ? chalk.yellow : tip.severity === 'medium' ? chalk.cyan : chalk.gray;
        console.log(`${i + 1}. ${levelColor(`[${tip.level}]`)} ${severityColor(`(${tip.severity})`)} ${chalk.white(tip.description)}`);
        console.log(`   ${chalk.gray(tip.detail)}`);
        if (tip.suggestion) {
          console.log(`   ${chalk.green('💡 ' + tip.suggestion)}`);
        }
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

    if (options.export) {
      const exportedPath = await exportComponent(result, options.framework, options.output);
      console.log(chalk.green(`\n💾 Component exported to: ${exportedPath}`));
    }

    const saved = await saveInitialVersion(options.description, result, options.framework);
    console.log(chalk.green(`\n💾 Version saved: v${saved.version}`));
    console.log(chalk.gray(`   To edit: aicg edit ${saved.componentId}`));
    console.log(chalk.gray(`   To view: aicg show ${saved.componentId}`));

  } catch (error) {
    console.error(chalk.red('Error generating component:'), error.message);
    if (error.stack && process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
  }
}

async function handleConfig(options) {
  const config = getConfig();
  
  if (options.list) {
    console.log(chalk.cyan('\n📋 Current Configuration:\n'));
    printConfigRecursive(config, '');
    console.log(chalk.gray('\nConfig file location: ~/.aicg/config.json'));
    return;
  }
  
  if (options.get) {
    const value = getNestedValue(config, options.get);
    if (value !== undefined) {
      console.log(`${chalk.yellow(options.get)} = ${chalk.white(JSON.stringify(value, null, 2))}`);
    } else {
      console.log(chalk.red(`Key not found: ${options.get}`));
    }
    return;
  }
  
  if (options.set) {
    const [key, ...valueParts] = options.set.split('=');
    const value = valueParts.join('=');
    
    if (!key || value === undefined) {
      console.log(chalk.red('Invalid format. Use: key=value'));
      return;
    }
    
    try {
      const parsedValue = JSON.parse(value);
      setConfigValue(key, parsedValue);
      console.log(chalk.green(`✅ Set ${key} = ${JSON.stringify(parsedValue)}`));
    } catch (e) {
      setConfigValue(key, value);
      console.log(chalk.green(`✅ Set ${key} = "${value}"`));
    }
  }
  
  if (!options.list && !options.get && !options.set) {
    console.log(chalk.cyan('\n⚙️  Configuration Management\n'));
    console.log(chalk.gray('Available commands:'));
    console.log('  aicg config --list                    ' + chalk.gray('Show all config'));
    console.log('  aicg config --get ai.provider         ' + chalk.gray('Get specific value'));
    console.log('  aicg config --set ai.provider=openai  ' + chalk.gray('Set value'));
    console.log('  aicg config --set ai.apiKey=sk-xxx    ' + chalk.gray('Set API key'));
    console.log('  aicg config --set ai.baseUrl=http://localhost:11434/v1 ' + chalk.gray('Local LLM'));
  }
}

function printConfigRecursive(obj, prefix) {
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      printConfigRecursive(value, fullKey);
    } else {
      const displayValue = typeof value === 'string' && value.includes('key') && value.length > 8
        ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
        : JSON.stringify(value);
      console.log(`  ${chalk.yellow(fullKey)} = ${chalk.white(displayValue)}`);
    }
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

async function handleList(options) {
  const components = listComponents(parseInt(options.limit) || 20);
  
  if (components.length === 0) {
    console.log(chalk.yellow('\n📭 No components found. Generate one with: aicg generate -d "..."\n'));
    return;
  }
  
  console.log(chalk.cyan(`\n📋 Components (${components.length}):\n`));
  components.forEach((comp, i) => {
    const date = new Date(comp.updatedAt).toLocaleString();
    console.log(`${i + 1}. ${chalk.white(comp.name)} ${chalk.gray('[' + comp.framework + ']')}`);
    console.log(`   ${chalk.cyan('ID:')} ${comp.id}`);
    console.log(`   ${chalk.cyan('Versions:')} v1 → v${comp.latestVersion} (${comp.versions.length} total)`);
    console.log(`   ${chalk.cyan('Updated:')} ${date}`);
    console.log(`   ${chalk.cyan('Desc:')} ${chalk.gray(comp.description.substring(0, 60))}${comp.description.length > 60 ? '...' : ''}`);
    console.log('');
  });
}

async function handleShow(componentId, options) {
  const component = getComponent(componentId);
  
  if (!component) {
    console.log(chalk.red(`\n❌ Component not found: ${componentId}\n`));
    return;
  }
  
  console.log(chalk.cyan(`\n📦 Component: ${component.name}`));
  console.log(chalk.gray(`ID: ${component.id}`));
  console.log(chalk.gray(`Framework: ${component.framework}`));
  console.log(chalk.gray(`Created: ${new Date(component.createdAt).toLocaleString()}`));
  console.log(chalk.gray(`Updated: ${new Date(component.updatedAt).toLocaleString()}`));
  console.log(chalk.gray(`Description: ${component.description}\n`));
  
  if (options.version) {
    const version = component.versions[`v${options.version}`];
    if (!version) {
      console.log(chalk.red(`\n❌ Version v${options.version} not found\n`));
      return;
    }
    
    console.log(chalk.magenta(`\n📄 Version v${options.version} (${version.metadata.type}):\n`));
    console.log(chalk.cyan('Code:\n'));
    console.log(version.code);
    
    if (version.diff) {
      console.log(chalk.yellow('\n📊 Changes from previous version:\n'));
      console.log(version.diff);
    }
  } else {
    console.log(chalk.magenta(`\n📚 Version History (${component.versions.length} versions):\n`));
    Object.entries(component.versions).forEach(([vKey, vData]) => {
      const meta = vData.metadata;
      const typeIcon = meta.type === 'original' ? '🤖' : '✏️';
      const date = new Date(meta.createdAt).toLocaleString();
      console.log(`  ${vKey} ${typeIcon} ${meta.type} ${chalk.gray('|')} ${date}`);
      if (meta.parentVersion) {
        console.log(`     ${chalk.gray('← derived from v' + meta.parentVersion)}`);
      }
      console.log('');
    });
    
    const latest = component.versions[`v${component.latestVersion}`];
    console.log(chalk.magenta(`\n📄 Latest Version (v${component.latestVersion}):\n`));
    console.log(chalk.cyan('Code:\n'));
    console.log(latest.code);
  }
  
  console.log(chalk.gray(`\nCommands:`));
  console.log(chalk.gray(`  Edit:   aicg edit ${componentId}`));
  console.log(chalk.gray(`  Export: aicg export ${componentId}`));
}

async function handleEdit(componentId, options) {
  try {
    const result = await openInEditor(componentId, options.version ? parseInt(options.version) : null);
    
    if (result.hasChanges) {
      console.log(chalk.green(`\n✅ Changes saved as v${result.newVersion}\n`));
      console.log(chalk.yellow('📊 Changes made:\n'));
      console.log(result.diff);
      console.log(chalk.gray(`\nView changes: aicg show ${componentId} -v ${result.newVersion}`));
    } else {
      console.log(chalk.yellow('\n⚠️  No changes detected. Component was not modified.\n'));
    }
  } catch (error) {
    console.error(chalk.red('Error editing component:'), error.message);
  }
}

async function handleExportComponent(componentId, options) {
  const component = getComponent(componentId);
  
  if (!component) {
    console.log(chalk.red(`\n❌ Component not found: ${componentId}\n`));
    return;
  }
  
  const versionNum = options.version || component.latestVersion;
  const version = component.versions[`v${versionNum}`];
  
  if (!version) {
    console.log(chalk.red(`\n❌ Version v${versionNum} not found\n`));
    return;
  }
  
  const result = {
    name: component.name,
    code: version.code,
    example: version.example
  };
  
  const exportedPath = await exportComponent(result, component.framework, options.output);
  console.log(chalk.green(`\n💾 v${versionNum} exported to: ${exportedPath}\n`));
}

module.exports = { main, handleGenerate, handleConfig, handleList, handleShow, handleEdit, handleExportComponent };
