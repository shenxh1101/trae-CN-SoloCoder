const COLORS = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
  purple: '#a855f7', pink: '#ec4899', orange: '#f97316', gray: '#6b7280',
  black: '#000000', white: '#ffffff', cyan: '#06b6d4', teal: '#14b8a6',
  indigo: '#6366f1', violet: '#8b5cf6'
};

const SIZES = {
  small: 'padding: 8px 16px; font-size: 14px;',
  medium: 'padding: 12px 24px; font-size: 16px;',
  large: 'padding: 16px 32px; font-size: 18px;'
};

const COMPONENT_TYPES = ['button', 'input', 'card', 'modal', 'navbar', 'dropdown', 'alert', 'badge', 'tooltip', 'menu'];

function parseDescription(description) {
  const lowerDesc = description.toLowerCase();
  const result = {
    type: 'button',
    color: '#3b82f6',
    colorName: 'blue',
    size: 'medium',
    hasIcon: false,
    iconType: null,
    hasSearch: false,
    onClick: null,
    features: [],
    ambiguous: [],
    raw: description
  };

  for (const type of COMPONENT_TYPES) {
    if (lowerDesc.includes(type)) {
      result.type = type;
      break;
    }
  }

  for (const [name, hex] of Object.entries(COLORS)) {
    if (lowerDesc.includes(name)) {
      result.color = hex;
      result.colorName = name;
      break;
    }
  }

  for (const size of ['small', 'large', 'tiny', 'big']) {
    if (lowerDesc.includes(size)) {
      result.size = size === 'tiny' ? 'small' : size === 'big' ? 'large' : size;
      break;
    }
  }

  if (lowerDesc.includes('icon')) {
    result.hasIcon = true;
    if (lowerDesc.includes('search')) {
      result.iconType = 'search';
      result.hasSearch = true;
    } else if (lowerDesc.includes('arrow')) {
      result.iconType = 'arrow';
    } else if (lowerDesc.includes('close')) {
      result.iconType = 'close';
    } else if (lowerDesc.includes('menu')) {
      result.iconType = 'menu';
    } else if (lowerDesc.includes('heart')) {
      result.iconType = 'heart';
    } else if (lowerDesc.includes('star')) {
      result.iconType = 'star';
    }
  }

  if (lowerDesc.includes('search') && !result.hasSearch) {
    result.hasSearch = true;
  }

  if (lowerDesc.includes('click') || lowerDesc.includes('弹出') || lowerDesc.includes('alert') || lowerDesc.includes('提示')) {
    result.onClick = 'alert';
    result.features.push('clickable');
  }

  if (lowerDesc.includes('hover')) {
    result.features.push('hover');
  }

  if (lowerDesc.includes('disabled')) {
    result.features.push('disabled');
  }

  if (lowerDesc.includes('rounded') || lowerDesc.includes('圆角')) {
    result.features.push('rounded');
  }

  if (lowerDesc.includes('shadow') || lowerDesc.includes('阴影')) {
    result.features.push('shadow');
  }

  if (lowerDesc.includes('outline') || lowerDesc.includes('边框')) {
    result.features.push('outline');
  }

  if (lowerDesc.includes('gradient') || lowerDesc.includes('渐变')) {
    result.features.push('gradient');
  }

  if (lowerDesc.includes('animation') || lowerDesc.includes('动画')) {
    result.features.push('animation');
  }

  if (lowerDesc.includes('loading') || lowerDesc.includes('加载')) {
    result.features.push('loading');
  }

  if (!COMPONENT_TYPES.some(t => lowerDesc.includes(t))) {
    result.ambiguous.push('Component type not specified, defaulting to button');
  }

  if (!Object.keys(COLORS).some(c => lowerDesc.includes(c))) {
    result.ambiguous.push('Color not specified, defaulting to blue');
  }

  if (result.hasIcon && !result.iconType) {
    result.ambiguous.push('Icon type not specified, defaulting to generic icon');
    result.iconType = 'generic';
  }

  return result;
}

function generateComponentName(description, framework) {
  const parsed = parseDescription(description);
  const name = parsed.type.charAt(0).toUpperCase() + parsed.type.slice(1);
  const color = parsed.colorName.charAt(0).toUpperCase() + parsed.colorName.slice(1);
  return `${color}${name}`;
}

module.exports = { parseDescription, generateComponentName, COLORS, SIZES };
