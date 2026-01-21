import React, { useState, useEffect, useCallback } from 'react';

export interface AchievementBadge {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconName: string;
  iconColor?: string;
  backgroundColor?: string;
  category: 'dating' | 'social' | 'profile' | 'engagement' | 'streak' | 'special' | 'collector';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  coinReward: number;
  xpReward: number;
  isHidden: boolean;
  currentProgress: number;
  targetProgress: number;
  isUnlocked: boolean;
  isDisplayed: boolean;
  unlockedAt?: string;
}

interface Props {
  badge: AchievementBadge;
  onToggleDisplay?: (badgeId: string, display: boolean) => void;
  compact?: boolean;
  showUnlockAnimation?: boolean;
  onAnimationComplete?: () => void;
}

const rarityColors = {
  common: { bg: '#E0E0E0', text: '#757575', glow: 'none' },
  uncommon: { bg: '#4CAF50', text: '#2E7D32', glow: '0 0 10px rgba(76,175,80,0.5)' },
  rare: { bg: '#2196F3', text: '#1565C0', glow: '0 0 15px rgba(33,150,243,0.5)' },
  epic: { bg: '#9C27B0', text: '#6A1B9A', glow: '0 0 20px rgba(156,39,176,0.5)' },
  legendary: {
    bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    text: '#FF8F00',
    glow: '0 0 25px rgba(255,215,0,0.7)',
  },
};

const categoryIcons: Record<string, string> = {
  dating: '💕',
  social: '💬',
  profile: '👤',
  engagement: '🎯',
  streak: '🔥',
  special: '✨',
  collector: '🏆',
};

