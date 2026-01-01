import React from 'react';
import styled, { keyframes } from 'styled-components';

interface FlamoralLogoProps {
  variant?: 'primary' | 'horizontal' | 'monogram' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  lightMode?: boolean;
  className?: string;
}

const flicker = keyframes`
  0% { transform: scaleY(1) scaleX(1); }
  25% { transform: scaleY(0.97) scaleX(1.02); }
  50% { transform: scaleY(1.03) scaleX(0.98); }
  75% { transform: scaleY(0.98) scaleX(1.01); }
  100% { transform: scaleY(1.02) scaleX(0.99); }
`;

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0) translateY(0); }
  50% { opacity: 1; transform: scale(1) translateY(-5px); }
`;

const glowPulse = keyframes`
  0%, 100% { filter: drop-shadow(0 0 8px rgba(230, 57, 70, 0.4)); }
  50% { filter: drop-shadow(0 0 16px rgba(230, 57, 70, 0.6)); }
`;

const LogoContainer = styled.div<{ $variant: string; $size: string }>`
  display: flex;
  flex-direction: ${props => props.$variant === 'horizontal' ? 'row' : 'column'};
  align-items: center;
  gap: ${props => props.$variant === 'horizontal' ? '12px' : '8px'};
`;

const IconWrapper = styled.div<{ $size: string }>`
  width: ${props => {
    switch (props.$size) {
      case 'sm': return '28px';
      case 'md': return '40px';
      case 'lg': return '60px';
      case 'xl': return '100px';
      default: return '40px';
    }
  }};
  height: ${props => {
    switch (props.$size) {
      case 'sm': return '28px';
      case 'md': return '40px';
      case 'lg': return '60px';
      case 'xl': return '100px';
      default: return '40px';
    }
  }};
  position: relative;
  animation: ${glowPulse} 3s ease-in-out infinite;

  svg {
    width: 100%;
    height: 100%;
  }

  .flame-outer {
    animation: ${flicker} 0.8s ease-in-out infinite alternate;
    transform-origin: bottom center;
  }

  .flame-inner {
    animation: ${flicker} 0.6s ease-in-out infinite alternate-reverse;
    transform-origin: bottom center;
  }
`;

const Sparkle = styled.div<{ $delay: number; $top: string; $left: string }>`
  position: absolute;
  width: 3px;
  height: 3px;
  background: #FFB4B4;
  border-radius: 50%;
  animation: ${sparkle} 2s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
  top: ${props => props.$top};
  left: ${props => props.$left};
  box-shadow: 0 0 4px #FFB4B4;
  pointer-events: none;
