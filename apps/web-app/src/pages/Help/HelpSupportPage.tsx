import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    category: 'Account',
    question: 'How do I reset my password?',
    answer:
      'Go to the login page and click "Forgot Password". Enter your email address and we\'ll send you a link to reset your password.',
  },
  {
    category: 'Account',
    question: 'How do I delete my account?',
    answer:
      'Go to Settings > Account > Delete Account. Please note this action is permanent and cannot be undone.',
  },
  {
    category: 'Account',
    question: 'How do I verify my profile?',
    answer:
      'Go to Safety Center > Verification. You can verify your profile by uploading a selfie, government ID, or linking your social media accounts.',
  },
  {
    category: 'Matching',
    question: 'How do matches work?',
    answer:
      'When you like someone and they like you back, it\'s a match! You\'ll both be notified and can start chatting.',
  },
  {
    category: 'Matching',
    question: 'What is a Super Like?',
    answer:
      'A Super Like lets someone know you\'re really interested. They\'ll see your profile highlighted and know you Super Liked them.',
  },
  {
    category: 'Matching',
    question: 'Can I undo a swipe?',
    answer: 'Premium members can use the Rewind feature to undo their last swipe. Free users cannot undo swipes.',
  },
  {
    category: 'Subscription',
    question: 'What are the benefits of Premium?',
    answer:
      'Premium members get unlimited likes, see who liked them, Super Likes, Boosts, and more. Check out our subscription page for full details.',
  },
  {
    category: 'Subscription',
    question: 'How do I cancel my subscription?',
    answer:
      'Go to Settings > Account > Manage Subscription. You can cancel anytime, and you\'ll retain access until the end of your billing period.',
  },
  {
    category: 'Safety',
    question: 'How do I report a user?',
    answer:
      'Open the user\'s profile, tap the three dots menu, and select "Report". Choose a reason and provide any additional details.',
  },
  {
    category: 'Safety',
    question: 'How do I block someone?',
    answer:
      'Open the user\'s profile or chat, tap the three dots menu, and select "Block". They won\'t be able to see your profile or contact you.',
  },
];

const categories = ['All', 'Account', 'Matching', 'Subscription', 'Safety'];

export const HelpSupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Profile
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Help & Support</h1>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => navigate('/safety')}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <p className="font-medium text-gray-800 text-sm">Safety Center</p>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-medium text-gray-800 text-sm">Settings</p>
          </button>
          <button
            onClick={() => navigate('/subscription')}
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <p className="font-medium text-gray-800 text-sm">Upgrade</p>
          </button>
          <a
            href="mailto:support@flamoral.com"
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="font-medium text-gray-800 text-sm">Contact Us</p>
          </a>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCategory === category ? 'bg-pink-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <h2 className="text-lg font-semibold text-gray-800 p-4 border-b">Frequently Asked Questions</h2>
          <div className="divide-y">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => (
                <div key={idx} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition"
                  >
                    <div className="flex-1">
                      <span className="text-xs text-pink-500 font-medium mb-1 block">{faq.category}</span>
                      <span className="font-medium text-gray-800">{faq.question}</span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition transform ${expandedFaq === idx ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 pb-4">
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>No FAQs found matching your search.</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
          <h2 className="text-xl font-bold mb-2">Still need help?</h2>
          <p className="mb-4 opacity-90">Our support team is here to help you 24/7.</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:support@flamoral.com"
              className="inline-flex items-center gap-2 bg-white text-pink-500 px-4 py-2 rounded-lg font-medium hover:bg-pink-50 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Email Support
            </a>
            <button className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Live Chat
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HelpSupportPage;
