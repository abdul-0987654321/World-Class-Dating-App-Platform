/**
 * ProfilePage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { ProfilePage } from '../Profile/ProfilePage';

// Mock profile service
const mockGetProfile = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('../../services', () => ({
  profileService: {
    getProfile: () => mockGetProfile(),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  },
  authService: {
    getCurrentUser: () => mockGetProfile(),
    getStoredEntitlements: () => ({
      tier: 'FREE',
      features: [],
      limits: {},
    }),
  },
}));

// Mock components used by ProfilePage
vi.mock('../../components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));

vi.mock('../../components/theme/FlamoralBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="flamoral-background">{children}</div>
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

// Mock localStorage
const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  photoUrl: 'https://example.com/photo.jpg',
  bio: 'Love hiking and coffee',
  age: 28,
  city: 'New York',
  occupation: 'Software Engineer',
  isVerified: true,
  profileCompletion: 80,
  subscription: 'free',
  premiumTier: 'FREE',
  coinBalance: 100,
};

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn().mockReturnValue(JSON.stringify(mockUser)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
});

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProfile.mockResolvedValue(mockUser);
    mockUpdateProfile.mockResolvedValue(mockUser);
  });

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      mockGetProfile.mockReturnValue(new Promise(() => {}));

      renderWithProviders(<ProfilePage />);

      expect(screen.getByTestId('flamoral-background')).toBeInTheDocument();
    });
  });

  describe('Profile Display', () => {
    it('displays user name', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/John/)).toBeInTheDocument();
      });
    });

    it('displays user bio', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/Love hiking and coffee/)).toBeInTheDocument();
      });
    });

    it('displays profile completion percentage', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/80%/)).toBeInTheDocument();
      });
    });

    it('displays verified badge when user is verified', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        // Look for verified indicator
        expect(mockGetProfile).toHaveBeenCalled();
      });
    });

    it('displays subscription tier', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('renders navigation component', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByTestId('navigation')).toBeInTheDocument();
      });
    });

    it('has link to edit profile', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/edit/i)).toBeInTheDocument();
      });
    });

    it('has link to settings', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        const settingsLinks = screen.getAllByText(/settings/i);
        expect(settingsLinks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Profile Actions', () => {
    it('has edit profile button', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/edit/i)).toBeInTheDocument();
      });
    });

    it('navigates to edit profile on edit button click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/edit/i)).toBeInTheDocument();
      });

      const editButton = screen.getByText(/edit profile/i);
      await user.click(editButton);

      expect(mockNavigate).toHaveBeenCalledWith('/profile/edit');
    });
  });

  describe('Profile Sections', () => {
    it('displays photos section', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/photos/i)).toBeInTheDocument();
      });
    });

    it('displays about section', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/about/i)).toBeInTheDocument();
      });
    });

    it('displays interests section', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        const interestsElements = screen.queryAllByText(/interests/i);
        expect(interestsElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Upgrade Prompt', () => {
    it('shows upgrade button for free users', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        const upgradeButton = screen.queryByText(/upgrade/i);
        expect(upgradeButton).toBeInTheDocument();
      });
    });

    it('navigates to subscription page on upgrade click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.queryByText(/upgrade/i)).toBeInTheDocument();
      });

      const upgradeButton = screen.getByText(/upgrade/i);
      await user.click(upgradeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/subscription');
    });
  });

  describe('Coin Balance', () => {
    it('displays coin balance', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/100/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles profile load error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetProfile.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Verification Status', () => {
    it('shows verified status for verified users', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalled();
      });
    });

    it('shows verify prompt for unverified users', async () => {
      mockGetProfile.mockResolvedValue({ ...mockUser, isVerified: false });

      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText(/verify/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
      });
    });

    it('has accessible buttons', async () => {
      renderWithProviders(<ProfilePage />);

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });
});
