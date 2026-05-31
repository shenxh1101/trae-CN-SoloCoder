const chalk = require('chalk');
const { parseDescription } = require('../src/utils/descriptionParser');
const { generateComponent } = require('../src/generators/componentGenerator');
const { generateASCII } = require('../src/utils/asciiArt');
const { checkWCAG } = require('../src/utils/wcagChecker');
const { detectAmbiguities } = require('../src/utils/ambiguityDetector');
const {
  saveInitialVersion,
  listComponents,
  getComponent,
  generateDiff,
  getFileExtension
} = require('../src/utils/versionControl');
const { getConfig, getAIConfig, setConfigValue } = require('../src/utils/config');
const aiService = require('../src/utils/aiService');

const fs = require('fs');
const path = require('path');

async function runTests() {
  setConfigValue('ai.apiKey', '');
  setConfigValue('ai.provider', 'mock');
  setConfigValue('ai.baseUrl', '');
  console.log(chalk.cyan('\n🧪 Running AI Component Generator Tests\n'));
  
  let passed = 0;
  let failed = 0;
  const testResults = [];

  async function test(name, fn) {
    try {
      console.log(chalk.gray('  Testing ' + name + '...'));
      await fn();
      console.log(chalk.green('    ✅ Passed'));
      passed++;
      testResults.push({ name, status: 'pass' });
    } catch (e) {
      console.log(chalk.red('    ❌ Failed:'), e.message);
      failed++;
      testResults.push({ name, status: 'fail', error: e.message });
    }
  }

  await test('description parser', () => {
    const parsed = parseDescription('a yellow button with search icon');
    if (!(parsed.type === 'button' && parsed.colorName === 'yellow' && parsed.hasIcon === true)) {
      throw new Error('Expected type=button, colorName=yellow, hasIcon=true');
    }
  });

  await test('ambiguous point detection (parser)', () => {
    const parsed = parseDescription('a component with icon');
    if (parsed.ambiguous.length === 0) {
      throw new Error('Expected ambiguous points');
    }
  });

  await test('AI ambiguity detection', async () => {
    const ambiguities = await detectAmbiguities('a button');
    if (!Array.isArray(ambiguities)) {
      throw new Error('Expected array result');
    }
    if (ambiguities.length === 0) {
      throw new Error('Expected at least one ambiguity for vague description');
    }
    const hasCategory = ambiguities.some(a => a.category);
    if (!hasCategory) {
      throw new Error('Expected category field');
    }
  });

  await test('native HTML component generation', async () => {
    const result = await generateComponent('a blue button', 'native');
    if (!result.code.includes('<button') && !result.code.includes('<style>')) {
      throw new Error('Expected <button> and <style>');
    }
    if (!result.componentId) {
      throw new Error('Expected componentId');
    }
    if (!result.name) {
      throw new Error('Expected name');
    }
    if (!result.structure) {
      throw new Error('Expected structure');
    }
  });

  await test('React component generation', async () => {
    const result = await generateComponent('a green rounded button with shadow', 'react');
    if (!result.code.includes('import React') || !result.code.includes('export default')) {
      throw new Error('Expected React imports');
    }
    if (!result.code.includes('borderRadius') || !result.code.includes('boxShadow')) {
      throw new Error('Expected camelCase style properties');
    }
  });

  await test('Vue component generation', async () => {
    const result = await generateComponent('a red button', 'vue');
    if (!result.code.includes('<template>') || !result.code.includes('<script>')) {
      throw new Error('Expected Vue SFC structure');
    }
  });

  await test('component has correct style object format', async () => {
    const result = await generateComponent('a rounded button with shadow', 'react');
    if (result.code.includes('border-radius:')) {
      throw new Error('React style should use camelCase borderRadius, not border-radius');
    }
    if (result.code.includes('box-shadow:')) {
      throw new Error('React style should use camelCase boxShadow, not box-shadow');
    }
  });

  await test('ASCII art generation (async)', async () => {
    const result = await generateComponent('a yellow button', 'native');
    const ascii = await generateASCII(result);
    if (ascii.length === 0) {
      throw new Error('Expected non-empty ASCII art');
    }
  });

  await test('WCAG accessibility checker (async, component-specific)', async () => {
    const result = await generateComponent('a button', 'native');
    const wcagResult = await checkWCAG(result);
    if (!wcagResult.tips || !Array.isArray(wcagResult.tips)) {
      throw new Error('Expected tips array');
    }
    if (!wcagResult.summary) {
      throw new Error('Expected summary');
    }
    const hasButtonTip = wcagResult.tips.some(t => 
      (t.code && t.code.includes('1.4.3')) || t.code.includes('2.4.7'));
    if (!hasButtonTip) {
      throw new Error('Expected button-specific WCAG tips');
    }
  });

  await test('WCAG tips have proper structure', async () => {
    const result = await generateComponent('a form input', 'native');
    const wcagResult = await checkWCAG(result);
    const firstTip = wcagResult.tips[0];
    if (!firstTip.code || !firstTip.level || !firstTip.severity || !firstTip.description) {
      throw new Error('Expected code, level, severity, description fields');
    }
  });

  await test('AI service configuration check', () => {
    const isConfigured = aiService.isConfigured();
    if (typeof isConfigured !== 'boolean') {
      throw new Error('Expected isConfigured to return boolean');
    }
  });

  await test('chatCompletion throws without API key', async () => {
    try {
      await aiService.chatCompletion([{ role: 'user', content: 'test' }]);
      if (aiService.isConfigured()) {
      } else {
        throw new Error('Expected error when API key not configured');
      }
    } catch (error) {
      if (aiService.isConfigured()) {
        throw new Error('Should not throw when API key is configured');
      }
      if (!error.message.includes('AI API key not configured')) {
        throw new Error('Expected API key not configured error, got: ' + error.message);
      }
    }
  });

  await test('extractJSON parses AI responses correctly', () => {
    const plainJSON = '{"key": "value"}';
    const result1 = aiService.extractJSON(plainJSON);
    if (!result1 || result1.key !== 'value') {
      throw new Error('Failed to parse plain JSON');
    }

    const markdownJSON = '```json\n{"key": "value2"}\n```';
    const result2 = aiService.extractJSON(markdownJSON);
    if (!result2 || result2.key !== 'value2') {
      throw new Error('Failed to parse markdown-wrapped JSON');
    }

    const textWithJSON = 'Here is the result:\n{"key": "value3"}\nEnd of response.';
    const result3 = aiService.extractJSON(textWithJSON);
    if (!result3 || result3.key !== 'value3') {
      throw new Error('Failed to extract JSON from surrounding text');
    }

    const invalidJSON = 'This is not JSON at all';
    const result4 = aiService.extractJSON(invalidJSON);
    if (result4 !== null) {
      throw new Error('Expected null for invalid JSON');
    }
  });

  await test('config loading', () => {
    const config = getConfig();
    if (!config.ai || !config.output || !config.features) {
      throw new Error('Expected complete config structure');
    }
  });

  await test('getAIConfig function', () => {
    const aiConfig = getAIConfig();
    if (aiConfig.provider === undefined || aiConfig.model === undefined) {
      throw new Error('Expected AI config with provider and model');
    }
  });

  await test('component ID is UUID format', async () => {
    const result = await generateComponent('a button', 'native');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(result.componentId)) {
      throw new Error('Expected UUID format, got: ' + result.componentId);
    }
  });

  await test('version control - save initial version', async () => {
    const result = await generateComponent('a purple test button', 'native');
    const saved = await saveInitialVersion('a purple test button', result, 'native');
    if (!saved.componentId || saved.version !== 1 || !saved.path) {
      throw new Error('Expected save result with componentId, version, path');
    }
    if (!fs.existsSync(saved.path)) {
      throw new Error('Expected version directory to exist');
    }
  });

  await test('version control - list components', async () => {
    const components = listComponents(5);
    if (!Array.isArray(components)) {
      throw new Error('Expected array');
    }
  });

  await test('version control - get component', async () => {
    const result = await generateComponent('a orange test button', 'native');
    await saveInitialVersion('a orange test button', result, 'native');
    const component = getComponent(result.componentId);
    if (!component || component.id !== result.componentId) {
      throw new Error('Expected to retrieve component by ID');
    }
    if (!component.versions || !component.versions['v1']) {
      throw new Error('Expected versions object');
    }
  });

  await test('version control - getComponent with versions', async () => {
    const result = await generateComponent('a pink test button', 'native');
    await saveInitialVersion('a pink test button', result, 'native');
    const component = getComponent(result.componentId);
    const v1 = component.versions['v1'];
    if (!v1 || !v1.metadata || !v1.code) {
      throw new Error('Expected v1 with metadata and code');
    }
  });

  await test('generateDiff function', () => {
    const original = 'line1\nline2\nline3';
    const modified = 'line1\nline2 changed\nline3';
    const diff = generateDiff(original, modified);
    if (diff.length === 0) {
      throw new Error('Expected non-empty diff');
    }
    if (!diff.includes('- line2') || !diff.includes('+ line2 changed')) {
      throw new Error('Expected diff to contain changed lines');
    }
  });

  await test('getFileExtension function', () => {
    if (getFileExtension('react') !== 'jsx') throw new Error('react should be jsx');
    if (getFileExtension('vue') !== 'vue') throw new Error('vue should be vue');
    if (getFileExtension('native') !== 'html') throw new Error('native should be html');
  });

  await test('component structure includes states and events', async () => {
    const result = await generateComponent('a button with click handler', 'native');
    if (!result.structure || !result.structure.states) {
      throw new Error('Expected structure with states');
    }
    if (!Array.isArray(result.structure.states)) {
      throw new Error('Expected states to be array');
    }
  });

  await test('WCAG for input components has label association tip', async () => {
    const result = await generateComponent('a text input field', 'native');
    result.type = 'input';
    result.structure = { ...result.structure, type: 'input' };
    const wcagResult = await checkWCAG(result);
    const hasLabelTip = wcagResult.tips.some(t => 
      t.description && t.description.toLowerCase().includes('label'));
    if (!hasLabelTip) {
      throw new Error('Expected input to have label association tip');
    }
  });

  await test('WCAG tips include code examples', async () => {
    const result = await generateComponent('a button', 'native');
    const wcagResult = await checkWCAG(result);
    const tipsWithExamples = wcagResult.tips.filter(t => t.codeExample);
    if (tipsWithExamples.length === 0) {
      throw new Error('Expected at least some tips with code examples');
    }
  });

  await test('ASCII art includes states preview', async () => {
    const result = await generateComponent('a button', 'native');
    const ascii = await generateASCII(result);
    const hasStates = ascii.includes('Visual States') || ascii.includes('Hover') || ascii.includes('Focus') || ascii.includes('States Preview');
    if (!hasStates) {
      throw new Error('Expected ASCII to include states information');
    }
  });

  console.log(chalk.cyan('\n📊 Test Results: ' + passed + ' passed, ' + failed + ' failed\n'));
  
  if (failed === 0) {
    console.log(chalk.green('🎉 All tests passed!\n'));
  } else {
    console.log(chalk.yellow('⚠️  Some tests failed. Details:\n'));
    testResults.filter(r => r.status === 'fail').forEach(r => {
      console.log(chalk.red('  ❌ ' + r.name + ': ' + r.error));
    });
    console.log('');
  }
  
  return failed === 0;
}

runTests().catch(e => {
  console.error(chalk.red('Fatal error:'), e);
  process.exit(1);
});
