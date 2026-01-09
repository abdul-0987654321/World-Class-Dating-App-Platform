import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';
import { authTokenService } from '../../services/auth-token.service';

interface Subscription {
  tier: string;
  status: string;
  startDate: string;
  expiresAt: string;
  autoRenew: boolean;
  price: number;
  currency: string;
  interval: string;
  nextBillingDate?: string;
  canceledAt?: string;
  paymentMethod?: {
    type: string;
    last4: string;
    brand: string;
  };
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  downloadUrl?: string;
}

export const SubscriptionManagePage: React.FC = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = authTokenService.getToken();
      const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };

      // Load subscription
      const subRes = await fetch('/api/subscriptions/status', { headers });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.data);
      }

      // Load invoices
      const invRes = await fetch('/api/subscriptions/invoices', { headers });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.data?.invoices || []);
      }
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const token = authTokenService.getToken();
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        await loadData();
        setShowCancelModal(false);
        alert('Subscription cancelled successfully. You will retain access until the end of your billing period.');
      } else {
        alert('Failed to cancel subscription. Please try again.');
      }
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      const token = authTokenService.getToken();
      const res = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        await loadData();
        alert('Subscription reactivated successfully!');
      } else {
        alert('Failed to reactivate subscription. Please try again.');
      }
    } catch (err) {
      console.error('Failed to reactivate subscription:', err);
      alert('Failed to reactivate subscription. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!subscription || subscription.tier === 'FREE') {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Active Subscription</h2>
            <p className="text-gray-600 mb-6">You don't have an active premium subscription.</p>
            <button
              onClick={() => navigate('/subscription')}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition"
            >
              View Plans
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Manage Subscription</h1>
          <button
            onClick={() => navigate('/subscription')}
            className="text-pink-500 hover:text-pink-600 font-medium"
          >
            View All Plans
          </button>
        </div>

        {/* Current Plan */}
        <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-sm p-6 text-white mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-pink-100 text-sm mb-1">Current Plan</p>
              <h2 className="text-3xl font-bold">{subscription.tier}</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              subscription.status === 'active'
                ? 'bg-green-500/20 text-green-100'
                : subscription.status === 'cancelled'
                ? 'bg-red-500/20 text-red-100'
                : 'bg-yellow-500/20 text-yellow-100'
            }`}>
              {subscription.status === 'active' ? 'Active' : subscription.status === 'cancelled' ? 'Cancelled' : subscription.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-pink-100 text-sm">Price</p>
              <p className="text-xl font-semibold">
                {formatPrice(subscription.price, subscription.currency)}
                <span className="text-sm font-normal text-pink-100">/{subscription.interval}</span>
              </p>
            </div>
            <div>
              <p className="text-pink-100 text-sm">
                {subscription.status === 'cancelled' ? 'Access Until' : 'Next Billing'}
              </p>
              <p className="text-xl font-semibold">
                {formatDate(subscription.nextBillingDate || subscription.expiresAt)}
              </p>
            </div>
          </div>

          {subscription.paymentMethod && (
            <div className="bg-white/10 rounded-lg p-3 mb-4">
              <p className="text-pink-100 text-xs mb-1">Payment Method</p>
              <div className="flex items-center gap-2">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
                <div>
                  <p className="font-medium">{subscription.paymentMethod.brand} •••• {subscription.paymentMethod.last4}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {subscription.status === 'active' && (
              <>
                <button
                  onClick={() => setShowUpdatePaymentModal(true)}
                  className="flex-1 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition font-medium"
                >
                  Update Payment
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 py-2 bg-red-500/50 rounded-lg hover:bg-red-500/70 transition font-medium"
                >
                  Cancel Plan
                </button>
              </>
            )}
            {subscription.status === 'cancelled' && (
              <button
                onClick={handleReactivateSubscription}
                className="flex-1 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition font-medium"
              >
                Reactivate Subscription
              </button>
            )}
          </div>
        </div>

        {/* Plan Benefits */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Benefits</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              'Unlimited likes and swipes',
              'See who liked you',
              'Advanced filters',
              'Unlimited Super Likes',
              'Profile boosts',
              'Read receipts',
              'Incognito mode',
              'Priority support',
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-800">Billing History</h3>
          </div>
          {invoices.length > 0 ? (
            <div className="divide-y">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{invoice.description}</p>
                    <p className="text-sm text-gray-500">{formatDate(invoice.date)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        {formatPrice(invoice.amount, invoice.currency)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : invoice.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    {invoice.downloadUrl && (
                      <a
                        href={invoice.downloadUrl}
                        download
                        className="p-2 text-gray-400 hover:text-pink-500 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No billing history available.</p>
            </div>
          )}
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Cancel Subscription?</h3>
              <p className="text-gray-600 mb-4">
                You'll lose access to all premium features at the end of your billing period on{' '}
                <strong>{formatDate(subscription.expiresAt)}</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  You can reactivate your subscription anytime before it expires to keep your benefits.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={canceling}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium disabled:opacity-50"
              >
                {canceling ? 'Canceling...' : 'Cancel Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Payment Modal */}
      {showUpdatePaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Update Payment Method</h3>
            <p className="text-gray-600 mb-6">
              This feature requires Stripe integration. You will be redirected to a secure payment page.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpdatePaymentModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  window.open('/api/subscriptions/update-payment', '_blank');
                  setShowUpdatePaymentModal(false);
                }}
                className="flex-1 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagePage;
