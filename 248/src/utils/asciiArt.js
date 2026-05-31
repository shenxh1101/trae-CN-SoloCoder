const aiService = require('./aiService');
const { parseDescription } = require('./descriptionParser');

async function generateASCII(parsedOrDescription) {
  let parsed, description;
  
  if (typeof parsedOrDescription === 'string') {
    description = parsedOrDescription;
    parsed = parseDescription(description);
  } else {
    parsed = parsedOrDescription;
    description = parsed.description || parsed.raw || '';
  }

  try {
    return await generateWithAI(parsed, description);
  } catch (error) {
    if (!error.message.includes('AI API key not configured')) {
      console.warn('AI ASCII generation failed, falling back to dynamic generation:', error.message);
    }
    return generateDynamic(parsed);
  }
}

async function generateWithAI(parsed, description) {
  const structure = parsed.structure || {};
  const messages = [
    {
      role: 'system',
      content: `You are an expert ASCII artist and UI designer. Create detailed ASCII art visualizations of UI components.

Guidelines for ASCII art:
1. Use box-drawing characters (┌┐└┘─│╭╮╰╯╔╗╚╝═║)
2. Include multiple states if applicable (normal, hover, active, disabled)
3. Show component structure with labels for key elements
4. Include dimensions and spacing information
5. Use emojis sparingly for visual emphasis (🔍, ✅, ❌, ⚙️, 📷, 🎨, etc.)
6. Keep width between 40-60 characters for readability
7. Show both the visual representation AND structural information

Return ONLY the ASCII art as plain text, no explanations, no code blocks.`
    },
    {
      role: 'user',
      content: `Create an ASCII art visualization for this UI component:

Component Description: "${description}"

Component Details:
- Type: ${parsed.type || 'button'}
- Color: ${parsed.colorName || 'blue'}
- Size: ${parsed.size || 'medium'}
- Has Icon: ${parsed.hasIcon}${parsed.iconType ? ` (${parsed.iconType})` : ''}
- Features: ${parsed.features?.join(', ') || 'none'}

${structure.type ? `Structure:
- Type: ${structure.type}
- Children: ${structure.children?.join(', ') || 'none'}
- Events: ${structure.events?.join(', ') || 'none'}
- States: ${structure.states?.join(', ') || 'none'}
${structure.dimensions ? `- Dimensions: ${JSON.stringify(structure.dimensions)}` : ''}` : ''}

Generate a detailed ASCII art showing:
1. The component in normal state
2. Visual representation of all states
3. Structural breakdown
4. Key dimensions`
    }
  ];

  const response = await aiService.chatCompletion(messages);
  return response.content.trim();
}

function generateDynamic(parsed) {
  const { type, colorName, size, hasIcon, iconType, features, structure } = parsed;
  const width = getWidth(size);
  const colorEmoji = getColorEmoji(colorName);
  const iconChar = getIconChar(iconType);
  
  const isRounded = features?.includes('rounded');
  const hasShadow = features?.includes('shadow');
  
  let ascii = '';
  
  switch (type) {
    case 'input':
      ascii = generateInputASCII(width, parsed, structure);
      break;
    case 'card':
      ascii = generateCardASCII(width, parsed, structure);
      break;
    case 'modal':
      ascii = generateModalASCII(width, parsed, structure);
      break;
    case 'navbar':
      ascii = generateNavbarASCII(width, parsed, structure);
      break;
    case 'dropdown':
      ascii = generateDropdownASCII(width, parsed, structure);
      break;
    case 'alert':
      ascii = generateAlertASCII(width, parsed, structure);
      break;
    case 'form':
      ascii = generateFormASCII(width, parsed, structure);
      break;
    case 'button':
    default:
      ascii = generateButtonASCII(width, parsed, structure);
      break;
  }
  
  ascii += `\n\n${'═'.repeat(width)}\n`;
  ascii += generateStructureInfo(parsed, structure);
  ascii += generateStatesInfo(parsed, structure);
  ascii += generateDimensionsInfo(parsed, structure);
  
  return ascii;
}

