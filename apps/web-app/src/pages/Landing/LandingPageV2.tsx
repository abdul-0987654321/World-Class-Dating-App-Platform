import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// MIDNIGHT LUXE AURORA - Premium Dating Platform Landing
// ============================================================================

// Design Tokens
const tokens = {
  colors: {
    // Backgrounds
    obsidian: '#0D0D12',
    charcoal: '#161622',
    slate: '#1E1E2E',
    overlay: '#252535',

    // Text
    white: '#FFFFFF',
    silver: '#B4B4C7',
    muted: '#6B6B80',
    violet: '#A78BFA',

    // Status
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
  },
  gradients: {
    aurora: 'linear-gradient(135deg, #FF6B9D 0%, #C44AFF 50%, #6366F1 100%)',
    accent: 'linear-gradient(90deg, #F97316 0%, #EC4899 50%, #8B5CF6 100%)',
    cta: 'linear-gradient(45deg, #FF3CAC 0%, #784BA0 50%, #2B86C5 100%)',
    gold: 'linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FF6B35 100%)',
    mesh: `
      radial-gradient(ellipse at 20% 0%, rgba(196, 74, 255, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(255, 107, 157, 0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 70%)
    `,
  },
};

// Floating Orb Component
const FloatingOrb: React.FC<{
  size: number;
  color: string;
  delay: number;
  duration: number;
  initialX: string;
  initialY: string;
}> = ({ size, color, delay, duration, initialX, initialY }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      left: initialX,
      top: initialY,
      filter: 'blur(40px)',
    }}
    animate={{
      x: [0, 100, -50, 80, 0],
      y: [0, -80, 60, -40, 0],
      scale: [1, 1.2, 0.9, 1.1, 1],
      opacity: [0.6, 0.8, 0.5, 0.7, 0.6],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}> = ({ children, className = '', hover = true, gradient = false }) => (
  <motion.div
    className={`relative overflow-hidden ${className}`}
    style={{
      background: 'rgba(30, 30, 46, 0.6)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: gradient
        ? '1px solid transparent'
        : '1px solid rgba(167, 139, 250, 0.2)',
      borderRadius: '24px',
      ...(gradient && {
        backgroundImage: `linear-gradient(rgba(30, 30, 46, 0.9), rgba(30, 30, 46, 0.9)), ${tokens.gradients.aurora}`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      }),
    }}
    whileHover={hover ? {
      y: -8,
      borderColor: 'rgba(196, 74, 255, 0.5)',
      boxShadow: '0 20px 40px rgba(196, 74, 255, 0.15)',
    } : undefined}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

// Glow Button Component
const GlowButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, onClick, variant = 'primary', size = 'md', className = '' }) => {
  const gradients = {
    primary: tokens.gradients.cta,
    secondary: 'transparent',
    gold: tokens.gradients.gold,
  };

  const sizes = {
    sm: 'px-5 py-2.5 text-sm',
    md: 'px-8 py-4 text-base',
    lg: 'px-10 py-5 text-lg',
  };

  return (
    <motion.button
      onClick={onClick}
      className={`relative font-semibold tracking-wide ${sizes[size]} ${className}`}
      style={{
        background: gradients[variant],
        borderRadius: '14px',
        color: variant === 'secondary' ? tokens.colors.silver : tokens.colors.white,
        border: variant === 'secondary' ? '1px solid rgba(167, 139, 250, 0.4)' : 'none',
        boxShadow: variant === 'primary'
          ? '0 4px 30px rgba(255, 60, 172, 0.4), 0 0 60px rgba(120, 75, 160, 0.2)'
          : variant === 'gold'
          ? '0 4px 30px rgba(255, 215, 0, 0.4)'
          : 'none',
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: variant === 'primary'
          ? '0 8px 40px rgba(255, 60, 172, 0.5), 0 0 80px rgba(120, 75, 160, 0.3)'
          : variant === 'gold'
          ? '0 8px 40px rgba(255, 215, 0, 0.5)'
          : '0 4px 20px rgba(167, 139, 250, 0.2)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.button>
  );
};

// Section Wrapper with Scroll Animation
const AnimatedSection: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.section
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
};

// Gradient Text Component
const GradientText: React.FC<{
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}> = ({ children, className = '', gradient = tokens.gradients.aurora }) => (
  <span
    className={className}
    style={{
      background: gradient,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}
  >
    {children}
  </span>
);

// Stats Counter Component
const StatCounter: React.FC<{
  value: string;
  label: string;
  delay: number;
}> = ({ value, label, delay }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className="text-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: tokens.colors.white }}>
        <GradientText>{value}</GradientText>
      </div>
      <div className="text-sm uppercase tracking-widest" style={{ color: tokens.colors.muted }}>
        {label}
      </div>
    </motion.div>
  );
};

// Feature Icon Component
const FeatureIcon: React.FC<{ icon: string }> = ({ icon }) => (
  <div
    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-6"
    style={{
      background: tokens.gradients.aurora,
      boxShadow: '0 8px 32px rgba(196, 74, 255, 0.3)',
    }}
  >
    {icon}
  </div>
);

// Pricing Card Component
const PricingCard: React.FC<{
  name: string;
  price: string;
  period?: string;
  features: string[];
  popular?: boolean;
  gradient?: string;
  delay: number;
}> = ({ name, price, period = '/month', features, popular, gradient, delay }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="relative"
    >
      {popular && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
          style={{
            background: tokens.gradients.gold,
            color: tokens.colors.obsidian,
          }}
        >
          Most Popular
        </div>
      )}
      <GlassCard
        className={`p-8 h-full ${popular ? 'border-2' : ''}`}
        gradient={popular}
      >
        <h3 className="text-xl font-bold mb-2" style={{ color: tokens.colors.white }}>
          {name}
        </h3>
        <div className="mb-6">
          <span
            className="text-4xl font-bold"
            style={{
              background: gradient || tokens.gradients.aurora,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {price}
          </span>
          {price !== 'Free' && (
            <span style={{ color: tokens.colors.muted }}>{period}</span>
          )}
        </div>
        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3">
              <span style={{ color: tokens.colors.success }}>✓</span>
              <span style={{ color: tokens.colors.silver }}>{feature}</span>
            </li>
          ))}
        </ul>
        <GlowButton
          variant={popular ? 'primary' : 'secondary'}
          size="md"
          className="w-full"
        >
          {price === 'Free' ? 'Get Started' : 'Subscribe Now'}
        </GlowButton>
      </GlassCard>
    </motion.div>
  );
};

