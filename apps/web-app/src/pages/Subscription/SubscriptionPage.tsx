import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  tier: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  highlighted?: boolean;
  color: string;
  icon: string;
}

interface Subscription {
  tier: string;
  status: string;
  expiresAt?: string;
  autoRenew?: boolean;
}

export const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const defaultPlans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      tier: 'FREE',
      price: 0,
      currency: 'USD',
      interval: 'monthly',
      color: 'from-gray-400 to-gray-500',
      icon: 'user',
      features: [
        'Basic matching',
        '10 daily likes',
        'Basic filters',
        'View profiles',
        'Send messages to matches',
      ],
    },
    {
      id: 'gold',
      name: 'Gold',
      tier: 'GOLD',
      price: 14.99,
      currency: 'USD',
      interval: 'monthly',
      color: 'from-yellow-400 to-amber-500',
      icon: 'star',
      features: [
        'Unlimited likes',
        'See who likes you',
        'Advanced filters',
        '5 Super Likes/day',
        '1 Boost/week',
        'Rewind last swipe',
        'Priority support',
      ],
    },
    {
      id: 'platinum',
      name: 'Platinum',
      tier: 'PLATINUM',
      price: 24.99,
      currency: 'USD',
      interval: 'monthly',
      highlighted: true,
      color: 'from-purple-500 to-indigo-600',
      icon: 'crown',
      features: [
        'Everything in Gold',
        'Message before matching',
        'Priority in Discovery',
        '10 Super Likes/day',
        '3 Boosts/week',
        'See read receipts',
        'Hide ads',
        'Incognito mode',
      ],
    },
    {
      id: 'diamond',
      name: 'Diamond',
      tier: 'DIAMOND',
      price: 39.99,
      currency: 'USD',
      interval: 'monthly',
      color: 'from-cyan-400 to-blue-500',
      icon: 'diamond',
      features: [
        'Everything in Platinum',
        'Exclusive events access',
        'Verified badge',
        'Unlimited Super Likes',
        'Unlimited Boosts',
        'Profile highlights',
        'AI matchmaking insights',
        'Personal concierge',
        'Video call priority',
      ],
    },
    {
      id: 'elite',
      name: 'Elite',
      tier: 'ELITE',
      price: 99.99,
      currency: 'USD',
      interval: 'monthly',
      color: 'from-rose-500 to-pink-600',
      icon: 'elite',
      features: [
        'Everything in Diamond',
        'VIP matchmaking service',
        'Profile written by experts',
        'Dedicated relationship coach',
        'Exclusive VIP events',
        'Priority customer support',
        'Background-checked matches',
        'Luxury date planning',
      ],
    },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Get plans
      const plansRes = await fetch('/api/subscriptions/plans', { headers });
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        if (plansData.data?.plans?.length > 0) {
          setPlans(plansData.data.plans.map((p: any) => {
            // Map API response to our Plan format
            const planId = p.id?.toLowerCase() || p.slug?.toLowerCase();
            const defaultPlan = defaultPlans.find(dp => dp.id === planId);
            return {
              id: p.id || p.slug,
              name: p.name,
              tier: (p.id || p.slug || '').toUpperCase(),
              price: (p.monthlyPrice || p.price || 0) / 100, // Convert cents to dollars
              currency: p.currency || 'USD',
              interval: 'monthly',
              features: p.features || defaultPlan?.features || [],
              highlighted: planId === 'platinum',
              color: defaultPlan?.color || 'from-gray-400 to-gray-500',
              icon: defaultPlan?.icon || 'star',
            };
          }));
        } else {
          setPlans(defaultPlans);
        }
      } else {
        setPlans(defaultPlans);
      }

      // Get current subscription
      const subRes = await fetch('/api/subscriptions/status', { headers });
      if (subRes.ok) {
        const subData = await subRes.json();
        setCurrentSubscription(subData.data);
      }
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setPlans(defaultPlans);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (plan.tier === 'FREE') return;

    setProcessingPlan(plan.id);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: plan.id,
          interval: selectedInterval,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data?.checkoutUrl) {
          window.location.href = data.data.checkoutUrl;
        } else {
          // Subscription activated directly
          setCurrentSubscription({ tier: plan.tier, status: 'active' });
          alert('Subscription activated successfully!');
        }
      }
    } catch (err) {
      console.error('Subscription failed:', err);
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setCurrentSubscription({ ...currentSubscription!, status: 'cancelled' });
        alert('Subscription cancelled. You will retain access until the end of your billing period.');
      }
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'user':
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
      case 'star':
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'crown':
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v1a1 1 0 001 1h12a1 1 0 001-1v-1z" />
          </svg>
        );
      case 'diamond':
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 2l-6 8 12 12 12-12-6-8H6zm13.2 6.8l-7.2 7.2-7.2-7.2L7.2 4h9.6l2.4 4.8z" />
          </svg>
        );
      case 'elite':
        return (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getYearlyPrice = (monthlyPrice: number) => {
    return (monthlyPrice * 12 * 0.8).toFixed(2); // 20% discount
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient-flamoral">
            Flamoral
          </h1>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} className="text-gray-600 hover:text-pink-500">Discover</button>
            <button onClick={() => navigate('/matches')} className="text-gray-600 hover:text-pink-500">Matches</button>
            <button onClick={() => navigate('/messages')} className="text-gray-600 hover:text-pink-500">Messages</button>
            <button onClick={() => navigate('/subscription')} className="text-pink-500 font-medium">Subscription</button>
            <button onClick={() => navigate('/profile')} className="text-gray-600 hover:text-pink-500">Profile</button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Unlock Your Perfect Match
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Upgrade to premium and discover more meaningful connections
          </p>

          {/* Interval Toggle */}
          <div className="inline-flex items-center bg-gray-200 rounded-full p-1">
            <button
              onClick={() => setSelectedInterval('monthly')}
              className={`px-6 py-2 rounded-full transition ${
                selectedInterval === 'monthly'
                  ? 'bg-white text-gray-800 shadow'
                  : 'text-gray-600'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedInterval('yearly')}
              className={`px-6 py-2 rounded-full transition flex items-center gap-2 ${
                selectedInterval === 'yearly'
                  ? 'bg-white text-gray-800 shadow'
                  : 'text-gray-600'
              }`}
            >
              Yearly
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Current Subscription Banner */}
        {currentSubscription && currentSubscription.tier !== 'FREE' && (
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-6 text-white mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm">Current Plan</p>
                <h3 className="text-2xl font-bold">{currentSubscription.tier}</h3>
                <p className="text-pink-100">
                  {currentSubscription.status === 'active' ? 'Active' : 'Cancelled'}
                  {currentSubscription.expiresAt && ` - Expires ${new Date(currentSubscription.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/subscription/manage')}
                  className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                >
                  Manage
                </button>
                {currentSubscription.status === 'active' && (
                  <button
                    onClick={handleCancelSubscription}
                    className="px-4 py-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {(plans.length > 0 ? plans : defaultPlans).map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden ${
                plan.highlighted ? 'ring-2 ring-purple-500 transform scale-105' : ''
              }`}
            >
              {plan.highlighted && (
                <div className="bg-purple-500 text-white text-center py-2 text-sm font-medium">
                  Most Popular
                </div>
              )}
              <div className={`bg-gradient-to-br ${plan.color} p-6 text-white`}>
                <div className="flex items-center gap-3 mb-4">
                  {getIcon(plan.icon)}
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${selectedInterval === 'yearly' && plan.price > 0 ? getYearlyPrice(plan.price) : plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-white/80">/{selectedInterval === 'yearly' ? 'year' : 'month'}</span>
                  )}
                </div>
                {selectedInterval === 'yearly' && plan.price > 0 && (
                  <p className="text-white/80 text-sm mt-1">
                    ${(parseFloat(getYearlyPrice(plan.price)) / 12).toFixed(2)}/month billed annually
                  </p>
                )}
              </div>
              <div className="p-6">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={processingPlan === plan.id || currentSubscription?.tier === plan.tier}
                  className={`w-full py-3 rounded-xl font-medium transition ${
                    currentSubscription?.tier === plan.tier
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : plan.price === 0
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : `bg-gradient-to-r ${plan.color} text-white hover:opacity-90`
                  }`}
                >
                  {processingPlan === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : currentSubscription?.tier === plan.tier ? (
                    'Current Plan'
                  ) : plan.price === 0 ? (
                    'Current Plan'
                  ) : (
                    'Upgrade Now'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Compare Features</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-3 text-gray-600 text-sm">Feature</th>
                  <th className="text-center py-4 px-2 text-gray-600 text-sm">Free</th>
                  <th className="text-center py-4 px-2 text-yellow-600 text-sm">Gold</th>
                  <th className="text-center py-4 px-2 text-purple-600 text-sm">Platinum</th>
                  <th className="text-center py-4 px-2 text-cyan-600 text-sm">Diamond</th>
                  <th className="text-center py-4 px-2 text-rose-600 text-sm">Elite</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Daily Likes', free: '10', gold: 'Unlimited', platinum: 'Unlimited', diamond: 'Unlimited', elite: 'Unlimited' },
                  { feature: 'Super Likes', free: '1/day', gold: '5/day', platinum: '10/day', diamond: 'Unlimited', elite: 'Unlimited' },
                  { feature: 'Boosts', free: '0', gold: '1/week', platinum: '3/week', diamond: 'Unlimited', elite: 'Unlimited' },
                  { feature: 'See Who Likes You', free: false, gold: true, platinum: true, diamond: true, elite: true },
                  { feature: 'Advanced Filters', free: false, gold: true, platinum: true, diamond: true, elite: true },
                  { feature: 'Rewind', free: false, gold: true, platinum: true, diamond: true, elite: true },
                  { feature: 'Message Before Match', free: false, gold: false, platinum: true, diamond: true, elite: true },
                  { feature: 'Incognito Mode', free: false, gold: false, platinum: true, diamond: true, elite: true },
                  { feature: 'Read Receipts', free: false, gold: false, platinum: true, diamond: true, elite: true },
                  { feature: 'Verified Badge', free: false, gold: false, platinum: false, diamond: true, elite: true },
                  { feature: 'Exclusive Events', free: false, gold: false, platinum: false, diamond: true, elite: true },
                  { feature: 'AI Matchmaking', free: false, gold: false, platinum: false, diamond: true, elite: true },
                  { feature: 'VIP Matchmaking', free: false, gold: false, platinum: false, diamond: false, elite: true },
                  { feature: 'Dedicated Coach', free: false, gold: false, platinum: false, diamond: false, elite: true },
                  { feature: 'Profile by Experts', free: false, gold: false, platinum: false, diamond: false, elite: true },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="py-3 px-3 text-gray-800 text-sm">{row.feature}</td>
                    <td className="text-center py-3 px-2">
                      {typeof row.free === 'boolean' ? (
                        row.free ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )
                      ) : (
                        <span className="text-gray-600 text-xs">{row.free}</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {typeof row.gold === 'boolean' ? (
                        row.gold ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )
                      ) : (
                        <span className="text-yellow-600 font-medium text-xs">{row.gold}</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {typeof row.platinum === 'boolean' ? (
                        row.platinum ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )
                      ) : (
                        <span className="text-purple-600 font-medium text-xs">{row.platinum}</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {typeof row.diamond === 'boolean' ? (
                        row.diamond ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )
                      ) : (
                        <span className="text-cyan-600 font-medium text-xs">{row.diamond}</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-2">
                      {typeof row.elite === 'boolean' ? (
                        row.elite ? (
                          <svg className="w-5 h-5 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )
                      ) : (
                        <span className="text-rose-600 font-medium text-xs">{row.elite}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">What payment methods do you accept?</h4>
              <p className="text-gray-600 text-sm">We accept all major credit cards, PayPal, and Apple Pay/Google Pay for mobile payments.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Can I upgrade or downgrade my plan?</h4>
              <p className="text-gray-600 text-sm">Absolutely! You can change your plan anytime. Upgrades take effect immediately, downgrades at your next billing cycle.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Is there a free trial?</h4>
              <p className="text-gray-600 text-sm">New users get a 7-day free trial of Platinum features. Cancel before the trial ends to avoid any charges.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubscriptionPage;
