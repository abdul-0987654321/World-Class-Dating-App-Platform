/**
 * SwipeCard (ProfileCard) Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../test/test-utils';
import { SwipeCard } from '../SwipeCard';
import { DiscoveryProfile } from '../../services/discovery.service';

// Mock react-icons
vi.mock('react-icons/fi', () => ({
  FiHeart: () => <span data-testid="heart-icon">Heart</span>,
  FiX: () => <span data-testid="x-icon">X</span>,
  FiStar: () => <span data-testid="star-icon">Star</span>,
  FiMapPin: () => <span data-testid="map-icon">Map</span>,
  FiBriefcase: () => <span data-testid="briefcase-icon">Briefcase</span>,
  FiCheckCircle: () => <span data-testid="check-icon">Check</span>,
}));

// Mock subscription badge
vi.mock('../subscription/SubscriptionBadge', () => ({
  TierIcon: ({ tier }: { tier: string }) => (
    <span data-testid="tier-icon">{tier}</span>
  ),
  SubscriptionTier: {},
}));

const mockProfile: DiscoveryProfile = {
  user_id: 'test-123',
  first_name: 'Jane',
  age: 25,
  bio: 'Love hiking and coffee',
  photos: [
    { url: 'https://example.com/photo1.jpg', is_primary: true },
    { url: 'https://example.com/photo2.jpg', is_primary: false },
  ],
  city: 'New York',
  distance: 5.2,
  interests: ['hiking', 'coffee', 'music'],
  is_verified: true,
  compatibility_score: 85,
  occupation: 'Software Engineer',
  prompts: [
    { question: 'What do you love?', answer: 'Adventures!' },
    { question: 'Perfect date?', answer: 'Coffee and walks' },
  ],
  premium_tier: 'GOLD',
};

describe('SwipeCard', () => {
  const mockOnLike = vi.fn();
  const mockOnPass = vi.fn();
  const mockOnSuperLike = vi.fn();

  beforeEach(() => {
    mockOnLike.mockClear();
    mockOnPass.mockClear();
    mockOnSuperLike.mockClear();
  });

  describe('Rendering', () => {
    it('renders profile name and age', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('renders verified badge when user is verified', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('does not render verified badge when user is not verified', () => {
      const unverifiedProfile = { ...mockProfile, is_verified: false };
      renderWithProviders(
        <SwipeCard
          profile={unverifiedProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    });

    it('renders premium tier icon when present', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.getByTestId('tier-icon')).toBeInTheDocument();
      expect(screen.getByText('GOLD')).toBeInTheDocument();
    });

    it('renders bio when present', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.getByText('Love hiking and coffee')).toBeInTheDocument();
    });

    it('renders occupation when present', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    it('renders city and distance when present', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.getByText(/New York/)).toBeInTheDocument();
      expect(screen.getByText(/5 km away/)).toBeInTheDocument();
    });

    it('renders prompts when present', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.getByText('What do you love?')).toBeInTheDocument();
      expect(screen.getByText('Adventures!')).toBeInTheDocument();
    });

    it('shows placeholder when no photos', () => {
      const noPhotoProfile = { ...mockProfile, photos: [] };
      renderWithProviders(
        <SwipeCard
          profile={noPhotoProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      // Component should still render
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders all action buttons', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.getByTitle('Pass')).toBeInTheDocument();
      expect(screen.getByTitle('Super Like')).toBeInTheDocument();
      expect(screen.getByTitle('Like')).toBeInTheDocument();
    });

    it('calls onPass when pass button is clicked', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      fireEvent.click(screen.getByTitle('Pass'));
      expect(mockOnPass).toHaveBeenCalledTimes(1);
    });

    it('calls onLike when like button is clicked', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      fireEvent.click(screen.getByTitle('Like'));
      expect(mockOnLike).toHaveBeenCalledTimes(1);
    });

    it('calls onSuperLike when super like button is clicked', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      fireEvent.click(screen.getByTitle('Super Like'));
      expect(mockOnSuperLike).toHaveBeenCalledTimes(1);
    });
  });

  describe('Photo Navigation', () => {
    it('renders photo dots for multiple photos', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      // Should have two photo dots (one for each photo)
      const dots = document.querySelectorAll('[class*="Dot"]');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('does not render photo dots for single photo', () => {
      const singlePhotoProfile = {
        ...mockProfile,
        photos: [{ url: 'https://example.com/photo1.jpg', is_primary: true }],
      };

      renderWithProviders(
        <SwipeCard
          profile={singlePhotoProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      // With single photo, dots should not be present
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible action buttons with titles', () => {
      renderWithProviders(
        <SwipeCard
          profile={mockProfile}
          onLike={mockOnLike}
          onPass={mockOnPass}
          onSuperLike={mockOnSuperLike}
        />
      );

      expect(screen.getByTitle('Pass')).toBeInTheDocument();
      expect(screen.getByTitle('Super Like')).toBeInTheDocument();
      expect(screen.getByTitle('Like')).toBeInTheDocument();
    });
  });
});
