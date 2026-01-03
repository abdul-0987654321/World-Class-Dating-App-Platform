/**
 * LoginPage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../Auth/LoginPage';

// Mock services
const mockLogin = vi.fn();
vi.mock('../../services', () => ({
  authService: {
    login: (...args: unknown[]) => mockLogin(...args),
  },
}));

// Mock components
vi.mock('../../components/Logo/FlamoralLogo', () => ({
  FlamoralLogo: () => <div data-testid="flamoral-logo">Flamoral</div>,
}));

vi.mock('../../components/auth/SocialLoginButtons', () => ({
  default: ({ onSuccess, onError }: { onSuccess: () => void; onError: (e: Error) => void }) => (
    <div data-testid="social-login">
      <button onClick={() => onSuccess()}>Mock Social Login</button>
      <button onClick={() => onError(new Error('Social error'))}>Mock Social Error</button>
    </div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  describe('Rendering', () => {
    it('renders login form', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByTestId('flamoral-logo')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders social login buttons', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByTestId('social-login')).toBeInTheDocument();
    });

    it('renders forgot password link', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });

    it('renders sign up link', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByText('Sign up')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('requires email and password fields', () => {
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('email input has email type', () => {
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Enter your email');
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('Password Visibility Toggle', () => {
    it('password is hidden by default', () => {
      renderWithProviders(<LoginPage />);

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility on button click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn =>
        btn.querySelector('svg')
      );

      // Initially hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle
      if (toggleButton) {
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        // Click again to hide
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });
  });

  describe('Form Submission', () => {
    it('calls login service with email and password', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ user: { id: '1' }, token: 'token' });

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('navigates to discover on successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({ user: { id: '1' }, token: 'token' });

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/discover');
      });
    });

    it('displays error message on login failure', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      // Create a promise that doesn't resolve immediately
      let resolveLogin: (value: unknown) => void;
      mockLogin.mockReturnValue(new Promise((resolve) => {
        resolveLogin = resolve;
      }));

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      // Should show loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      // Resolve the promise
      resolveLogin!({ user: { id: '1' }, token: 'token' });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/discover');
      });
    });

    it('disables submit button while loading', async () => {
      const user = userEvent.setup();
      mockLogin.mockReturnValue(new Promise(() => {})); // Never resolves

      renderWithProviders(<LoginPage />);

      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
      });
    });
  });

  describe('Social Login', () => {
    it('handles social login success', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);

      await user.click(screen.getByText('Mock Social Login'));

      expect(mockNavigate).toHaveBeenCalledWith('/discover');
    });

    it('handles social login error', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);

      await user.click(screen.getByText('Mock Social Error'));

      expect(screen.getByText('Social error')).toBeInTheDocument();
    });
  });

  describe('Input Handling', () => {
    it('updates email on input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);

      const emailInput = screen.getByPlaceholderText('Enter your email');
      await user.type(emailInput, 'new@email.com');

      expect(emailInput).toHaveValue('new@email.com');
    });

    it('updates password on input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginPage />);

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      await user.type(passwordInput, 'mypassword');

      expect(passwordInput).toHaveValue('mypassword');
    });

    it('clears error on new submission attempt', async () => {
      const user = userEvent.setup();
      mockLogin
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ user: { id: '1' }, token: 'token' });

      renderWithProviders(<LoginPage />);

      // First attempt - fails
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong');
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      // Second attempt - should clear error
      await user.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument();
      });
    });
  });
});
