const { parseDescription, generateComponentName, SIZES } = require('../utils/descriptionParser');
const aiService = require('../utils/aiService');
const crypto = require('crypto');

async function generateComponent(description, framework = 'native') {
  const componentId = crypto.randomUUID();
  const parsed = parseDescription(description);
  
  try {
    const aiResult = await generateWithAI(description, framework, parsed);
    return {
      ...aiResult,
      componentId,
      description,
      framework,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    if (!error.message.includes('AI API key not configured')) {
      console.warn('AI generation failed, falling back to template generation:', error.message);
    }
    const fallbackResult = generateWithTemplate(description, framework, parsed);
    return {
      ...fallbackResult,
      componentId,
      description,
      framework,
      createdAt: new Date().toISOString()
    };
  }
}

async function generateWithAI(description, framework, parsed) {
  const systemPrompt = getSystemPrompt(framework);
  const name = generateComponentName(description);

  const messages = [
    {
      role: 'system',
      content: systemPrompt
    },
    {
      role: 'user',
      content: `Generate a ${framework.toUpperCase()} component: "${description}"
Type: ${parsed.type}, Color: ${parsed.colorName} (${parsed.color}), Size: ${parsed.size}, Icon: ${parsed.hasIcon ? parsed.iconType || 'yes' : 'no'}, Features: ${parsed.features.join(', ') || 'none'}

Return ONLY valid JSON like this example format (code and example MUST be strings):
{"componentName":"${name}","code":"<style>.btn{background:#3b82f6;color:white;padding:10px 20px;border:none;border-radius:5px;cursor:pointer;}</style>\\n<button class=\\"btn\\" aria-label=\\"Click\\">Click</button>","example":"<div>component here</div>","props":{"onClick":"click handler"},"structure":{"type":"${parsed.type}","children":["text"],"events":["click"],"states":["hover","active","focus","disabled"],"dimensions":{"width":"auto","height":"40px","padding":"10px 20px"}}}`
    }
  ];

  const response = await aiService.chatCompletion(messages);
  
  const result = aiService.extractJSON(response.content);
  if (!result) {
    throw new Error('Failed to parse AI component response as JSON');
  }

  let code = result.code;
  if (code && typeof code === 'object') {
    if (framework === 'native') {
      const parts = [];
      if (code.css) parts.push('<style>\n' + (typeof code.css === 'string' ? code.css : JSON.stringify(code.css)) + '\n</style>');
      if (code.html) parts.push(typeof code.html === 'string' ? code.html : JSON.stringify(code.html));
      if (code.javascript && code.javascript !== '' && !code.javascript.includes('No JavaScript')) {
        parts.push('<script>\n' + (typeof code.javascript === 'string' ? code.javascript : JSON.stringify(code.javascript)) + '\n</script>');
      }
      code = parts.join('\n\n');
    } else if (framework === 'react') {
      code = typeof code.jsx === 'string' ? code.jsx : (typeof code.javascript === 'string' ? code.javascript : JSON.stringify(code, null, 2));
    } else if (framework === 'vue') {
      code = typeof code.vue === 'string' ? code.vue : (typeof code.html === 'string' ? code.html : JSON.stringify(code, null, 2));
    } else {
      code = JSON.stringify(code, null, 2);
    }
  }

  let example = result.example;
  if (example && typeof example === 'object') {
    example = JSON.stringify(example, null, 2);
  }

  let props = result.props || {};
  if (props.properties && typeof props.properties === 'object') {
    const flatProps = {};
    for (const [key, val] of Object.entries(props.properties)) {
      flatProps[key] = typeof val === 'object' ? (val.description || val.type || JSON.stringify(val)) : String(val);
    }
    props = flatProps;
  }

  let structure = result.structure || {
    type: parsed.type,
    children: [],
    events: [],
    states: [],
    dimensions: {}
  };
  if (structure.children && !Array.isArray(structure.children)) {
    structure.children = Object.values(structure.children);
  }
  if (structure.events && !Array.isArray(structure.events)) {
    structure.events = Object.values(structure.events);
  }
  if (structure.states && !Array.isArray(structure.states)) {
    structure.states = Object.values(structure.states);
  }
  
  return {
    name: result.componentName || name,
    code,
    example,
    props,
    structure,
    isAIGenerated: true
  };
}

function getSystemPrompt(framework) {
  const frameworkHint = {
    react: 'Use React functional component with inline styles (camelCase). Code must be a single string.',
    vue: 'Use Vue SFC format with template/script/style. Code must be a single string.',
    native: 'Use HTML with <style> and inline JS. Code must be a single string.'
  };

  return `You are a frontend component code generator. Return ONLY valid JSON. The "code" and "example" fields MUST be strings containing the full source code, NOT objects. Include accessibility attributes. ${(frameworkHint[framework] || frameworkHint.native)}`;
}

function generateWithTemplate(description, framework, parsed) {
  const name = generateComponentName(description);

  switch (framework.toLowerCase()) {
    case 'react':
      return generateReactComponent(parsed, name, description);
    case 'vue':
      return generateVueComponent(parsed, name, description);
    case 'native':
    default:
      return generateNativeComponent(parsed, name, description);
  }
}

function generateNativeComponent(parsed, name, description) {
  const { color, size, hasIcon, iconType, onClick, features } = parsed;
  const sizeStyle = SIZES[size] || SIZES.medium;
  
  const borderRadius = features.includes('rounded') ? 'border-radius: 8px;' : '';
  const boxShadow = features.includes('shadow') ? 'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);' : '';
  const iconHTML = hasIcon ? getIconSVG(iconType, '16px') : '';
  const clickHandler = onClick ? `onclick="alert('Button clicked!')"` : '';

  const code = `<!-- ${name} Component -->
<style>
  .${name.toLowerCase()} {
    ${sizeStyle}
    background-color: ${color};
    color: white;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 500;
    transition: all 0.2s ease;
    ${borderRadius}
    ${boxShadow}
  }
  .${name.toLowerCase()}:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .${name.toLowerCase()}:active:not(:disabled) {
    transform: translateY(0);
  }
  .${name.toLowerCase()}:focus {
    outline: 2px solid ${color};
    outline-offset: 2px;
  }
  .${name.toLowerCase()}:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .${name.toLowerCase()}-icon {
    display: inline-flex;
    align-items: center;
  }
</style>

<button class="${name.toLowerCase()}" ${clickHandler} aria-label="Click Me">
  ${iconHTML ? `<span class="${name.toLowerCase()}-icon">${iconHTML}</span>` : ''}
  <span class="${name.toLowerCase()}-text">Click Me</span>
</button>`;

  return {
    name,
    code,
    example: `<!-- Usage Example -->
<!DOCTYPE html>
<html>
<head>
  <title>${name} Demo</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 40px; background: #f5f5f5; }
    .container { display: flex; gap: 10px; align-items: center; }
  </style>
</head>
<body>
  <div class="container">
    ${code}
  </div>
</body>
</html>`,
    props: {
      className: name.toLowerCase(),
      backgroundColor: color,
      size: size,
      hasIcon: hasIcon,
      iconType: iconType || 'none',
      interactive: onClick ? 'yes' : 'no',
      features: features.join(', ') || 'none'
    },
    structure: {
      type: parsed.type,
      children: hasIcon ? ['icon', 'text'] : ['text'],
      events: onClick ? ['click'] : [],
      states: ['hover', 'active', 'focus', 'disabled'],
      dimensions: {
        width: 'auto',
        height: size === 'small' ? '40px' : size === 'large' ? '56px' : '48px',
        padding: size === 'small' ? '8px 16px' : size === 'large' ? '16px 32px' : '12px 24px'
      }
    },
    isAIGenerated: false
  };
}

function generateReactComponent(parsed, name, description) {
  const { color, size, hasIcon, iconType, onClick, features } = parsed;
  
  const borderRadius = features.includes('rounded') ? "    borderRadius: '8px'," : '';
  const boxShadow = features.includes('shadow') ? "    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'," : '';
  const iconSVG = hasIcon ? getIconSVG(iconType, '16px') : '';

  const code = `import React from 'react';

const ${name} = ({ 
  children = 'Click Me', 
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  const baseStyles = {
    padding: '${size === 'small' ? '8px 16px' : size === 'large' ? '16px 32px' : '12px 24px'}',
    fontSize: '${size === 'small' ? '14px' : size === 'large' ? '18px' : '16px'}',
    backgroundColor: '${color}',
    color: 'white',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.6 : 1,
${borderRadius}
${boxShadow}
  };

  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button 
      style={baseStyles}
      onClick={handleClick}
      disabled={disabled}
      aria-label={typeof children === 'string' ? children : 'button'}
      onFocus={(e) => {
        e.target.style.outline = '2px solid ${color}';
        e.target.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.target.style.outline = 'none';
        e.target.style.outlineOffset = '0';
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.target.style.opacity = '0.9';
          e.target.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.target.style.opacity = disabled ? '0.6' : '1';
          e.target.style.transform = 'translateY(0)';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.target.style.transform = 'translateY(0)';
        }
      }}
    >
      ${hasIcon ? `<span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: \`${iconSVG}\` }} />` : ''}
      <span>{children}</span>
    </button>
  );
};