function generateButtonASCII(width, parsed, structure) {
  const { colorName, hasIcon, iconType, features } = parsed;
  const colorEmoji = getColorEmoji(colorName);
  const iconChar = getIconChar(iconType);
  const isRounded = features?.includes('rounded');
  
  const topLeft = isRounded ? '╭' : '┌';
  const topRight = isRounded ? '╮' : '┐';
  const bottomLeft = isRounded ? '╰' : '└';
  const bottomRight = isRounded ? '╯' : '┘';
  const hLine = '─'.repeat(width - 2);
  
  const iconContent = hasIcon ? `${iconChar} ` : '';
  const content = `${iconContent}${colorEmoji}  Action Button`;
  const padding = Math.floor((width - 2 - content.length) / 2);
  const paddedContent = ' '.repeat(Math.max(0, padding)) + content + ' '.repeat(Math.max(0, width - 2 - content.length - padding));
  
  const states = structure?.states || ['hover', 'active', 'focus', 'disabled'];
  
  let ascii = '';
  
  ascii += `${topLeft}${hLine}${topRight}\n`;
  ascii += `│${' '.repeat(width - 2)}│\n`;
  ascii += `│${paddedContent.slice(0, width - 2)}│  ← Normal State\n`;
  ascii += `│${' '.repeat(width - 2)}│\n`;
  ascii += `${bottomLeft}${hLine}${bottomRight}\n`;
  
  if (states.length > 0) {
    ascii += '\n  States Preview:\n';
    ascii += `  ${'─'.repeat(Math.min(width - 4, 30))}\n`;
    
    const statePreviews = [];
    if (states.includes('hover')) {
      statePreviews.push('Hover: ↑ + opacity 90%');
    }
    if (states.includes('active')) {
      statePreviews.push('Active: ↓ + scale 98%');
    }
    if (states.includes('focus')) {
      statePreviews.push('Focus: [outline: 2px]');
    }
    if (states.includes('disabled')) {
      statePreviews.push('Disabled: opacity 60%');
    }
    
    statePreviews.forEach((state, i) => {
      ascii += `  • ${state}\n`;
    });
  }
  
  return ascii;
}

function generateInputASCII(width, parsed, structure) {
  const { hasIcon, iconType, colorName, features } = parsed;
  const colorEmoji = getColorEmoji(colorName);
  const iconChar = getIconChar(iconType);
  const hLine = '─'.repeat(width - 2);
  
  const placeholder = hasIcon ? `${iconChar}  Enter your text here...` : '  Type something...';
  const paddedPlaceholder = placeholder.padEnd(width - 2, ' ');
  
  let ascii = '';
  
  ascii += `  Label Text ${colorEmoji}\n`;
  ascii += `  ${'─'.repeat(Math.min(30, width - 6))}\n\n`;
  ascii += `┌${hLine}┐\n`;
  ascii += `│${paddedPlaceholder.slice(0, width - 2)}│  ← Normal\n`;
  ascii += `└${hLine}┘\n`;
  
  if (structure?.states?.includes('focus')) {
    ascii += '\n  Focus State:\n';
    ascii += `  ╔${'═'.repeat(width - 2)}╗\n`;
    ascii += `  ║  ${iconChar}  | with cursor...${' '.repeat(Math.max(0, width - 30))}║  ← Border: 2px\n`;
    ascii += `  ╚${'═'.repeat(width - 2)}╝\n`;
  }
  
  if (features?.includes('search')) {
    ascii += '\n  Suggestions Dropdown:\n';
    ascii += `  ┌${hLine}┐\n`;
    ascii += `  │  Suggestion option 1${' '.repeat(Math.max(0, width - 25))}│\n`;
    ascii += `  │  Suggestion option 2${' '.repeat(Math.max(0, width - 25))}│\n`;
    ascii += `  │  Suggestion option 3${' '.repeat(Math.max(0, width - 25))}│\n`;
    ascii += `  └${hLine}┘\n`;
  }
  
  return ascii;
}

