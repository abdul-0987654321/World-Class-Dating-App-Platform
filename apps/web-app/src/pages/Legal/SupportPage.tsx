import React from 'react';
import { Link } from 'react-router-dom';

export const SupportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Flamoral Support</h1>
          <p className="text-gray-300 text-lg">We're here to help you with any questions or concerns</p>
        </div>

        {/* Contact Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-xl font-semibold text-white mb-2">Email Support</h2>
            <p className="text-gray-300 mb-4">Get help via email within 24 hours</p>
            <a
              href="mailto:support@flamoral.com"
              className="text-pink-400 hover:text-pink-300 font-medium"
            >
              support@flamoral.com
            </a>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <div className="text-4xl mb-4">💬</div>
            <h2 className="text-xl font-semibold text-white mb-2">In-App Support</h2>
            <p className="text-gray-300 mb-4">Chat with our support team directly in the app</p>
            <span className="text-gray-400">Available in Settings → Help</span>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">How do I reset my password?</h3>
              <p className="text-gray-300">Go to the login page and click "Forgot Password". Enter your email address and we'll send you a link to reset your password.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">How do I delete my account?</h3>
              <p className="text-gray-300">Go to Settings → Account → Delete Account. Please note this action is permanent and cannot be undone.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">How do I verify my profile?</h3>
              <p className="text-gray-300">Go to Safety Center → Verification. You can verify your profile by uploading a selfie or linking your social media accounts.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">How do I report a user?</h3>
              <p className="text-gray-300">Open the user's profile, tap the three dots menu, and select "Report". Choose the reason for your report and submit.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">How do I cancel my subscription?</h3>
              <p className="text-gray-300">Go to Settings → Subscription → Manage Subscription. You can cancel your subscription at any time, and you'll retain access until the end of your billing period.</p>
            </div>
          </div>
        </div>

        {/* Safety Resources */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 mb-12">
          <h2 className="text-2xl font-semibold text-white mb-4">Safety Resources</h2>
          <p className="text-gray-300 mb-4">Your safety is our top priority. Here are some helpful resources:</p>
          <ul className="space-y-2">
            <li>
              <Link to="/safety-guidelines" className="text-pink-400 hover:text-pink-300">Safety Guidelines</Link>
            </li>
            <li>
              <Link to="/community-guidelines" className="text-pink-400 hover:text-pink-300">Community Guidelines</Link>
            </li>
            <li>
              <Link to="/privacy-policy" className="text-pink-400 hover:text-pink-300">Privacy Policy</Link>
            </li>
            <li>
              <Link to="/terms-of-service" className="text-pink-400 hover:text-pink-300">Terms of Service</Link>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400">
          <p className="mb-4">Response time: Within 24 hours on business days</p>
          <p>© {new Date().getFullYear()} Flamoral. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
