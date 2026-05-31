const chalk = require('chalk');
const { createMockAIServer } = require('./mock-ai-server');
const { generateComponent } = require('../src/generators/componentGenerator');
const { generateASCII } = require('../src/utils/asciiArt');
const { checkWCAG } = require('../src/utils/wcagChecker');
const { detectAmbiguities } = require('../src/utils/ambiguityDetector');
const { setConfigValue, getAIConfig } = require('../src/utils/config');
const aiService = require('../src/utils/aiService');

async function runE2ETests() {
  console.log(chalk.cyan('\n🔌 E2E Integration Test: Real AI API Flow\n'));
  
  const SERVER_PORT = 18488;
  const BASE_URL = `http://localhost:${SERVER_PORT}/v1/chat/completions`;

  console.log(chalk.gray('1. Starting mock AI server...'));
  const server = await createMockAIServer(SERVER_PORT);
  console.log(chalk.green('   ✅ Mock AI server started on port ' + SERVER_PORT));

  console.log(chalk.gray('\n2. Configuring aicg to use mock AI server...'));
  setConfigValue('ai.apiKey', 'test-key-for-e2e');
  setConfigValue('ai.provider', 'openai');
  setConfigValue('ai.baseUrl', BASE_URL);
  setConfigValue('ai.model', 'mock-model');
  
  aiService.config = require('../src/utils/config').getConfig();
  
  const aiConfig = getAIConfig();
  console.log(chalk.green('   ✅ AI config updated:'));
  console.log(chalk.gray(`      provider: ${aiConfig.provider}`));
  console.log(chalk.gray(`      baseUrl: ${aiConfig.baseUrl}`));
  console.log(chalk.gray(`      model: ${aiConfig.model}`));
  console.log(chalk.gray(`      apiKey: ${aiConfig.apiKey ? '***configured***' : 'not set'}`));
  console.log(chalk.gray(`      isConfigured: ${aiService.isConfigured()}`));

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      console.log(chalk.gray('\n   Testing ' + name + '...'));
      await fn();
      console.log(chalk.green('   ✅ Passed'));
      passed++;
    } catch (e) {
      console.log(chalk.red('   ❌ Failed:'), e.message);
      failed++;
    }
  }

  console.log(chalk.cyan('\n3. Running E2E Tests with AI API\n'));

  await test('chatCompletion connects to API', async () => {
    const response = await aiService.chatCompletion([
      { role: 'user', content: 'test message' }
    ]);
    if (!response.content) {
      throw new Error('Expected content in response');
    }
    if (!response.model) {
      throw new Error('Expected model in response');
    }
    console.log(chalk.gray('      Response model: ' + response.model));
  });

  await test('componentGenerator - native (AI)', async () => {
    const result = await generateComponent('a blue button with icon', 'native');
    if (!result.code) throw new Error('Expected code');
    if (!result.name) throw new Error('Expected name');
    if (!result.structure) throw new Error('Expected structure');
    if (!result.componentId) throw new Error('Expected componentId');
    if (result.isAIGenerated !== true) throw new Error('Expected isAIGenerated=true, got: ' + result.isAIGenerated);
    console.log(chalk.gray('      Name: ' + result.name));
    console.log(chalk.gray('      AI Generated: ' + result.isAIGenerated));
    console.log(chalk.gray('      Code length: ' + result.code.length + ' chars'));
  });

  await test('componentGenerator - react (AI)', async () => {
    const result = await generateComponent('a green rounded button', 'react');
    if (!result.code.includes('import React')) throw new Error('Expected React import');
    if (!result.code.includes('borderRadius')) throw new Error('Expected camelCase borderRadius');
    if (result.isAIGenerated !== true) throw new Error('Expected isAIGenerated=true');
    console.log(chalk.gray('      Name: ' + result.name));
    console.log(chalk.gray('      Has React import: ' + result.code.includes('import React')));
  });

  await test('componentGenerator - vue (AI)', async () => {
    const result = await generateComponent('a red button', 'vue');
    if (!result.code.includes('<template>')) throw new Error('Expected Vue template');
    if (!result.code.includes('<script>')) throw new Error('Expected Vue script');
    if (result.isAIGenerated !== true) throw new Error('Expected isAIGenerated=true');
    console.log(chalk.gray('      Name: ' + result.name));
  });

  await test('ambiguityDetector (AI)', async () => {
    const ambiguities = await detectAmbiguities('a button');
    if (!Array.isArray(ambiguities)) throw new Error('Expected array');
    if (ambiguities.length === 0) throw new Error('Expected at least 1 ambiguity');
    if (!ambiguities[0].category) throw new Error('Expected category field');
    if (!ambiguities[0].question) throw new Error('Expected question field');
    console.log(chalk.gray('      Found ' + ambiguities.length + ' ambiguous points'));
    ambiguities.forEach((a, i) => console.log(chalk.gray('      ' + (i+1) + '. ' + a.category + ': ' + a.question)));
  });

  await test('asciiArt (AI)', async () => {
    const result = await generateComponent('a button with search icon', 'native');
    const ascii = await generateASCII(result);
    if (!ascii || ascii.length === 0) throw new Error('Expected non-empty ASCII');
    if (!ascii.includes('Visual States')) throw new Error('Expected Visual States in ASCII');
    if (!ascii.includes('button')) throw new Error('Expected button reference in ASCII');
    console.log(chalk.gray('      ASCII length: ' + ascii.length + ' chars'));
    console.log(chalk.gray('      Has Visual States: ' + ascii.includes('Visual States')));
  });

  await test('wcagChecker (AI)', async () => {
    const result = await generateComponent('a button', 'native');
    const wcagResult = await checkWCAG(result);
    if (!wcagResult.tips || !Array.isArray(wcagResult.tips)) throw new Error('Expected tips array');
    if (!wcagResult.summary) throw new Error('Expected summary');
    if (wcagResult.tips.length === 0) throw new Error('Expected at least 1 tip');
    const tip = wcagResult.tips[0];
    if (!tip.code || !tip.level || !tip.severity) throw new Error('Expected code, level, severity');
    console.log(chalk.gray('      Tips: ' + wcagResult.tips.length));
    console.log(chalk.gray('      Summary: ' + JSON.stringify(wcagResult.summary)));
  });

  await test('wcagChecker - input with label (AI)', async () => {
    const result = await generateComponent('a text input field', 'native');
    result.type = 'input';
    result.structure = { ...result.structure, type: 'input' };
    const wcagResult = await checkWCAG(result);
    const hasLabelTip = wcagResult.tips.some(t => 
      t.description && t.description.toLowerCase().includes('label'));
    if (!hasLabelTip) throw new Error('Expected label association tip for input');
    console.log(chalk.gray('      Has label tip: true'));
  });

  console.log(chalk.cyan('\n4. Cleanup\n'));
  
  setConfigValue('ai.apiKey', '');
  setConfigValue('ai.provider', 'mock');
  setConfigValue('ai.baseUrl', '');
  aiService.config = require('../src/utils/config').getConfig();
  
  await new Promise(resolve => server.close(resolve));
  console.log(chalk.green('   ✅ Mock server stopped, AI config reset'));

  console.log(chalk.cyan('\n📊 E2E Test Results: ' + passed + ' passed, ' + failed + ' failed\n'));
  
  if (failed === 0) {
    console.log(chalk.green('🎉 All E2E tests passed! AI integration verified.\n'));
  } else {
    console.log(chalk.yellow('⚠️  Some E2E tests failed.\n'));
  }

  return failed === 0;
}

runE2ETests().catch(e => {
  console.error(chalk.red('Fatal error:'), e);
  process.exit(1);
});
