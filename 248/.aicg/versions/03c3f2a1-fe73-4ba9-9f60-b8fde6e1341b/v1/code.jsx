import React from 'react';

const AIGeneratedButton = ({
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

export default AIGeneratedButton;