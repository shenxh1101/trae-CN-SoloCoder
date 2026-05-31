const aiService = require('./aiService');
const { parseDescription } = require('./descriptionParser');

async function checkWCAG(parsedOrDescription) {
  let parsed, description;
  
  if (typeof parsedOrDescription === 'string') {
    description = parsedOrDescription;
    parsed = parseDescription(description);
  } else {
    parsed = parsedOrDescription;
    description = parsed.raw || '';
  }

  try {
    return await checkWithAI(parsed, description);
  } catch (error) {
    if (!error.message.includes('AI API key not configured')) {
      console.warn('AI WCAG analysis failed, falling back to rule-based:', error.message);
    }
    return checkRuleBased(parsed);
  }
}

async function checkWithAI(parsed, description) {
  const structure = parsed.structure || {};
  const messages = [
    {
      role: 'system',
      content: `You are an expert in web accessibility and WCAG 2.1 standards. Analyze UI component descriptions and provide specific, actionable accessibility recommendations.

Follow these guidelines:
1. Be specific to the component type (button, input, modal, etc.)
2. Reference exact WCAG success criteria with level (A, AA, AAA)
3. Provide concrete implementation suggestions, not just theory
4. Include code examples where relevant
5. Prioritize issues by severity (critical, high, medium, low)
6. Consider the component's states (hover, active, focus, disabled)
7. Include keyboard navigation considerations
8. Mention ARIA roles and attributes where appropriate

Return ONLY a valid JSON object in this format:
{
  "componentType": "button|input|card|modal|navbar|dropdown|alert|form|table|custom",
  "totalTips": number,
  "byLevel": {
    "A": number,
    "AA": number,
    "AAA": number
  },
  "bySeverity": {
    "critical": number,
    "high": number,
    "medium": number,
    "low": number
  },
  "tips": [
    {
      "code": "WCAG 1.1.1",
      "level": "A",
      "severity": "high",
      "description": "Non-text Content",
      "detail": "Full explanation of the requirement",
      "applies": true,
      "suggestion": "Specific, actionable recommendation",
      "codeExample": "optional code snippet showing correct implementation"
    }
  ]
}`
    },
    {
      role: 'user',
      content: `Analyze this UI component for WCAG 2.1 accessibility compliance:

Component Description: "${description}"

Component Details:
- Type: ${structure.type || parsed.type || 'button'}
- Color: ${parsed.colorName || 'blue'} (${parsed.color || '#3b82f6'})
- Size: ${parsed.size || 'medium'}
- Has Icon: ${parsed.hasIcon}${parsed.iconType ? ` (${parsed.iconType})` : ''}
- Has Search: ${parsed.hasSearch}
- Click Behavior: ${parsed.onClick || 'none'}
- Features: ${parsed.features?.join(', ') || 'none'}

${structure.type ? `Structure:
- Type: ${structure.type}
- Children: ${structure.children?.join(', ') || 'none'}
- Events: ${structure.events?.join(', ') || 'none'}
- States: ${structure.states?.join(', ') || 'none'}
${structure.dimensions ? `- Dimensions: ${JSON.stringify(structure.dimensions)}` : ''}` : ''}

Provide comprehensive WCAG recommendations specific to this component type and its properties.`
    }
  ];

  const response = await aiService.chatCompletion(messages);
  
  const result = aiService.extractJSON(response.content);
  if (!result) {
    throw new Error('Failed to parse WCAG response as JSON');
  }
  return result;
}

