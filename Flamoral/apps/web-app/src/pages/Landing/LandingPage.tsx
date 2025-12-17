import React, { useState } from 'react';
import { Link } from 'react-router-dom';

// Feature Modal Component
const FeatureModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  feature: {
    title: string;
    description: string;
    details: string[];
    icon: React.ReactNode;
    color: string;
  } | null;
}> = ({ isOpen, onClose, feature }) => {
  if (!isOpen || !feature) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
        <div
          className="relative inline-block w-full max-w-2xl p-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className={`w-16 h-16 ${feature.color} rounded-xl flex items-center justify-center text-white mb-6`}>
            {feature.icon}
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
          <p className="text-gray-600 mb-6">{feature.description}</p>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Key Features:</h4>
            <ul className="space-y-3">
              {feature.details.map((detail, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-600">{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex space-x-4">
            <Link
              to="/signup"
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 px-6 rounded-full text-center font-semibold hover:shadow-lg transition"
            >
              Get Started Free
            </Link>
            <button
              onClick={onClose}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-full font-semibold hover:bg-gray-50 transition"
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
    color: string;
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
      color: 'bg-gradient-to-br from-pink-500 to-rose-500'
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
      color: 'bg-gradient-to-br from-purple-500 to-indigo-500'
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
      color: 'bg-gradient-to-br from-green-500 to-emerald-500'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Feature Modal */}
      <FeatureModal
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        feature={selectedFeature}
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                Flamoral
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-pink-500 transition">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-pink-500 transition">How It Works</a>
              <a href="#safety" className="text-gray-600 hover:text-pink-500 transition">Safety</a>
              <a href="#success" className="text-gray-600 hover:text-pink-500 transition">Success Stories</a>
              <Link to="/subscription" className="text-gray-600 hover:text-pink-500 transition">Pricing</Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-pink-500 font-medium transition"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-2 rounded-full font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
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
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-gray-900">
                Find Your Perfect
                <span className="block bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                  Connection
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Join millions who have found meaningful relationships through our AI-powered matching.
                Real people, real connections, real love.
              </p>

              {/* Trust Signals */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Photo Verified</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span>2M+ Members</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/signup"
                  className="flex items-center justify-center bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  Start Free Today
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <a
                  href="#how-it-works"
                  className="flex items-center justify-center border-2 border-pink-500 text-pink-500 px-8 py-4 rounded-full text-lg font-semibold hover:bg-pink-50 transition-all duration-200"
                >
                  See How It Works
                </a>
              </div>

              {/* Social Proof */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 border-2 border-white flex items-center justify-center text-white text-sm font-medium">
                        {['A', 'S', 'M', 'J', 'K'][i-1]}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex text-yellow-400 mb-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">Rated 4.8/5 by 50,000+ users</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
              <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-2xl font-bold">E</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Emma, 28</h3>
                      <div className="flex items-center text-sm text-green-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Verified Profile
                      </div>
                    </div>
                    <div className="ml-auto">
                      <span className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-sm font-medium">95% Match</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">Adventure</span>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">Photography</span>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">Travel</span>
                  </div>
                  <p className="text-gray-600 italic">"Looking for someone who loves spontaneous adventures and meaningful conversations..."</p>
                  <div className="flex justify-center space-x-4">
                    <button className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-600 transition">
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
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Flamoral?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Intelligent matching powered by AI, designed for genuine connections
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <button
                key={index}
                onClick={() => setSelectedFeature(feature)}
                className="text-left bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2 border-transparent hover:border-pink-200"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center text-white mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <span className="text-pink-500 font-medium inline-flex items-center">
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
              <div key={index} className="bg-gray-50 rounded-xl p-6 text-center hover:bg-gray-100 transition">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How Flamoral Works</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Finding love has never been easier. Get started in just 4 simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-pink-200 -translate-x-4" />
                )}
                <div className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition">
                  <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                    {step.step}
                  </div>
                  <span className="text-4xl mb-4 block">{step.icon}</span>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/signup"
              className="inline-flex items-center bg-gradient-to-r from-pink-500 to-rose-500 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
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
      <section id="safety" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Your Safety is Our Priority</h2>
              <p className="text-lg text-gray-600 mb-8">
                We've built multiple layers of protection to ensure you have a safe and positive experience.
              </p>
              <div className="space-y-6">
                {[
                  {
                    title: 'AI Fraud Detection',
                    desc: 'Advanced machine learning detects and removes fake profiles, scammers, and suspicious behavior in real-time.',
                    icon: '🛡️'
                  },
                  {
                    title: '24/7 Moderation',
                    desc: 'Our dedicated safety team reviews reports around the clock to maintain a respectful community.',
                    icon: '👁️'
                  },
                  {
                    title: 'Privacy First',
                    desc: 'Your data is encrypted end-to-end and never sold. You control who sees your profile and information.',
                    icon: '🔒'
                  },
                  {
                    title: 'Block & Report',
                    desc: 'Easy one-tap blocking and reporting. We take immediate action on policy violations.',
                    icon: '🚫'
                  }
                ].map((item, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/safety"
                className="inline-flex items-center text-pink-500 font-semibold mt-8 hover:text-pink-600"
              >
                Visit Safety Center
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 shadow-xl">
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Safety Statistics</h3>
                <div className="grid grid-cols-2 gap-6 mt-8">
                  <div>
                    <p className="text-3xl font-bold text-green-600">99.2%</p>
                    <p className="text-sm text-gray-600">Fake profiles caught</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600">&lt;1hr</p>
                    <p className="text-sm text-gray-600">Avg. report response</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600">24/7</p>
                    <p className="text-sm text-gray-600">Live moderation</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-600">AES-256</p>
                    <p className="text-sm text-gray-600">Encryption standard</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section id="success" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Real Success Stories</h2>
            <p className="text-xl text-gray-600">Thousands have found their perfect match on Flamoral</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                names: 'Sarah & Michael',
                time: 'Matched 2 years ago',
                quote: '"We matched on Flamoral and instantly connected over our love for hiking. Now we\'re engaged and planning our wedding!"',
                color: 'from-pink-400 to-rose-500',
                initial: 'S'
              },
              {
                names: 'James & Emma',
                time: 'Matched 1 year ago',
                quote: '"The video dating feature helped us build a real connection before meeting. Best decision I ever made!"',
                color: 'from-purple-400 to-indigo-500',
                initial: 'J'
              },
              {
                names: 'Alex & Jordan',
                time: 'Matched 6 months ago',
                quote: '"After trying other apps, Flamoral\'s AI matching was spot on. We had a 94% compatibility score and it was accurate!"',
                color: 'from-green-400 to-emerald-500',
                initial: 'A'
              }
            ].map((story, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition">
                <div className="flex items-center space-x-4 mb-6">
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${story.color} flex items-center justify-center text-white text-xl font-bold`}>
                    {story.initial}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{story.names}</h4>
                    <p className="text-sm text-gray-500">{story.time}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic mb-4">{story.quote}</p>
                <div className="flex text-pink-500">
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
            <p className="text-gray-600 mb-4">Join 2M+ members finding love every day</p>
            <Link
              to="/signup"
              className="inline-flex items-center text-pink-500 font-semibold hover:text-pink-600"
            >
              Start Your Success Story
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Start free, upgrade when you're ready</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-8 border-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
              <p className="text-gray-600 mb-4">Get started with the basics</p>
              <p className="text-4xl font-bold text-gray-900 mb-6">$0<span className="text-lg font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-3 mb-8">
                {['Limited daily swipes', 'Basic filters', 'Send messages', 'Photo verification'].map((feature) => (
                  <li key={feature} className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="block w-full text-center border-2 border-pink-500 text-pink-500 py-3 rounded-full font-semibold hover:bg-pink-50 transition">
                Get Started
              </Link>
            </div>

            <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl p-8 text-white transform scale-105 shadow-xl">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">MOST POPULAR</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Premium</h3>
              <p className="text-pink-100 mb-4">Unlock the full experience</p>
              <p className="text-4xl font-bold mb-6">$19.99<span className="text-lg font-normal text-pink-100">/mo</span></p>
              <ul className="space-y-3 mb-8">
                {['Unlimited swipes', 'See who likes you', 'Super Likes included', 'Advanced filters', 'Read receipts', 'Priority support'].map((feature) => (
                  <li key={feature} className="flex items-center">
                    <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="block w-full text-center bg-white text-pink-500 py-3 rounded-full font-semibold hover:shadow-lg transition">
                Start Free Trial
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border-2 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Platinum</h3>
              <p className="text-gray-600 mb-4">For serious daters</p>
              <p className="text-4xl font-bold text-gray-900 mb-6">$34.99<span className="text-lg font-normal text-gray-500">/mo</span></p>
              <ul className="space-y-3 mb-8">
                {['Everything in Premium', 'Weekly Boost included', 'Top Picks daily', 'Video dating', 'AI conversation coach', 'Profile insights'].map((feature) => (
                  <li key={feature} className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="block w-full text-center border-2 border-pink-500 text-pink-500 py-3 rounded-full font-semibold hover:bg-pink-50 transition">
                Get Started
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/subscription" className="text-pink-500 font-semibold hover:text-pink-600">
              View full pricing details →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-pink-500 to-rose-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Find Your Match?</h2>
          <p className="text-xl text-pink-100 mb-8">Join millions of singles finding meaningful connections every day</p>
          <Link
            to="/signup"
            className="inline-flex items-center bg-white text-pink-500 px-10 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            Create Free Account
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-pink-100 text-sm mt-4">No credit card required. Start matching in minutes.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <span className="text-2xl font-bold text-white">Flamoral</span>
              <p className="mt-4 text-sm">Finding meaningful connections through intelligent matching.</p>
              <div className="flex space-x-4 mt-6">
                <a href="#" className="text-gray-400 hover:text-white transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
                <li><Link to="/careers" className="hover:text-white transition">Careers</Link></li>
                <li><Link to="/press" className="hover:text-white transition">Press</Link></li>
                <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/help" className="hover:text-white transition">Help Center</Link></li>
                <li><Link to="/safety" className="hover:text-white transition">Safety Tips</Link></li>
                <li><Link to="/communities" className="hover:text-white transition">Community</Link></li>
                <li><Link to="/tier-showcase" className="hover:text-white transition">Dating Tips Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link to="/cookie-policy" className="hover:text-white transition">Cookie Policy</Link></li>
                <li><Link to="/community-guidelines" className="hover:text-white transition">Community Guidelines</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
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
