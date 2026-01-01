import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  tier: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  highlighted?: boolean;
  bestValue?: boolean;
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
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [highlightedTier, setHighlightedTier] = useState<string | null>(null);

  // Check for tier parameter from landing page
  useEffect(() => {
    const tierParam = searchParams.get('tier');
    if (tierParam) {
      setHighlightedTier(tierParam.toLowerCase());
      // Scroll to pricing after a short delay
      setTimeout(() => {
        const element = document.getElementById(`plan-${tierParam.toLowerCase()}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [searchParams]);

  // 6-Tier Subscription Model aligned with backend
  const defaultPlans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      tier: 'free',
      price: 0,
      currency: 'USD',
      interval: 'monthly',
      color: 'from-gray-400 to-gray-500',
      icon: 'user',
      features: [
        '50 daily swipes',
        'Basic filters',
        '1 Super Like/day',
        'Photo verification',
        'Send messages to matches',
      ],
    },
    {
      id: 'basic',
      name: 'Basic',
      tier: 'basic',
      price: 9.99,
      currency: 'USD',
      interval: 'monthly',
      color: 'from-blue-400 to-blue-500',
      icon: 'star',
      features: [
        'Unlimited swipes',
        'See who likes you',
        '5 Super Likes/day',
        '1 Boost/month',
        'Rewind last swipe',
        'Basic filters',
      ],
    },
    {
      id: 'plus',
      name: 'Plus',
      tier: 'plus',
      price: 19.99,
      currency: 'USD',
      interval: 'monthly',
      bestValue: true,
      color: 'from-green-400 to-emerald-500',
      icon: 'star',
      features: [
        'All Basic features',
        'Advanced filters',
        'Read receipts',
        '10 Super Likes/day',
        '3 Boosts/month',
        'Incognito mode',
        'Priority likes',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      tier: 'premium',
      price: 29.99,
      currency: 'USD',
      interval: 'monthly',
      highlighted: true,
      color: 'from-pink-500 to-purple-600',
      icon: 'crown',
      features: [
        'All Plus features',
        'Unlimited Super Likes',
        'Unlimited Boosts',
        'Video dating',
        'AI matchmaking',
        'AI conversation coach',
        'Verified badge',
      ],
    },
    {
      id: 'premium_plus',
      name: 'Premium+',
      tier: 'premium_plus',
      price: 39.99,
      currency: 'USD',
      interval: 'monthly',
      color: 'from-cyan-400 to-blue-500',
      icon: 'diamond',
      features: [
        'All Premium features',
        'Passport (travel mode)',
        'Message before match',
        'Priority support',
        'Travel mode alerts',
        'Profile highlights',
      ],
    },
    {
      id: 'elite',
      name: 'Elite',
      tier: 'elite',
      price: 59.99,
      currency: 'USD',
      interval: 'monthly',
      color: 'from-yellow-500 to-amber-600',
      icon: 'elite',
      features: [
        'All Premium+ features',
        'VIP badge',
        'Dedicated dating coach',
        'Background-verified matches',
        'Luxury date planning',
        'Exclusive VIP events',
        'Concierge service',
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--accent-pink)' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Flamoral
          </h1>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">Discover</button>
            <button onClick={() => navigate('/matches')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">Matches</button>
            <button onClick={() => navigate('/messages')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">Messages</button>
            <button onClick={() => navigate('/subscription')} style={{ color: 'var(--accent-pink)' }} className="font-medium">Subscription</button>
            <button onClick={() => navigate('/profile')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">Profile</button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Unlock Your Perfect Match
          </h2>
          <p className="text-xl mb-8" style={{ color: 'var(--text-secondary)' }}>
            Upgrade to premium and discover more meaningful connections
          </p>

          {/* Interval Toggle */}
          <div className="inline-flex items-center rounded-full p-1" style={{ background: 'var(--surface-card)' }}>
            <button
              onClick={() => setSelectedInterval('monthly')}
              className="px-6 py-2 rounded-full transition"
              style={{
                background: selectedInterval === 'monthly' ? 'var(--accent-gradient)' : 'transparent',
                color: selectedInterval === 'monthly' ? 'white' : 'var(--text-secondary)'
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedInterval('yearly')}
              className="px-6 py-2 rounded-full transition flex items-center gap-2"
              style={{
                background: selectedInterval === 'yearly' ? 'var(--accent-gradient)' : 'transparent',
                color: selectedInterval === 'yearly' ? 'white' : 'var(--text-secondary)'
              }}
            >
              Yearly
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Current Subscription Banner */}
        {currentSubscription && currentSubscription.tier !== 'FREE' && (
          <div className="rounded-xl p-6 text-white mb-8" style={{ background: 'var(--accent-gradient)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Current Plan</p>
                <h3 className="text-2xl font-bold">{currentSubscription.tier}</h3>
                <p className="text-white/70">
                  {currentSubscription.status === 'active' ? 'Active' : 'Cancelled'}
                  {currentSubscription.expiresAt && ` - Expires ${new Date(currentSubscription.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/subscription/manage')}
                  className="px-4 py-2 rounded-lg transition"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
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

        {/* Plans Grid - 6 Tier Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-12">
          {(plans.length > 0 ? plans : defaultPlans).map((plan) => (
            <div
              key={plan.id}
              id={`plan-${plan.id}`}
              className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                plan.highlighted || highlightedTier === plan.id ? 'ring-2 ring-pink-500 transform scale-105 z-10' : ''
              } ${plan.bestValue ? 'ring-2 ring-green-500' : ''} ${
                highlightedTier === plan.id ? 'animate-pulse' : ''
              }`}
              style={{ background: 'var(--surface-card)' }}
            >
              {plan.highlighted && (
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-center py-1.5 text-xs font-medium">
                  MOST POPULAR
                </div>
              )}
              {plan.bestValue && !plan.highlighted && (
                <div className="bg-green-500 text-white text-center py-1.5 text-xs font-medium">
                  BEST VALUE
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
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={processingPlan === plan.id || currentSubscription?.tier === plan.tier}
                  className="w-full py-3 rounded-xl font-medium transition"
                  style={{
                    background: currentSubscription?.tier === plan.tier || plan.price === 0
                      ? 'rgba(255,255,255,0.1)'
                      : `linear-gradient(135deg, var(--accent-pink) 0%, var(--accent-purple) 100%)`,
                    color: currentSubscription?.tier === plan.tier ? 'var(--text-muted)' : 'white',
                    cursor: currentSubscription?.tier === plan.tier ? 'not-allowed' : 'pointer'
                  }}
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

        {/* Features Comparison - 6 Tier */}
        <div className="rounded-2xl p-8 mb-8" style={{ background: 'var(--surface-card)' }}>
          <h3 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Compare Features</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="text-left py-4 px-2 text-sm min-w-[140px]" style={{ color: 'var(--text-secondary)' }}>Feature</th>
                  <th className="text-center py-4 px-1 text-xs" style={{ color: 'var(--text-muted)' }}>Free</th>
                  <th className="text-center py-4 px-1 text-xs text-blue-400">Basic</th>
                  <th className="text-center py-4 px-1 text-xs text-green-400">Plus</th>
                  <th className="text-center py-4 px-1 text-xs font-bold" style={{ color: 'var(--accent-pink)' }}>Premium</th>
                  <th className="text-center py-4 px-1 text-xs" style={{ color: 'var(--accent-cyan)' }}>Premium+</th>
                  <th className="text-center py-4 px-1 text-xs text-amber-400">Elite</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Daily Swipes', free: '50', basic: '∞', plus: '∞', premium: '∞', premiumPlus: '∞', elite: '∞' },
                  { feature: 'Super Likes', free: '1/day', basic: '5/day', plus: '10/day', premium: '∞', premiumPlus: '∞', elite: '∞' },
                  { feature: 'Boosts', free: '0', basic: '1/mo', plus: '3/mo', premium: '∞', premiumPlus: '∞', elite: '∞' },
                  { feature: 'See Who Likes You', free: false, basic: true, plus: true, premium: true, premiumPlus: true, elite: true },
                  { feature: 'Rewind', free: false, basic: true, plus: true, premium: true, premiumPlus: true, elite: true },
                  { feature: 'Advanced Filters', free: false, basic: false, plus: true, premium: true, premiumPlus: true, elite: true },
                  { feature: 'Read Receipts', free: false, basic: false, plus: true, premium: true, premiumPlus: true, elite: true },
                  { feature: 'Incognito Mode', free: false, basic: false, plus: true, premium: true, premiumPlus: true, elite: true },
                  { feature: 'Video Dating', free: false, basic: false, plus: false, premium: true, premiumPlus: true, elite: true },
                  { feature: 'AI Matchmaking', free: false, basic: false, plus: false, premium: true, premiumPlus: true, elite: true },
                  { feature: 'Verified Badge', free: false, basic: false, plus: false, premium: true, premiumPlus: true, elite: true },
                  { feature: 'Passport (Travel)', free: false, basic: false, plus: false, premium: false, premiumPlus: true, elite: true },
                  { feature: 'Message Before Match', free: false, basic: false, plus: false, premium: false, premiumPlus: true, elite: true },
                  { feature: 'Priority Support', free: false, basic: false, plus: false, premium: false, premiumPlus: true, elite: true },
                  { feature: 'VIP Badge', free: false, basic: false, plus: false, premium: false, premiumPlus: false, elite: true },
                  { feature: 'Dedicated Coach', free: false, basic: false, plus: false, premium: false, premiumPlus: false, elite: true },
                  { feature: 'Background Verified', free: false, basic: false, plus: false, premium: false, premiumPlus: false, elite: true },
                ].map((row, idx) => {
                  const renderCell = (value: boolean | string, colorClass: string) => {
                    if (typeof value === 'boolean') {
                      return value ? (
                        <svg className="w-4 h-4 text-green-400 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mx-auto" style={{ color: 'var(--text-muted)' }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      );
                    }
                    return <span className={`${colorClass} font-medium text-[10px]`}>{value}</span>;
                  };

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="py-2 px-2 text-xs" style={{ color: 'var(--text-primary)' }}>{row.feature}</td>
                      <td className="text-center py-2 px-1">{renderCell(row.free, 'text-gray-400')}</td>
                      <td className="text-center py-2 px-1">{renderCell(row.basic, 'text-blue-400')}</td>
                      <td className="text-center py-2 px-1">{renderCell(row.plus, 'text-green-400')}</td>
                      <td className="text-center py-2 px-1" style={{ background: 'rgba(255, 46, 147, 0.1)' }}>{renderCell(row.premium, 'text-pink-400')}</td>
                      <td className="text-center py-2 px-1">{renderCell(row.premiumPlus, 'text-cyan-400')}</td>
                      <td className="text-center py-2 px-1">{renderCell(row.elite, 'text-amber-400')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl p-8" style={{ background: 'var(--surface-card)' }}>
          <h3 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--text-primary)' }}>Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Can I cancel anytime?</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>What payment methods do you accept?</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>We accept all major credit cards, Apple Pay/Google Pay for mobile payments, and regional options like Paystack and Flutterwave for African markets.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Can I upgrade or downgrade my plan?</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Absolutely! You can change your plan anytime. Upgrades take effect immediately, downgrades at your next billing cycle.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Is there a free trial?</h4>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>New users get a 7-day free trial of Platinum features. Cancel before the trial ends to avoid any charges.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubscriptionPage;
