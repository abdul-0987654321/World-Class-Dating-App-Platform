import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-800 mb-3">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Welcome to Premium! Your subscription is now active and all premium features are unlocked.
        </p>

        {/* Benefits List */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-6 text-white mb-6">
          <h3 className="font-semibold mb-3">You now have access to:</h3>
          <ul className="space-y-2 text-left text-sm">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Unlimited likes and swipes
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              See who liked you
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Advanced filters and preferences
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Profile boosts and priority
            </li>
          </ul>
        </div>

        {/* Receipt Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-600">
          <p>A receipt has been sent to your email.</p>
          <p className="mt-1">You can manage your subscription anytime in Settings.</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/discover')}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition"
          >
            Start Matching
          </button>
          <button
            onClick={() => navigate('/subscription/manage')}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            Manage Subscription
          </button>
        </div>

        {/* Support Link */}
        <p className="mt-6 text-sm text-gray-500">
          Need help?{' '}
          <button onClick={() => navigate('/help')} className="text-pink-500 hover:text-pink-600 font-medium">
            Contact Support
          </button>
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
