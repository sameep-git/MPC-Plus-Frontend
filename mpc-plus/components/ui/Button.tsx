'use client';

import React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'text' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-purple-900 text-white rounded-lg font-medium hover:bg-purple-800 transition-colors',
  text:
    'underline text-current hover:opacity-80 transition-opacity',
  icon:
    'p-2 hover:bg-gray-100 rounded-lg transition-colors',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = clsx(
    variantClasses[variant],
    variant !== 'icon' && sizeClasses[size],
    fullWidth && 'w-full',
    className
  );

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;


