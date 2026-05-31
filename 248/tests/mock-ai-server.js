const http = require('http');

function createMockAIServer(port = 18488) {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const lastMessage = parsed.messages[parsed.messages.length - 1];
          const content = lastMessage.content.toLowerCase();

          let responseContent;

          if (content.includes('ambigu') && content.includes('analyze')) {
            responseContent = JSON.stringify({
              ambiguousPoints: [
                {
                  category: 'appearance',
                  question: 'What color should the component be?',
                  field: 'color',
                  defaultValue: 'blue',
                  options: ['red', 'blue', 'green', 'yellow', 'custom']
                },
                {
                  category: 'layout',
                  question: 'What size should the component be?',
                  field: 'size',
                  defaultValue: 'medium',
                  options: ['small', 'medium', 'large']
                }
              ],
              summary: 'Found 2 ambiguous points',
              hasEnoughInfo: false
            });
          } else if (content.includes('ascii')) {
            const typeMatch = content.match(/type:\s*(button|input|modal|card)/);
            const compType = typeMatch ? typeMatch[1] : 'button';
            
            if (compType === 'input') {
              responseContent = `┌──────────────────────────────────────┐
│  🔍  Enter text here...             │
└──────────────────────────────────────┘

🎨 Visual States:
  ──────────────────────────────
  ⌨️ Focus: border highlight
  ❌ Error: red border
  🚫 Disabled: opacity 60%

📐 Component Structure:
  ──────────────────────────────
  Type: input
  Children: [label] → [input]
  Events: focus, blur, input`;
            } else {
              responseContent = `┌──────────────────────────────────────┐
│                                      │
│     🔍  AI Generated Button          │
│                                      │
└──────────────────────────────────────┘

🎨 Visual States:
  ──────────────────────────────
  🖱️ Hover: opacity 90%
  👆 Active: scale 98%
  ⌨️ Focus: outline 2px solid
  🚫 Disabled: opacity 60%

📐 Component Structure:
  ──────────────────────────────
  Type: button
  Children: [icon] → [text]
  Events: click, mouseEnter`;
            }
          } else if (content.includes('wcag') || content.includes('accessibility')) {
            const typeMatch = content.match(/type:\s*(button|input|modal|card)/);
            const compType = typeMatch ? typeMatch[1] : 'button';
            const isInput = compType === 'input';

            const tips = [
              {
                code: 'WCAG 1.1.1',
                level: 'A',
                severity: 'critical',
                description: 'Non-text Content',
                detail: 'All non-text content must have a text alternative.',
                applies: true,
                suggestion: 'Provide alt text for icons and images.',
                codeExample: '<button aria-label="Search"><svg aria-hidden="true">...</svg></button>'
              },
              {
                code: 'WCAG 1.4.3',
                level: 'AA',
                severity: 'high',
                description: 'Contrast (Minimum)',
                detail: 'Text must have a contrast ratio of at least 4.5:1.',
                applies: true,
                suggestion: 'Verify color contrast meets 4.5:1 ratio.',
                codeExample: '.button { color: #ffffff; background-color: #3b82f6; }'
              },
              {
                code: 'WCAG 2.4.7',
                level: 'AA',
                severity: 'high',
                description: 'Focus Visible',
                detail: 'Keyboard focus indicator must be visible.',
                applies: true,
                suggestion: 'Implement clear focus styles.',
                codeExample: 'button:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }'
              }
            ];

            if (isInput) {
              tips.push({
                code: 'WCAG 1.3.1',
                level: 'A',
                severity: 'critical',
                description: 'Label Association',
                detail: 'Form controls must have associated labels.',
                applies: true,
                suggestion: 'Use <label> with for attribute.',
                codeExample: '<label for="email">Email</label>\n<input id="email" type="email" />'
              });
            }

            const byLevel = { A: 0, AA: 0, AAA: 0 };
            const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
            tips.forEach(t => {
              byLevel[t.level]++;
              bySeverity[t.severity]++;
            });

            responseContent = JSON.stringify({
              componentType: compType,
              totalTips: tips.length,
              byLevel,
              bySeverity,
              tips,
              summary: { total: tips.length, byLevel, bySeverity }
            });
          } else if (content.includes('generate') && content.includes('component')) {
            const isReact = content.includes('react');
            const isVue = content.includes('vue');
            const framework = isReact ? 'react' : isVue ? 'vue' : 'native';
            const name = 'AIGeneratedButton';

            let code, example, props, structure;

            structure = {
              type: 'button',
              children: ['icon', 'text'],
              events: ['click', 'mouseEnter', 'mouseLeave', 'focus', 'blur'],
              states: ['hover', 'active', 'focus', 'disabled'],
              dimensions: { width: 'auto', height: '48px', padding: '12px 24px' }
            };

            if (isReact) {
              code = `import React from 'react';

const ${name} = ({
  children = 'Click Me',
  onClick,
  disabled = false
}) => {
  const baseStyles = {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.6 : 1,
    boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)'
  };

  return (
    <button
      style={baseStyles}
      onClick={onClick}
      disabled={disabled}
      aria-label={typeof children === 'string' ? children : 'button'}
    >
      <span>{children}</span>
    </button>
  );
};

export default ${name};`;
              example = `import ${name} from './${name}';

function App() {
  return (
    <div style={{ padding: '20px' }}>
      <${name} onClick={() => alert('Hello!')}>Click Me</${name}>
    </div>
  );
}`;
              props = {
                children: 'node - Button content',
                onClick: 'function - Click handler',
                disabled: 'boolean - Disabled state'
              };
            } else if (isVue) {
              code = `<template>
  <button
    :style="buttonStyles"
    :disabled="disabled"
    @click="handleClick"
    :aria-label="label"
  >
    <span>{{ label }}</span>
  </button>
</template>

<script>
export default {
  name: '${name}',
  props: {
    label: { type: String, default: 'Click Me' },
    disabled: { type: Boolean, default: false }
  },
  emits: ['click'],
  computed: {
    buttonStyles() {
      return {
        padding: '12px 24px',
        fontSize: '16px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: this.disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 500,
        transition: 'all 0.2s ease',
        opacity: this.disabled ? 0.6 : 1,
        boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)'
      };
    }
  },
  methods: {
    handleClick(e) {
      if (!this.disabled) this.$emit('click', e);
    }
  }
};
</script>

<style scoped>
button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>`;
              example = `<template>
  <div style="padding: 20px;">
    <${name} label="Click Me" @click="handleClick" />
  </div>
</template>

<script>
import ${name} from './${name}.vue';
export default {
  components: { ${name} },
  methods: { handleClick() { alert('Hello!'); } }
};
</script>`;
              props = {
                label: 'string - Button text',
                disabled: 'boolean - Disabled state'
              };
            } else {
              code = `<!-- ${name} Component - AI Generated -->
<style>
  .${name.toLowerCase()} {
    padding: 12px 24px;
    font-size: 16px;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);
  }
  .${name.toLowerCase()}:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  .${name.toLowerCase()}:focus {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
  }
  .${name.toLowerCase()}:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>

<button class="${name.toLowerCase()}" aria-label="Click Me" onclick="alert('Button clicked!')">
  <span>Click Me</span>
</button>`;
              example = `<!DOCTYPE html>
<html>
<head><title>${name} Demo</title></head>
<body>
  <div style="padding: 20px;">
    ${code}
  </div>
</body>
</html>`;
              props = {
                className: name.toLowerCase(),
                onClick: 'inline handler or event listener'
              };
            }

            responseContent = JSON.stringify({
              componentName: name,
              framework,
              code,
              example,
              props,
              structure
            });
          } else {
            responseContent = JSON.stringify({
              result: 'AI response for: ' + lastMessage.content.substring(0, 50)
            });
          }

          const responseObj = {
            id: 'chatcmpl-mock-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: parsed.model || 'mock-model',
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: responseContent
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 200,
              total_tokens: 300
            }
          };

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(responseObj));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: e.message } }));
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Mock AI server running on http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  const port = parseInt(process.argv[2] || '18488');
  createMockAIServer(port).then(() => {
    console.log('Press Ctrl+C to stop');
  });
}

module.exports = { createMockAIServer };
