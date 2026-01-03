/**
 * SignupPage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { SignupPage } from '../Auth/SignupPage';

// Mock services
const mockRegister = vi.fn();
vi.mock('../../services', () => ({
  authService: {
    register: (...args: unknown[]) => mockRegister(...args),
  },
}));

// Mock components
vi.mock('../../components/Logo/FlamoralLogo', () => ({
  FlamoralLogo: () => <div data-testid="flamoral-logo">Flamoral</div>,
}));

vi.mock('../../components/AIAvatar/AIAvatarSystem', () => ({
  AIAvatarSystem: () => <div data-testid="ai-avatar">AI Avatar</div>,
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

// Mock window.location
const originalLocation = window.location;
beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: '' },
  });
});
afterEach(() => {
  window.location = originalLocation;
});

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegister.mockReset();
    mockNavigate.mockReset();
  });

  describe('Step 1: Basic Information', () => {
    it('renders step 1 form fields', () => {
      renderWithProviders(<SignupPage />);

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Create a strong password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    });

    it('shows progress indicator at step 1', () => {
      renderWithProviders(<SignupPage />);

      const steps = screen.getAllByText(/^[123]$/);
      expect(steps).toHaveLength(3);
    });

    it('validates first name is required', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      // Try to continue without first name
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    it('validates first name minimum length', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await user.type(screen.getByPlaceholderText('First name'), 'A');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('First name must be at least 2 characters')).toBeInTheDocument();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('your@email.com'), 'invalid-email');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('validates password strength', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'weak');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });

    it('validates password confirmation matches', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123');
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'Different123');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('shows password strength indicator', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      const passwordInput = screen.getByPlaceholderText('Create a strong password');
      await user.type(passwordInput, 'Password123!');

      // Should show strength indicator
      await waitFor(() => {
        expect(screen.getByText(/weak|medium|strong/i)).toBeInTheDocument();
      });
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      const passwordInput = screen.getByPlaceholderText('Create a strong password');
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find and click the toggle button
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn =>
        btn.parentElement?.querySelector('input[placeholder="Create a strong password"]')
      );

      if (toggleButton) {
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');
      }
    });

    it('advances to step 2 with valid data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123');
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'Password123');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() => {
        expect(screen.getByText('About You')).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: About You', () => {
    const advanceToStep2 = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123');
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'Password123');
      await user.click(screen.getByRole('button', { name: /continue/i }));
    };

    it('renders step 2 form fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await advanceToStep2(user);

      await waitFor(() => {
        expect(screen.getByText('About You')).toBeInTheDocument();
        expect(screen.getByText('Date of Birth *')).toBeInTheDocument();
        expect(screen.getByText('Gender *')).toBeInTheDocument();
      });
    });

    it('validates date of birth is required', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await advanceToStep2(user);

      await waitFor(() => {
        expect(screen.getByText('About You')).toBeInTheDocument();
      });

      // Try to continue without date of birth
      const continueButton = screen.getAllByRole('button', { name: /continue/i })[0];
      await user.click(continueButton);

      expect(screen.getByText('Date of birth is required')).toBeInTheDocument();
    });

    it('validates age is at least 18', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await advanceToStep2(user);

      await waitFor(() => {
        expect(screen.getByText('About You')).toBeInTheDocument();
      });

      // Enter a date that makes user under 18
      const today = new Date();
      const underageDate = new Date(today.getFullYear() - 17, 0, 1).toISOString().split('T')[0];

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: underageDate } });

      const continueButton = screen.getAllByRole('button', { name: /continue/i })[0];
      await user.click(continueButton);

      expect(screen.getByText('You must be at least 18 years old')).toBeInTheDocument();
    });

    it('validates gender is required', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await advanceToStep2(user);

      await waitFor(() => {
        expect(screen.getByText('About You')).toBeInTheDocument();
      });

      // Set valid date of birth
      const validDate = new Date(new Date().getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: validDate } });

      // Try to continue without gender
      const continueButton = screen.getAllByRole('button', { name: /continue/i })[0];
      await user.click(continueButton);

      expect(screen.getByText('Please select your gender')).toBeInTheDocument();
    });

    it('validates terms acceptance is required', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await advanceToStep2(user);

      await waitFor(() => {
        expect(screen.getByText('About You')).toBeInTheDocument();
      });

      // Set valid date of birth and gender
      const validDate = new Date(new Date().getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: validDate } });

      const genderSelect = document.querySelector('select[name="gender"]') as HTMLSelectElement;
      fireEvent.change(genderSelect, { target: { value: 'male' } });

      // Try to continue without accepting terms
      const continueButton = screen.getAllByRole('button', { name: /continue/i })[0];
      await user.click(continueButton);

      expect(screen.getByText('You must agree to the terms and privacy policy')).toBeInTheDocument();
    });

    it('allows going back to step 1', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await advanceToStep2(user);

      await waitFor(() => {
        expect(screen.getByText('About You')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /back/i }));

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
  });

  describe('Step 3: Photo Upload', () => {
    const advanceToStep3 = async (user: ReturnType<typeof userEvent.setup>) => {
      // Step 1
      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('your@email.com'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Create a strong password'), 'Password123');
      await user.type(screen.getByPlaceholderText('Confirm your password'), 'Password123');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2
      await waitFor(() => {
        expect(screen.getByText('About You')).toBeInTheDocument();
      });

      const validDate = new Date(new Date().getFullYear() - 25, 0, 1).toISOString().split('T')[0];
      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(dateInput, { target: { value: validDate } });

      const genderSelect = document.querySelector('select[name="gender"]') as HTMLSelectElement;
      fireEvent.change(genderSelect, { target: { value: 'male' } });

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const continueButton = screen.getAllByRole('button', { name: /continue/i })[0];
      await user.click(continueButton);
    };

    it('renders step 3 photo upload', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await advanceToStep3(user);

      await waitFor(() => {
        expect(screen.getByText('Upload Your Photos')).toBeInTheDocument();
      });
    });

    it('shows photo count indicator', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SignupPage />);

      await advanceToStep3(user);

      await waitFor(() => {
        expect(screen.getByText(/0 \/ 3 required photos/)).toBeInTheDocument();
      });
    });
  });

  describe('Sign In Link', () => {
    it('has link to sign in page', () => {
      renderWithProviders(<SignupPage />);

      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
  });
});
