import React, { useState } from 'react';

interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  defaultActiveKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onChange,
  className = ''
}) => {
  const [internalActiveKey, setInternalActiveKey] = useState(defaultActiveKey || tabs[0]?.key);
  const activeKey = controlledActiveKey !== undefined ? controlledActiveKey : internalActiveKey;

  const handleTabClick = (key: string) => {
    if (controlledActiveKey === undefined) {
      setInternalActiveKey(key);
    }
    onChange?.(key);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && handleTabClick(tab.key)}
              disabled={tab.disabled}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                flex items-center gap-2
                transition-colors duration-200
                ${activeKey === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

interface TabPanelProps {
  activeKey: string;
  itemKey: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  activeKey,
  itemKey,
  children,
  className = ''
}) => {
  if (activeKey !== itemKey) return null;

  return (
    <div className={className}>
      {children}
    </div>
  );
};

export default Tabs;
