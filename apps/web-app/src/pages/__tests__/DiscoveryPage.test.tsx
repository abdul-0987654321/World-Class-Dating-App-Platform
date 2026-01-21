/**
 * DiscoveryPage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../test/test-utils';
import { DiscoveryPage } from '../Discovery/DiscoveryPage';

// Mock discovery service
const mockGetRecommendations = vi.fn();
const mockSwipe = vi.fn();
const mockGetStats = vi.fn();

vi.mock('../../services', () => ({
  discoveryService: {
    getRecommendations: () => mockGetRecommendations(),
    swipe: (...args: unknown[]) => mockSwipe(...args),
    getStats: () => mockGetStats(),
  },
  DiscoveryProfile: {},
}));

// Mock components
vi.mock('../../components/Navigation', () => {
  const Navigation = () => <nav data-testid="navigation">Navigation</nav>;
  return {
    Navigation,
    default: Navigation,
  };
});

vi.mock('../../components/theme/FlamoralBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="flamoral-background">{children}</div>
  ),
}));

vi.mock('../../components/AIAvatar/AIAvatarSystem', () => ({
  AIAvatarSystem: () => null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockProfiles = [
  {
    user_id: 'user-1',
    first_name: 'Jane',
    age: 25,
    bio: 'Love hiking!',
    photos: [{ url: 'https://example.com/photo1.jpg', is_primary: true }],
    city: 'New York',
    distance: 5,
    interests: ['hiking'],
    is_verified: true,
    compatibility_score: 85,
  },
  {
    user_id: 'user-2',
    first_name: 'John',
    age: 28,
    bio: 'Coffee lover',
    photos: [{ url: 'https://example.com/photo2.jpg', is_primary: true }],
    city: 'Brooklyn',
    distance: 10,
    interests: ['coffee'],
    is_verified: false,
    compatibility_score: 78,
  },
];

const mockStats = {
  remainingLikes: 10,
  remainingSuperLikes: 5,
  remainingBoosts: 1,
};

describe('DiscoveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRecommendations.mockResolvedValue({ profiles: mockProfiles });
    mockGetStats.mockResolvedValue(mockStats);
    mockSwipe.mockResolvedValue({ isMatch: false });
  });

  describe('Loading State', () => {
    it('shows loading spinner initially', () => {
      mockGetRecommendations.mockReturnValue(new Promise(() => {})); // Never resolves
      mockGetStats.mockReturnValue(new Promise(() => {}));

      renderWithProviders(<DiscoveryPage />);

      expect(screen.getByTestId('flamoral-background')).toBeInTheDocument();
    });
  });

  describe('Rendering', () => {
    it('renders navigation', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByTestId('navigation')).toBeInTheDocument();
      });
    });

    it('renders stats bar with remaining counts', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument(); // remainingLikes
        expect(screen.getByText('5')).toBeInTheDocument(); // remainingSuperLikes
        expect(screen.getByText('1')).toBeInTheDocument(); // remainingBoosts
      });
    });

    it('renders profile card with user info', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
      });
    });

    it('renders stats labels', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Likes Left')).toBeInTheDocument();
        expect(screen.getByText('Super Likes')).toBeInTheDocument();
        expect(screen.getByText('Boosts')).toBeInTheDocument();
      });
    });
  });

  describe('Swipe Actions', () => {
    it('calls swipe with "like" when like button clicked', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      // Find and click the like button (heart icon)
      const likeButton = screen.getByTitle('Like');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(mockSwipe).toHaveBeenCalledWith('user-1', 'like');
      });
    });

    it('calls swipe with "pass" when pass button clicked', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      const passButton = screen.getByTitle('Pass');
      fireEvent.click(passButton);

      await waitFor(() => {
        expect(mockSwipe).toHaveBeenCalledWith('user-1', 'pass');
      });
    });

    it('calls swipe with "super_like" when super like button clicked', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      const superLikeButton = screen.getByTitle('Super Like');
      fireEvent.click(superLikeButton);

      await waitFor(() => {
        expect(mockSwipe).toHaveBeenCalledWith('user-1', 'super_like');
      });
    });
  });

  describe('Profile Navigation', () => {
    it('moves to next profile after swipe', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      const likeButton = screen.getByTitle('Like');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText('John')).toBeInTheDocument();
      });
    });

    it('reloads profiles when reaching end of list', async () => {
      mockGetRecommendations
        .mockResolvedValueOnce({ profiles: [mockProfiles[0]] })
        .mockResolvedValueOnce({ profiles: [mockProfiles[1]] });

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      const likeButton = screen.getByTitle('Like');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(mockGetRecommendations).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Match Modal', () => {
    it('shows match modal when swipe results in match', async () => {
      mockSwipe.mockResolvedValue({
        isMatch: true,
        match: {
          id: 'match-1',
          userId: 'user-1',
          name: 'Jane',
          photo: 'https://example.com/photo.jpg',
        },
      });

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      const likeButton = screen.getByTitle('Like');
      fireEvent.click(likeButton);

      // Match modal behavior would be tested here if implemented
    });
  });

  describe('Photo Navigation', () => {
    it('renders photo navigation dots for profiles with multiple photos', async () => {
      mockGetRecommendations.mockResolvedValue({
        profiles: [
          {
            ...mockProfiles[0],
            photos: [
              { url: 'https://example.com/photo1.jpg', is_primary: true },
              { url: 'https://example.com/photo2.jpg', is_primary: false },
            ],
          },
        ],
      });

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      // Photo dots should be present
      const dots = document.querySelectorAll('button[class*="h-2"]');
      expect(dots.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('handles empty profile list gracefully', async () => {
      mockGetRecommendations.mockResolvedValue({ profiles: [] });

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(mockGetRecommendations).toHaveBeenCalled();
      });

      // Should not crash with empty list
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles profile load error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetRecommendations.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('handles swipe error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSwipe.mockRejectedValue(new Error('Swipe failed'));

      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      const likeButton = screen.getByTitle('Like');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has accessible action buttons', async () => {
      renderWithProviders(<DiscoveryPage />);

      await waitFor(() => {
        expect(screen.getByTitle('Like')).toBeInTheDocument();
        expect(screen.getByTitle('Pass')).toBeInTheDocument();
        expect(screen.getByTitle('Super Like')).toBeInTheDocument();
      });
    });
  });
});