function generateCardASCII(width, parsed, structure) {
  const { colorName, features } = parsed;
  const colorEmoji = getColorEmoji(colorName);
  const hLine = '─'.repeat(width - 2);
  const isRounded = features?.includes('rounded');
  
  const topLeft = isRounded ? '╭' : '┌';
  const topRight = isRounded ? '╮' : '┐';
  const bottomLeft = isRounded ? '╰' : '└';
  const bottomRight = isRounded ? '╯' : '┘';
  
  let ascii = '';
  
  ascii += `${topLeft}${hLine}${topRight}\n`;
  ascii += `│${' '.repeat(width - 2)}│\n`;
  ascii += `│  📷  ${'█'.repeat(Math.min(30, width - 12))}${' '.repeat(Math.max(0, width - 40))}│\n`;
  ascii += `│      ${'█'.repeat(Math.min(30, width - 12))}${' '.repeat(Math.max(0, width - 40))}│\n`;
  ascii += `│      ${'█'.repeat(Math.min(30, width - 12))}${' '.repeat(Math.max(0, width - 40))}│\n`;
  ascii += `│${' '.repeat(width - 2)}│\n`;
  ascii += `│  Card Title ${colorEmoji}${' '.repeat(Math.max(0, width - 20))}│\n`;
  ascii += `│  ${'─'.repeat(Math.min(20, width - 8))}${' '.repeat(Math.max(0, width - 30))}│\n`;
  ascii += `│${' '.repeat(width - 2)}│\n`;
  ascii += `│  Card description text goes here.${' '.repeat(Math.max(0, width - 40))}│\n`;
  ascii += `│  Additional details and content.${' '.repeat(Math.max(0, width - 40))}│\n`;
  ascii += `│${' '.repeat(width - 2)}│\n`;
  ascii += `│  [ Action ]  [ Secondary ]${' '.repeat(Math.max(0, width - 32))}│\n`;
  ascii += `│${' '.repeat(width - 2)}│\n`;
  ascii += `${bottomLeft}${hLine}${bottomRight}\n`;
  
  if (structure?.states?.includes('hover')) {
    ascii += '\n  Hover Effect: ↑ + shadow + scale(1.02)\n';
  }
  
  return ascii;
}

function generateModalASCII(width, parsed, structure) {
  const { colorName } = parsed;
  const colorEmoji = getColorEmoji(colorName);
  const hLine = '═'.repeat(Math.min(width - 4, 40));
  const innerWidth = Math.min(width, 44);
  const indent = Math.max(0, Math.floor((width - innerWidth) / 2) + 4);
  const pad = ' '.repeat(indent);
  
  let ascii = '';
  
  ascii += '\n' + ' '.repeat(Math.max(0, indent - 4)) + '███████████████████████████████████████████\n';
  ascii += ' '.repeat(Math.max(0, indent - 4)) + '███                                   ███\n';
  ascii += ' '.repeat(Math.max(0, indent - 4)) + '███   ╔' + hLine + '╗   ███  ← Backdrop (dimmed)\n';
  ascii += pad + '║  ✅  Modal Title' + ' '.repeat(Math.max(0, innerWidth - 22)) + '║\n';
  ascii += pad + '╠' + '═'.repeat(innerWidth - 2) + '╣\n';
  ascii += pad + '║' + ' '.repeat(innerWidth - 2) + '║\n';
  ascii += pad + '║  Modal content and message' + ' '.repeat(Math.max(0, innerWidth - 32)) + '║\n';
  ascii += pad + '║  goes here.' + ' '.repeat(Math.max(0, innerWidth - 18)) + '║\n';
  ascii += pad + '║' + ' '.repeat(innerWidth - 2) + '║\n';
  ascii += pad + '║  Important details are displayed.' + ' '.repeat(Math.max(0, innerWidth - 38)) + '║\n';
  ascii += pad + '║' + ' '.repeat(innerWidth - 2) + '║\n';
  ascii += pad + '║  [ Cancel ]        [ Confirm ]' + ' '.repeat(Math.max(0, innerWidth - 34)) + '║\n';
  ascii += pad + '╚' + '═'.repeat(innerWidth - 2) + '╝\n';
  ascii += ' '.repeat(Math.max(0, indent - 4)) + '███                                   ███\n';
  ascii += ' '.repeat(Math.max(0, indent - 4)) + '███████████████████████████████████████████\n';
  
  ascii += '\n  Features:\n';
  ascii += `  • Focus trap: ${structure?.events?.includes('keydown') ? '✅' : '➖'}\n`;
  ascii += `  • ESC to close: ${structure?.events?.includes('keydown') ? '✅' : '➖'}\n`;
  ascii += `  • Backdrop click: ${structure?.events?.includes('click') ? '✅' : '➖'}\n`;
  
  return ascii;
}

function generateNavbarASCII(width, parsed, structure) {
  const { colorName } = parsed;
  const colorEmoji = getColorEmoji(colorName);
  const hLine = '─'.repeat(Math.max(width - 2, 60));
  
  let ascii = '';
  
  ascii += `┌${hLine}┐\n`;
  ascii += `│  🏠 Logo    Home    Products    About    Contact    ${colorEmoji}   │ ← Nav Items\n`;
  ascii += `│${' '.repeat(Math.max(0, width - 50))} [ Search 🔍 ] │ ← Search Box\n`;
  ascii += `└${hLine}┘\n`;
  
  ascii += '\n  Mobile Menu (collapsed):\n';
  ascii += `  ┌─────────────┐\n`;
  ascii += `  │  ☰  Menu    │\n`;
  ascii += `  └─────────────┘\n`;
  
  ascii += '\n  Dropdown Preview:\n';
  ascii += `           ┌───────────────┐\n`;
  ascii += `           │  Product 1    │\n`;
  ascii += `           │  Product 2    │\n`;
  ascii += `           │  Product 3    │\n`;
  ascii += `           └───────────────┘\n`;
  
  return ascii;
}