// Testimonial Card Component
const TestimonialCard: React.FC<{
  quote: string;
  author: string;
  role: string;
  image: string;
  delay: number;
}> = ({ quote, author, role, image, delay }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.6, delay }}
    >
      <GlassCard className="p-8" gradient>
        <div className="flex items-start gap-4 mb-6">
          <img
            src={image}
            alt={author}
            className="w-14 h-14 rounded-full object-cover"
            style={{ border: '2px solid rgba(196, 74, 255, 0.5)' }}
          />
          <div>
            <h4 className="font-semibold" style={{ color: tokens.colors.white }}>
              {author}
            </h4>
            <p className="text-sm" style={{ color: tokens.colors.muted }}>
              {role}
            </p>
          </div>
        </div>
        <p className="text-lg italic leading-relaxed" style={{ color: tokens.colors.silver }}>
          "{quote}"
        </p>
        <div className="mt-6 flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="text-xl">⭐</span>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
};

// Step Component for How It Works
const StepItem: React.FC<{
  number: number;
  title: string;
  description: string;
  isLast?: boolean;
  delay: number;
}> = ({ number, title, description, isLast, delay }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      className="relative flex flex-col items-center text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
    >
      {/* Connector Line */}
      {!isLast && (
        <motion.div
          className="hidden md:block absolute top-8 left-[60%] w-full h-0.5"
          style={{
            background: tokens.gradients.aurora,
            opacity: 0.3,
          }}
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: delay + 0.3 }}
        />
      )}

      {/* Number Circle */}
      <motion.div
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-6 relative z-10"
        style={{
          background: tokens.gradients.aurora,
          boxShadow: '0 0 40px rgba(196, 74, 255, 0.4)',
        }}
        whileHover={{ scale: 1.1 }}
      >
        {number}
      </motion.div>

      <h3 className="text-xl font-bold mb-3" style={{ color: tokens.colors.white }}>
        {title}
      </h3>
      <p className="max-w-[250px]" style={{ color: tokens.colors.silver }}>
        {description}
      </p>
    </motion.div>
  );
};

