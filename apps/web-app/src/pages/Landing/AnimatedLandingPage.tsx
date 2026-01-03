import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useInView, useScroll, useTransform } from 'framer-motion';
import { FlamoralLogo } from '../../components/Logo';

/**
 * Flamoral Animated Landing Page
 *
 * Design Philosophy: Cinematic Calm
 * - Slow, intentional animations that feel premium
 * - Dark atmospheric canvas with breathing gradients
 * - Typography-driven hierarchy
 * - One animation per section max
 * - Reduced motion support throughout
 */

// Animation configuration
const MOTION_CONFIG = {
  ease: [0.22, 1, 0.36, 1] as const,
  duration: 0.34,
  stagger: 0.08,
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION_CONFIG.duration, ease: MOTION_CONFIG.ease },
};

// Pricing data
const PRICING_PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    cta: 'Start Free',
    features: ['50 daily swipes', 'Basic filters', '1 Super Like/day', 'Photo verification'],
    highlighted: false,
  },
  {
    key: 'basic',
    name: 'Basic',
    price: '$9.99',
    period: '/month',
    cta: 'Choose Basic',
    features: ['Unlimited swipes', 'See who likes you', '5 Super Likes/day', '1 Boost/month'],
    highlighted: false,
  },
  {
    key: 'plus',
    name: 'Plus',
    price: '$19.99',
    period: '/month',
    cta: 'Choose Plus',
    badge: 'Best Value',
    features: ['All Basic features', 'Advanced filters', 'Read receipts', 'Incognito mode'],
    highlighted: false,
  },
  {
    key: 'premium',
    name: 'Premium',
    price: '$29.99',
    period: '/month',
    cta: 'Start Free Trial',
    badge: 'Most Popular',
    features: ['All Plus features', 'Unlimited Super Likes', 'Video dating', 'AI matchmaking'],
    highlighted: true,
  },
  {
    key: 'premium_plus',
    name: 'Premium+',
    price: '$39.99',
    period: '/month',
    cta: 'Choose Premium+',
    features: ['All Premium features', 'Passport (travel)', 'Message before match', 'Priority support'],
    highlighted: false,
  },
  {
    key: 'elite',
    name: 'Elite',
    price: '$59.99',
    period: '/month',
    cta: 'Go Elite',
    features: ['All Premium+ features', 'VIP badge', 'Dedicated coach', 'Background verified'],
    highlighted: false,
  },
];

// Features data
const FEATURES = [
  { icon: '🎯', title: 'Smart Filters', description: 'Filter by lifestyle, interests, values' },
  { icon: '⚡', title: 'Super Likes', description: 'Stand out from the crowd' },
  { icon: '🚀', title: 'Profile Boosts', description: 'Get up to 10x more visibility' },
  { icon: '💬', title: 'AI Icebreakers', description: 'Intelligent conversation starters' },
];

// Safety features
const SAFETY_FEATURES = [
  { icon: '🛡️', title: 'AI Fraud Detection', description: 'Advanced algorithms protect you' },
  { icon: '👁️', title: '24/7 Moderation', description: 'Human oversight always active' },
  { icon: '🔒', title: 'Privacy First', description: 'Your data stays yours' },
  { icon: '🚫', title: 'Block & Report', description: 'Quick action when needed' },
];

