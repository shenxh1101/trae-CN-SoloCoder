import React from 'react';

const GreenButton = ({ 
  children = 'Click Me', 
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  const baseStyles = {
    padding: '16px 32px',
    fontSize: '18px',
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

    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
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
      
      <span>{children}</span>
    </button>
  );
};

export default GreenButton;