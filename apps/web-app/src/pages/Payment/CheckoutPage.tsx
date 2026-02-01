import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';
import { FlamoralBackground } from '../../components/theme';
import { apiClient } from '../../services/api.client';
import { SUBSCRIPTION_ENDPOINTS, PAYMENT_ENDPOINTS } from '../../config/api.config';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  currency: string;
}

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'mobile'>('card');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    if (!planId) {
      navigate('/subscription');
      return;
    }

    try {
      const data = await apiClient.get<{ data: Plan }>(`${SUBSCRIPTION_ENDPOINTS.PLANS}/${planId}`);
      setPlan(data.data);
    } catch (err) {
      console.error('Failed to load plan:', err);
      navigate('/subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError(null);
    try {
      await apiClient.post(`${PAYMENT_ENDPOINTS.BASE}/validate-promo`, { code: promoCode });
      setPromoApplied(true);
    } catch (err) {
      setPromoError('Invalid or expired promo code.');
      setPromoApplied(false);
    }
  };

  const handleCheckout = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await apiClient.postIdempotent<{ data: { checkoutUrl: string } }>(
        `${PAYMENT_ENDPOINTS.BASE}/create-checkout-session`,
        {
          planId: plan?.id,
          promoCode: promoCode || undefined,
        }
      );

      // Redirect to Stripe Checkout
      window.location.href = response.data.checkoutUrl;
    } catch (err) {
      console.error('Checkout failed:', err);
      setError('Failed to initiate checkout. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'card') {
      await handleCheckout();
    } else if (paymentMethod === 'paypal') {
      // PayPal flow - redirect to PayPal checkout session
      setProcessing(true);
      setError(null);
      try {
        const response = await apiClient.postIdempotent<{ data: { checkoutUrl: string } }>(
          `${PAYMENT_ENDPOINTS.BASE}/create-checkout-session`,
          {
            planId: plan?.id,
            promoCode: promoCode || undefined,
            paymentMethod: 'paypal',
          }
        );
        window.location.href = response.data.checkoutUrl;
      } catch (err) {
        console.error('PayPal checkout failed:', err);
        setError('Failed to initiate PayPal checkout. Please try again.');
      } finally {
        setProcessing(false);
      }
    }
  };

  if (loading) {
    return (
      <FlamoralBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fm-pink"></div>
        </div>
      </FlamoralBackground>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <FlamoralBackground>
      <div className="min-h-screen">
        <Navigation />

        <main className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/subscription')}
            className="flex items-center gap-2 text-fm-text-secondary hover:text-fm-text-primary mb-6 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Plans
          </button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Payment Form */}
            <div className="lg:col-span-2">
              <div className="bg-fm-surface/80 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h2 className="text-2xl font-bold text-fm-text-primary mb-6">Payment Details</h2>

                {error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Payment Method Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-fm-text-secondary mb-3">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-4 border-2 rounded-lg transition ${
                          paymentMethod === 'card'
                            ? 'border-fm-pink bg-fm-pink/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <svg
                          className="w-8 h-8 mx-auto mb-2 text-fm-text-primary"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                        </svg>
                        <p className="text-sm font-medium text-fm-text-primary">Card</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('paypal')}
                        className={`p-4 border-2 rounded-lg transition ${
                          paymentMethod === 'paypal'
                            ? 'border-fm-pink bg-fm-pink/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <svg
                          className="w-8 h-8 mx-auto mb-2 text-fm-text-primary"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8.32 21.97a.546.546 0 01-.26-.32c-.03-.15-.01-.3.04-.43l2.36-9.6c.04-.15.12-.28.23-.38.11-.1.25-.15.39-.15h4.45c.75 0 1.43-.14 2.03-.42.6-.28 1.08-.68 1.45-1.19.37-.51.55-1.11.55-1.79 0-.52-.13-.98-.38-1.37-.25-.39-.59-.69-1.02-.9-.43-.21-.91-.31-1.43-.31H9.39c-.14 0-.27.05-.38.15-.11.1-.19.23-.23.38L6.42 15.2c-.04.13-.06.28-.04.43.02.15.08.29.19.4.11.11.25.17.4.17h2.83c.14 0 .27-.05.38-.15.11-.1.19-.23.23-.38l.91-3.7zm6.82-11.39c.32 0 .59.1.81.29.22.19.33.45.33.78 0 .33-.11.59-.33.78-.22.19-.49.29-.81.29h-2.91l.73-2.14h2.18z" />
                        </svg>
                        <p className="text-sm font-medium text-fm-text-primary">PayPal</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('mobile')}
                        className={`p-4 border-2 rounded-lg transition ${
                          paymentMethod === 'mobile'
                            ? 'border-fm-pink bg-fm-pink/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <svg
                          className="w-8 h-8 mx-auto mb-2 text-fm-text-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-sm font-medium text-fm-text-primary">Mobile</p>
                      </button>
                    </div>
                  </div>

                  {/* Card - Stripe Checkout redirect message */}
                  {paymentMethod === 'card' && (
                    <div className="mb-6 p-4 bg-fm-blue/10 border border-fm-blue/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-fm-blue flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-fm-blue">
                            Secure Stripe Checkout
                          </p>
                          <p className="text-xs text-fm-blue/70 mt-1">
                            You will be redirected to Stripe's secure checkout page to enter your card details. Your payment information is never stored on our servers.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PayPal */}
                  {paymentMethod === 'paypal' && (
                    <div className="mb-6 p-4 bg-fm-blue/10 border border-fm-blue/30 rounded-lg">
                      <p className="text-sm text-fm-blue">
                        You will be redirected to PayPal to complete your payment securely.
                      </p>
                    </div>
                  )}

                  {/* Mobile Payment */}
                  {paymentMethod === 'mobile' && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-sm text-green-400 mb-3">
                        Choose your mobile payment provider:
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled
                          className="p-3 bg-fm-surface border border-white/10 rounded-lg opacity-60 cursor-not-allowed"
                        >
                          <p className="font-medium text-fm-text-primary">Paystack</p>
                          <p className="text-xs text-fm-text-secondary">Coming Soon</p>
                        </button>
                        <button
                          type="button"
                          disabled
                          className="p-3 bg-fm-surface border border-white/10 rounded-lg opacity-60 cursor-not-allowed"
                        >
                          <p className="font-medium text-fm-text-primary">Flutterwave</p>
                          <p className="text-xs text-fm-text-secondary">Coming Soon</p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Promo Code */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-fm-text-secondary mb-2">
                      Promo Code
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoApplied(false);
                          setPromoError(null);
                        }}
                        placeholder="Enter promo code"
                        className="flex-1 px-4 py-3 bg-fm-surface border border-white/10 rounded-lg text-fm-text-primary placeholder-fm-text-secondary/50 focus:ring-2 focus:ring-fm-pink focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim() || promoApplied}
                        className="px-6 py-3 bg-fm-surface border border-white/10 rounded-lg text-fm-text-primary hover:border-fm-pink transition disabled:opacity-50"
                      >
                        {promoApplied ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                    {promoApplied && (
                      <p className="mt-2 text-sm text-green-400">Promo code applied successfully!</p>
                    )}
                    {promoError && (
                      <p className="mt-2 text-sm text-red-400">{promoError}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={processing || paymentMethod === 'mobile'}
                    className="w-full py-4 bg-gradient-to-r from-fm-pink to-fm-blue text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {processing
                      ? 'Redirecting to checkout...'
                      : paymentMethod === 'mobile'
                        ? 'Coming Soon'
                        : `Pay ${new Intl.NumberFormat('en-US', { style: 'currency', currency: plan.currency }).format(plan.price / 100)}`}
                  </button>

                  {/* Security Note */}
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-fm-text-secondary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span>Secured by Stripe. Your payment information is encrypted.</span>
                  </div>
                </form>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-fm-surface/80 backdrop-blur-sm rounded-xl border border-white/10 p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-fm-text-primary mb-4">Order Summary</h3>

                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-fm-pink to-fm-blue rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-fm-text-primary">{plan.name}</h4>
                      <p className="text-sm text-fm-text-secondary">Billed {plan.interval}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-fm-text-secondary">Subtotal</span>
                    <span className="text-fm-text-primary">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: plan.currency,
                      }).format(plan.price / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-fm-text-secondary">Tax</span>
                    <span className="text-fm-text-primary">Calculated at checkout</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="font-semibold text-fm-text-primary">Total</span>
                    <span className="font-bold text-lg text-fm-pink">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: plan.currency,
                      }).format(plan.price / 100)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-green-400">
                        30-Day Money-Back Guarantee
                      </p>
                      <p className="text-xs text-green-400/70 mt-1">
                        Try risk-free. Cancel anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </FlamoralBackground>
  );
};

export default CheckoutPage;