const AnimatedLandingPage: React.FC = () => {
  // useReducedMotion can return null before the preference is resolved
  // Default to false (show animations) when null
  const reducedMotionPref = useReducedMotion();
  const prefersReducedMotion = reducedMotionPref === true;
  const heroRef = useRef<HTMLDivElement>(null);
  const [gradientPos, setGradientPos] = useState({ x: 50, y: 50 });

  // Parallax for hero
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Animated gradient movement
  useEffect(() => {
    if (prefersReducedMotion) return;

    let animationId: number;
    const animate = () => {
      const time = Date.now() * 0.00005;
      setGradientPos({
        x: 50 + Math.sin(time) * 20,
        y: 50 + Math.cos(time * 0.7) * 15,
      });
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [prefersReducedMotion]);

  return (
    <div className="flamoral-animated-landing">
      {/* Preload fonts for better performance - link element is non-blocking */}
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"
      />
      <style>{`
        .flamoral-animated-landing {
          /* Master Prompt Specification — Midnight Blue base */
          --color-bg: #1a1a2e;
          --color-bg-elevated: #232342;
          --color-bg-card: #2d2d44;
          --color-text: #f5f5f7;
          --color-text-muted: #a0a0b0;
          --color-text-dim: #6b6b7b;
          --color-pink: #ff2d75;
          --color-pink-glow: rgba(255, 45, 117, 0.35);
          --color-blue: #22d3ee;
          --color-blue-glow: rgba(34, 211, 238, 0.3);
          --color-gold: #f59e0b;
          --color-border: rgba(255, 255, 255, 0.12);

          --font-display: 'Playfair Display', Georgia, serif;
          --font-body: 'DM Sans', -apple-system, sans-serif;

          --ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);
          --ease-subtle: cubic-bezier(0.16, 1, 0.3, 1);

          font-family: var(--font-body);
          background: var(--color-bg);
          color: var(--color-text);
          min-height: 100vh;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
          /* Ensure landing page renders above App's FlamoralBackground */
          position: relative;
          z-index: 1;
        }

        .flamoral-animated-landing * {
          box-sizing: border-box;
        }

        /* Typography */
        .serif { font-family: var(--font-display); }
        .italic { font-style: italic; }

        /* Containers */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .container-wide {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* Buttons */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 2.5rem;
          background: var(--color-text);
          color: var(--color-bg);
          font-weight: 500;
          font-size: 0.95rem;
          border-radius: 100px;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: transform 0.2s var(--ease-smooth), box-shadow 0.2s var(--ease-smooth);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s var(--ease-smooth);
        }

        .btn-ghost:hover {
          color: var(--color-text);
        }

        .btn-ghost svg {
          transition: transform 0.2s var(--ease-smooth);
        }

        .btn-ghost:hover svg {
          transform: translateX(4px);
        }

        .btn-plan {
          display: block;
          width: 100%;
          padding: 0.875rem 1.5rem;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text);
          font-weight: 500;
          font-size: 0.9rem;
          border-radius: 10px;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          transition: all 0.14s var(--ease-smooth);
        }

        .btn-plan:hover {
          background: var(--color-text);
          color: var(--color-bg);
          border-color: var(--color-text);
        }

        .btn-plan-highlighted {
          background: var(--color-text);
          color: var(--color-bg);
          border-color: var(--color-text);
        }

        .btn-plan-highlighted:hover {
          background: var(--color-pink);
          border-color: var(--color-pink);
          color: white;
          box-shadow: 0 0 30px var(--color-pink-glow);
        }

        /* Hero Section */
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .hero-gradient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              ellipse 80% 60% at var(--gradient-x, 50%) var(--gradient-y, 50%),
              var(--color-pink-glow) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 60% 80% at calc(100% - var(--gradient-x, 50%)) calc(100% - var(--gradient-y, 50%)),
              var(--color-blue-glow) 0%,
              transparent 50%
            ),
            var(--color-bg);
          transition: background 0.5s ease;
        }

        .hero-noise {
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
        }

        .hero-image {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .hero-image::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 0%, var(--color-bg) 100%);
        }

        .hero-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.25;
          filter: saturate(0.8);
        }

        /* Navigation */
        .nav {
          position: relative;
          padding: 1.5rem 0;
          z-index: 10;
        }

        .nav-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-logo {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-style: italic;
          color: var(--color-text);
          text-decoration: none;
          letter-spacing: -0.02em;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .nav-link {
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: var(--color-text);
        }

        /* Hero Content */
        .hero-content {
          flex: 1;
          display: flex;
          align-items: center;
          position: relative;
          z-index: 5;
          padding-bottom: 6rem;
        }

        .hero-inner {
          max-width: 680px;
        }

        .hero-headline {
          font-family: var(--font-display);
          font-size: clamp(3rem, 8vw, 5.5rem);
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: -0.03em;
          margin: 0 0 1.5rem;
        }

        .hero-subheadline {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: var(--color-text-muted);
          max-width: 480px;
          margin-bottom: 2.5rem;
        }

        .hero-ctas {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 1.5rem;
        }

        .hero-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid var(--color-border);
        }

        .hero-trust-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--color-text-muted);
        }

        .hero-trust-icon {
          width: 16px;
          height: 16px;
          opacity: 0.7;
        }

        /* Section Styles */
        .section {
          padding: 6rem 0;
          position: relative;
        }

        .section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 4rem;
        }

        .section-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 400;
          letter-spacing: -0.02em;
          margin: 0 0 1rem;
        }

        .section-subtitle {
          color: var(--color-text-muted);
          font-size: 1.1rem;
        }

        /* Value Pillars */
        .pillars {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 3rem;
        }

        .pillar {
          position: relative;
          padding: 2.5rem;
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          overflow: hidden;
        }

        .pillar-visual {
          height: 200px;
          margin-bottom: 2rem;
          border-radius: 12px;
          overflow: hidden;
          background: linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .pillar-visual-icon {
          font-size: 4rem;
          opacity: 0.8;
        }

        .pillar-pulse {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--color-pink-glow) 0%, transparent 70%);
          animation: pulse 4s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        .pillar-title {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 400;
          margin: 0 0 0.75rem;
        }

        .pillar-description {
          color: var(--color-text-muted);
          font-size: 0.95rem;
          line-height: 1.7;
          margin: 0 0 1.5rem;
        }

        .pillar-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-pink);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .pillar-link:hover {
          text-decoration: underline;
        }

        /* Features Grid */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .feature-card {
          padding: 2rem;
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          text-align: center;
          transition: transform 0.3s var(--ease-smooth), border-color 0.3s var(--ease-smooth);
        }

        .feature-card:hover {
          transform: translateY(-4px);
          border-color: var(--color-pink);
        }

        .feature-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          display: block;
        }

        .feature-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          margin: 0 0 0.5rem;
        }

        .feature-description {
          color: var(--color-text-muted);
          font-size: 0.9rem;
          margin: 0;
        }

        /* Pricing Section */
        .pricing-section {
          background: var(--color-bg-elevated);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
        }

        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        @media (min-width: 1200px) {
          .pricing-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }

        .pricing-card {
          padding: 1.5rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: border-color 0.2s var(--ease-smooth), box-shadow 0.2s var(--ease-smooth);
        }

        .pricing-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .pricing-card-highlighted {
          border-color: var(--color-pink);
          background: linear-gradient(180deg, rgba(255, 45, 117, 0.08) 0%, var(--color-bg) 100%);
        }

        .pricing-card-highlighted:hover {
          box-shadow: 0 0 40px var(--color-pink-glow);
        }

        .pricing-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          padding: 0.25rem 0.75rem;
          background: var(--color-pink);
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 100px;
          white-space: nowrap;
        }

        .pricing-badge-value {
          background: var(--color-blue);
        }

        .pricing-name {
          font-family: var(--font-display);
          font-size: 1.25rem;
          margin: 0 0 0.25rem;
        }

        .pricing-price {
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
          margin-bottom: 1rem;
        }

        .pricing-amount {
          font-size: 2rem;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .pricing-period {
          color: var(--color-text-muted);
          font-size: 0.85rem;
        }

        .pricing-features {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
          flex: 1;
        }

        .pricing-feature {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--color-text-muted);
          margin-bottom: 0.5rem;
        }

        .pricing-feature::before {
          content: '✓';
          color: var(--color-pink);
          flex-shrink: 0;
        }

        /* Safety Section */
        .safety-section {
          position: relative;
          overflow: hidden;
        }

        .safety-gradient {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              ellipse 50% 50% at 50% 50%,
              var(--color-blue-glow) 0%,
              transparent 70%
            );
          opacity: 0.5;
        }

        .safety-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .safety-card {
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          text-align: center;
        }

        .safety-icon {
          font-size: 2rem;
          margin-bottom: 0.75rem;
          display: block;
        }

        .safety-title {
          font-size: 1rem;
          font-weight: 500;
          margin: 0 0 0.5rem;
        }

        .safety-description {
          color: var(--color-text-muted);
          font-size: 0.85rem;
          margin: 0;
        }

        /* CTA Section */
        .cta-section {
          text-align: center;
        }

        .cta-section .section-title {
          font-style: italic;
        }

        /* Footer */
        .footer {
          padding: 4rem 0 2rem;
          border-top: 1px solid var(--color-border);
        }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .footer-column-title {
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-text-muted);
          margin: 0 0 1rem;
        }

        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .footer-link {
          margin-bottom: 0.5rem;
        }

        .footer-link a {
          color: var(--color-text-dim);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .footer-link a:hover {
          color: var(--color-text);
        }

        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          padding-top: 2rem;
          border-top: 1px solid var(--color-border);
        }

        .footer-copyright {
          color: var(--color-text-dim);
          font-size: 0.85rem;
        }

        .footer-logo {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 1.25rem;
          color: var(--color-text);
          text-decoration: none;
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .pillar-pulse {
            animation: none;
            opacity: 0.6;
          }

          .hero-gradient {
            transition: none;
          }
        }

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .hero-headline {
            font-size: 2.5rem;
          }

          .hero-ctas {
            flex-direction: column;
            align-items: flex-start;
          }

          .btn-primary {
            width: 100%;
          }

          .nav-links {
            gap: 1rem;
          }

          .pricing-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .footer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 480px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section ref={heroRef} className="hero">
        <div
          className="hero-gradient"
          style={{
            '--gradient-x': `${gradientPos.x}%`,
            '--gradient-y': `${gradientPos.y}%`
          } as React.CSSProperties}
        />
        <div className="hero-noise" />

        <motion.div
          className="hero-image"
          style={prefersReducedMotion ? {} : { y: heroY, scale: heroScale, opacity: heroOpacity }}
        >
          {/* Abstract romantic imagery would go here */}
        </motion.div>

        {/* Navigation */}
        <nav className="nav">
          <div className="container nav-inner">
            <Link to="/" className="nav-logo">
              <FlamoralLogo variant="horizontal" size="sm" />
            </Link>
            <div className="nav-links">
              <Link to="/login" className="nav-link">Log in</Link>
              <Link to="/signup" className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="hero-content">
          <div className="container">
            <motion.div
              className="hero-inner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.18 : 0.6, ease: MOTION_CONFIG.ease }}
            >
              <h1 className="hero-headline serif">
                Real connections.<br />
                <span className="italic">No noise.</span>
              </h1>

              <p className="hero-subheadline">
                Intelligent matching powered by AI, designed for genuine connections.
              </p>

              <div className="hero-ctas">
                <Link to="/signup" className="btn-primary">Start Free</Link>
                <a href="#pricing" className="btn-ghost">
                  See pricing
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>

              <div className="hero-trust">
                <div className="hero-trust-item">
                  <svg className="hero-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>Private by design</span>
                </div>
                <div className="hero-trust-item">
                  <svg className="hero-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>Verified profiles</span>
                </div>
                <div className="hero-trust-item">
                  <svg className="hero-trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  <span>Upgrade anytime</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Value Pillars */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title serif">
              Powered by <span className="italic">intelligence</span>
            </h2>
            <p className="section-subtitle">
              Advanced AI technology that understands what makes connections meaningful.
            </p>
          </div>

          <div className="pillars">
            <AnimatedPillar index={0}>
              <div className="pillar-visual">
                <div className="pillar-pulse" style={{ background: 'radial-gradient(circle, var(--color-pink-glow) 0%, transparent 70%)' }} />
                <span className="pillar-visual-icon">🧠</span>
              </div>
              <h3 className="pillar-title serif">AI-Powered Compatibility</h3>
              <p className="pillar-description">
                Advanced neural networks analyze 50+ compatibility factors to match you with people who truly align with your values and goals.
              </p>
              <a href="#learn-more" className="pillar-link">
                Learn more →
              </a>
            </AnimatedPillar>

            <AnimatedPillar index={1}>
              <div className="pillar-visual">
                <div className="pillar-pulse" style={{ background: 'radial-gradient(circle, var(--color-blue-glow) 0%, transparent 70%)' }} />
                <span className="pillar-visual-icon">📹</span>
              </div>
              <h3 className="pillar-title serif">Video Dating Experience</h3>
              <p className="pillar-description">
                Build genuine connections through HD video calls before meeting in person. See chemistry in action.
              </p>
              <a href="#learn-more" className="pillar-link">
                Learn more →
              </a>
            </AnimatedPillar>

            <AnimatedPillar index={2}>
              <div className="pillar-visual">
                <div className="pillar-pulse" style={{ background: 'radial-gradient(circle, rgba(201, 169, 98, 0.3) 0%, transparent 70%)' }} />
                <span className="pillar-visual-icon">✓</span>
              </div>
              <h3 className="pillar-title serif">Verified & Authentic</h3>
              <p className="pillar-description">
                Every profile goes through multi-layer verification so you connect with real people, every time.
              </p>
              <a href="#learn-more" className="pillar-link">
                Learn more →
              </a>
            </AnimatedPillar>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="section" style={{ background: 'var(--color-bg-elevated)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title serif">
              Tools for <span className="italic">better</span> dating
            </h2>
            <p className="section-subtitle">
              Features designed to help you find your person faster.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((feature, index) => (
              <AnimatedFeature key={feature.title} index={index}>
                <span className="feature-icon">{feature.icon}</span>
                <h3 className="feature-title serif">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </AnimatedFeature>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="section pricing-section">
        <div className="container-wide">
          <div className="section-header">
            <h2 className="section-title serif">
              Simple, <span className="italic">transparent</span> pricing
            </h2>
            <p className="section-subtitle">
              Start free, upgrade when you're ready.
            </p>
          </div>

          <div className="pricing-grid">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`pricing-card ${plan.highlighted ? 'pricing-card-highlighted' : ''}`}
              >
                {plan.badge && (
                  <span className={`pricing-badge ${plan.badge === 'Best Value' ? 'pricing-badge-value' : ''}`}>
                    {plan.badge}
                  </span>
                )}
                <h3 className="pricing-name serif">{plan.name}</h3>
                <div className="pricing-price">
                  <span className="pricing-amount">{plan.price}</span>
                  <span className="pricing-period">{plan.period}</span>
                </div>
                <ul className="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature} className="pricing-feature">{feature}</li>
                  ))}
                </ul>
                <Link
                  to={plan.key === 'free' ? '/signup' : `/signup?plan=${plan.key}`}
                  className={`btn-plan ${plan.highlighted ? 'btn-plan-highlighted' : ''}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section className="section safety-section">
        <div className="safety-gradient" />
        <div className="container">
          <div className="section-header">
            <h2 className="section-title serif">
              Your safety is our <span className="italic">priority</span>
            </h2>
            <p className="section-subtitle">
              Multi-layered protection so you can focus on finding connection.
            </p>
          </div>

          <div className="safety-grid">
            {SAFETY_FEATURES.map((feature, index) => (
              <AnimatedSafetyCard key={feature.title} index={index}>
                <span className="safety-icon">{feature.icon}</span>
                <h3 className="safety-title">{feature.title}</h3>
                <p className="safety-description">{feature.description}</p>
              </AnimatedSafetyCard>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section cta-section">
        <div className="container">
          <div className="section-header" style={{ marginBottom: '2rem' }}>
            <h2 className="section-title serif">Connect differently.</h2>
            <p className="section-subtitle">
              Join thousands finding meaningful relationships on Flamoral.
            </p>
          </div>
          <Link to="/signup" className="btn-primary" style={{ marginBottom: '1rem' }}>
            Start Free Today
          </Link>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            Free to join. Upgrade when you're ready.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h4 className="footer-column-title">Company</h4>
              <ul className="footer-links">
                <li className="footer-link"><Link to="/about">About Us</Link></li>
                <li className="footer-link"><Link to="/careers">Careers</Link></li>
                <li className="footer-link"><Link to="/press">Press</Link></li>
                <li className="footer-link"><Link to="/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="footer-column-title">Resources</h4>
              <ul className="footer-links">
                <li className="footer-link"><Link to="/help">Help Center</Link></li>
                <li className="footer-link"><Link to="/safety-tips">Safety Tips</Link></li>
                <li className="footer-link"><Link to="/community">Community</Link></li>
                <li className="footer-link"><Link to="/blog">Dating Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="footer-column-title">Legal</h4>
              <ul className="footer-links">
                <li className="footer-link"><Link to="/privacy-policy">Privacy Policy</Link></li>
                <li className="footer-link"><Link to="/terms-of-service">Terms of Service</Link></li>
                <li className="footer-link"><Link to="/cookie-policy">Cookie Policy</Link></li>
                <li className="footer-link"><Link to="/community-guidelines">Community Guidelines</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="footer-column-title">Extras</h4>
              <ul className="footer-links">
                <li className="footer-link"><Link to="/gift-cards">Gift Cards</Link></li>
                <li className="footer-link"><Link to="/safety-hub">Safety Hub</Link></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <Link to="/" className="footer-logo">
              <FlamoralLogo variant="horizontal" size="sm" showTagline />
            </Link>
            <p className="footer-copyright">© {new Date().getFullYear()} Flamoral. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Animated Pillar Component
const AnimatedPillar: React.FC<{ children: React.ReactNode; index: number }> = ({ children, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.25 });
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="pillar"
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: prefersReducedMotion ? 0.18 : 0.34,
        delay: prefersReducedMotion ? 0 : index * 0.08,
        ease: MOTION_CONFIG.ease,
      }}
    >
      {children}
    </motion.div>
  );
};

// Animated Feature Component
const AnimatedFeature: React.FC<{ children: React.ReactNode; index: number }> = ({ children, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.25 });
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="feature-card"
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12, scale: prefersReducedMotion ? 1 : 0.98 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: prefersReducedMotion ? 0.18 : 0.26,
        delay: prefersReducedMotion ? 0 : index * 0.06,
        ease: MOTION_CONFIG.ease,
      }}
    >
      {children}
    </motion.div>
  );
};

// Animated Safety Card Component
const AnimatedSafetyCard: React.FC<{ children: React.ReactNode; index: number }> = ({ children, index }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.25 });
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className="safety-card"
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: prefersReducedMotion ? 0.18 : 0.34,
        delay: prefersReducedMotion ? 0 : index * 0.08,
        ease: MOTION_CONFIG.ease,
      }}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedLandingPage;
