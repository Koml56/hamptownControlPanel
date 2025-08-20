// CheckboxButton.tsx - Standardized checkbox button component matching "Plan Preps" design
import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxButtonProps {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'blue' | 'green' | 'indigo';
  'data-testid'?: string;
}

const CheckboxButton: React.FC<CheckboxButtonProps> = ({
  checked,
  onClick,
  disabled = false,
  className = '',
  title,
  size = 'medium',
  variant = 'blue',
  'data-testid': testId
}) => {
  // Size configurations
  const sizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-6 h-6', 
    large: 'w-7 h-7'
  };

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5'
  };

  // Color configurations
  const colorClasses = {
    blue: {
      checked: 'bg-blue-500 border-blue-500',
      unchecked: 'border-gray-300 hover:border-blue-500'
    },
    green: {
      checked: 'bg-green-500 border-green-500', 
      unchecked: 'border-gray-300 hover:border-green-500'
    },
    indigo: {
      checked: 'bg-indigo-500 border-indigo-500',
      unchecked: 'border-gray-300 hover:border-indigo-500'
    }
  };

  const colors = colorClasses[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${sizeClasses[size]}
        rounded-full 
        border-2 
        flex 
        items-center 
        justify-center 
        transition-colors
        ${checked ? colors.checked : colors.unchecked}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}
      `.replace(/\s+/g, ' ').trim()}
      title={title}
      data-testid={testId}
    >
      {checked && <Check className={`${iconSizes[size]} text-white`} />}
    </button>
  );
};

export default CheckboxButton;