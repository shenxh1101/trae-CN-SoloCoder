import React from 'react';

const GreenButton = ({ 
  children = 'Click Me', 
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  const baseStyles = {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#22c55e',
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
      onFocus={(e) => {
        e.target.style.outline = '2px solid #22c55e';
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
      
      <span>{children}</span>
    </button>
  );
};

export default GreenButton;