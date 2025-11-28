/**
 * Flamoral Button Component
 * Web version with high contrast flame gradients
 */

import React from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const baseClass = 'flamoral-btn';
  const variantClass = `flamoral-btn--${variant}`;
  const sizeClass = `flamoral-btn--${size}`;
  const fullWidthClass = fullWidth ? 'flamoral-btn--full-width' : '';
  const loadingClass = loading ? 'flamoral-btn--loading' : '';
  const disabledClass = disabled ? 'flamoral-btn--disabled' : '';

  const combinedClassName = [
    baseClass,
    variantClass,
    sizeClass,
    fullWidthClass,
    loadingClass,
    disabledClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={combinedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="flamoral-btn__spinner">
          <svg
            className="flamoral-btn__spinner-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="31.4 31.4"
            />
          </svg>
        </span>
      )}
      {!loading && leftIcon && (
        <span className="flamoral-btn__icon flamoral-btn__icon--left">
          {leftIcon}
        </span>
      )}
      <span className="flamoral-btn__text">{children}</span>
      {!loading && rightIcon && (
        <span className="flamoral-btn__icon flamoral-btn__icon--right">
          {rightIcon}
        </span>
      )}
    </button>
  );
};

// Convenience components for common variants
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);

export const OutlineButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="outline" {...props} />
);

export default Button;
