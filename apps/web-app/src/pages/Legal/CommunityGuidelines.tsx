import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

export const CommunityGuidelines: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Community Guidelines</h1>
          <p className="text-gray-600 mb-8">Last updated: December 2025</p>

          {/* Introduction */}
          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed">
              Welcome to Flamoral! We're building a community where everyone can find meaningful connections in a safe,
              respectful environment. These guidelines help ensure our platform remains a positive space for all users.
            </p>
          </section>

          {/* Our Values */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Core Values</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-pink-50 rounded-lg">
                <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Respect</h3>
                <p className="text-sm text-gray-600">Treat everyone with kindness and dignity</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Safety</h3>
                <p className="text-sm text-gray-600">Prioritize your security and wellbeing</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">Authenticity</h3>
                <p className="text-sm text-gray-600">Be genuine and honest in your interactions</p>
              </div>
            </div>
          </section>

          {/* Guidelines */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Community Guidelines</h2>

            <div className="space-y-6">
              {/* Be Respectful */}
              <div className="border-l-4 border-pink-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">1. Be Respectful and Kind</h3>
                <p className="text-gray-700 mb-2">Treat everyone on Flamoral with respect, regardless of their background, beliefs, or preferences.</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>No harassment, bullying, or hate speech</li>
                  <li>Respect boundaries when someone isn't interested</li>
                  <li>Be mindful of cultural and personal differences</li>
                  <li>Use appropriate language in conversations</li>
                </ul>
              </div>

              {/* Be Authentic */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">2. Be Authentic</h3>
                <p className="text-gray-700 mb-2">Honesty is the foundation of meaningful connections.</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Use real, recent photos of yourself</li>
                  <li>Provide accurate information about yourself</li>
                  <li>Don't impersonate others or use fake identities</li>
                  <li>One person per account</li>
                </ul>
              </div>

              {/* Keep it Safe */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">3. Prioritize Safety</h3>
                <p className="text-gray-700 mb-2">Your safety is our top priority.</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>Don't share personal information too quickly (address, financial details)</li>
                  <li>Meet in public places for first dates</li>
                  <li>Report suspicious behavior immediately</li>
                  <li>Trust your instincts</li>
                </ul>
              </div>

              {/* Appropriate Content */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">4. Share Appropriate Content</h3>
                <p className="text-gray-700 mb-2">Keep Flamoral a comfortable space for everyone.</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>No nudity, sexually explicit content, or solicitation</li>
                  <li>No violent, graphic, or disturbing content</li>
                  <li>No spam or commercial solicitations</li>
                  <li>No promotion of illegal activities</li>
                </ul>
              </div>

              {/* Legal Requirements */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">5. Follow the Law</h3>
                <p className="text-gray-700 mb-2">Comply with all applicable laws and regulations.</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
                  <li>You must be 18 years or older to use Flamoral</li>
                  <li>No illegal activities or promotion thereof</li>
                  <li>Respect intellectual property rights</li>
                  <li>No scams, fraud, or financial crimes</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Prohibited Behavior */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Prohibited Behavior</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-gray-700 mb-4">The following behaviors are strictly prohibited and may result in immediate account suspension or termination:</p>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  'Harassment or bullying',
                  'Hate speech or discrimination',
                  'Sexual harassment',
                  'Sharing intimate images without consent',
                  'Impersonation or catfishing',
                  'Spam or commercial solicitation',
                  'Scams or fraud',
                  'Promoting illegal activities',
                  'Violence or threats',
                  'Underage users',
                  'Account manipulation',
                  'Coordinated inauthentic behavior',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Reporting */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reporting Violations</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                If you encounter behavior that violates these guidelines, please report it immediately. We review all reports and take appropriate action.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate('/safety/report')}
                  className="px-6 py-3 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition"
                >
                  Report a User
                </button>
                <button
                  onClick={() => navigate('/help')}
                  className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition border border-gray-300"
                >
                  Get Help
                </button>
              </div>
            </div>
          </section>

          {/* Consequences */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Consequences of Violations</h2>
            <p className="text-gray-700 mb-4">
              Violations of these guidelines may result in:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
              <li>Warning and account restrictions</li>
              <li>Temporary suspension of account privileges</li>
              <li>Permanent account termination</li>
              <li>Removal from the platform</li>
              <li>Legal action in severe cases</li>
            </ul>
          </section>

          {/* Updates */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Updates to Guidelines</h2>
            <p className="text-gray-700">
              We may update these guidelines from time to time to reflect changes in our community or platform.
              Continued use of Flamoral after updates constitutes acceptance of the new guidelines. We'll notify
              users of significant changes.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Questions or Concerns?</h2>
            <p className="mb-4 opacity-90">
              If you have questions about these guidelines or need to report a serious issue, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@flamoral.com"
                className="px-6 py-3 bg-white text-pink-500 rounded-lg font-medium hover:bg-pink-50 transition text-center"
              >
                Email Support
              </a>
              <button
                onClick={() => navigate('/help')}
                className="px-6 py-3 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition"
              >
                Visit Help Center
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CommunityGuidelines;