function generateDropdownASCII(width, parsed, structure) {
  const { colorName, hasIcon, iconType } = parsed;
  const colorEmoji = getColorEmoji(colorName);
  const iconChar = getIconChar(iconType);
  const innerWidth = Math.min(width, 40);
  const hLine = '─'.repeat(innerWidth - 2);
  
  let ascii = '';
  
  ascii += `┌${hLine}┐\n`;
  ascii += `│  ${iconChar} Select an option...  ▼  ${colorEmoji}│ ← Trigger\n`;
  ascii += `└${hLine}┘\n`;
  
  ascii += `\n  Expanded State:\n`;
  ascii += `  ┌${hLine}┐\n`;
  ascii += `  │  ${iconChar} Select an option...  ▲  ${' '.repeat(Math.max(0, innerWidth - 30))}│\n`;
  ascii += `  ├${hLine}┤\n`;
  ascii += `  │  ◉ Option One (selected)${' '.repeat(Math.max(0, innerWidth - 28))}│\n`;
  ascii += `  │    Option Two${' '.repeat(Math.max(0, innerWidth - 18))}│\n`;
  ascii += `  │    Option Three${' '.repeat(Math.max(0, innerWidth - 20))}│\n`;
  ascii += `  │    Option Four${' '.repeat(Math.max(0, innerWidth - 18))}│\n`;
  ascii += `  └${hLine}┘\n`;
  
  return ascii;
}

function generateAlertASCII(width, parsed, structure) {
  const { colorName, hasIcon, iconType } = parsed;
  const colorEmoji = getColorEmoji(colorName);
  const iconChar = getIconChar(iconType);
  const innerWidth = Math.min(width, 50);
  const hLine = '─'.repeat(innerWidth - 2);
  const leftBorder = getAlertBorderColor(colorName);
  
  let ascii = '';
  
  ascii += `${leftBorder}┌${hLine}┐\n`;
  ascii += `${leftBorder}│  ${iconChar || '⚠️'}  Alert Title${' '.repeat(Math.max(0, innerWidth - 20))}✕ │ ← Close button\n`;
  ascii += `${leftBorder}│${' '.repeat(innerWidth - 2)}│\n`;
  ascii += `${leftBorder}│  This is the alert message content.${' '.repeat(Math.max(0, innerWidth - 42))}│\n`;
  ascii += `${leftBorder}│  Additional details here.${' '.repeat(Math.max(0, innerWidth - 30))}│\n`;
  ascii += `${leftBorder}│${' '.repeat(innerWidth - 2)}│\n`;
  ascii += `${leftBorder}│  [ Action Button ]${' '.repeat(Math.max(0, innerWidth - 22))}│\n`;
  ascii += `${leftBorder}└${hLine}┘\n`;
  
  ascii += `\n  Alert Type: ${colorName} ${colorEmoji}\n`;
  ascii += `  Dismissable: ${structure?.events?.includes('close') ? '✅' : '➖'}\n`;
  
  return ascii;
}

