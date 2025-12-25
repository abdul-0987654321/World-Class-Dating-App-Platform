import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Color palette - using inline styles since Tailwind 4 color classes aren't processing
const colors = {
  // Primary pinks
  pink50: '#FDF2F8',
  pink100: '#FCE7F3',
  pink200: '#FBCFE8',
  pink400: '#F472B6',
  pink500: '#EC4899',
  pink600: '#DB2777',
  rose500: '#F43F5E',
  rose400: '#FB7185',
  // Purples
  purple50: '#FAF5FF',
  purple200: '#E9D5FF',
  purple400: '#C084FC',
  purple500: '#A855F7',
  indigo500: '#6366F1',
  // Greens
  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green400: '#4ADE80',
  green500: '#22C55E',
  green600: '#16A34A',
  emerald50: '#ECFDF5',
  emerald500: '#10B981',
  // Blues
  blue500: '#3B82F6',
  blue600: '#2563EB',
  // Yellows
  yellow400: '#FACC15',
  yellow900: '#713F12',
  // Grays
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  white: '#FFFFFF',
};

// Gradient backgrounds
const gradients = {
  pinkRose: `linear-gradient(to right, ${colors.pink500}, ${colors.rose500})`,
  pinkRoseBr: `linear-gradient(to bottom right, ${colors.pink500}, ${colors.rose500})`,
  purpleIndigo: `linear-gradient(to bottom right, ${colors.purple500}, ${colors.indigo500})`,
  greenEmerald: `linear-gradient(to bottom right, ${colors.green500}, ${colors.emerald500})`,
  heroBackground: `linear-gradient(to bottom right, ${colors.pink50}, ${colors.pink100}, ${colors.purple50})`,
  sectionPinkPurple: `linear-gradient(to bottom right, ${colors.pink50}, ${colors.purple50})`,
};

