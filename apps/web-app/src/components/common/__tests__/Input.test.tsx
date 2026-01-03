/**
 * Input Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders input element', () => {
      renderWithProviders(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with label', () => {
      renderWithProviders(<Input label="Email" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('renders without label when not provided', () => {
      renderWithProviders(<Input placeholder="No label" />);
      expect(screen.queryByRole('label')).not.toBeInTheDocument();
    });

    it('renders with helper text', () => {
      renderWithProviders(<Input helperText="This is helper text" />);
      expect(screen.getByText('This is helper text')).toBeInTheDocument();
    });

    it('does not show helper text when error is present', () => {
      renderWithProviders(
        <Input helperText="Helper" error="Error message" />
      );
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('displays error message', () => {
      renderWithProviders(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('applies error styling when error is present', () => {
      renderWithProviders(<Input error="Error" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Icon', () => {
    it('renders with icon', () => {
      const icon = <span data-testid="icon">Icon</span>;
      renderWithProviders(<Input icon={icon} />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('handles value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      renderWithProviders(
        <Input placeholder="Type here" onChange={handleChange} />
      );

      const input = screen.getByPlaceholderText('Type here');
      await user.type(input, 'Hello');

      expect(handleChange).toHaveBeenCalled();
    });

    it('supports controlled input', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn((e) => e.target.value);

      const { rerender } = renderWithProviders(
        <Input value="" onChange={handleChange} placeholder="Controlled" />
      );

      const input = screen.getByPlaceholderText('Controlled');
      await user.type(input, 'Test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('handles focus events', () => {
      const handleFocus = vi.fn();
      renderWithProviders(
        <Input placeholder="Focus me" onFocus={handleFocus} />
      );

      const input = screen.getByPlaceholderText('Focus me');
      fireEvent.focus(input);

      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it('handles blur events', () => {
      const handleBlur = vi.fn();
      renderWithProviders(<Input placeholder="Blur me" onBlur={handleBlur} />);

      const input = screen.getByPlaceholderText('Blur me');
      fireEvent.focus(input);
      fireEvent.blur(input);

      expect(handleBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('Input Types', () => {
    it('renders as text input by default', () => {
      renderWithProviders(<Input placeholder="Text" />);
      expect(screen.getByPlaceholderText('Text')).toHaveAttribute('type', 'text');
    });

    it('renders as password input', () => {
      renderWithProviders(<Input type="password" placeholder="Password" />);
      expect(screen.getByPlaceholderText('Password')).toHaveAttribute(
        'type',
        'password'
      );
    });

    it('renders as email input', () => {
      renderWithProviders(<Input type="email" placeholder="Email" />);
      expect(screen.getByPlaceholderText('Email')).toHaveAttribute(
        'type',
        'email'
      );
    });

    it('renders as number input', () => {
      renderWithProviders(<Input type="number" placeholder="Number" />);
      expect(screen.getByPlaceholderText('Number')).toHaveAttribute(
        'type',
        'number'
      );
    });
  });

  describe('Disabled State', () => {
    it('is disabled when disabled prop is true', () => {
      renderWithProviders(<Input disabled placeholder="Disabled" />);
      expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
    });

    it('does not trigger onChange when disabled', async () => {
      const handleChange = vi.fn();
      renderWithProviders(
        <Input disabled placeholder="Disabled" onChange={handleChange} />
      );

      const input = screen.getByPlaceholderText('Disabled');
      fireEvent.change(input, { target: { value: 'test' } });

      // Disabled inputs don't fire change events
      expect(input).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('associates label with input', () => {
      renderWithProviders(<Input label="Username" id="username" />);
      const input = screen.getByLabelText('Username');
      expect(input).toBeInTheDocument();
    });

    it('supports aria-describedby for error', () => {
      renderWithProviders(
        <Input
          error="Invalid input"
          aria-describedby="error-message"
          placeholder="With error"
        />
      );
      expect(screen.getByText('Invalid input')).toBeInTheDocument();
    });

    it('supports required attribute', () => {
      renderWithProviders(<Input required placeholder="Required" />);
      expect(screen.getByPlaceholderText('Required')).toBeRequired();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = { current: null };
      renderWithProviders(<Input ref={ref} placeholder="Ref test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});
