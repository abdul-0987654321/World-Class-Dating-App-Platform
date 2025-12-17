import React, { forwardRef } from 'react';
import styled from 'styled-components';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const InputWrapper = styled.div`
  width: 100%;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const InputContainer = styled.div<{ hasError?: boolean; hasIcon?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;

  ${({ hasIcon, theme }) =>
    hasIcon &&
    `
    svg {
      position: absolute;
      left: ${theme.spacing.md};
      width: 20px;
      height: 20px;
      color: ${theme.colors.textSecondary};
    }
  `}
`;

const StyledInput = styled.input<{ hasError?: boolean; hasIcon?: boolean }>`
  width: 100%;
  padding: ${({ theme, hasIcon }) =>
    hasIcon
      ? `${theme.spacing.md} ${theme.spacing.md} ${theme.spacing.md} ${theme.spacing['3xl']}`
      : `${theme.spacing.md}`};
  font-size: ${({ theme }) => theme.fontSize.md};
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.white};
  border: 2px solid
    ${({ theme, hasError }) => (hasError ? theme.colors.error : theme.colors.border)};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  outline: none;
  transition: all ${({ theme }) => theme.transitions.base};

  &:focus {
    border-color: ${({ theme, hasError }) =>
      hasError ? theme.colors.error : theme.colors.primary};
    box-shadow: 0 0 0 3px
      ${({ theme, hasError }) =>
        hasError ? theme.colors.errorLight : theme.colors.primaryLight};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.backgroundTertiary};
    cursor: not-allowed;
    opacity: 0.6;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textLight};
  }
`;

const ErrorText = styled.span`
  display: block;
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.error};
`;

const HelperText = styled.span`
  display: block;
  margin-top: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className, ...props }, ref) => {
    return (
      <InputWrapper className={className}>
        {label && <Label>{label}</Label>}
        <InputContainer hasError={!!error} hasIcon={!!icon}>
          {icon}
          <StyledInput ref={ref} hasError={!!error} hasIcon={!!icon} {...props} />
        </InputContainer>
        {error && <ErrorText>{error}</ErrorText>}
        {!error && helperText && <HelperText>{helperText}</HelperText>}
      </InputWrapper>
    );
  }
);

Input.displayName = 'Input';