// Feature Modal Component
const FeatureModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  feature: {
    title: string;
    description: string;
    details: string[];
    icon: React.ReactNode;
    gradient: string;
  } | null;
}> = ({ isOpen, onClose, feature }) => {
  if (!isOpen || !feature) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={onClose}
      style={{ background: 'rgba(107, 114, 128, 0.75)' }}
    >
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="relative inline-block w-full max-w-2xl p-8 overflow-hidden text-left align-middle transition-all transform shadow-xl rounded-2xl"
          style={{ background: colors.white }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 transition"
            style={{ color: colors.gray400 }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
            style={{ background: feature.gradient, color: colors.white }}
          >
            {feature.icon}
          </div>

          <h3 className="text-2xl font-bold mb-4" style={{ color: colors.gray900 }}>{feature.title}</h3>
          <p className="mb-6" style={{ color: colors.gray600 }}>{feature.description}</p>

          <div className="space-y-4">
            <h4 className="font-semibold" style={{ color: colors.gray900 }}>Key Features:</h4>
            <ul className="space-y-3">
              {feature.details.map((detail, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: colors.green500 }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span style={{ color: colors.gray600 }}>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex space-x-4">
            <Link
              to="/signup"
              className="flex-1 py-3 px-6 rounded-full text-center font-semibold hover:shadow-lg transition"
              style={{ background: gradients.pinkRose, color: colors.white }}
            >
              Get Started Free
            </Link>
            <button
              onClick={onClose}
              className="flex-1 border-2 py-3 px-6 rounded-full font-semibold transition"
              style={{ borderColor: colors.gray300, color: colors.gray700 }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<{
    title: string;
    description: string;
    details: string[];
    icon: React.ReactNode;
    gradient: string;
  } | null>(null);

  const features = [
    {
      title: 'AI-Powered Matching',
      description: 'Our advanced compatibility algorithm learns your preferences to suggest your ideal matches with up to 95% accuracy.',
      details: [
        'Deep learning neural networks analyze 50+ compatibility factors',
        'Personality-based matching using Big Five traits analysis',
        'Interest and lifestyle compatibility scoring',
        'Behavioral pattern recognition for better suggestions',
        'Continuous learning from your swipe patterns and conversations',
        'Top Picks feature highlighting your best daily matches'
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      gradient: gradients.pinkRoseBr
    },
    {
      title: 'Video Dating',
      description: 'Connect face-to-face with HD video calls before meeting in person. Build real connections from anywhere.',
      details: [
        'Crystal-clear HD video and audio powered by Agora',
        'Virtual date rooms with fun backgrounds',
        'Voice messages for when video isn\'t convenient',
        'Call recording for memorable moments (with consent)',
        'Speed dating events with multiple video matches',
        'Screen sharing for watching movies together'
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      gradient: gradients.purpleIndigo
    },
    {
      title: 'Verified Profiles',
      description: 'Every profile is photo-verified by AI. No catfishing, no bots - just real people looking for real connections.',
      details: [
        'Selfie verification matches your profile photos',
        'AI-powered fraud and fake profile detection',
        'Manual review by our safety team for edge cases',
        'Verified badge displayed on confirmed profiles',
        'Background check integration available (Premium)',
        'Real-time scam and bot detection algorithms'
      ],
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      gradient: gradients.greenEmerald
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Create Your Profile',
      description: 'Sign up in minutes. Add photos, write your bio, and let our AI help you showcase your best self.',
      icon: '👤'
    },
    {
      step: 2,
      title: 'Discover Matches',
      description: 'Our AI analyzes compatibility across 50+ factors to show you the most compatible people near you.',
      icon: '💡'
    },
    {
      step: 3,
      title: 'Start Conversations',
      description: 'Like someone? Send a message or use our AI-powered icebreakers to start meaningful conversations.',
      icon: '💬'
    },
    {
      step: 4,
      title: 'Connect Deeper',
      description: 'Video chat, send voice messages, and build real connections before meeting in person.',
      icon: '❤️'
    }
  ];

  const successStories = [
    {
      names: 'Sarah & Michael',
      time: 'Matched 2 years ago',
      quote: '"We matched on Flamoral and instantly connected over our love for hiking. Now we\'re engaged and planning our wedding!"',
      gradient: `linear-gradient(to bottom right, ${colors.pink400}, ${colors.rose500})`,
      initial: 'S'
    },
    {
      names: 'James & Emma',
      time: 'Matched 1 year ago',
      quote: '"The video dating feature helped us build a real connection before meeting. Best decision I ever made!"',
      gradient: `linear-gradient(to bottom right, ${colors.purple400}, ${colors.indigo500})`,
      initial: 'J'
    },
    {
      names: 'Alex & Jordan',
      time: 'Matched 6 months ago',
      quote: '"After trying other apps, Flamoral\'s AI matching was spot on. We had a 94% compatibility score and it was accurate!"',
      gradient: `linear-gradient(to bottom right, ${colors.green400}, ${colors.emerald500})`,
      initial: 'A'
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: gradients.heroBackground }}>
      {/* Feature Modal */}
      <FeatureModal
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        feature={selectedFeature}
      />

      {/* Navigation */}
      <nav
        className="fixed top-0 w-full backdrop-blur-md z-40 border-b"
        style={{ background: 'rgba(255, 255, 255, 0.8)', borderColor: colors.gray100 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link
                to="/"
                className="text-2xl font-bold"
                style={{
                  background: gradients.pinkRose,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                Flamoral
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="transition" style={{ color: colors.gray600 }}>Features</a>
              <a href="#how-it-works" className="transition" style={{ color: colors.gray600 }}>How It Works</a>
              <a href="#safety" className="transition" style={{ color: colors.gray600 }}>Safety</a>
              <a href="#success" className="transition" style={{ color: colors.gray600 }}>Success Stories</a>
              <Link to="/subscription" className="transition" style={{ color: colors.gray600 }}>Pricing</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="font-medium transition"
                style={{ color: colors.gray700 }}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-6 py-2 rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
                style={{ background: gradients.pinkRose, color: colors.white }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight" style={{ color: colors.gray900 }}>
                Find Your Perfect
                <span
                  className="block"
                  style={{
                    background: gradients.pinkRose,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Connection
                </span>
              </h1>
              <p className="text-xl leading-relaxed" style={{ color: colors.gray600 }}>
                Join millions who have found meaningful relationships through our AI-powered matching.
                Real people, real connections, real love.
              </p>

              {/* Trust Signals */}
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: colors.gray500 }}>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" style={{ color: colors.green500 }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Photo Verified</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" style={{ color: colors.green500 }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" style={{ color: colors.green500 }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span>2M+ Members</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/signup"
                  className="flex items-center justify-center px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
                  style={{ background: gradients.pinkRose, color: colors.white }}
                >
                  Start Free Today
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="#how-it-works"
                  className="flex items-center justify-center border-2 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-200"
                  style={{ borderColor: colors.pink500, color: colors.pink500 }}
                >
                  See How It Works
                </a>
              </div>

              {/* Social Proof */}
              <div className="pt-6 border-t" style={{ borderColor: colors.gray200 }}>
                <div className="flex items-center space-x-4">
                  <div className="flex -space-x-2">
                    {['A', 'S', 'M', 'J', 'K'].map((letter, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium"
                        style={{
                          background: `linear-gradient(to bottom right, ${colors.pink400}, ${colors.rose400})`,
                          borderColor: colors.white,
                          color: colors.white
                        }}
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex mb-1" style={{ color: colors.yellow400 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm" style={{ color: colors.gray600 }}>Rated 4.8/5 by 50,000+ users</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div
                className="absolute -top-10 -left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"
                style={{ background: colors.pink200 }}
              />
              <div
                className="absolute -bottom-10 -right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"
                style={{ background: colors.purple200, animationDelay: '2s' }}
              />
              <div
                className="relative rounded-3xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500"
                style={{ background: colors.white }}
              >
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                      style={{ background: `linear-gradient(to bottom right, ${colors.pink400}, ${colors.rose500})`, color: colors.white }}
                    >
                      E
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: colors.gray900 }}>Emma, 28</h3>
                      <div className="flex items-center text-sm" style={{ color: colors.green500 }}>
                        <span className="w-2 h-2 rounded-full mr-2" style={{ background: colors.green500 }} />
                        Verified Profile
                      </div>
                    </div>
                    <div className="ml-auto">
                      <span
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ background: colors.pink100, color: colors.pink600 }}
                      >
                        95% Match
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Adventure', 'Photography', 'Travel'].map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{ background: colors.gray100, color: colors.gray600 }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="italic" style={{ color: colors.gray600 }}>
                    "Looking for someone who loves spontaneous adventures and meaningful conversations..."
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      className="w-14 h-14 rounded-full flex items-center justify-center transition"
                      style={{ background: colors.gray100, color: colors.gray400 }}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all"
                      style={{ background: gradients.pinkRose, color: colors.white }}
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      className="w-14 h-14 rounded-full flex items-center justify-center transition"
                      style={{ background: colors.blue500, color: colors.white }}
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20" style={{ background: colors.white }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: colors.gray900 }}>Why Choose Flamoral?</h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: colors.gray600 }}>
              Intelligent matching powered by AI, designed for genuine connections
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <button
                key={index}
                onClick={() => setSelectedFeature(feature)}
                className="text-left rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2"
                style={{
                  background: `linear-gradient(to bottom right, ${colors.gray50}, ${colors.gray100})`,
                  borderColor: 'transparent'
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: feature.gradient, color: colors.white }}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: colors.gray900 }}>{feature.title}</h3>
                <p className="mb-4" style={{ color: colors.gray600 }}>{feature.description}</p>
                <span className="font-medium inline-flex items-center" style={{ color: colors.pink500 }}>
                  Learn more
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            ))}
          </div>

          {/* Additional Features Grid */}
          <div className="mt-16 grid md:grid-cols-4 gap-6">
            {[
              { icon: '🎯', title: 'Smart Filters', desc: 'Filter by lifestyle, interests, values' },
              { icon: '⚡', title: 'Super Likes', desc: 'Stand out from the crowd' },
              { icon: '🔥', title: 'Profile Boosts', desc: 'Get 10x more visibility' },
              { icon: '💬', title: 'AI Icebreakers', desc: 'Never run out of conversation starters' }
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-xl p-6 text-center transition"
                style={{ background: colors.gray50 }}
              >
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h4 className="font-semibold mb-1" style={{ color: colors.gray900 }}>{item.title}</h4>
                <p className="text-sm" style={{ color: colors.gray600 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20" style={{ background: gradients.sectionPinkPurple }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: colors.gray900 }}>How Flamoral Works</h2>
            <p className="text-xl max-w-2xl mx-auto" style={{ color: colors.gray600 }}>
              Finding love has never been easier. Get started in just 4 simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                {index < howItWorks.length - 1 && (
                  <div
                    className="hidden md:block absolute top-12 left-full w-full h-0.5 -translate-x-4"
                    style={{ background: colors.pink200 }}
                  />
                )}
                <div
                  className="rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition"
                  style={{ background: colors.white }}
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6"
                    style={{ background: gradients.pinkRose, color: colors.white }}
                  >
                    {step.step}
                  </div>
                  <span className="text-4xl mb-4 block">{step.icon}</span>
                  <h3 className="text-xl font-semibold mb-3" style={{ color: colors.gray900 }}>{step.title}</h3>
                  <p style={{ color: colors.gray600 }}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/signup"
              className="inline-flex items-center px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
              style={{ background: gradients.pinkRose, color: colors.white }}
            >
              Get Started Now - It's Free
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="py-20" style={{ background: colors.white }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6" style={{ color: colors.gray900 }}>Your Safety is Our Priority</h2>
              <p className="text-lg mb-8" style={{ color: colors.gray600 }}>
                We've built multiple layers of protection to ensure you have a safe and positive experience.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'AI Fraud Detection', desc: 'Advanced machine learning detects and removes fake profiles, scammers, and suspicious behavior in real-time.', icon: '🛡️' },
                  { title: '24/7 Moderation', desc: 'Our dedicated safety team reviews reports around the clock to maintain a respectful community.', icon: '👁️' },
                  { title: 'Privacy First', desc: 'Your data is encrypted end-to-end and never sold. You control who sees your profile and information.', icon: '🔒' },
                  { title: 'Block & Report', desc: 'Easy one-tap blocking and reporting. We take immediate action on policy violations.', icon: '🚫' }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="font-semibold" style={{ color: colors.gray900 }}>{item.title}</h4>
                      <p style={{ color: colors.gray600 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/safety"
                className="inline-flex items-center font-semibold mt-8"
                style={{ color: colors.pink500 }}
              >
                Visit Safety Center
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div
              className="rounded-2xl p-8 shadow-xl"
              style={{ background: `linear-gradient(to bottom right, ${colors.green50}, ${colors.emerald50})` }}
            >
              <div className="text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ background: colors.green100 }}
                >
                  <svg className="w-10 h-10" style={{ color: colors.green600 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: colors.gray900 }}>Safety Statistics</h3>
                <div className="grid grid-cols-2 gap-6 mt-8">
                  {[
                    { value: '99.2%', label: 'Fake profiles caught' },
                    { value: '<1hr', label: 'Avg. report response' },
                    { value: '24/7', label: 'Live moderation' },
                    { value: 'AES-256', label: 'Encryption standard' }
                  ].map((stat, i) => (
                    <div key={i}>
                      <p className="text-3xl font-bold" style={{ color: colors.green600 }}>{stat.value}</p>
                      <p className="text-sm" style={{ color: colors.gray600 }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section id="success" className="py-20" style={{ background: colors.gray50 }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: colors.gray900 }}>Real Success Stories</h2>
            <p className="text-xl" style={{ color: colors.gray600 }}>Thousands have found their perfect match on Flamoral</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {successStories.map((story, index) => (
              <div
                key={index}
                className="rounded-2xl p-8 shadow-lg hover:shadow-xl transition"
                style={{ background: colors.white }}
              >
                <div className="flex items-center space-x-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{ background: story.gradient, color: colors.white }}
                  >
                    {story.initial}
                  </div>
                  <div>
                    <h4 className="font-semibold" style={{ color: colors.gray900 }}>{story.names}</h4>
                    <p className="text-sm" style={{ color: colors.gray500 }}>{story.time}</p>
                  </div>
                </div>
                <p className="italic mb-4" style={{ color: colors.gray600 }}>{story.quote}</p>
                <div className="flex" style={{ color: colors.pink500 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="mb-4" style={{ color: colors.gray600 }}>Join 2M+ members finding love every day</p>
            <Link to="/signup" className="inline-flex items-center font-semibold" style={{ color: colors.pink500 }}>
              Start Your Success Story
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20" style={{ background: colors.white }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ color: colors.gray900 }}>Simple, Transparent Pricing</h2>
            <p className="text-xl" style={{ color: colors.gray600 }}>Start free, upgrade when you're ready</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div
              className="rounded-2xl p-8 border-2"
              style={{ background: colors.gray50, borderColor: colors.gray200 }}
            >
              <h3 className="text-xl font-bold mb-2" style={{ color: colors.gray900 }}>Free</h3>
              <p className="mb-4" style={{ color: colors.gray600 }}>Get started with the basics</p>
              <p className="text-4xl font-bold mb-6" style={{ color: colors.gray900 }}>
                $0<span className="text-lg font-normal" style={{ color: colors.gray500 }}>/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['Limited daily swipes', 'Basic filters', 'Send messages', 'Photo verification'].map((feature) => (
                  <li key={feature} className="flex items-center" style={{ color: colors.gray600 }}>
                    <svg className="w-5 h-5 mr-2" style={{ color: colors.green500 }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="block w-full text-center border-2 py-3 rounded-full font-semibold transition"
                style={{ borderColor: colors.pink500, color: colors.pink500 }}
              >
                Get Started
              </Link>
            </div>

            {/* Premium Plan */}
            <div
              className="rounded-2xl p-8 transform scale-105 shadow-xl relative"
              style={{ background: gradients.pinkRoseBr, color: colors.white }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: colors.yellow400, color: colors.yellow900 }}
                >
                  MOST POPULAR
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2">Premium</h3>
              <p className="mb-4" style={{ color: colors.pink100 }}>Unlock the full experience</p>
              <p className="text-4xl font-bold mb-6">
                $19.99<span className="text-lg font-normal" style={{ color: colors.pink100 }}>/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['Unlimited swipes', 'See who likes you', 'Super Likes included', 'Advanced filters', 'Read receipts', 'Priority support'].map((feature) => (
                  <li key={feature} className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="block w-full text-center py-3 rounded-full font-semibold hover:shadow-lg transition"
                style={{ background: colors.white, color: colors.pink500 }}
              >
                Start Free Trial
              </Link>
            </div>

            {/* Platinum Plan */}
            <div
              className="rounded-2xl p-8 border-2"
              style={{ background: colors.gray50, borderColor: colors.gray200 }}
            >
              <h3 className="text-xl font-bold mb-2" style={{ color: colors.gray900 }}>Platinum</h3>
              <p className="mb-4" style={{ color: colors.gray600 }}>For serious daters</p>
              <p className="text-4xl font-bold mb-6" style={{ color: colors.gray900 }}>
                $34.99<span className="text-lg font-normal" style={{ color: colors.gray500 }}>/mo</span>
              </p>
              <ul className="space-y-3 mb-8">
                {['Everything in Premium', 'Weekly Boost included', 'Top Picks daily', 'Video dating', 'AI conversation coach', 'Profile insights'].map((feature) => (
                  <li key={feature} className="flex items-center" style={{ color: colors.gray600 }}>
                    <svg className="w-5 h-5 mr-2" style={{ color: colors.green500 }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="block w-full text-center border-2 py-3 rounded-full font-semibold transition"
                style={{ borderColor: colors.pink500, color: colors.pink500 }}
              >
                Get Started
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/subscription" className="font-semibold" style={{ color: colors.pink500 }}>
              View full pricing details →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20" style={{ background: gradients.pinkRose }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6" style={{ color: colors.white }}>Ready to Find Your Match?</h2>
          <p className="text-xl mb-8" style={{ color: colors.pink100 }}>Join millions of singles finding meaningful connections every day</p>
          <Link
            to="/signup"
            className="inline-flex items-center px-10 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
            style={{ background: colors.white, color: colors.pink500 }}
          >
            Create Free Account
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-sm mt-4" style={{ color: colors.pink100 }}>No credit card required. Start matching in minutes.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{ background: colors.gray900, color: colors.gray400 }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <span className="text-2xl font-bold" style={{ color: colors.white }}>Flamoral</span>
              <p className="mt-4 text-sm">Finding meaningful connections through intelligent matching.</p>
              <div className="flex space-x-4 mt-6">
                {['twitter', 'instagram', 'facebook'].map((social) => (
                  <a key={social} href="#" className="transition" style={{ color: colors.gray400 }}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      {social === 'twitter' && <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>}
                      {social === 'instagram' && <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>}
                      {social === 'facebook' && <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>}
                    </svg>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: colors.white }}>Company</h4>
              <ul className="space-y-2 text-sm">
                {[{ to: '/about', label: 'About Us' }, { to: '/careers', label: 'Careers' }, { to: '/press', label: 'Press' }, { to: '/contact', label: 'Contact' }].map(link => (
                  <li key={link.to}><Link to={link.to} className="transition">{link.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: colors.white }}>Resources</h4>
              <ul className="space-y-2 text-sm">
                {[{ to: '/help', label: 'Help Center' }, { to: '/safety', label: 'Safety Tips' }, { to: '/communities', label: 'Community' }, { to: '/tier-showcase', label: 'Dating Tips Blog' }].map(link => (
                  <li key={link.to}><Link to={link.to} className="transition">{link.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: colors.white }}>Legal</h4>
              <ul className="space-y-2 text-sm">
                {[{ to: '/privacy-policy', label: 'Privacy Policy' }, { to: '/terms-of-service', label: 'Terms of Service' }, { to: '/cookie-policy', label: 'Cookie Policy' }, { to: '/community-guidelines', label: 'Community Guidelines' }].map(link => (
                  <li key={link.to}><Link to={link.to} className="transition">{link.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div
            className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm"
            style={{ borderColor: colors.gray800 }}
          >
            <p>&copy; {new Date().getFullYear()} Flamoral. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <span>🇺🇸 United States</span>
              <span>English</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