export default ${name};`;

  return {
    name,
    code,
    example: `// Usage Example
import ${name} from './${name}';

function App() {
  const handleClick = () => {
    alert('Hello!');
  };

  return (
    <div style={{ padding: '20px', display: 'flex', gap: '10px' }}>
      <${name} onClick={handleClick}>
        Click Me
      </${name}>
      
      <${name} disabled>
        Disabled
      </${name}>
    </div>
  );
}

export default App;`,
    props: {
      children: 'node - Button content (text, elements, or components)',
      onClick: 'function - Click event handler',
      variant: 'string - Button variant (primary, secondary, etc.)',
      disabled: 'boolean - Disabled state'
    },
    structure: {
      type: parsed.type,
      children: hasIcon ? ['icon', 'text'] : ['text'],
      events: ['click', 'mouseEnter', 'mouseLeave', 'focus', 'blur'],
      states: ['hover', 'active', 'focus', 'disabled'],
      dimensions: {
        width: 'auto',
        height: size === 'small' ? '40px' : size === 'large' ? '56px' : '48px',
        padding: size === 'small' ? '8px 16px' : size === 'large' ? '16px 32px' : '12px 24px'
      }
    },
    isAIGenerated: false
  };
}

function generateVueComponent(parsed, name, description) {
  const { color, size, hasIcon, iconType, onClick, features } = parsed;
  
  const borderRadius = features.includes('rounded') ? "        borderRadius: '8px'," : '';
  const boxShadow = features.includes('shadow') ? "        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'," : '';
  const iconSVG = hasIcon ? getIconSVG(iconType, '16px') : '';

  const code = `<template>
  <button 
    :style="buttonStyles"
    :disabled="disabled"
    @click="handleClick"
    :aria-label="label"
    @focus="handleFocus"
    @blur="handleBlur"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
    ref="button"
  >
    ${hasIcon ? `<span v-html="iconSVG"></span>` : ''}
    <span>{{ label }}</span>
  </button>
