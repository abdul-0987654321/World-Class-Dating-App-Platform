/**
 * PaymentCheckout Component
 * Multi-provider payment checkout with support for:
 * - Stripe (Cards, Apple Pay, Google Pay)
 * - PayPal
 * - Flutterwave (African markets)
 * - Paystack (African markets)
 */

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentProvider {
  id: string;
  name: string;
  icon: string;
  supportedMethods: string[];
  enabled: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  type: 'subscription' | 'coins' | 'boost' | 'super_like';
}

interface PaymentCheckoutProps {
  product: Product;
  onSuccess: (result: any) => void;
  onCancel: () => void;
  onError: (error: string) => void;
  userCountry?: string;
}

// Provider Icons
const ProviderIcon: React.FC<{ provider: string }> = ({ provider }) => {
  switch (provider) {
    case 'stripe':
      return (
        <svg className="w-8 h-8" viewBox="0 0 32 32">
          <path fill="#6772E5" d="M13.976 13.2c0-.7.6-1 1.6-1 1.4 0 3.2.4 4.6 1.2V9.6c-1.5-.6-3-.8-4.6-.8-3.8 0-6.3 2-6.3 5.3 0 5.2 7.1 4.4 7.1 6.6 0 .8-.7 1.1-1.7 1.1-1.5 0-3.5-.6-5-1.4v3.8c1.7.7 3.4 1 5 1 3.9 0 6.5-1.9 6.5-5.3 0-5.6-7.2-4.6-7.2-6.7z" />
        </svg>
      );
    case 'paypal':
      return (
        <svg className="w-8 h-8" viewBox="0 0 32 32">
          <path fill="#003087" d="M12.5 7h6.2c3.5 0 5.9 2.4 5.4 6-.5 3.8-3.3 6-6.7 6h-2.3c-.5 0-.9.4-1 .9l-.8 5.3c-.1.4-.4.8-.9.8H9.2c-.4 0-.7-.4-.6-.8l2.9-17.4c.1-.5.5-.8 1-.8z" />
          <path fill="#009CDE" d="M13.3 19.7l.6-3.9c.1-.5.5-.9 1-.9h2.3c3.4 0 6.2-2.2 6.7-6 .3-2-.2-3.7-1.3-4.9 1.4 1.2 2 3 1.6 5.3-.5 3.8-3.3 6-6.7 6h-2.3c-.5 0-.9.4-1 .9l-1.3 8.3h3.2l.4-2.8c.1-.4.4-.8.9-.8h.9z" />
        </svg>
      );
    case 'flutterwave':
      return (
        <svg className="w-8 h-8" viewBox="0 0 32 32">
          <rect fill="#F5A623" width="32" height="32" rx="4" />
          <text x="8" y="22" fill="white" fontSize="14" fontWeight="bold">FW</text>
        </svg>
      );
    case 'paystack':
      return (
        <svg className="w-8 h-8" viewBox="0 0 32 32">
          <rect fill="#00C3F7" width="32" height="32" rx="4" />
          <text x="6" y="22" fill="white" fontSize="14" fontWeight="bold">PS</text>
        </svg>
      );
    default:
      return null;
  }
};