function generateFormASCII(width, parsed, structure) {
  const { colorName } = parsed;
  const colorEmoji = getColorEmoji(colorName);
  const innerWidth = Math.min(width, 50);
  const hLine = '─'.repeat(innerWidth - 2);
  
  let ascii = '';
  
  ascii += `┌${hLine}┐\n`;
  ascii += `│  📝  Form Title ${colorEmoji}${' '.repeat(Math.max(0, innerWidth - 25))}│\n`;
  ascii += `├${hLine}┤\n`;
  ascii += `│${' '.repeat(innerWidth - 2)}│\n`;
  ascii += `│  Name *${' '.repeat(Math.max(0, innerWidth - 12))}│\n`;
  ascii += `│  ┌${'─'.repeat(innerWidth - 6)}┐  │\n`;
  ascii += `│  │  Enter your name${' '.repeat(Math.max(0, innerWidth - 28))}│  │ ← Input\n`;
  ascii += `│  └${'─'.repeat(innerWidth - 6)}┘  │\n`;
  ascii += `│${' '.repeat(innerWidth - 2)}│\n`;
  ascii += `│  Email *${' '.repeat(Math.max(0, innerWidth - 13))}│\n`;
  ascii += `│  ┌${'─'.repeat(innerWidth - 6)}┐  │\n`;
  ascii += `│  │  email@example.com${' '.repeat(Math.max(0, innerWidth - 30))}│  │\n`;
  ascii += `│  └${'─'.repeat(innerWidth - 6)}┘  │\n`;
  ascii += `│${' '.repeat(innerWidth - 2)}│\n`;
  ascii += `│  ☐  I agree to the terms${' '.repeat(Math.max(0, innerWidth - 28))}│ ← Checkbox\n`;
  ascii += `│${' '.repeat(innerWidth - 2)}│\n`;
  ascii += `│  [ Submit Form ]${' '.repeat(Math.max(0, innerWidth - 20))}│\n`;
  ascii += `│${' '.repeat(innerWidth - 2)}│\n`;
  ascii += `└${hLine}┘\n`;
  
  ascii += `\n  Required fields: * marked\n`;
  ascii += `  Validation: ${structure?.events?.includes('submit') ? '✅ On submit' : '➖ None'}\n`;
  
  return ascii;
}

function generateStructureInfo(parsed, structure) {
  if (!structure) return '';
  
  let info = '\n📐 Component Structure:\n';
  info += `  ${'─'.repeat(30)}\n`;
  info += `  Type: ${structure.type || parsed.type || 'unknown'}\n`;
  
  if (structure.children?.length > 0) {
    info += `  Children: ${structure.children.map(c => `[${c}]`).join(' → ')}\n`;
  }
  
  if (structure.events?.length > 0) {
    info += `  Events: ${structure.events.join(', ')}\n`;
  }
  
  return info;
}

function generateStatesInfo(parsed, structure) {
  const states = structure?.states || parsed.features || [];
  if (states.length === 0) return '';
  
  let info = '\n🎨 Visual States:\n';
  info += `  ${'─'.repeat(30)}\n`;
  
  const stateIcons = {
    hover: '🖱️',
    active: '👆',
    focus: '⌨️',
    disabled: '🚫',
    loading: '⏳',
    error: '❌',
    success: '✅',
    selected: '◉'
  };
  
  states.forEach(state => {
    const icon = stateIcons[state] || '⚪';
    info += `  ${icon} ${state.charAt(0).toUpperCase() + state.slice(1)}\n`;
  });
  
  return info;
}

function generateDimensionsInfo(parsed, structure) {
  const dims = structure?.dimensions || {};
  const size = parsed.size || 'medium';
  
  let info = '\n📏 Dimensions:\n';
  info += `  ${'─'.repeat(30)}\n`;
  info += `  Size: ${size}\n`;
  
  if (dims.width) info += `  Width: ${dims.width}\n`;
  if (dims.height) info += `  Height: ${dims.height}\n`;
  if (dims.padding) info += `  Padding: ${dims.padding}\n`;
  
  if (parsed.features?.length > 0) {
    info += `\n✨ Features:\n`;
    parsed.features.forEach(f => {
      info += `  • ${f}\n`;
    });
  }
  
  return info;
}

function getWidth(size) {
  switch (size) {
    case 'small': return 40;
    case 'large': return 60;
    default: return 50;
  }
}

function getIconChar(iconType) {
  const icons = {
    search: '🔍',
    arrow: '→',
    close: '✕',
    menu: '☰',
    heart: '♥',
    star: '★',
    check: '✓',
    plus: '+',
    minus: '−',
    home: '🏠',
    settings: '⚙️',
    user: '👤',
    generic: '⚙'
  };
  return icons[iconType] || '⚙';
}

function getColorEmoji(colorName) {
  const colors = {
    red: '🔴',
    blue: '🔵',
    green: '🟢',
    yellow: '🟡',
    purple: '🟣',
    pink: '💗',
    orange: '🟠',
    gray: '⚪',
    black: '⚫',
    white: '⬜',
    cyan: '💎',
    teal: '💚',
    indigo: '💜',
    violet: '💟'
  };
  return colors[colorName] || '🔵';
}

function getAlertBorderColor(colorName) {
  switch (colorName) {
    case 'red': return '█ ';
    case 'yellow': return '▓ ';
    case 'green': return '▒ ';
    case 'blue': return '░ ';
    default: return '│ ';
  }
}

module.exports = { generateASCII };
