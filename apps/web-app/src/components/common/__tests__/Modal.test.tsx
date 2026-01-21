/**
 * UpgradeModal Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../../../test/test-utils';
import { UpgradeModal } from '../UpgradeModal';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('UpgradeModal', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      renderWithProviders(<UpgradeModal isOpen={false} onClose={() => {}} />);
      expect(screen.queryByText('Premium Feature')).not.toBeInTheDocument();
    });

    it('renders when isOpen is true', () => {
      renderWithProviders(<UpgradeModal isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    });

    it('displays default message when no feature specified', () => {
      renderWithProviders(<UpgradeModal isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    });

    it('displays custom message when provided', () => {
      renderWithProviders(
        <UpgradeModal isOpen={true} onClose={() => {}} message="Custom upgrade message" />
      );
      // Message appears in the feature description and/or the content section
      const messages = screen.getAllByText(/Custom upgrade message/);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Feature Specific Content', () => {
    it('displays super_like feature info', () => {
      renderWithProviders(<UpgradeModal isOpen={true} onClose={() => {}} feature="super_like" />);
      expect(screen.getByText('Super Like')).toBeInTheDocument();
      expect(screen.getByText(/Stand out from the crowd/)).toBeInTheDocument();
    });

    it('displays unlimited_likes feature info', () => {
      renderWithProviders(
        <UpgradeModal isOpen={true} onClose={() => {}} feature="unlimited_likes" />
      );
      expect(screen.getByText('Unlimited Likes')).toBeInTheDocument();
    });

    it('displays see_who_likes_you feature info', () => {
      renderWithProviders(
        <UpgradeModal isOpen={true} onClose={() => {}} feature="see_who_likes_you" />
      );
      expect(screen.getByText('See Who Likes You')).toBeInTheDocument();
    });

    it('displays video_call feature info', () => {
      renderWithProviders(<UpgradeModal isOpen={true} onClose={() => {}} feature="video_call" />);
      expect(screen.getByText('Video Calls')).toBeInTheDocument();
    });

    it('displays advanced_filters feature info', () => {
      renderWithProviders(
        <UpgradeModal isOpen={true} onClose={() => {}} feature="advanced_filters" />
      );
      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    });

    it('displays boost feature info', () => {
      renderWithProviders(<UpgradeModal isOpen={true} onClose={() => {}} feature="boost" />);
      expect(screen.getByText('Profile Boost')).toBeInTheDocument();
    });
  });

  describe('Tier Display', () => {
    it('displays GOLD tier by default', () => {
      renderWithProviders(<UpgradeModal isOpen={true} onClose={() => {}} />);
      expect(screen.getByText(/Upgrade to GOLD/)).toBeInTheDocument();
    });

    it('displays specified tier', () => {
      renderWithProviders(
        <UpgradeModal isOpen={true} onClose={() => {}} requiredTier="PLATINUM" />
      );
      expect(screen.getByText(/Upgrade to PLATINUM/)).toBeInTheDocument();
    });
  });

  describe('Benefits Section', () => {
    it('displays premium benefits list', () => {
      renderWithProviders(<UpgradeModal isOpen={true} onClose={() => {}} />);

      expect(screen.getByText('Premium Benefits:')).toBeInTheDocument();
      expect(screen.getByText(/Unlimited likes and super likes/)).toBeInTheDocument();
      expect(screen.getByText(/See who likes you/)).toBeInTheDocument();
      expect(screen.getByText(/Advanced filters and priority matches/)).toBeInTheDocument();
      expect(screen.getByText(/Video and voice calls/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(<UpgradeModal isOpen={true} onClose={handleClose} />);

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(<UpgradeModal isOpen={true} onClose={handleClose} />);

      // Click on the backdrop (the outer div)
      const backdrop = screen.getByText('Premium Feature').closest('.fixed');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(handleClose).toHaveBeenCalledTimes(1);
      }
    });

    it('does not close when modal content is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(<UpgradeModal isOpen={true} onClose={handleClose} />);

      const modalContent = screen.getByText('Premium Benefits:');
      fireEvent.click(modalContent);

      expect(handleClose).not.toHaveBeenCalled();
    });

    it('navigates to subscription page when Upgrade Now is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(<UpgradeModal isOpen={true} onClose={handleClose} />);

      fireEvent.click(screen.getByText('Upgrade Now'));

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/subscription');
    });

    it('navigates to coins page when Buy Coins is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(<UpgradeModal isOpen={true} onClose={handleClose} />);

      fireEvent.click(screen.getByText('Buy Coins Instead'));

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/coins');
    });

    it('calls onClose when Maybe Later is clicked', () => {
      const handleClose = vi.fn();
      renderWithProviders(<UpgradeModal isOpen={true} onClose={handleClose} />);

      fireEvent.click(screen.getByText('Maybe Later'));

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has accessible close button', () => {
      renderWithProviders(<UpgradeModal isOpen={true} onClose={() => {}} />);
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      renderWithProviders(<UpgradeModal isOpen={true} onClose={() => {}} />);

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upgrade Now' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Buy Coins Instead' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Maybe Later' })).toBeInTheDocument();
    });
  });
});