// Stripe Payment Form
const StripePaymentForm: React.FC<{
  clientSecret: string;
  product: Product;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}> = ({ clientSecret, product, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed');
      onError(submitError.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent) {
      onSuccess({ paymentIntent, provider: 'stripe' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : (
          `Pay ${product.currency === 'USD' ? '$' : product.currency}${(product.price / 100).toFixed(2)}`
        )}
      </button>
    </form>
  );
};

// Main Checkout Component
export const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({
  product,
  onSuccess,
  onCancel,
  onError,
  userCountry = 'US',
}) => {
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);

  useEffect(() => {
    loadProviders();
  }, [userCountry]);

  const loadProviders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/payments/providers?country=${userCountry}&platform=web`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        // Auto-select first provider
        if (data.providers?.length > 0) {
          setSelectedProvider(data.providers[0].id);
        }
      } else {
        // Default providers
        setProviders([
          { id: 'stripe', name: 'Credit Card', icon: 'stripe', supportedMethods: ['card'], enabled: true },
          { id: 'paypal', name: 'PayPal', icon: 'paypal', supportedMethods: ['paypal_wallet'], enabled: true },
        ]);
        setSelectedProvider('stripe');
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
      // Default to Stripe
      setProviders([
        { id: 'stripe', name: 'Credit Card', icon: 'stripe', supportedMethods: ['card'], enabled: true },
      ]);
      setSelectedProvider('stripe');
    } finally {
      setLoading(false);
    }
  };

  const initializeStripePayment = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: 'stripe',
          amount: product.price,
          currency: product.currency,
          productId: product.id,
          productType: product.type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStripeClientSecret(data.clientSecret);
      } else {
        const error = await res.json();
        onError(error.error || 'Failed to initialize payment');
      }
    } catch (err: any) {
      onError(err.message || 'Failed to initialize payment');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayPalCheckout = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: 'paypal',
          productId: product.id,
          productType: product.type,
          successUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/payment/cancel`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const error = await res.json();
        onError(error.error || 'Failed to initialize PayPal checkout');
      }
    } catch (err: any) {
      onError(err.message || 'Failed to initialize PayPal checkout');
    } finally {
      setProcessing(false);
    }
  };

  const handleFlutterwaveCheckout = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: 'flutterwave',
          productId: product.id,
          productType: product.type,
          successUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/payment/cancel`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const error = await res.json();
        onError(error.error || 'Failed to initialize Flutterwave checkout');
      }
    } catch (err: any) {
      onError(err.message || 'Failed to initialize Flutterwave checkout');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaystackCheckout = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: 'paystack',
          productId: product.id,
          productType: product.type,
          successUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/payment/cancel`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const error = await res.json();
        onError(error.error || 'Failed to initialize Paystack checkout');
      }
    } catch (err: any) {
      onError(err.message || 'Failed to initialize Paystack checkout');
    } finally {
      setProcessing(false);
    }
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setStripeClientSecret(null);

    if (providerId === 'stripe') {
      initializeStripePayment();
    }
  };

  const handleContinue = () => {
    switch (selectedProvider) {
      case 'stripe':
        if (!stripeClientSecret) {
          initializeStripePayment();
        }
        break;
      case 'paypal':
        handlePayPalCheckout();
        break;
      case 'flutterwave':
        handleFlutterwaveCheckout();
        break;
      case 'paystack':
        handlePaystackCheckout();
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full mx-auto overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white">
        <h2 className="text-xl font-bold">Complete Your Purchase</h2>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-pink-100 text-sm">{product.name}</p>
            {product.description && (
              <p className="text-pink-200 text-xs">{product.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {product.currency === 'USD' ? '$' : product.currency}
              {(product.price / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Payment Method Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Select Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider.id)}
                disabled={!provider.enabled}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl transition ${
                  selectedProvider === provider.id
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!provider.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <ProviderIcon provider={provider.id} />
                <span className="font-medium text-gray-800">{provider.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stripe Payment Form */}
        {selectedProvider === 'stripe' && stripeClientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: stripeClientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#ec4899',
                },
              },
            }}
          >
            <StripePaymentForm
              clientSecret={stripeClientSecret}
              product={product}
              onSuccess={onSuccess}
              onError={onError}
            />
          </Elements>
        )}

        {/* Other Providers - Continue Button */}
        {selectedProvider && selectedProvider !== 'stripe' && (
          <button
            onClick={handleContinue}
            disabled={processing}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Redirecting...
              </span>
            ) : (
              `Continue with ${providers.find(p => p.id === selectedProvider)?.name}`
            )}
          </button>
        )}

        {/* Stripe Init Button */}
        {selectedProvider === 'stripe' && !stripeClientSecret && (
          <button
            onClick={initializeStripePayment}
            disabled={processing}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Continue to Payment'
            )}
          </button>
        )}

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          Cancel
        </button>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-xs">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>Secure payment powered by industry-leading encryption</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckout;
