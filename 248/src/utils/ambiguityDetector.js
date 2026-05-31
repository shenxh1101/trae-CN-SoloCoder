const aiService = require('./aiService');

async function detectAmbiguities(description) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert frontend developer and UX designer. Your task is to analyze a user's natural language description of a UI component and identify ambiguous or missing information that needs clarification before generating code.

Focus on these categories:
1. COMPONENT TYPE: What specific UI element is this? (button, input, card, modal, navbar, dropdown, alert, etc.)
2. APPEARANCE: Color scheme, size, shape (rounded, square), style (minimal, gradient, shadow, outline, 3D)
3. LAYOUT: Position, dimensions, spacing, alignment, responsive behavior
4. INTERACTION: Click behavior, hover effects, form submission, navigation, animation, validation
5. CONTENT: Text content, icons, images, placeholders, data format
6. ACCESSIBILITY: ARIA labels, keyboard navigation, focus management

For each ambiguous point, provide:
- category: One of the above categories
- question: A clear, specific question to ask the user
- field: A key name for this property
- defaultValue: A reasonable default if user doesn't specify
- options: Array of suggested options (if applicable)

Return ONLY a JSON object in this format:
{
  "ambiguousPoints": [
    {
      "category": "appearance",
      "question": "What color should the button be?",
      "field": "color",
      "defaultValue": "blue",
      "options": ["red", "blue", "green", "yellow", "purple", "custom"]
    }
  ],
  "summary": "Brief summary of findings",
  "hasEnoughInfo": boolean
}`
    },
    {
      role: 'user',
      content: `Analyze this component description for ambiguities:

"${description}"

Identify all points that need clarification. Be thorough but not overly nitpicky - only ask about truly important information that affects the implementation.`
    }
  ];

  try {
    const response = await aiService.chatCompletion(messages);
    const result = aiService.extractJSON(response.content);
    if (result && result.ambiguousPoints) {
      return result.ambiguousPoints;
    }
    throw new Error('Invalid ambiguity detection response format');
  } catch (error) {
    if (error.message.includes('AI API key not configured')) {
      const result = fallbackDetection(description);
      return result.ambiguousPoints || [];
    }
    console.warn('AI ambiguity detection failed, falling back to heuristic analysis:', error.message);
    const result = fallbackDetection(description);
    return result.ambiguousPoints || [];
  }
}

function fallbackDetection(description) {
  const lowerDesc = description.toLowerCase();
  const ambiguousPoints = [];

  const componentKeywords = ['button', 'input', 'card', 'modal', 'navbar', 'dropdown', 'alert', 'badge', 'tooltip', 'menu', 'form', 'table', 'list', 'checkbox', 'radio', 'select', 'textarea'];
  const hasComponentType = componentKeywords.some(k => lowerDesc.includes(k));
  if (!hasComponentType) {
    ambiguousPoints.push({
      category: 'type',
      question: 'What type of component do you want to create?',
      field: 'componentType',
      defaultValue: 'button',
      options: ['button', 'input field', 'card', 'modal dialog', 'navigation bar', 'dropdown menu', 'form', 'alert', 'custom']
    });
  }

  const colorKeywords = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange', 'gray', 'black', 'white', 'cyan', 'teal', 'indigo', 'violet', 'transparent'];
  const hasColor = colorKeywords.some(c => lowerDesc.includes(c));
  if (!hasColor) {
    ambiguousPoints.push({
      category: 'appearance',
      question: 'What color should the component be?',
      field: 'color',
      defaultValue: 'blue',
      options: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'gray', 'cyan', 'teal', 'indigo', 'violet', 'custom']
    });
  }

  const sizeKeywords = ['small', 'medium', 'large', 'tiny', 'big', 'compact', 'full-width', 'wide', 'narrow'];
  const hasSize = sizeKeywords.some(s => lowerDesc.includes(s));
  if (!hasSize) {
    ambiguousPoints.push({
      category: 'layout',
      question: 'What size should the component be?',
      field: 'size',
      defaultValue: 'medium',
      options: ['small', 'medium', 'large', 'full-width', 'compact', 'custom']
    });
  }

  const interactionKeywords = ['click', 'hover', 'submit', 'close', 'open', 'toggle', 'show', 'hide', 'navigate', 'animate', 'validate', 'search', 'filter'];
  const hasInteraction = interactionKeywords.some(i => lowerDesc.includes(i));
  if (!hasInteraction && hasComponentType) {
    ambiguousPoints.push({
      category: 'interaction',
      question: 'What interaction behavior should the component have?',
      field: 'interaction',
      defaultValue: 'none',
      options: ['click to show alert', 'click to navigate', 'submit form', 'toggle visibility', 'open modal', 'search/filter', 'none']
    });
  }

  const styleKeywords = ['rounded', 'shadow', 'outline', 'gradient', 'flat', '3d', 'minimal', 'fancy', 'modern', 'classic', 'retro'];
  const hasStyle = styleKeywords.some(s => lowerDesc.includes(s));
  if (!hasStyle && ambiguousPoints.length < 3) {
    ambiguousPoints.push({
      category: 'style',
      question: 'What visual style should the component have?',
      field: 'style',
      defaultValue: 'default',
      options: ['minimal/clean', 'rounded corners', 'with shadow', 'outlined', 'gradient background', '3D effect', 'default']
    });
  }

  const iconKeywords = ['icon', 'image', 'svg', 'picture', 'logo'];
  const hasIcon = iconKeywords.some(i => lowerDesc.includes(i));
  if (hasIcon) {
    const specificIcon = ['search', 'arrow', 'close', 'menu', 'heart', 'star', 'check', 'plus', 'minus', 'home', 'settings', 'user'].some(i => lowerDesc.includes(i));
    if (!specificIcon) {
      ambiguousPoints.push({
        category: 'content',
        question: 'What type of icon should be used?',
        field: 'iconType',
        defaultValue: 'generic',
        options: ['search', 'arrow', 'close', 'menu', 'heart', 'star', 'check', 'plus', 'home', 'settings', 'user', 'custom']
      });
    }
  }

  return {
    ambiguousPoints,
    summary: `Found ${ambiguousPoints.length} points that need clarification`,
    hasEnoughInfo: ambiguousPoints.length < 2
  };
}

function applyClarifications(description, clarifications, ambiguousPoints) {
  let enhancedDescription = description;
  
  for (let i = 0; i < ambiguousPoints.length; i++) {
    const point = ambiguousPoints[i];
    const answer = clarifications[`clarification_${i}`] || clarifications[point.field];
    
    if (answer && answer !== point.defaultValue) {
      if (point.field === 'color') {
        enhancedDescription = `${answer} ${enhancedDescription}`;
      } else if (point.field === 'size') {
        enhancedDescription = `${enhancedDescription}, ${answer} size`;
      } else if (point.field === 'componentType') {
        enhancedDescription = `${answer} ${enhancedDescription}`;
      } else if (point.field === 'interaction') {
        enhancedDescription = `${enhancedDescription}, with ${answer} behavior`;
      } else if (point.field === 'style') {
        enhancedDescription = `${enhancedDescription}, ${answer} style`;
      } else {
        enhancedDescription = `${enhancedDescription}, ${point.field}: ${answer}`;
      }
    }
  }
  
  return enhancedDescription;
}

module.exports = { detectAmbiguities, applyClarifications, fallbackDetection };
