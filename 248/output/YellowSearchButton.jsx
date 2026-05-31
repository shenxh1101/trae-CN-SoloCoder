import React from 'react';

const YellowButton = ({ 
  children = 'Click Me', 
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  const baseStyles = {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#eab308',
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
    borderRadius: '8px',

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
    >
      <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>` }} />
      <span>{children}</span>
    </button>
  );
};

export default YellowButton;