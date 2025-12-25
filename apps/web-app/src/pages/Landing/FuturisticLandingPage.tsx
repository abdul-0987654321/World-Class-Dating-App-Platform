/**
 * FLAMORAL Futuristic Landing Page
 * Premium Multi-Gradient Design with AI Avatar Integration
 *
 * Version: 2.0.0
 * Theme: Dark Mode First + Trust Forward
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

// ============================================================================
// AI AVATAR COMPONENT
// ============================================================================

interface AvatarState {
  isVisible: boolean;
  isMuted: boolean;
  isPaused: boolean;
  currentMessage: string;
  messageIndex: number;
}

const AIAvatar: React.FC<{
  onClose: () => void;
  reducedMotion: boolean;
}> = ({ onClose, reducedMotion }) => {
  const [state, setState] = useState<AvatarState>({
    isVisible: true,
    isMuted: false,
    isPaused: false,
    currentMessage: '',
    messageIndex: 0,
  });

  const avatarMessages = [
    "Welcome to FLAMORAL. I'm here to guide you through finding meaningful connections.",
    "Your safety and privacy are our top priorities. All profiles are verified.",
    "Ready to start your journey? Let me show you how FLAMORAL works.",
  ];

  useEffect(() => {
    if (state.isPaused || state.isMuted) return;

    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        currentMessage: avatarMessages[prev.messageIndex],
        messageIndex: (prev.messageIndex + 1) % avatarMessages.length,
      }));
    }, 5000);

    return () => clearTimeout(timer);
  }, [state.messageIndex, state.isPaused, state.isMuted]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      currentMessage: avatarMessages[0],
    }));
  }, []);

  if (!state.isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeOut' }}
      className="fixed bottom-6 right-6 z-50 max-w-sm"
    >
      <div className="relative">
        {/* Avatar Container */}
        <div className="bg-base-charcoal/95 backdrop-blur-xl rounded-3xl p-6 border border-base-dark-gray shadow-elevation-4">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 text-base-light-gray hover:text-white transition-colors rounded-full hover:bg-base-dark-gray"
            aria-label="Close avatar guide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-start space-x-4">
            {/* Avatar Visual */}
            <div className="relative flex-shrink-0">
              <div
                className={`w-16 h-16 rounded-full bg-gradient-pink-blue flex items-center justify-center ${
                  !reducedMotion ? 'animate-avatar-pulse' : ''
                }`}
              >
                {/* Holographic Avatar Effect */}
                <div className="w-14 h-14 rounded-full bg-base-deep-black flex items-center justify-center overflow-hidden">
                  <svg
                    className="w-10 h-10 text-pink-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                    />
                  </svg>
                </div>
              </div>
              {/* Status Indicator */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-base-charcoal flex items-center justify-center">
                <div className={`w-2 h-2 bg-white rounded-full ${!reducedMotion ? 'animate-pulse' : ''}`} />
              </div>
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-pink-400 mb-1">FLAMORAL Guide</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={state.currentMessage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: reducedMotion ? 0 : 0.3 }}
                  className="text-sm text-gray-300 leading-relaxed"
                >
                  {state.currentMessage}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-base-dark-gray">
            <button
              onClick={() => setState((prev) => ({ ...prev, isMuted: !prev.isMuted }))}
              className={`p-2 rounded-lg transition-colors ${
                state.isMuted
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'bg-base-dark-gray text-gray-400 hover:text-white'
              }`}
              aria-label={state.isMuted ? 'Unmute' : 'Mute'}
            >
              {state.isMuted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setState((prev) => ({ ...prev, isPaused: !prev.isPaused }))}
              className={`p-2 rounded-lg transition-colors ${
                state.isPaused
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'bg-base-dark-gray text-gray-400 hover:text-white'
              }`}
              aria-label={state.isPaused ? 'Resume' : 'Pause'}
            >
              {state.isPaused ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// FEATURE MODAL COMPONENT
// ============================================================================

interface Feature {
  title: string;
  description: string;
  details: string[];
  icon: React.ReactNode;
  gradient: string;
}

const FeatureModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  feature: Feature | null;
}> = ({ isOpen, onClose, feature }) => {
  if (!isOpen || !feature) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto"
        onClick={onClose}
      >
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative inline-block w-full max-w-2xl p-8 overflow-hidden text-left align-middle transition-all transform bg-base-charcoal border border-base-dark-gray shadow-elevation-5 rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-base-dark-gray"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className={`w-16 h-16 ${feature.gradient} rounded-2xl flex items-center justify-center text-white mb-6`}>
              {feature.icon}
            </div>

            <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
            <p className="text-gray-400 mb-6">{feature.description}</p>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">Key Features:</h4>
              <ul className="space-y-3">
                {feature.details.map((detail, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-300">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex space-x-4">
              <Link
                to="/signup"
                className="flex-1 bg-gradient-pink-blue text-white py-3 px-6 rounded-full text-center font-semibold hover:shadow-glow-pink transition-all duration-300"
              >
                Get Started Free
              </Link>
              <button
                onClick={onClose}
                className="flex-1 border-2 border-gray-600 text-gray-300 py-3 px-6 rounded-full font-semibold hover:bg-base-dark-gray transition-all duration-300"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

const FuturisticLandingPage: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [showAvatar, setShowAvatar] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const features: Feature[] = [
    {
      title: 'AI-Powered Compatibility',
      description: 'Our advanced neural networks analyze 50+ compatibility factors to match you with people who truly align with your values, interests, and relationship goals.',
      details: [
        'Deep learning analysis of personality traits and communication styles',
        'Behavioral pattern recognition from engagement data',
        'Continuous learning from your preferences and feedback',
        'Scientific compatibility scoring with transparent explanations',
        'Top Picks curated daily based on your unique profile',
        'Smart conversation starters powered by AI',
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      gradient: 'bg-gradient-pink-blue',
    },
    {
      title: 'Video Dating Experience',
      description: 'Build genuine connections through HD video calls before meeting in person. See real chemistry with crystal-clear video and audio.',
      details: [
        'HD video and audio powered by enterprise-grade infrastructure',
        'Virtual date backgrounds and ambient settings',
        'Speed dating events with multiple video connections',
        'Voice messages for asynchronous communication',
        'Screen sharing for virtual movie nights',
        'Recording available with mutual consent',
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'bg-gradient-blue-green',
    },
    {
      title: 'Verified & Authentic',
      description: 'Every profile goes through our multi-layer verification. Connect with confidence knowing you are meeting real people with real intentions.',
      details: [
        'AI-powered photo verification matching selfies to profiles',
        'Real-time fraud detection and bot prevention',
        'Verified badge system for confirmed authentic profiles',
        'Optional background checks for premium members',
        '24/7 human moderation team reviewing flagged content',
        'Zero tolerance policy for fake profiles and scammers',
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      gradient: 'bg-gradient-green-yellow',
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Create Your Profile',
      description: 'Sign up in minutes. Our AI helps you craft a profile that authentically represents who you are.',
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      step: 2,
      title: 'Discover Matches',
      description: 'Our algorithm analyzes compatibility across 50+ factors to show you meaningful connections.',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      step: 3,
      title: 'Start Conversations',
      description: 'Break the ice with AI-powered conversation starters or jump straight into video dating.',
      gradient: 'from-green-500 to-green-600',
    },
    {
      step: 4,
      title: 'Build Connections',
      description: 'Move from chat to video calls to real-world dates. We are with you every step of the way.',
      gradient: 'from-yellow-500 to-yellow-600',
    },
  ];

  const safetyFeatures = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: 'AI Fraud Detection',
      description: 'Advanced machine learning detects and removes fake profiles, scammers, and suspicious behavior in real-time.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      title: '24/7 Moderation',
      description: 'Our dedicated safety team reviews reports around the clock to maintain a respectful community.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: 'Privacy First',
      description: 'Your data is encrypted end-to-end and never sold. You control who sees your profile and information.',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      title: 'Block & Report',
      description: 'Easy one-tap blocking and reporting. We take immediate action on policy violations.',
    },
  ];

  const testimonials = [
    {
      names: 'Sarah & Michael',
      time: 'Together 2 years',
      quote: 'We matched on FLAMORAL and instantly connected over our love for hiking. The video dating feature helped us build real chemistry before meeting. Now we are engaged!',
      gradient: 'from-pink-500 to-blue-500',
      initial: 'S',
    },
    {
      names: 'James & Emma',
      time: 'Together 1 year',
      quote: 'After disappointing experiences on other apps, FLAMORAL felt different. The verification gave me confidence, and the matching was incredibly accurate.',
      gradient: 'from-blue-500 to-green-500',
      initial: 'J',
    },
    {
      names: 'Alex & Jordan',
      time: 'Together 8 months',
      quote: "Our 94% compatibility score was spot on. The AI really understood what we were looking for. We connected immediately and haven't looked back.",
      gradient: 'from-green-500 to-yellow-500',
      initial: 'A',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-base-deep-black text-white overflow-x-hidden">
      {/* Skip Navigation Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Feature Modal */}
      <FeatureModal
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        feature={selectedFeature}
      />

      {/* AI Avatar */}
      <AnimatePresence>
        {showAvatar && (
          <AIAvatar onClose={() => setShowAvatar(false)} reducedMotion={reducedMotion} />
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-base-deep-black/80 backdrop-blur-xl z-40 border-b border-base-dark-gray/50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-gradient-pink-blue font-heading">FLAMORAL</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How It Works</a>
              <a href="#safety" className="text-gray-400 hover:text-white transition-colors">Safety</a>
              <a href="#success" className="text-gray-400 hover:text-white transition-colors">Success Stories</a>
              <Link to="/subscription" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-300 hover:text-white font-medium transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="bg-gradient-pink-blue text-white px-6 py-2 rounded-full font-medium hover:shadow-glow-pink hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-base-deep-black"
                aria-label="Sign up for free"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        id="main-content"
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative w-full min-h-screen flex flex-col justify-center pt-20 pb-16 overflow-hidden"
        aria-label="Hero section - Find your perfect connection"
      >
        {/* Background Effects - Contained blur orbs */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-30 pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-48 md:w-72 h-48 md:h-72 bg-pink-500/20 rounded-full filter blur-3xl pointer-events-none" style={{ left: '-6rem' }} />
        <div className="absolute bottom-1/4 right-0 w-48 md:w-72 h-48 md:h-72 bg-blue-500/20 rounded-full filter blur-3xl pointer-events-none" style={{ right: '-6rem' }} />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-6 lg:space-y-8 text-center lg:text-left"
            >
              <h1 className="text-display-2 lg:text-display-1 font-bold leading-tight font-heading">
                Find Your Perfect
                <span className="block text-gradient-pink-blue">
                  Connection
                </span>
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed max-w-xl">
                Join 2M+ verified singles finding real love through AI-powered matching.
                100% photo-verified profiles. Start free today.
              </p>

              {/* Trust Signals */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-sm text-gray-400">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Photo Verified</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>End-to-End Encrypted</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                  <span>2M+ Active Members</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center lg:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/signup"
                  className="flex items-center justify-center bg-gradient-pink-blue text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-glow-pink hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-base-deep-black"
                  aria-label="Create free account and start matching"
                >
                  Create Free Account
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="#how-it-works"
                  className="flex items-center justify-center border-2 border-pink-500/50 text-pink-400 px-8 py-4 rounded-full text-lg font-semibold hover:bg-pink-500/10 hover:border-pink-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-base-deep-black"
                  aria-label="Learn how FLAMORAL matching works"
                >
                  See How It Works
                </a>
              </div>
              {/* Urgency Microcopy */}
              <p className="text-sm text-green-400 flex items-center justify-center lg:justify-start">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No credit card required • Takes 60 seconds to sign up
              </p>

              {/* Social Proof */}
              <div className="pt-6 border-t border-base-dark-gray">
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="flex -space-x-3">
                    {['bg-gradient-to-br from-pink-400 to-pink-600', 'bg-gradient-to-br from-blue-400 to-blue-600', 'bg-gradient-to-br from-green-400 to-green-600', 'bg-gradient-to-br from-yellow-400 to-yellow-600', 'bg-gradient-to-br from-pink-400 to-blue-600'].map((bg, i) => (
                      <div
                        key={i}
                        className={`w-10 h-10 rounded-full ${bg} border-2 border-base-deep-black flex items-center justify-center text-white text-sm font-medium`}
                      >
                        {['A', 'S', 'M', 'J', 'K'][i]}
                      </div>
                    ))}
                  </div>
                  <div className="text-center sm:text-left">
                    <div className="flex justify-center sm:justify-start text-yellow-400 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-gray-400">Rated 4.8/5 by 50,000+ users</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Hero Visual - Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative flex justify-center lg:justify-end"
            >
              {/* Contained glow effects behind card */}
              <div className="absolute top-0 left-0 w-32 md:w-48 h-32 md:h-48 bg-pink-500/30 rounded-full filter blur-3xl animate-pulse pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-32 md:w-48 h-32 md:h-48 bg-blue-500/30 rounded-full filter blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

              <div className="relative bg-base-charcoal/80 backdrop-blur-xl rounded-3xl border border-base-dark-gray p-6 sm:p-8 transform hover:scale-[1.02] transition-transform duration-500 shadow-elevation-4 w-full max-w-md lg:max-w-lg">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-pink-blue flex items-center justify-center text-white text-2xl font-bold">E</div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Emma, 28</h3>
                      <div className="flex items-center text-sm text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                        Verified Profile
                      </div>
                    </div>
                    <div className="ml-auto">
                      <span className="bg-gradient-pink-blue text-white px-4 py-1.5 rounded-full text-sm font-medium">
                        95% Match
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['Adventure', 'Photography', 'Travel', 'Music'].map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-base-dark-gray rounded-full text-sm text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-gray-400 italic">
                    "Looking for someone who loves spontaneous adventures and meaningful conversations over coffee..."
                  </p>

                  <div className="flex justify-center space-x-4 pt-4">
                    <button className="w-14 h-14 rounded-full bg-base-dark-gray flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white transition-all duration-300 hover:scale-110">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button className="w-16 h-16 rounded-full bg-gradient-pink-blue flex items-center justify-center text-white shadow-glow-pink hover:scale-110 transition-all duration-300 animate-heartbeat">
                      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button className="w-14 h-14 rounded-full bg-gradient-blue-green flex items-center justify-center text-white hover:scale-110 transition-all duration-300 hover:shadow-glow-blue">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="py-24 relative w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-base-charcoal/50 to-transparent" />
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold font-heading mb-4">
              Why Choose <span className="text-gradient-pink-blue">FLAMORAL</span>?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Intelligent matching powered by AI, designed for genuine connections
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => setSelectedFeature(feature)}
                className="text-left bg-base-charcoal/50 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-base-dark-gray hover:border-pink-500/50 hover:shadow-glow-pink-sm transition-all duration-500 hover:scale-[1.02] group h-full flex flex-col focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-base-deep-black"
                aria-label={`Learn more about ${feature.title}`}
              >
                <div className={`w-14 h-14 ${feature.gradient} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 mb-4">{feature.description}</p>
                <span className="text-pink-400 font-medium inline-flex items-center group-hover:translate-x-2 transition-transform duration-300">
                  Learn more
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </motion.button>
            ))}
          </div>

          {/* Additional Features Grid */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: '🎯', title: 'Smart Filters', desc: 'Filter by lifestyle, interests, values' },
              { icon: '⚡', title: 'Super Likes', desc: 'Stand out from the crowd' },
              { icon: '🚀', title: 'Profile Boosts', desc: 'Get 10x more visibility' },
              { icon: '💬', title: 'AI Icebreakers', desc: 'Never run out of conversation starters' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-base-dark-gray/50 rounded-2xl p-6 text-center hover:bg-base-dark-gray transition-colors duration-300"
              >
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial-pink opacity-20 pointer-events-none" />
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold font-heading mb-4">
              How <span className="text-gradient-blue-green">FLAMORAL</span> Works
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Finding meaningful connections in just 4 simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="relative"
              >
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-base-dark-gray to-transparent" />
                )}
                <div className="bg-base-charcoal/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 text-center border border-base-dark-gray hover:border-pink-500/30 transition-all duration-500 h-full flex flex-col items-center justify-start">
                  <div className={`w-16 h-16 bg-gradient-to-br ${step.gradient} rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg`}>
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center mt-12"
          >
            <Link
              to="/signup"
              className="inline-flex items-center bg-gradient-pink-blue text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-glow-pink hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-base-deep-black"
              aria-label="Get started with a free account"
            >
              Create Free Account
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="py-24 relative w-full">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-base-charcoal/30 to-transparent" />
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl lg:text-5xl font-bold font-heading mb-6">
                Your <span className="text-gradient-blue-green">Safety</span> is Our Priority
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                We have built multiple layers of protection to ensure you have a safe and positive experience on FLAMORAL.
              </p>
              <div className="space-y-6">
                {safetyFeatures.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-start space-x-4"
                  >
                    <div className="w-12 h-12 bg-gradient-blue-green rounded-xl flex items-center justify-center text-white flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-lg">{item.title}</h4>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Link
                to="/safety"
                className="inline-flex items-center text-green-400 font-semibold mt-8 hover:text-green-300 transition-colors"
              >
                Visit Safety Center
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-base-charcoal/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-base-dark-gray"
            >
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gradient-blue-green rounded-full flex items-center justify-center mx-auto mb-6 animate-avatar-pulse">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Safety Statistics</h3>
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-8 max-w-md mx-auto">
                  {[
                    { value: '99.2%', label: 'Fake profiles caught' },
                    { value: '<1hr', label: 'Avg. report response' },
                    { value: '24/7', label: 'Live moderation' },
                    { value: 'AES-256', label: 'Encryption standard' },
                  ].map((stat, index) => (
                    <div key={index} className="p-4 bg-base-dark-gray/50 rounded-2xl">
                      <p className="text-3xl font-bold text-gradient-blue-green">{stat.value}</p>
                      <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section id="success" className="py-24 w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial-blue opacity-10 pointer-events-none" />
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold font-heading mb-4">
              Real <span className="text-gradient-pink-yellow">Success</span> Stories
            </h2>
            <p className="text-xl text-gray-400">Thousands have found their perfect match on FLAMORAL</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
            {testimonials.map((story, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="bg-base-charcoal/80 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-base-dark-gray hover:border-pink-500/30 transition-all duration-500 h-full flex flex-col justify-between"
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${story.gradient} flex items-center justify-center text-white text-xl font-bold`}>
                    {story.initial}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{story.names}</h4>
                    <p className="text-sm text-gray-500">{story.time}</p>
                  </div>
                </div>
                <p className="text-gray-400 italic mb-4">{story.quote}</p>
                <div className="flex text-pink-500">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-12"
          >
            <p className="text-gray-400 mb-4">Join 2M+ members finding love every day</p>
            <Link
              to="/signup"
              className="inline-flex items-center text-pink-400 font-semibold hover:text-pink-300 transition-colors"
            >
              Start Your Success Story
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 relative w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold font-heading mb-4">
              Simple, <span className="text-gradient-green-yellow">Transparent</span> Pricing
            </h2>
            <p className="text-xl text-gray-400">Start free, upgrade when you are ready</p>
          </motion.div>

          {/* 6-Tier Subscription Model - Mobile-first responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5 max-w-7xl mx-auto">
            {/* Free Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-base-charcoal/50 rounded-2xl p-4 sm:p-5 border border-base-dark-gray h-full flex flex-col"
            >
              <h3 className="text-lg font-bold text-white mb-1">Free</h3>
              <p className="text-xs text-gray-400 mb-3">Get started</p>
              <p className="text-2xl font-bold text-white mb-4">$0<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-2 mb-4 flex-grow">
                {['50 daily swipes', 'Basic filters', '1 Super Like/day', 'Photo verification'].map((feature) => (
                  <li key={feature} className="flex items-start text-gray-300 text-xs">
                    <svg className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="block w-full text-center border border-pink-500 text-pink-400 py-2 rounded-full text-sm font-semibold hover:bg-pink-500/10 transition-all duration-300">
                Start Free
              </Link>
            </motion.div>

            {/* Basic Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="bg-base-charcoal/50 rounded-2xl p-4 sm:p-5 border border-base-dark-gray h-full flex flex-col"
            >
              <h3 className="text-lg font-bold text-white mb-1">Basic</h3>
              <p className="text-xs text-gray-400 mb-3">Essential features</p>
              <p className="text-2xl font-bold text-white mb-4">$9.99<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-2 mb-4 flex-grow">
                {['Unlimited swipes', 'See who likes you', '5 Super Likes/day', '1 Boost/month'].map((feature) => (
                  <li key={feature} className="flex items-start text-gray-300 text-xs">
                    <svg className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup?tier=basic" className="block w-full text-center border border-pink-500 text-pink-400 py-2 rounded-full text-sm font-semibold hover:bg-pink-500/10 transition-all duration-300">
                Choose Basic
              </Link>
            </motion.div>

            {/* Plus Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative bg-base-charcoal/50 rounded-2xl p-4 sm:p-5 border border-green-500/50 h-full flex flex-col"
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">BEST VALUE</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Plus</h3>
              <p className="text-xs text-gray-400 mb-3">Enhanced matching</p>
              <p className="text-2xl font-bold text-white mb-4">$19.99<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-2 mb-4 flex-grow">
                {['All Basic features', 'Advanced filters', 'Read receipts', 'Incognito mode'].map((feature) => (
                  <li key={feature} className="flex items-start text-gray-300 text-xs">
                    <svg className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup?tier=plus" className="block w-full text-center bg-green-500 text-white py-2 rounded-full text-sm font-semibold hover:bg-green-600 transition-all duration-300">
                Choose Plus
              </Link>
            </motion.div>

            {/* Premium Tier - MOST POPULAR */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative bg-gradient-pink-blue rounded-2xl p-4 sm:p-5 transform lg:scale-105 origin-center shadow-glow-pink h-full flex flex-col"
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-bold">MOST POPULAR</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Premium</h3>
              <p className="text-xs text-pink-100 mb-3">Full experience</p>
              <p className="text-2xl font-bold text-white mb-4">$29.99<span className="text-sm font-normal text-pink-100">/mo</span></p>
              <ul className="space-y-2 mb-4 flex-grow">
                {['All Plus features', 'Unlimited Super Likes', 'Video dating', 'AI matchmaking'].map((feature) => (
                  <li key={feature} className="flex items-start text-white text-xs">
                    <svg className="w-4 h-4 text-white mr-1.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup?tier=premium" className="block w-full text-center bg-white text-pink-500 py-2 rounded-full text-sm font-semibold hover:shadow-lg transition-all duration-300">
                Start Free Trial
              </Link>
            </motion.div>

            {/* Premium+ Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-base-charcoal/50 rounded-2xl p-4 sm:p-5 border border-base-dark-gray h-full flex flex-col"
            >
              <h3 className="text-lg font-bold text-white mb-1">Premium+</h3>
              <p className="text-xs text-gray-400 mb-3">Priority access</p>
              <p className="text-2xl font-bold text-white mb-4">$39.99<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-2 mb-4 flex-grow">
                {['All Premium features', 'Passport (travel)', 'Message before match', 'Priority support'].map((feature) => (
                  <li key={feature} className="flex items-start text-gray-300 text-xs">
                    <svg className="w-4 h-4 text-green-500 mr-1.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup?tier=premium_plus" className="block w-full text-center border border-pink-500 text-pink-400 py-2 rounded-full text-sm font-semibold hover:bg-pink-500/10 transition-all duration-300">
                Choose Premium+
              </Link>
            </motion.div>

            {/* Elite Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="bg-gradient-to-br from-yellow-600/20 to-yellow-400/10 rounded-2xl p-4 sm:p-5 border border-yellow-500/50 h-full flex flex-col"
            >
              <div className="flex items-center gap-1 mb-1">
                <h3 className="text-lg font-bold text-white">Elite</h3>
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <p className="text-xs text-gray-400 mb-3">White glove service</p>
              <p className="text-2xl font-bold text-white mb-4">$59.99<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-2 mb-4 flex-grow">
                {['All Premium+ features', 'VIP badge', 'Dedicated coach', 'Background verified'].map((feature) => (
                  <li key={feature} className="flex items-start text-gray-300 text-xs">
                    <svg className="w-4 h-4 text-yellow-400 mr-1.5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup?tier=elite" className="block w-full text-center bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-2 rounded-full text-sm font-semibold hover:shadow-lg transition-all duration-300">
                Go Elite
              </Link>
            </motion.div>
          </div>

          <div className="text-center mt-8">
            <Link to="/subscription" className="text-pink-400 font-semibold hover:text-pink-300 transition-colors">
              View full pricing details →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden w-full">
        <div className="absolute inset-0 bg-gradient-pink-blue opacity-90" />
        <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
        <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 font-heading">Ready to Find Your Match?</h2>
            <p className="text-xl text-pink-100 mb-8">Join millions of singles finding meaningful connections every day</p>
            <Link
              to="/signup"
              className="inline-flex items-center bg-white text-pink-500 px-10 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-pink-500"
              aria-label="Create your free FLAMORAL account"
            >
              Start Matching Free
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <p className="text-pink-100 text-sm mt-4 flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required • Start matching in 60 seconds
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-base-deep-black border-t border-base-dark-gray py-12 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <span className="text-2xl font-bold text-gradient-pink-blue font-heading">FLAMORAL</span>
              <p className="mt-4 text-sm text-gray-400">Finding meaningful connections through intelligent matching.</p>
              <div className="flex space-x-4 mt-6">
                {[
                  { name: 'twitter', url: 'https://twitter.com/flamoralapp', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                  { name: 'instagram', url: 'https://instagram.com/flamoralapp', icon: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                  { name: 'facebook', url: 'https://facebook.com/flamoralapp', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' }
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label={`Follow us on ${social.name}`}
                  >
                    <div className="w-8 h-8 bg-base-dark-gray rounded-full flex items-center justify-center hover:bg-pink-500/20">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d={social.icon} />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                {['About Us', 'Careers', 'Press', 'Contact'].map((item) => (
                  <li key={item}>
                    <Link to={`/${item.toLowerCase().replace(' ', '-')}`} className="text-gray-400 hover:text-white transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                {['Help Center', 'Safety Tips', 'Community', 'Dating Blog'].map((item) => (
                  <li key={item}>
                    <Link to={`/${item.toLowerCase().replace(' ', '-')}`} className="text-gray-400 hover:text-white transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                {[
                  { name: 'Privacy Policy', path: '/privacy-policy' },
                  { name: 'Terms of Service', path: '/terms-of-service' },
                  { name: 'Cookie Policy', path: '/cookie-policy' },
                  { name: 'Community Guidelines', path: '/community-guidelines' },
                  { name: 'Safety Hub', path: '/safety-hub' },
                ].map((item) => (
                  <li key={item.name}>
                    <Link to={item.path} className="text-gray-400 hover:text-white transition-colors">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-base-dark-gray mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
            <p className="text-gray-400">&copy; {new Date().getFullYear()} FLAMORAL. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0 text-gray-400">
              <span>United States</span>
              <span>English</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FuturisticLandingPage;