`;

const Wordmark = styled.span<{ $size: string; $lightMode: boolean }>`
  font-family: 'Playfair Display', Georgia, serif;
  font-weight: 600;
  font-style: italic;
  letter-spacing: 2px;
  font-size: ${props => {
    switch (props.$size) {
      case 'sm': return '18px';
      case 'md': return '24px';
      case 'lg': return '36px';
      case 'xl': return '48px';
      default: return '24px';
    }
  }};
  background: ${props => props.$lightMode
    ? 'linear-gradient(135deg, #C1121F 0%, #E63946 50%, #FF6B6B 100%)'
    : 'linear-gradient(135deg, #FFB4B4 0%, #FF6B6B 50%, #E63946 100%)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;

  &::after {
    content: 'Flamoral';
    position: absolute;
    left: 0;
    top: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    background-size: 200% 100%;
    animation: ${shimmer} 3s ease-in-out infinite;
  }
`;

const Tagline = styled.span<{ $lightMode: boolean }>`
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${props => props.$lightMode ? '#E63946' : '#FFB4B4'};
  opacity: 0.8;
`;

const LogoIcon: React.FC<{ lightMode?: boolean }> = ({ lightMode }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="flameGradient" x1="50%" y1="100%" x2="50%" y2="0%">
        <stop offset="0%" stopColor={lightMode ? "#C1121F" : "#E63946"} />
        <stop offset="50%" stopColor="#FF6B6B" />
        <stop offset="100%" stopColor="#FFB4B4" />
      </linearGradient>
      <linearGradient id="petalGradient" x1="50%" y1="100%" x2="50%" y2="0%">
        <stop offset="0%" stopColor="#C1121F" />
        <stop offset="100%" stopColor="#E63946" />
      </linearGradient>
    </defs>

    {/* Main flame/flower shape */}
    <path
      d="M50 15 C35 35, 25 55, 30 70 C35 85, 50 90, 50 90 C50 90, 65 85, 70 70 C75 55, 65 35, 50 15Z"
      fill="url(#flameGradient)"
      className="flame-outer"
    />

    {/* Left petal */}
    <path
      d="M30 45 C15 55, 20 75, 35 80 C40 72, 38 60, 30 45Z"
      fill="url(#petalGradient)"
      opacity="0.8"
    />

    {/* Right petal */}
    <path
      d="M70 45 C85 55, 80 75, 65 80 C60 72, 62 60, 70 45Z"
      fill="url(#petalGradient)"
      opacity="0.8"
    />

    {/* Inner flame */}
    <path
      d="M50 30 C40 45, 35 60, 40 72 C45 82, 50 85, 50 85 C50 85, 55 82, 60 72 C65 60, 60 45, 50 30Z"
      fill="url(#flameGradient)"
      className="flame-inner"
      opacity="0.9"
    />

    {/* Core glow */}
    <ellipse cx="50" cy="70" rx="12" ry="15" fill={lightMode ? "#FFFFFF" : "#FFF5F5"} opacity="0.7" />

    {/* Center flower detail */}
    <circle cx="50" cy="72" r="4" fill="#FFF5F5" opacity="0.9" />
    <circle cx="46" cy="68" r="2" fill="#FFB4B4" opacity="0.7" />
    <circle cx="54" cy="68" r="2" fill="#FFB4B4" opacity="0.7" />
    <circle cx="50" cy="64" r="2" fill="#FFB4B4" opacity="0.7" />
  </svg>
);

const MonogramIcon: React.FC<{ lightMode?: boolean }> = ({ lightMode }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="monoGradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={lightMode ? "#C1121F" : "#E63946"} />
        <stop offset="50%" stopColor="#FF6B6B" />
        <stop offset="100%" stopColor="#FFB4B4" />
      </linearGradient>
    </defs>
    {/* Stylized F with flame/floral elements */}
    <path
      d="M30 85 L30 25 C30 20, 35 15, 45 15 L70 15 L70 25 L45 25 C40 25, 40 28, 40 30 L40 45 L65 45 L65 55 L40 55 L40 85 Z"
      fill="url(#monoGradient)"
    />
    {/* Flame accent on top */}
    <path
      d="M55 15 C52 8, 58 5, 60 10 C62 5, 68 8, 65 15"
      fill="url(#monoGradient)"
      className="flame-outer"
    />
    {/* Small petal accent */}
    <circle cx="70" cy="35" r="5" fill="#FFB4B4" opacity="0.7" />
  </svg>
);

export const FlamoralLogo: React.FC<FlamoralLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showTagline = false,
  lightMode = false,
  className,
}) => {
  const showSparkles = size === 'lg' || size === 'xl';

  if (variant === 'icon-only') {
    return (
      <IconWrapper $size={size} className={className}>
        {showSparkles && (
          <>
            <Sparkle $delay={0} $top="10%" $left="20%" />
            <Sparkle $delay={0.4} $top="5%" $left="70%" />
            <Sparkle $delay={0.8} $top="30%" $left="90%" />
          </>
        )}
        <LogoIcon lightMode={lightMode} />
      </IconWrapper>
    );
  }

  if (variant === 'monogram') {
    return (
      <IconWrapper $size={size} className={className}>
        <MonogramIcon lightMode={lightMode} />
      </IconWrapper>
    );
  }

  return (
    <LogoContainer $variant={variant} $size={size} className={className}>
      <IconWrapper $size={size}>
        {showSparkles && (
          <>
            <Sparkle $delay={0} $top="10%" $left="20%" />
            <Sparkle $delay={0.4} $top="5%" $left="70%" />
            <Sparkle $delay={0.8} $top="30%" $left="90%" />
          </>
        )}
        <LogoIcon lightMode={lightMode} />
      </IconWrapper>
      <Wordmark $size={size} $lightMode={lightMode}>Flamoral</Wordmark>
      {showTagline && <Tagline $lightMode={lightMode}>Where Hearts Bloom</Tagline>}
    </LogoContainer>
  );
};

export default FlamoralLogo;