const rarityLabels: Record<string, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const AchievementBadgeCard: React.FC<Props> = ({
  badge,
  onToggleDisplay,
  compact = false,
  showUnlockAnimation = false,
  onAnimationComplete,
}) => {
  const [isAnimating, setIsAnimating] = useState(showUnlockAnimation);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const progressPercent = Math.min(
    100,
    Math.round((badge.currentProgress / badge.targetProgress) * 100)
  );
  const rarityStyle = rarityColors[badge.rarity];

  useEffect(() => {
    if (showUnlockAnimation) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        onAnimationComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showUnlockAnimation, onAnimationComplete]);

  const handleToggleDisplay = useCallback(async () => {
    if (!onToggleDisplay || isToggling) return;

    setIsToggling(true);
    setToggleError(null);

    try {
      await onToggleDisplay(badge.id, !badge.isDisplayed);
    } catch (err) {
      setToggleError('Failed to update. Try again.');
      setTimeout(() => setToggleError(null), 3000);
    } finally {
      setIsToggling(false);
    }
  }, [badge.id, badge.isDisplayed, onToggleDisplay, isToggling]);

  const formatUnlockDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (compact) {
    return (
      <div
        className={`
          relative p-3 rounded-xl transition-all duration-300
          ${badge.isUnlocked ? 'cursor-pointer' : 'opacity-70'}
          ${isAnimating ? 'animate-pulse scale-110' : 'hover:scale-105'}
        `}
        style={{
          background: badge.isUnlocked
            ? `${badge.backgroundColor || rarityStyle.bg}20`
            : 'rgba(128,128,128,0.1)',
          border: badge.isUnlocked
            ? `2px solid ${badge.iconColor || rarityStyle.bg}`
            : '2px solid transparent',
          boxShadow: isAnimating
            ? `0 0 30px ${badge.iconColor || rarityStyle.bg}`
            : badge.isUnlocked
              ? rarityStyle.glow
              : 'none',
        }}
        title={badge.description}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Unlock animation overlay */}
        {isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl overflow-hidden">
            <div
              className="absolute inset-0 animate-ping opacity-50"
              style={{ background: badge.iconColor || rarityStyle.bg }}
            />
          </div>
        )}

        <div className={`text-2xl text-center ${isAnimating ? 'animate-bounce' : ''}`}>
          {badge.isHidden && !badge.isUnlocked ? '❓' : categoryIcons[badge.category] || '🏅'}
        </div>
        <p
          className="text-xs font-medium text-center mt-1 truncate"
          style={{ color: badge.isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          {badge.isHidden && !badge.isUnlocked ? '???' : badge.name}
        </p>
        {!badge.isUnlocked && (
          <div className="mt-1 rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: 'var(--accent-gradient)',
              }}
            />
          </div>
        )}
        {badge.isDisplayed && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs">✓</span>
          </div>
        )}
        {/* Hover tooltip for progress */}
        {isHovered && !badge.isUnlocked && !badge.isHidden && (
          <div
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap z-10"
            style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
          >
            {badge.currentProgress}/{badge.targetProgress}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        relative p-4 rounded-xl transition-all duration-300
        ${badge.isUnlocked ? '' : 'opacity-80'}
        ${isAnimating ? 'scale-105' : 'hover:shadow-lg'}
      `}
      style={{
        background: badge.isUnlocked
          ? `linear-gradient(135deg, ${badge.backgroundColor || rarityStyle.bg}20 0%, transparent 100%)`
          : 'rgba(255,255,255,0.05)',
        border: `1px solid ${badge.isUnlocked ? badge.iconColor || rarityStyle.bg : 'var(--border-subtle)'}`,
        boxShadow: isAnimating
          ? `0 0 40px ${badge.iconColor || rarityStyle.bg}`
          : badge.isUnlocked
            ? rarityStyle.glow
            : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Unlock animation overlay */}
      {isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 animate-pulse"
            style={{ background: `${badge.iconColor || rarityStyle.bg}20` }}
          />
          <div className="text-6xl animate-bounce z-10">🎉</div>
        </div>
      )}

      {/* Rarity Badge */}
      <div
        className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase transition-transform duration-200"
        style={{
          background:
            typeof rarityStyle.bg === 'string' && rarityStyle.bg.includes('gradient')
              ? rarityStyle.bg
              : `${rarityStyle.bg}40`,
          color: rarityStyle.text,
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {rarityLabels[badge.rarity]}
      </div>

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 transition-transform duration-300 ${isAnimating ? 'animate-bounce' : ''}`}
          style={{
            background: badge.isUnlocked
              ? `${badge.iconColor || rarityStyle.bg}30`
              : 'rgba(128,128,128,0.2)',
            transform: isHovered && badge.isUnlocked ? 'rotate(-5deg) scale(1.05)' : 'none',
          }}
        >
          {badge.isHidden && !badge.isUnlocked ? '❓' : categoryIcons[badge.category] || '🏅'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4
            className="font-bold text-lg truncate"
            style={{ color: badge.isUnlocked ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {badge.isHidden && !badge.isUnlocked ? 'Hidden Badge' : badge.name}
          </h4>
          <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
            {badge.isHidden && !badge.isUnlocked
              ? 'Complete the secret requirement to unlock!'
              : badge.description}
          </p>

          {/* Rewards */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {badge.coinReward > 0 && (
              <span
                className="text-sm flex items-center gap-1"
                style={{ color: 'var(--coin-primary)' }}
              >
                <span>+{badge.coinReward}</span>
                <span>🪙</span>
              </span>
            )}
            {badge.xpReward > 0 && (
              <span
                className="text-sm flex items-center gap-1"
                style={{ color: 'var(--accent-purple)' }}
              >
                <span>+{badge.xpReward}</span>
                <span>XP</span>
              </span>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}
            >
              {badge.category}
            </span>
          </div>

          {/* Progress or Unlocked State */}
          {badge.isUnlocked ? (
            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-green-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Unlocked</span>
                {badge.unlockedAt && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatUnlockDate(badge.unlockedAt)}
                  </span>
                )}
              </div>
              {onToggleDisplay && (
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleToggleDisplay}
                    disabled={isToggling}
                    className={`
                      px-3 py-1 rounded-full text-xs font-medium transition-all duration-200
                      flex items-center gap-1
                      ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}
                      ${
                        badge.isDisplayed
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-transparent text-gray-400 border border-gray-400 hover:border-green-500 hover:text-green-500'
                      }
                    `}
                  >
                    {isToggling ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent" />
                        <span>Updating...</span>
                      </>
                    ) : badge.isDisplayed ? (
                      <>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>On Profile</span>
                      </>
                    ) : (
                      'Show on Profile'
                    )}
                  </button>
                  {toggleError && (
                    <span className="text-xs" style={{ color: '#f44336' }}>
                      {toggleError}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {badge.currentProgress}/{badge.targetProgress} ({progressPercent}%)
                </span>
              </div>
              <div
                className="rounded-full h-2 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <div
                  className="h-2 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{
                    width: `${progressPercent}%`,
                    background: 'var(--accent-gradient)',
                  }}
                >
                  {/* Shimmer effect on progress bar */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                      animation: 'shimmer 2s infinite',
                    }}
                  />
                </div>
              </div>
              {progressPercent >= 80 && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent-pink)' }}>
                  Almost there! Keep going!
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shimmer animation style */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default AchievementBadgeCard;
