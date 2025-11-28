/**
 * Flamoral Card Components
 * Web version with premium styling
 */

import React from 'react';
import './Card.css';

export type CardVariant = 'standard' | 'premium' | 'profile' | 'elevated';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'standard',
  padding = 'md',
  hoverable = false,
  children,
  className = '',
  ...props
}) => {
  const baseClass = 'flamoral-card';
  const variantClass = `flamoral-card--${variant}`;
  const paddingClass = `flamoral-card--padding-${padding}`;
  const hoverableClass = hoverable ? 'flamoral-card--hoverable' : '';

  const combinedClassName = [
    baseClass,
    variantClass,
    paddingClass,
    hoverableClass,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
};

// ============================================
// Premium Card Component
// ============================================

export interface PremiumCardProps extends Omit<CardProps, 'variant'> {
  badge?: string;
  glowColor?: 'gold' | 'flame';
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  badge,
  glowColor = 'gold',
  children,
  className = '',
  ...props
}) => {
  const glowClass = `flamoral-card--glow-${glowColor}`;

  return (
    <Card
      variant="premium"
      className={`${glowClass} ${className}`}
      {...props}
    >
      {badge && (
        <div className="flamoral-card__badge">
          <span className="flamoral-card__badge-text">{badge}</span>
        </div>
      )}
      {children}
    </Card>
  );
};

// ============================================
// Profile Card Component
// ============================================

export interface ProfileCardProps {
  name: string;
  age: number;
  location?: string;
  imageUrl: string;
  isVerified?: boolean;
  isOnline?: boolean;
  bio?: string;
  distance?: string;
  interests?: string[];
  onLike?: () => void;
  onPass?: () => void;
  onSuperLike?: () => void;
  className?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  age,
  location,
  imageUrl,
  isVerified = false,
  isOnline = false,
  bio,
  distance,
  interests = [],
  onLike,
  onPass,
  onSuperLike,
  className = '',
}) => {
  return (
    <div className={`flamoral-profile-card ${className}`}>
      {/* Image Container */}
      <div className="flamoral-profile-card__image-container">
        <img
          src={imageUrl}
          alt={`${name}'s profile`}
          className="flamoral-profile-card__image"
        />

        {/* Gradient Overlay */}
        <div className="flamoral-profile-card__overlay" />

        {/* Online Indicator */}
        {isOnline && (
          <div className="flamoral-profile-card__online-indicator" />
        )}

        {/* Profile Info Overlay */}
        <div className="flamoral-profile-card__info">
          <div className="flamoral-profile-card__name-row">
            <h3 className="flamoral-profile-card__name">
              {name}, {age}
            </h3>
            {isVerified && (
              <span className="flamoral-profile-card__verified">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
            )}
          </div>

          {location && (
            <p className="flamoral-profile-card__location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
              </svg>
              {location}
              {distance && <span className="flamoral-profile-card__distance"> • {distance}</span>}
            </p>
          )}

          {bio && (
            <p className="flamoral-profile-card__bio">{bio}</p>
          )}

          {interests.length > 0 && (
            <div className="flamoral-profile-card__interests">
              {interests.slice(0, 4).map((interest, index) => (
                <span key={index} className="flamoral-profile-card__interest-tag">
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flamoral-profile-card__actions">
        <button
          className="flamoral-profile-card__action flamoral-profile-card__action--pass"
          onClick={onPass}
          aria-label="Pass"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          className="flamoral-profile-card__action flamoral-profile-card__action--superlike"
          onClick={onSuperLike}
          aria-label="Super Like"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          className="flamoral-profile-card__action flamoral-profile-card__action--like"
          onClick={onLike}
          aria-label="Like"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// ============================================
// Feature Card Component
// ============================================

export interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  premium?: boolean;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  premium = false,
  className = '',
}) => {
  return (
    <Card
      variant={premium ? 'premium' : 'standard'}
      padding="lg"
      hoverable
      className={`flamoral-feature-card ${className}`}
    >
      <div className={`flamoral-feature-card__icon ${premium ? 'flamoral-feature-card__icon--premium' : ''}`}>
        {icon}
      </div>
      <h4 className="flamoral-feature-card__title">{title}</h4>
      <p className="flamoral-feature-card__description">{description}</p>
      {premium && (
        <span className="flamoral-feature-card__premium-badge">Premium</span>
      )}
    </Card>
  );
};

export default Card;