</template>

<script>
export default {
  name: '${name}',
  props: {
    label: {
      type: String,
      default: 'Click Me'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click'],
  data() {
    return {
      isHovered: false,
      isFocused: false,
      isActive: false
    };
  },
  computed: {
    buttonStyles() {
      return {
        padding: '${size === 'small' ? '8px 16px' : size === 'large' ? '16px 32px' : '12px 24px'}',
        fontSize: '${size === 'small' ? '14px' : size === 'large' ? '18px' : '16px'}',
        backgroundColor: '${color}',
        color: 'white',
        border: 'none',
        cursor: this.disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 500,
        transition: 'all 0.2s ease',
        opacity: this.disabled ? 0.6 : 1,
        transform: this.isHovered && !this.disabled && !this.isActive ? 'translateY(-1px)' : 'translateY(0)',
        outline: this.isFocused ? '2px solid ${color}' : 'none',
        outlineOffset: this.isFocused ? '2px' : '0',
${borderRadius}
${boxShadow}
      };
    },
    iconSVG() {
      return \`${iconSVG}\`;
    }
  },
  methods: {
    handleClick(e) {
      if (!this.disabled) {
        this.\$emit('click', e);
      }
    },
    handleFocus(e) {
      this.isFocused = true;
    },
    handleBlur(e) {
      this.isFocused = false;
    },
    handleMouseEnter(e) {
      if (!this.disabled) {
        this.isHovered = true;
      }
    },
    handleMouseLeave(e) {
      this.isHovered = false;
      this.isActive = false;
    },
    handleMouseDown(e) {
      if (!this.disabled) {
        this.isActive = true;
      }
    }
  }
};
</script>

<style scoped>
button:active:not(:disabled) {
  transform: translateY(0) !important;
}
</style>`;

  return {
    name,
    code,
    example: `<!-- Usage Example -->
<template>
  <div style="padding: 20px; display: flex; gap: 10px;">
    <${name} 
      label="Click Me" 
      @click="handleClick" 
    />
    
    <${name} 
      label="Disabled" 
      :disabled="true"
    />
  </div>
</template>

<script>
import ${name} from './${name}.vue';

export default {
  components: { ${name} },
  methods: {
    handleClick() {
      alert('Hello from Vue!');
    }
  }
};
</script>`,
    props: {
      label: 'string - Button text content',
      disabled: 'boolean - Disabled state'
    },
    structure: {
      type: parsed.type,
      children: hasIcon ? ['icon', 'text'] : ['text'],
      events: ['click', 'focus', 'blur', 'mouseEnter', 'mouseLeave'],
      states: ['hover', 'active', 'focus', 'disabled'],
      dimensions: {
        width: 'auto',
        height: size === 'small' ? '40px' : size === 'large' ? '56px' : '48px',
        padding: size === 'small' ? '8px 16px' : size === 'large' ? '16px 32px' : '12px 24px'
      }
    },
    isAIGenerated: false
  };
}

function getIconSVG(type, size = '24px') {
  const icons = {
    search: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>`,
    arrow: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>`,
    close: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`,
    menu: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>`,
    heart: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>`,
    star: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,
    generic: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: block;">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>`
  };
  return icons[type] || icons.generic;
}

module.exports = { generateComponent, generateWithAI, generateWithTemplate };
