import React from 'react';

interface FlamoralLogoProps {
  variant?: 'primary' | 'horizontal' | 'monogram' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  lightMode?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { fontSize: '24px', taglineSize: '10px' },
  md: { fontSize: '32px', taglineSize: '12px' },
  lg: { fontSize: '48px', taglineSize: '14px' },
  xl: { fontSize: '64px', taglineSize: '16px' },
};

export const FlamoralLogo: React.FC<FlamoralLogoProps> = ({
  size = 'md',
  showTagline = false,
  className,
}) => {
  const { fontSize, taglineSize } = sizeMap[size];

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
            marginTop: '4px',
          }}
        >
          Where Passion Meets Connection
        </span>
      )}
    </div>
  );
};

export default FlamoralLogo;
