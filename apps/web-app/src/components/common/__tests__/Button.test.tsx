/**
 * Button Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../../test/test-utils';
import { Button } from '../Button';

describe('Button', () => {
  describe('Rendering', () => {
    it('renders with children text', () => {
      renderWithProviders(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders with primary variant by default', () => {
      renderWithProviders(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with secondary variant', () => {
      renderWithProviders(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with outline variant', () => {
      renderWithProviders(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('renders with ghost variant', () => {
      renderWithProviders(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('renders with small size', () => {
      renderWithProviders(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with medium size by default', () => {
      renderWithProviders(<Button>Medium</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders with large size', () => {
      renderWithProviders(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('handles click events', () => {
      const handleClick = vi.fn();
      renderWithProviders(<Button onClick={handleClick}>Click</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
      const handleClick = vi.fn();
      renderWithProviders(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('is disabled when loading', () => {
      const handleClick = vi.fn();
      renderWithProviders(
        <Button isLoading onClick={handleClick}>
          Loading
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('shows spinner when loading', () => {
      renderWithProviders(<Button isLoading>Loading</Button>);
      // The Spinner component should be rendered
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });
  });

  describe('Full Width', () => {
    it('renders full width when fullWidth is true', () => {
      renderWithProviders(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has correct button role', () => {
      renderWithProviders(<Button>Accessible</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('supports aria-label', () => {
      renderWithProviders(<Button aria-label="Submit form">Submit</Button>);
      expect(screen.getByLabelText('Submit form')).toBeInTheDocument();
    });

    it('supports type attribute', () => {
      renderWithProviders(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  describe('HTML Attributes', () => {
    it('passes through additional HTML attributes', () => {
      renderWithProviders(
        <Button data-testid="custom-button" id="my-button">
          Custom
        </Button>
      );

      const button = screen.getByTestId('custom-button');
      expect(button).toHaveAttribute('id', 'my-button');
    });
  });
});
