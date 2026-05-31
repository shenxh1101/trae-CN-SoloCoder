import React from 'react';

const BlueButton = ({ 
  children = 'Click Me', 
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  const baseStyles = {
    padding: '12px 24px',
    fontSize: '16px',
    backgroundColor: '#3b82f6',
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

export default BlueButton;