import React from 'react';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  indeterminate?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  indeterminate = false,
  className = '',
  id,
  ...props
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className="inline-flex items-center cursor-pointer" htmlFor={id}>
      <div className="relative">
        <input
          ref={inputRef}
          type="checkbox"
          id={id}
          className="sr-only peer"
          {...props}
        />
        <div
          className={`
            w-5 h-5 border-2 rounded
            border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800
            peer-checked:bg-primary-600 peer-checked:border-primary-600
            peer-indeterminate:bg-primary-600 peer-indeterminate:border-primary-600
            transition-colors duration-200
            ${className}
          `}
        >
          <svg
            className="w-full h-full text-white opacity-0 peer-checked:opacity-100 transition-opacity"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          <svg
            className="absolute inset-1 w-3 h-3 text-white opacity-0 peer-indeterminate:opacity-100 transition-opacity"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="4" y="11" width="16" height="2" rx="1" />
          </svg>
        </div>
      </div>
      {label && (
        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
