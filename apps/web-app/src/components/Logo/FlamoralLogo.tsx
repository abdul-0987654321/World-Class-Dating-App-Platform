import React from 'react';

interface FlamoralLogoProps {
  variant?: 'primary' | 'horizontal' | 'monogram' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  lightMode?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { iconSize: 32, fontSize: '18px', taglineSize: '8px' },
  md: { iconSize: 56, fontSize: '24px', taglineSize: '10px' },
  lg: { iconSize: 72, fontSize: '32px', taglineSize: '12px' },
  xl: { iconSize: 96, fontSize: '40px', taglineSize: '14px' },
};

export const FlamoralLogo: React.FC<FlamoralLogoProps> = ({
  variant = 'primary',
  size = 'md',
  showTagline = false,
  className,
}) => {
  const { iconSize, fontSize, taglineSize } = sizeMap[size];

  // Icon-only variant - just the logo image
  if (variant === 'icon-only' || variant === 'monogram') {
    return (
      <div className={className}>
        <img
          src="/flamoral-logo.png"
          alt="Flamoral"
          width={iconSize}
          height={iconSize}
          style={{
            width: iconSize,
            height: iconSize,
            objectFit: 'contain',
          }}
        />
      </div>
    );
  }

  // Primary and horizontal variants - logo image + text + tagline
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: variant === 'horizontal' ? 'row' : 'column',
        alignItems: 'center',
        gap: variant === 'horizontal' ? '12px' : '8px',
      }}
    >
      {/* Logo image - exact asset, no modifications */}
      <img
        src="/flamoral-logo.png"
        alt="Flamoral"
        width={iconSize}
        height={iconSize}
        style={{
          width: iconSize,
          height: iconSize,
          objectFit: 'contain',
        }}
      />

      {/* Text and tagline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: variant === 'horizontal' ? 'flex-start' : 'center',
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight: 'bold',
            color: '#D62839',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          Flamoral
        </span>
        {showTagline && (
          <span
            style={{
              fontSize: taglineSize,
              color: '#666',
              marginTop: '2px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            WHERE PASSION MEETS LOVE
          </span>
        )}
      </div>
    </div>
  );
};

export default FlamoralLogo;
