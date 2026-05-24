import React, { useState, useRef, useEffect } from 'react';

interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
  divider?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled && !item.divider) {
      item.onClick?.();
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`
            absolute z-50 mt-2 min-w-48
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            rounded-lg shadow-lg
            ${align === 'right' ? 'right-0' : 'left-0'}
            animate-in fade-in slide-in-from-top-2 duration-200
          `}
          role="menu"
        >
          {items.map((item, index) => (
            item.divider ? (
              <div
                key={`divider-${index}`}
                className="my-1 border-t border-gray-200 dark:border-gray-700"
              />
            ) : (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`
                  w-full px-4 py-2 text-left text-sm
                  flex items-center gap-3
                  transition-colors duration-150
                  ${item.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : item.danger
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                  ${index === 0 ? 'rounded-t-lg' : ''}
                  ${index === items.length - 1 ? 'rounded-b-lg' : ''}
                `}
                role="menuitem"
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                {item.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