// Navigation Component
const Navigation: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Safety', href: '#safety' },
  ];

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        height: '72px',
        background: scrolled
          ? 'rgba(22, 22, 34, 0.95)'
          : 'rgba(22, 22, 34, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: scrolled
          ? '1px solid rgba(255, 107, 157, 0.15)'
          : '1px solid transparent',
      }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/')}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: tokens.gradients.aurora }}
          >
            <span className="text-xl">🔥</span>
          </div>
          <span
            className="text-2xl font-bold"
            style={{
              background: tokens.gradients.aurora,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Flamoral
          </span>
        </motion.div>

        {/* Nav Links - Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <motion.a
              key={link.label}
              href={link.href}
              className="relative font-medium tracking-wide"
              style={{ color: tokens.colors.silver }}
              whileHover={{
                color: tokens.colors.white,
              }}
            >
              <span className="relative z-10">{link.label}</span>
              <motion.span
                className="absolute bottom-0 left-0 w-full h-0.5 origin-left"
                style={{ background: tokens.gradients.aurora }}
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.a>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          <motion.button
            className="hidden sm:block font-medium"
            style={{ color: tokens.colors.silver }}
            whileHover={{ color: tokens.colors.white }}
            onClick={() => navigate('/login')}
          >
            Sign In
          </motion.button>
          <GlowButton size="sm" onClick={() => navigate('/signup')}>
            Get Started
          </GlowButton>
        </div>
      </div>
    </motion.nav>
  );
};

// Hero Section
const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: tokens.colors.obsidian }}
    >
      {/* Gradient Mesh Background */}
      <div
        className="absolute inset-0"
        style={{ background: tokens.gradients.mesh }}
      />

      {/* Floating Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <FloatingOrb size={400} color="rgba(196, 74, 255, 0.4)" delay={0} duration={20} initialX="10%" initialY="20%" />
        <FloatingOrb size={300} color="rgba(255, 107, 157, 0.3)" delay={2} duration={25} initialX="70%" initialY="60%" />
        <FloatingOrb size={250} color="rgba(99, 102, 241, 0.35)" delay={4} duration={22} initialX="80%" initialY="10%" />
        <FloatingOrb size={200} color="rgba(236, 72, 153, 0.3)" delay={1} duration={18} initialX="20%" initialY="70%" />
        <FloatingOrb size={350} color="rgba(139, 92, 246, 0.25)" delay={3} duration={28} initialX="50%" initialY="30%" />
      </div>

      {/* Noise Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        style={{ y, opacity }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            background: 'rgba(167, 139, 250, 0.15)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span style={{ color: tokens.colors.silver }}>
            Over 2 million connections made
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight mb-8"
          style={{ color: tokens.colors.white }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Find Your{' '}
          <GradientText>Forever</GradientText>
          <br />
          <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl" style={{ color: tokens.colors.silver }}>
            Start Tonight.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg md:text-xl max-w-2xl mx-auto mb-12"
          style={{ color: tokens.colors.silver }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Experience dating reimagined. AI-powered matching meets genuine human connection
          in the most sophisticated dating platform ever created.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GlowButton size="lg" onClick={() => navigate('/signup')}>
            Start Free Today
          </GlowButton>
          <GlowButton variant="secondary" size="lg">
            <span className="flex items-center gap-2">
              <span className="text-xl">▶</span>
              Watch How It Works
            </span>
          </GlowButton>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          className="mt-16 flex flex-wrap justify-center gap-8 items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {['App Store', 'Google Play', 'TrustPilot', 'Forbes'].map((brand) => (
            <div
              key={brand}
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: tokens.colors.muted }}
            >
              {brand === 'TrustPilot' ? '⭐ 4.8 TrustPilot' : brand}
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div
          className="w-6 h-10 rounded-full flex items-start justify-center pt-2"
          style={{ border: `2px solid ${tokens.colors.muted}` }}
        >
          <motion.div
            className="w-1.5 h-3 rounded-full"
            style={{ background: tokens.gradients.aurora }}
            animate={{ y: [0, 12, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};

// Social Proof Section
const SocialProofSection: React.FC = () => (
  <section
    className="relative py-12 overflow-hidden"
    style={{
      background: 'rgba(30, 30, 46, 0.6)',
      borderTop: '1px solid rgba(167, 139, 250, 0.1)',
      borderBottom: '1px solid rgba(167, 139, 250, 0.1)',
    }}
  >
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <StatCounter value="2M+" label="Active Users" delay={0} />
        <StatCounter value="50K+" label="Success Stories" delay={0.1} />
        <StatCounter value="98%" label="Match Rate" delay={0.2} />
        <StatCounter value="4.8★" label="App Rating" delay={0.3} />
      </div>
    </div>
  </section>
);

// Features Section
const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: '🧠',
      title: 'AI-Powered Matching',
      description: 'Our proprietary algorithm analyzes 200+ compatibility factors to find your ideal match with unprecedented accuracy.',
    },
    {
      icon: '📹',
      title: 'HD Video Dates',
      description: 'Break the ice with crystal-clear video calls. See chemistry before you meet, all within our secure platform.',
    },
    {
      icon: '✓',
      title: 'Verified Profiles',
      description: 'Every member undergoes multi-step verification including photo, ID, and social verification for maximum trust.',
    },
  ];

  return (
    <AnimatedSection id="features" className="py-24" style={{ background: tokens.colors.obsidian }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.span
            className="inline-block px-4 py-1 rounded-full text-sm font-medium mb-6"
            style={{
              background: 'rgba(167, 139, 250, 0.15)',
              color: tokens.colors.violet,
            }}
          >
            Why Choose Flamoral
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: tokens.colors.white }}>
            Dating, <GradientText>Elevated</GradientText>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: tokens.colors.silver }}>
            We've combined cutting-edge technology with human psychology to create
            the most effective way to find meaningful connections.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
            >
              <GlassCard className="p-8 h-full">
                <FeatureIcon icon={feature.icon} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: tokens.colors.white }}>
                  {feature.title}
                </h3>
                <p className="leading-relaxed" style={{ color: tokens.colors.silver }}>
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
};

// How It Works Section
const HowItWorksSection: React.FC = () => {
  const steps = [
    { number: 1, title: 'Create Profile', description: 'Build your authentic profile in minutes with AI-assisted prompts' },
    { number: 2, title: 'Get Matched', description: 'Our AI finds compatible matches based on your unique preferences' },
    { number: 3, title: 'Connect', description: 'Chat, video call, and build genuine connections safely' },
    { number: 4, title: 'Meet', description: 'Take it offline with confidence and find your forever' },
  ];

  return (
    <AnimatedSection
      id="how-it-works"
      className="py-24"
      style={{ background: tokens.colors.charcoal }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span
            className="inline-block px-4 py-1 rounded-full text-sm font-medium mb-6"
            style={{
              background: 'rgba(236, 72, 153, 0.15)',
              color: '#EC4899',
            }}
          >
            Simple Process
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: tokens.colors.white }}>
            How <GradientText gradient={tokens.gradients.accent}>Flamoral</GradientText> Works
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-8 md:gap-4">
          {steps.map((step, index) => (
            <StepItem
              key={step.number}
              {...step}
              isLast={index === steps.length - 1}
              delay={index * 0.15}
            />
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
};

// Testimonials Section
const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      quote: "I never believed in dating apps until Flamoral. The AI matching is incredibly accurate - I met my fiancé within the first week!",
      author: "Sarah Chen",
      role: "Matched in 2024",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    {
      quote: "The video date feature changed everything. Being able to see someone's energy before meeting in person saved me so much time.",
      author: "Marcus Williams",
      role: "Premium Member",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    {
      quote: "Finally, a dating app that takes safety seriously. The verification process gave me confidence to actually engage with matches.",
      author: "Elena Rodriguez",
      role: "Success Story",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
  ];

  return (
    <AnimatedSection className="py-24" style={{ background: tokens.colors.obsidian }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span
            className="inline-block px-4 py-1 rounded-full text-sm font-medium mb-6"
            style={{
              background: 'rgba(52, 211, 153, 0.15)',
              color: tokens.colors.success,
            }}
          >
            Real Stories
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: tokens.colors.white }}>
            Love Stories <GradientText>Written Here</GradientText>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={testimonial.author} {...testimonial} delay={index * 0.2} />
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
};

// Pricing Section
const PricingSection: React.FC = () => {
  const plans = [
    {
      name: 'Free',
      price: 'Free',
      features: ['5 likes per day', 'Basic matching', 'Limited messages', 'Ad supported'],
    },
    {
      name: 'Basic',
      price: '$9.99',
      features: ['25 likes per day', 'Standard matching', 'Unlimited messages', 'No ads'],
    },
    {
      name: 'Plus',
      price: '$19.99',
      features: ['Unlimited likes', 'Advanced matching', 'See who likes you', 'Read receipts', '1 Super Like/day'],
      gradient: tokens.gradients.accent,
    },
    {
      name: 'Premium',
      price: '$29.99',
      features: ['Everything in Plus', 'Priority matching', '5 Super Likes/day', 'Profile boost', 'Video dates'],
      popular: true,
    },
    {
      name: 'Premium+',
      price: '$39.99',
      features: ['Everything in Premium', 'Unlimited Super Likes', 'Weekly boost', 'Incognito mode', 'Travel mode'],
      gradient: tokens.gradients.cta,
    },
    {
      name: 'Elite',
      price: '$59.99',
      features: ['Everything in Premium+', 'Personal matchmaker', 'Background checks', 'VIP events access', 'Concierge support'],
      gradient: tokens.gradients.gold,
    },
  ];

  return (
    <AnimatedSection
      id="pricing"
      className="py-24"
      style={{ background: tokens.colors.charcoal }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.span
            className="inline-block px-4 py-1 rounded-full text-sm font-medium mb-6"
            style={{
              background: 'rgba(255, 215, 0, 0.15)',
              color: '#FFD700',
            }}
          >
            Pricing Plans
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: tokens.colors.white }}>
            Find Your <GradientText gradient={tokens.gradients.gold}>Perfect Plan</GradientText>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: tokens.colors.silver }}>
            From free exploration to elite matchmaking services,
            choose the experience that fits your journey.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {plans.map((plan, index) => (
            <PricingCard key={plan.name} {...plan} delay={index * 0.1} />
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
};

// Safety Section
const SafetySection: React.FC = () => {
  const safetyFeatures = [
    { icon: '🛡️', title: 'AI Fraud Detection', description: 'Advanced algorithms detect and block suspicious accounts' },
    { icon: '👁️', title: '24/7 Moderation', description: 'Human moderators review reports around the clock' },
    { icon: '🔒', title: 'Privacy First', description: 'Your data is encrypted and never sold to third parties' },
    { icon: '🚫', title: 'Block & Report', description: 'Easy tools to block and report inappropriate behavior' },
  ];

  return (
    <AnimatedSection
      id="safety"
      className="py-24 relative overflow-hidden"
      style={{ background: tokens.colors.obsidian }}
    >
      {/* Background Glow */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.1) 0%, transparent 60%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
            style={{
              background: 'rgba(52, 211, 153, 0.2)',
              boxShadow: '0 0 60px rgba(52, 211, 153, 0.3)',
            }}
            animate={{
              boxShadow: [
                '0 0 40px rgba(52, 211, 153, 0.3)',
                '0 0 80px rgba(52, 211, 153, 0.4)',
                '0 0 40px rgba(52, 211, 153, 0.3)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-4xl">🛡️</span>
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: tokens.colors.white }}>
            Your Safety, <span style={{ color: tokens.colors.success }}>Our Priority</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: tokens.colors.silver }}>
            We've built the most comprehensive safety system in online dating
            so you can focus on what matters: finding love.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {safetyFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-6 text-center h-full">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: tokens.colors.white }}>
                  {feature.title}
                </h3>
                <p className="text-sm" style={{ color: tokens.colors.silver }}>
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
};

// Final CTA Section
const FinalCTASection: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Gradient Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            ${tokens.gradients.aurora},
            ${tokens.colors.obsidian}
          `,
          backgroundBlendMode: 'overlay',
        }}
      />

      {/* Mesh Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: tokens.gradients.mesh }}
      />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.h2
          className="text-4xl md:text-6xl font-bold mb-6"
          style={{ color: tokens.colors.white }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Ready to Find <br />Your Person?
        </motion.h2>

        <motion.p
          className="text-xl mb-10 opacity-90"
          style={{ color: tokens.colors.white }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          Join millions who've already found love on Flamoral.
          Your story starts with a single swipe.
        </motion.p>

        {/* Email Signup */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-6 py-4 rounded-xl text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          />
          <GlowButton size="lg" variant="gold" onClick={() => navigate('/signup')}>
            Get Started Free
          </GlowButton>
        </motion.div>

        <motion.p
          className="text-sm opacity-70"
          style={{ color: tokens.colors.white }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          No credit card required • Cancel anytime • Instant access
        </motion.p>
      </div>
    </section>
  );
};

// Footer Component
const Footer: React.FC = () => {
  const footerLinks = {
    Product: ['Features', 'Pricing', 'Success Stories', 'Mobile Apps'],
    Company: ['About Us', 'Careers', 'Press', 'Blog'],
    Support: ['Help Center', 'Safety Tips', 'Community Guidelines', 'Contact'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'],
  };

  const socialLinks = [
    { icon: '𝕏', href: '#' },
    { icon: '📷', href: '#' },
    { icon: '📘', href: '#' },
    { icon: '🔗', href: '#' },
  ];

  return (
    <footer style={{ background: tokens.colors.charcoal }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: tokens.gradients.aurora }}
              >
                <span className="text-xl">🔥</span>
              </div>
              <GradientText className="text-2xl font-bold">Flamoral</GradientText>
            </div>
            <p className="text-sm mb-6" style={{ color: tokens.colors.silver }}>
              Where meaningful connections begin. Find your forever, starting tonight.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, i) => (
                <a
                  key={i}
                  href={social.href}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{
                    background: 'rgba(167, 139, 250, 0.15)',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                  }}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4" style={{ color: tokens.colors.white }}>
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors hover:text-white"
                      style={{ color: tokens.colors.silver }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div
          className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderTop: '1px solid rgba(167, 139, 250, 0.1)' }}
        >
          <p className="text-sm" style={{ color: tokens.colors.muted }}>
            © 2024 Flamoral. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-sm" style={{ color: tokens.colors.muted }}>
              Made with 💜 for lovers everywhere
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main Landing Page Component
export const LandingPageV2: React.FC = () => {
  return (
    <div
      className="min-h-screen"
      style={{
        background: tokens.colors.obsidian,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <Navigation />
      <HeroSection />
      <SocialProofSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <SafetySection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default LandingPageV2;