function checkRuleBased(parsed) {
  const { type, color, colorName, hasIcon, features, structure } = parsed;
  const tips = [];

  const universalTips = [
    {
      code: 'WCAG 1.1.1',
      level: 'A',
      severity: 'high',
      description: 'Non-text Content',
      detail: 'All non-text content must have a text alternative that serves the equivalent purpose.',
      applies: true,
      suggestion: hasIcon ? 
        'For functional icons, provide descriptive aria-label. For decorative icons, use aria-hidden="true". Example: <button aria-label="Search"><svg aria-hidden="true">...</svg></button>' :
        'Ensure all images and icons have appropriate alt text or aria labels.',
      codeExample: hasIcon ? 
        `<button aria-label="Search">
  <svg aria-hidden="true">...</svg>
  <span class="sr-only">Search</span>
</button>` : null
    },
    {
      code: 'WCAG 1.4.3',
      level: 'AA',
      severity: 'medium',
      description: 'Contrast (Minimum)',
      detail: 'Text and images of text must have a contrast ratio of at least 4.5:1 (3:1 for large text).',
      applies: true,
      suggestion: `Verify text color against background color meets 4.5:1 contrast ratio. Current color ${color} (${colorName}) should be checked against the background it will be displayed on. Use tools like WebAIM Contrast Checker.`,
      codeExample: `/* Ensure sufficient contrast */
.button {
  color: #ffffff; /* white text */
  background-color: ${color}; /* ${colorName} background */
  /* Check contrast: https://webaim.org/resources/contrastchecker/ */
}`
    },
    {
      code: 'WCAG 1.4.11',
      level: 'AA',
      severity: 'medium',
      description: 'Non-text Contrast',
      detail: 'UI components and graphical objects must have a contrast ratio of at least 3:1 against adjacent colors.',
      applies: true,
      suggestion: 'Ensure component borders, focus indicators, and icons have sufficient contrast against backgrounds. This is especially important for interactive elements without text.',
      codeExample: `/* High contrast focus indicator */
button:focus {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}`
    },
    {
      code: 'WCAG 2.1.1',
      level: 'A',
      severity: 'critical',
      description: 'Keyboard',
      detail: 'All functionality must be available from a keyboard interface without requiring specific timing for individual keystrokes.',
      applies: true,
      suggestion: type === 'button' || type === 'input' || type === 'dropdown' ? 
        `Ensure ${type} is focusable via Tab key and activatable via Enter/Space. Never use div or span for interactive elements without proper keyboard handling.` :
        'Ensure all interactive elements are reachable and operable via keyboard.',
      codeExample: `// Good: Semantic HTML is keyboard accessible by default
<button onClick={handleClick}>Click Me</button>

// Bad: Div needs manual keyboard handling
<div onClick={handleClick} tabIndex={0} onKeyDown={...}>Click Me</div>`
    },
    {
      code: 'WCAG 2.4.3',
      level: 'A',
      severity: 'high',
      description: 'Focus Order',
      detail: 'Focus order must be logical and intuitive, following the visual reading order.',
      applies: true,
      suggestion: 'Ensure tab order follows visual reading order. Use semantic HTML and avoid positive tabindex values. Modals and dropdowns should manage focus appropriately.',
      codeExample: `// Focus management for modals
function Modal({ isOpen, onClose }) {
  const firstRef = useRef();
  const lastRef = useRef();
  
  useEffect(() => {
    if (isOpen) firstRef.current?.focus();
  }, [isOpen]);
  
  // Implement focus trap...
}`
    },
    {
      code: 'WCAG 2.4.7',
      level: 'AA',
      severity: 'high',
      description: 'Focus Visible',
      detail: 'Keyboard focus indicator must be visible for all interactive elements.',
      applies: true,
      suggestion: 'Never remove focus outlines without providing a custom visible focus indicator. Use outline, box-shadow, or other visible styles for focus state.',
      codeExample: `/* Custom focus styles - always keep focus visible! */
button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

/* Never do this! */
button:focus {
  outline: none; /* ❌ Removes focus indicator */
}`
    },
    {
      code: 'WCAG 2.5.5',
      level: 'AA',
      severity: 'medium',
      description: 'Target Size',
      detail: 'Touch targets must be at least 44×44 CSS pixels, unless spacing or exceptions apply.',
      applies: true,
      suggestion: 'Ensure minimum clickable area of 44×44px for mobile. Provide sufficient spacing between interactive elements to prevent accidental activation.',
      codeExample: `/* Ensure minimum touch target size */
button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}

/* Spacing between buttons */
button + button {
  margin-left: 8px;
}`
    },
    {
      code: 'WCAG 1.4.12',
      level: 'AA',
      severity: 'low',
      description: 'Text Spacing',
      detail: 'Content must adapt to text spacing adjustments without clipping or overlapping.',
      applies: true,
      suggestion: 'Avoid fixed heights on text containers. Use relative units (em, rem) for text properties. Ensure line height of at least 1.5 for body text.',
      codeExample: `/* Support text spacing adjustments */
.text-container {
  min-height: auto; /* ❌ Don't use fixed height */
  line-height: 1.5;
  letter-spacing: 0.12em; /* Can be overridden by user */
}

/* Use relative units */
button {
  font-size: 1rem; /* ✅ */
  padding: 0.75em 1.5em; /* ✅ */
}`
    },
    {
      code: 'WCAG 4.1.1',
      level: 'A',
      severity: 'medium',
      description: 'Parsing',
      detail: 'Markup must be valid and properly structured to be parsed by assistive technologies.',
      applies: true,
      suggestion: 'Use valid HTML5 markup. Ensure proper nesting of elements, unique IDs, and correct ARIA usage. Validate with W3C Markup Validation Service.',
      codeExample: `<!-- Valid HTML -->
<label for="email">Email</label>
<input type="email" id="email" name="email" required>

<!-- Invalid: Missing label association -->
<input type="email" name="email"> <!-- ❌ -->`
    },
    {
      code: 'WCAG 4.1.3',
      level: 'AA',
      severity: 'medium',
      description: 'Status Messages',
      detail: 'Status messages must be programmatically determinable without requiring focus.',
      applies: features?.includes('loading') || type === 'alert',
      suggestion: 'Use ARIA live regions for status updates, notifications, and loading states. This ensures screen reader users are aware of dynamic content changes.',
      codeExample: `<!-- Live region for status messages -->
<div aria-live="polite" class="sr-only">
  {statusMessage}
</div>

<!-- Loading indicator with live region -->
<div role="status" aria-live="polite">
  {isLoading ? 'Loading...' : 'Loaded successfully!'}
</div>`
    }
  ];

  const componentSpecificResult = getComponentSpecificTips(parsed);
  const componentSpecificTips = componentSpecificResult.tips || [];
  
  const allTips = [...universalTips, ...componentSpecificTips];
  
  const byLevel = {
    A: allTips.filter(t => t.level === 'A').length,
    AA: allTips.filter(t => t.level === 'AA').length,
    AAA: allTips.filter(t => t.level === 'AAA').length
  };
  const bySeverity = {
    critical: allTips.filter(t => t.severity === 'critical').length,
    high: allTips.filter(t => t.severity === 'high').length,
    medium: allTips.filter(t => t.severity === 'medium').length,
    low: allTips.filter(t => t.severity === 'low').length
  };

  return {
    componentType: type,
    totalTips: allTips.length,
    byLevel,
    bySeverity,
    tips: allTips,
    summary: {
      total: allTips.length,
      byLevel,
      bySeverity
    }
  };
}

