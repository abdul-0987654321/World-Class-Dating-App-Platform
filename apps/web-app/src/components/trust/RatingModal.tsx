/**
 * Rating Modal Component
 * Allows users to rate their experience with another user
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { useRatings } from '../../hooks/useTrust';
import { RatingCategory } from '../../services/trust.service';

interface RatingModalProps {
  toUserId: string;
  conversationId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
`;

const Modal = styled.div`
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  max-width: 420px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-text-primary);
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 24px 0;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 12px;
`;

const StarsContainer = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

const Star = styled.button<{ $active: boolean }>`
  font-size: 36px;
  background: none;
  border: none;
  cursor: pointer;
  color: ${(props) => (props.$active ? '#FFD700' : 'var(--color-border)')};
  transition:
    transform 0.2s,
    color 0.2s;

  &:hover {
    transform: scale(1.1);
    color: #ffd700;
  }
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
`;

const CategoryChip = styled.button<{ $selected: boolean; $negative?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${(props) =>
    props.$selected
      ? props.$negative
        ? 'rgba(239, 68, 68, 0.2)'
        : 'rgba(16, 185, 129, 0.2)'
      : 'var(--color-background)'};
  border: 1px solid
    ${(props) =>
      props.$selected
        ? props.$negative
          ? 'var(--color-error)'
          : 'var(--color-success)'
        : 'var(--color-border)'};
  color: ${(props) =>
    props.$selected
      ? props.$negative
        ? 'var(--color-error)'
        : 'var(--color-success)'
      : 'var(--color-text-secondary)'};

  &:hover {
    border-color: ${(props) => (props.$negative ? 'var(--color-error)' : 'var(--color-success)')};
  }
`;

const CommentInput = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 14px;
  background: var(--color-background);
  color: var(--color-text-primary);
  resize: vertical;
  min-height: 80px;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-text-secondary);
  }
`;

const AnonymousToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  ${(props) =>
    props.$primary
      ? `
    background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
    color: white;
    border: none;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `
      : `
    background: var(--color-background);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);

    &:hover {
      background: var(--color-border);
    }
  `}
`;

const POSITIVE_CATEGORIES: { value: RatingCategory; label: string; emoji: string }[] = [
  { value: 'respectful', label: 'Respectful', emoji: '🤝' },
  { value: 'authentic', label: 'Authentic', emoji: '✨' },
  { value: 'good_communicator', label: 'Good Communicator', emoji: '💬' },
  { value: 'honest', label: 'Honest', emoji: '💯' },
  { value: 'punctual', label: 'Punctual', emoji: '⏰' },
  { value: 'kind', label: 'Kind', emoji: '💖' },
  { value: 'interesting', label: 'Interesting', emoji: '🌟' },
];

const NEGATIVE_CATEGORIES: { value: RatingCategory; label: string; emoji: string }[] = [
  { value: 'made_uncomfortable', label: 'Made me uncomfortable', emoji: '😕' },
  { value: 'misleading_profile', label: 'Misleading profile', emoji: '🚫' },
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior', emoji: '⚠️' },
];

export const RatingModal: React.FC<RatingModalProps> = ({
  toUserId,
  conversationId,
  onClose,
  onSuccess,
}) => {
  const { submitRating } = useRatings();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<RatingCategory[]>([]);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCategory = (category: RatingCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (!rating || selectedCategories.length === 0) return;

    try {
      setIsSubmitting(true);
      await submitRating({
        toUserId,
        conversationId,
        rating,
        categories: selectedCategories,
        comment: comment || undefined,
        isAnonymous,
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNegativeRating = rating !== null && rating <= 2;
  const categoriesToShow = isNegativeRating ? NEGATIVE_CATEGORIES : POSITIVE_CATEGORIES;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>Rate Your Experience</Title>
        <Subtitle>Your feedback helps keep our community safe and welcoming</Subtitle>

        <Section>
          <Label>How was your experience?</Label>
          <StarsContainer>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                $active={rating !== null && star <= rating}
                onClick={() => {
                  setRating(star as 1 | 2 | 3 | 4 | 5);
                  setSelectedCategories([]);
                }}
              >
                ★
              </Star>
            ))}
          </StarsContainer>
        </Section>

        {rating && (
          <>
            <Section>
              <Label>
                {isNegativeRating ? 'What went wrong?' : 'What made this experience good?'}
              </Label>
              <CategoryGrid>
                {categoriesToShow.map((cat) => (
                  <CategoryChip
                    key={cat.value}
                    $selected={selectedCategories.includes(cat.value)}
                    $negative={isNegativeRating}
                    onClick={() => toggleCategory(cat.value)}
                  >
                    {cat.emoji} {cat.label}
                  </CategoryChip>
                ))}
              </CategoryGrid>
            </Section>

            <Section>
              <Label>Additional comments (optional)</Label>
              <CommentInput
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share more about your experience..."
                maxLength={500}
              />
            </Section>

            <AnonymousToggle>
              <Checkbox
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              Submit anonymously
            </AnonymousToggle>
          </>
        )}

        <ButtonRow>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            $primary
            onClick={handleSubmit}
            disabled={!rating || selectedCategories.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </ButtonRow>
      </Modal>
    </Overlay>
  );
};

export default RatingModal;