function getComponentSpecificTips(parsed) {
  const { type, colorName, hasIcon, onClick, features, structure } = parsed;
  const tips = [];

  switch (type) {
    case 'button':
      tips.push({
        code: 'WCAG 4.1.2',
        level: 'A',
        severity: 'critical',
        description: 'Name, Role, Value',
        detail: 'Components must have proper names, roles, and states exposed to assistive technologies.',
        applies: true,
        suggestion: 'Use semantic <button> element. Include aria-label for icon-only buttons. Expose disabled state via disabled attribute, not just visual styling.',
        codeExample: `// Good: Semantic button with proper accessibility
<button 
  aria-label={iconOnly ? 'Close dialog' : undefined}
  disabled={isDisabled}
  onClick={handleClick}
>
  {iconOnly ? <XIcon aria-hidden="true" /> : children}
</button>`
      });
      
      tips.push({
        code: 'WCAG 3.2.1',
        level: 'A',
        severity: 'high',
        description: 'On Focus',
        detail: 'Focusing on an element must not change context unexpectedly.',
        applies: true,
        suggestion: 'Button focus should not trigger navigation, form submission, or modal opening without explicit user activation (click or Enter/Space).',
        codeExample: `// ❌ Bad: Focus triggers action
<button onFocus={openModal}>Hover me</button>

// ✅ Good: Only click triggers action
<button onClick={openModal}>Click me</button>`
      });
      
      if (colorName === 'yellow' || colorName === 'orange' || colorName === 'cyan') {
        tips.push({
          code: 'WCAG 1.4.3',
          level: 'AA',
          severity: 'high',
          description: 'Contrast (Minimum)',
          detail: `${colorName.charAt(0).toUpperCase() + colorName.slice(1)} color may have insufficient contrast on white backgrounds.`,
          applies: true,
          suggestion: `The ${colorName} background with white text may not meet 4.5:1 contrast ratio. Consider darker text (#1f2937) or a different background color.`,
          codeExample: `/* Better contrast for light backgrounds */
.button-yellow {
  background-color: #ca8a04; /* darker yellow */
  color: #ffffff;
}

/* Or use dark text */
.button-yellow {
  background-color: #fde047; /* light yellow */
  color: #1f2937; /* dark gray text */
}`
        });
      }
      break;

    case 'input':
    case 'textarea':
    case 'select':
      tips.push({
        code: 'WCAG 1.3.1',
        level: 'A',
        severity: 'critical',
        description: 'Label Association',
        detail: 'Form controls must have associated labels that are programmatically linked.',
        applies: true,
        suggestion: 'Use <label> element with for attribute associated with input id. Or wrap input in <label>. Never rely on placeholder text alone.',
        codeExample: `<!-- ✅ Good: Proper label association -->
<label for="email">Email Address</label>
<input 
  type="email" 
  id="email" 
  name="email"
  aria-describedby="email-hint email-error"
  required
>
<p id="email-hint" class="hint">We'll never share your email.</p>
<p id="email-error" class="error" role="alert"></p>`
      });
      
      tips.push({
        code: 'WCAG 3.3.1',
        level: 'A',
        severity: 'high',
        description: 'Error Identification',
        detail: 'Input errors must be identified and described to the user in text.',
        applies: true,
        suggestion: 'Use aria-describedby to link error messages to inputs. Provide clear, specific error messages explaining what went wrong and how to fix it.',
        codeExample: `<div class="form-group">
  <label for="password">Password</label>
  <input 
    type="password" 
    id="password"
    aria-invalid={hasError}
    aria-describedby={hasError ? "password-error" : "password-requirements"}
  />
  <p id="password-requirements">Must be at least 8 characters.</p>
  {hasError && (
    <p id="password-error" role="alert" className="error">
      Password is too short. Use at least 8 characters.
    </p>
  )}
</div>`
      });
      
      tips.push({
        code: 'WCAG 3.3.2',
        level: 'A',
        severity: 'medium',
        description: 'Labels or Instructions',
        detail: 'Provide labels and instructions when content requires specific input formats.',
        applies: true,
        suggestion: 'Include visible labels, helper text, and format examples. Use aria-describedby to associate instructions with inputs.',
        codeExample: `<label for="date">Birth Date</label>
<input 
  type="date" 
  id="date" 
  name="birthdate"
  aria-describedby="date-format"
>
<span id="date-format" class="sr-only">
  Format: MM/DD/YYYY
</span>`
      });
      
      if (features?.includes('search')) {
        tips.push({
          code: 'WCAG 4.1.2',
          level: 'A',
          severity: 'high',
          description: 'Search Input Semantics',
          detail: 'Search inputs should be properly identified for assistive technologies.',
          applies: true,
          suggestion: 'Use role="search" on the search form container. Include a visible or screen-reader-only submit button.',
          codeExample: `<form role="search" aria-label="Site search">
  <label for="search" className="sr-only">Search</label>
  <input 
    type="search" 
    id="search" 
    name="q"
    placeholder="Search..."
  />
  <button type="submit" aria-label="Submit search">
    <SearchIcon aria-hidden="true" />
  </button>
</form>`
        });
      }
      break;

    case 'modal':
    case 'dialog':
      tips.push({
        code: 'WCAG 2.4.3',
        level: 'A',
        severity: 'critical',
        description: 'Focus Management',
        detail: 'Modal dialogs must trap focus and restore focus on close.',
        applies: true,
        suggestion: 'Implement focus trap: first focusable element receives focus on open, Tab cycles within modal, focus returns to trigger element on close. Support Escape key to close.',
        codeExample: `function Modal({ isOpen, onClose, triggerRef }) {
  const modalRef = useRef();
  const firstFocusableRef = useRef();
  
  useEffect(() => {
    if (isOpen) {
      firstFocusableRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      triggerRef.current?.focus();
      document.body.style.overflow = '';
    }
  }, [isOpen, triggerRef]);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    // Implement focus trap logic...
  };
  
  return (
    <div 
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
    >
      <h2 id="modal-title">Modal Title</h2>
      <button ref={firstFocusableRef} onClick={onClose}>Close</button>
    </div>
  );
}`
      });
      
      tips.push({
        code: 'WCAG 4.1.2',
        level: 'A',
        severity: 'critical',
        description: 'Dialog Semantics',
        detail: 'Dialogs must have proper ARIA roles and labels.',
        applies: true,
        suggestion: 'Use role="dialog", aria-modal="true", and aria-labelledby pointing to the dialog title. Include role="document" for scrollable content.',
        codeExample: `<div 
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-description">
    Are you sure you want to delete this item?
  </p>
  <div role="document">
    <!-- Scrollable content -->
  </div>
</div>`
      });
      
      tips.push({
        code: 'WCAG 1.4.13',
        level: 'AA',
        severity: 'high',
        description: 'Content on Hover or Focus',
        detail: 'Modal content must be dismissable and persistent.',
        applies: true,
        suggestion: 'Support ESC key to close, provide visible close button, and allow clicking backdrop to dismiss. Ensure content remains visible while hovered or focused.',
        codeExample: `// Backdrop click to close
<div 
  className="backdrop" 
  onClick={onClose}
  aria-hidden="true"
>
  <div 
    role="dialog"
    onClick={e => e.stopPropagation()}
    onKeyDown={e => e.key === 'Escape' && onClose()}
  >
    <button onClick={onClose} aria-label="Close dialog">✕</button>
    <!-- Content -->
  </div>
</div>`
      });
      break;

    case 'form':
      tips.push({
        code: 'WCAG 3.3.1',
        level: 'A',
        severity: 'critical',
        description: 'Error Identification',
        detail: 'Form errors must be clearly identified and described.',
        applies: true,
        suggestion: 'Provide inline error messages next to problematic fields. Use role="alert" or aria-live for dynamic error updates. Display a summary of all errors at the top of the form.',
        codeExample: `{errors.length > 0 && (
  <div role="alert" aria-labelledby="error-summary-title">
    <h3 id="error-summary-title">
      Please correct the following errors:
    </h3>
    <ul>
      {errors.map((error, i) => (
        <li key={i}>
          <a href={\`#\${error.fieldId}\`}>
            {error.message}
          </a>
        </li>
      ))}
    </ul>
  </div>
)}`
      });
      
      tips.push({
        code: 'WCAG 2.4.6',
        level: 'AA',
        severity: 'medium',
        description: 'Headings and Labels',
        detail: 'Headings and labels must describe topic or purpose.',
        applies: true,
        suggestion: 'Use clear, descriptive labels for all form fields. Group related fields with <fieldset> and <legend>. Use heading hierarchy (h1, h2, etc.) to structure form sections.',
        codeExample: `<form>
  <fieldset>
    <legend>Personal Information</legend>
    
    <div>
      <label for="firstname">First Name *</label>
      <input type="text" id="firstname" required>
    </div>
    
    <div>
      <label for="lastname">Last Name *</label>
      <input type="text" id="lastname" required>
    </div>
  </fieldset>
</form>`
      });
      
      tips.push({
        code: 'WCAG 3.3.4',
        level: 'AA',
        severity: 'low',
        description: 'Error Prevention (Legal, Financial, Data)',
        detail: 'For legal/financial data transactions, provide mechanisms for reviewing and correcting submissions.',
        applies: onClick === 'submit',
        suggestion: 'Include a review step before final submission. Allow users to go back and edit their responses. Provide a confirmation summary before submitting.',
        codeExample: `// Multi-step form with review
function CheckoutForm() {
  const [step, setStep] = useState(1);
  
  return (
    <div>
      {step === 1 && <BillingForm />}
      {step === 2 && <ShippingForm />}
      {step === 3 && <ReviewSummary />}
      {step === 4 && <Confirmation />}
      
      <button 
        type="button" 
        onClick={() => setStep(Math.max(1, step - 1))}
        disabled={step === 1}
      >
        Back
      </button>
      <button 
        type={step === 4 ? 'submit' : 'button'}
        onClick={() => setStep(Math.min(4, step + 1))}
      >
        {step === 4 ? 'Place Order' : 'Continue'}
      </button>
    </div>
  );
}`
      });
      break;

    case 'navbar':
    case 'navigation':
    case 'menu':
      tips.push({
        code: 'WCAG 2.4.1',
        level: 'A',
        severity: 'critical',
        description: 'Bypass Blocks',
        detail: 'Provide a mechanism to bypass repeated navigation content.',
        applies: true,
        suggestion: 'Include a "Skip to main content" link that appears on focus. This allows keyboard and screen reader users to skip navigation menus.',
        codeExample: `<!-- Skip link placed at the very top of the page -->
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: white;
  padding: 8px;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
</style>

<nav>
  <!-- Navigation links -->
</nav>

<main id="main-content">
  <!-- Main content -->
</main>`
      });
      
      tips.push({
        code: 'WCAG 1.3.1',
        level: 'A',
        severity: 'high',
        description: 'Navigation Semantics',
        detail: 'Navigation regions must be properly identified with ARIA roles.',
        applies: true,
        suggestion: 'Use <nav> element with aria-label to describe the navigation purpose. Use role="menubar" for application-style menus with submenus.',
        codeExample: `<!-- Primary site navigation -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<!-- Secondary navigation -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li aria-current="page">Laptops</li>
  </ol>
</nav>`
      });
      
      tips.push({
        code: 'WCAG 2.1.1',
        level: 'A',
        severity: 'high',
        description: 'Dropdown Keyboard Navigation',
        detail: 'Dropdown menus must be fully keyboard accessible.',
        applies: features?.includes('dropdown'),
        suggestion: 'Dropdowns must support: Enter/Space to open, Arrow keys to navigate items, Escape to close, and Home/End to jump to first/last item.',
        codeExample: `<nav role="menubar" aria-label="Main menu">
  <div role="none">
    <button 
      role="menuitem"
      aria-haspopup="true"
      aria-expanded={isOpen}
      onKeyDown={handleKeyDown}
    >
      Products
    </button>
    <ul 
      role="menu"
      hidden={!isOpen}
    >
      <li role="none">
        <a role="menuitem" href="/laptops">Laptops</a>
      </li>
    </ul>
  </div>
</nav>`
      });
      break;

    case 'alert':
    case 'notification':
      tips.push({
        code: 'WCAG 4.1.3',
        level: 'AA',
        severity: 'critical',
        description: 'Status Messages',
        detail: 'Alerts and notifications must be announced by assistive technologies.',
        applies: true,
        suggestion: 'Use role="alert" for important, time-sensitive messages that need immediate attention. Use aria-live="polite" for less urgent updates.',
        codeExample: `// Critical alert (interrupts)
<div role="alert" className="alert-error">
  <span aria-hidden="true">⚠️</span>
  Connection lost. Please check your internet.
</div>

// Non-intrusive status update
<div aria-live="polite" aria-atomic="true">
  {saveStatus === 'saved' && 'Changes saved successfully!'}
</div>`
      });
      
      tips.push({
        code: 'WCAG 2.5.3',
        level: 'A',
        severity: 'medium',
        description: 'Label in Name',
        detail: 'Visible label must be included in the accessible name.',
        applies: true,
        suggestion: 'If an alert has a close button with "✕" symbol, ensure aria-label includes the visible text concept (e.g., "Close notification").',
        codeExample: `<div role="alert" className="notification">
  <p>Your order has been shipped!</p>
  <button 
    aria-label="Close notification"
    onClick={dismiss}
  >
    <span aria-hidden="true">✕</span>
  </button>
</div>`
      });
      break;

    case 'card':
      if (onClick || features?.includes('clickable')) {
        tips.push({
          code: 'WCAG 1.3.1',
          level: 'A',
          severity: 'high',
          description: 'Clickable Card Semantics',
          detail: 'Cards that act as links or buttons must have proper semantics.',
          applies: true,
          suggestion: 'Wrap the entire card in an <a> tag if it navigates, or use a <button> if it triggers an action. Don\'t make the card itself clickable via JS without proper keyboard support.',
          codeExample: `// ✅ Good: Card as link
<a href="/products/123" className="card-link">
  <article className="card">
    <img src="..." alt="Product image" />
    <h3>Product Name</h3>
    <p>$99.99</p>
  </article>
</a>

// ❌ Bad: Div with onClick
<div onClick={navigate} className="card"> <!-- Needs keyboard support -->
  ...
</div>`
        });
      }
      
      tips.push({
        code: 'WCAG 1.1.1',
        level: 'A',
        severity: 'medium',
        description: 'Card Image Alt Text',
        detail: 'Card images must have descriptive alt text.',
        applies: true,
        suggestion: 'Provide meaningful alt text for card images. If the image is purely decorative, use alt="". If it contains important information, describe it.',
        codeExample: `<article className="card">
  <!-- Informative image -->
  <img 
    src="product.jpg" 
    alt="Blue wireless headphones with noise cancellation"
  />
  
  <!-- Decorative only -->
  <img 
    src="background-pattern.jpg" 
    alt=""
    aria-hidden="true"
  />
  
  <h3>Product Title</h3>
</article>`
      });
      break;

    case 'table':
    case 'datatable':
      tips.push({
        code: 'WCAG 1.3.1',
        level: 'A',
        severity: 'critical',
        description: 'Table Semantics',
        detail: 'Data tables must have proper header associations and captions.',
        applies: true,
        suggestion: 'Use <th scope="col"> for column headers and <th scope="row"> for row headers. Include <caption> for table title. Use scope attribute to associate headers with cells.',
        codeExample: `<table>
  <caption>Monthly Sales Report - 2024</caption>
  <thead>
    <tr>
      <th scope="col">Month</th>
      <th scope="col">Revenue</th>
      <th scope="col">Expenses</th>
      <th scope="col">Profit</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">January</th>
      <td>$10,000</td>
      <td>$6,000</td>
      <td>$4,000</td>
    </tr>
  </tbody>
</table>`
      });
      
      tips.push({
        code: 'WCAG 2.4.3',
        level: 'A',
        severity: 'high',
        description: 'Sortable Table Keyboard Navigation',
        detail: 'Sortable tables must be keyboard accessible.',
        applies: features?.includes('sortable'),
        suggestion: 'Sort buttons in headers must be focusable and operable via keyboard. Indicate sort direction with aria-sort attribute.',
        codeExample: `<th>
  <button 
    onClick={toggleSort}
    aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'}
  >
    Column Name
    <span aria-hidden="true">
      {sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕'}
    </span>
  </button>
</th>`
      });
      break;
  }

  if (hasIcon) {
    tips.push({
      code: 'WCAG 1.1.1',
      level: 'A',
      severity: 'high',
      description: 'Icon Accessibility',
      detail: 'Icons must be properly marked as decorative or functional.',
      applies: true,
      suggestion: parsed.iconType ? 
        `The ${parsed.iconType} icon should either have a descriptive aria-label (if functional) or aria-hidden="true" (if decorative). When used with text, the icon should be hidden from screen readers.` :
        'Icons must have appropriate ARIA attributes based on their purpose.',
      codeExample: `<!-- Icon + text: icon is decorative -->
<button>
  <svg aria-hidden="true">${getIconSVG(parsed.iconType || 'search')}</svg>
  <span>Search</span>
</button>

<!-- Icon only: needs aria-label -->
<button aria-label="Close">
  <svg aria-hidden="true">...</svg>
</button>`
    });
  }

  const componentType = parsed.type || 'custom';
  const byLevel = { A: 0, AA: 0, AAA: 0 };
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  
  tips.forEach(tip => {
    if (byLevel[tip.level] !== undefined) byLevel[tip.level]++;
    if (bySeverity[tip.severity] !== undefined) bySeverity[tip.severity]++;
  });
  
  return {
    componentType,
    tips,
    summary: {
      total: tips.length,
      byLevel,
      bySeverity
    }
  };
}

function getContrastRatio(color1, color2) {
  const luminance1 = getRelativeLuminance(color1);
  const luminance2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;
  
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getIconSVG(type, size = '24px') {
  const icons = {
    search: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>`,
    close: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`,
    generic: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
    </svg>`
  };
  return icons[type] || icons.generic;
}

module.exports = { checkWCAG, getContrastRatio };
