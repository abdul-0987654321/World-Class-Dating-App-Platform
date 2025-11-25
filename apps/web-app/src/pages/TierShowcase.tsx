/**
 * Tier Showcase Page
 * Demo page displaying all subscription tier badges and their variations
 */

import React from 'react';
import {
  SubscriptionBadge,
  TierIcon,
  TierCard,
  TIER_CONFIG,
  SubscriptionTier,
} from '../components/subscription/SubscriptionBadge';

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  FREE: [
    '20 likes per day',
    '1 super like per day',
    'Basic filters',
    'See who liked you (blurred)',
  ],
  GOLD: [
    'Unlimited likes',
    '5 super likes per day',
    'See who liked you',
    'Rewind last swipe',
    'No ads',
    'Read receipts',
    '1 free boost per month',
  ],
  PLATINUM: [
    'Everything in Gold',
    'Unlimited super likes',
    'Priority likes',
    'Message before matching',
    'Weekly free boost',
    'Incognito mode',
    'Travel mode',
  ],
  DIAMOND: [
    'Everything in Platinum',
    'VIP badge on profile',
    'Priority support',
    'Exclusive VIP events',
    'AI matchmaker',
    'Unlimited boosts',
    'Daily Top Picks',
    'Profile review by experts',
  ],
};

const TIER_PRICES: Record<SubscriptionTier, string> = {
  FREE: '$0/month',
  GOLD: '$29.99/month',
  PLATINUM: '$49.99/month',
  DIAMOND: '$99.99/month',
};

export const TierShowcase: React.FC = () => {
  return (
    <div className="tier-showcase">
      <div className="showcase-container">
        <h1 className="showcase-title">Subscription Tier Badges</h1>
        <p className="showcase-subtitle">
          Visual guide to our membership tier system
        </p>

        {/* Color Legend */}
        <section className="section">
          <h2 className="section-title">Color Legend</h2>
          <div className="color-legend">
            {(Object.keys(TIER_CONFIG) as SubscriptionTier[]).map((tier) => {
              const config = TIER_CONFIG[tier];
              return (
                <div key={tier} className="legend-item">
                  <div
                    className="color-swatch"
                    style={{ background: config.gradient }}
                  />
                  <div className="legend-info">
                    <span className="legend-tier">{config.label}</span>
                    <span className="legend-color">{config.color}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Badge Sizes */}
        <section className="section">
          <h2 className="section-title">Badge Sizes</h2>
          <div className="badge-grid">
            {(Object.keys(TIER_CONFIG) as SubscriptionTier[]).map((tier) => (
              <div key={tier} className="badge-column">
                <h3 className="column-title">{TIER_CONFIG[tier].label}</h3>
                <div className="badge-row">
                  <div className="badge-item">
                    <span className="size-label">Small</span>
                    <SubscriptionBadge tier={tier} size="sm" showUpgrade={false} />
                  </div>
                  <div className="badge-item">
                    <span className="size-label">Medium</span>
                    <SubscriptionBadge tier={tier} size="md" showUpgrade={false} />
                  </div>
                  <div className="badge-item">
                    <span className="size-label">Large</span>
                    <SubscriptionBadge tier={tier} size="lg" showUpgrade={false} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tier Icons */}
        <section className="section">
          <h2 className="section-title">Compact Icons (for profile cards)</h2>
          <div className="icon-grid">
            {(Object.keys(TIER_CONFIG) as SubscriptionTier[]).map((tier) => (
              <div key={tier} className="icon-column">
                <h3 className="column-title">{TIER_CONFIG[tier].label}</h3>
                <div className="icon-row">
                  <div className="icon-item">
                    <span className="size-label">XS</span>
                    <TierIcon tier={tier} size="xs" />
                  </div>
                  <div className="icon-item">
                    <span className="size-label">SM</span>
                    <TierIcon tier={tier} size="sm" />
                  </div>
                  <div className="icon-item">
                    <span className="size-label">MD</span>
                    <TierIcon tier={tier} size="md" />
                  </div>
                  <div className="icon-item">
                    <span className="size-label">LG</span>
                    <TierIcon tier={tier} size="lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Usage Examples */}
        <section className="section">
          <h2 className="section-title">Usage in Context</h2>

          {/* Profile Header Example */}
          <div className="context-example">
            <h3 className="example-title">Profile Header</h3>
            <div className="profile-header-examples">
              {(Object.keys(TIER_CONFIG) as SubscriptionTier[]).map((tier) => (
                <div key={tier} className="profile-header-example">
                  <div className="profile-avatar">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tier}`}
                      alt={tier}
                    />
                    <TierIcon
                      tier={tier}
                      size="sm"
                      className="avatar-tier-icon"
                    />
                  </div>
                  <div className="profile-info">
                    <span className="profile-name">
                      {tier === 'FREE' ? 'Alex' : tier === 'GOLD' ? 'Jordan' : tier === 'PLATINUM' ? 'Taylor' : 'Morgan'}
                    </span>
                    <SubscriptionBadge tier={tier} size="sm" showUpgrade={tier === 'FREE'} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Message Example */}
          <div className="context-example">
            <h3 className="example-title">Chat Messages</h3>
            <div className="chat-examples">
              {(['GOLD', 'PLATINUM', 'DIAMOND'] as SubscriptionTier[]).map((tier) => (
                <div key={tier} className="chat-message">
                  <div className="message-avatar">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tier}chat`}
                      alt={tier}
                    />
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-name">
                        {tier === 'GOLD' ? 'Sarah' : tier === 'PLATINUM' ? 'Mike' : 'Emma'}
                      </span>
                      <TierIcon tier={tier} size="xs" />
                    </div>
                    <div className="message-text">
                      Hey! I noticed we both love hiking 🏔️
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Full Tier Cards */}
        <section className="section">
          <h2 className="section-title">Subscription Cards</h2>
          <div className="tier-cards-grid">
            {(Object.keys(TIER_CONFIG) as SubscriptionTier[]).map((tier) => (
              <TierCard
                key={tier}
                tier={tier}
                price={TIER_PRICES[tier]}
                features={TIER_FEATURES[tier]}
                isCurrentTier={tier === 'GOLD'} // Example: Gold is current
                onSelect={() => alert(`Selected ${tier} plan!`)}
              />
            ))}
          </div>
        </section>

        {/* Icon + Color Reference */}
        <section className="section">
          <h2 className="section-title">Quick Reference</h2>
          <div className="reference-table">
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Icon</th>
                  <th>Primary Color</th>
                  <th>Badge</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(TIER_CONFIG) as SubscriptionTier[]).map((tier) => {
                  const config = TIER_CONFIG[tier];
                  return (
                    <tr key={tier}>
                      <td className="tier-name">{config.label}</td>
                      <td className="tier-emoji">{config.icon}</td>
                      <td>
                        <span
                          className="color-chip"
                          style={{ background: config.color }}
                        />
                        {config.color}
                      </td>
                      <td>
                        <SubscriptionBadge tier={tier} size="sm" showUpgrade={false} />
                      </td>
                      <td>{TIER_PRICES[tier]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <style>{`
        .tier-showcase {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 2rem;
        }

        .showcase-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .showcase-title {
          font-size: 2.5rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .showcase-subtitle {
          text-align: center;
          color: #64748b;
          font-size: 1.1rem;
          margin-bottom: 3rem;
        }

        .section {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #1e293b;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }

        /* Color Legend */
        .color-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .color-swatch {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }

        .legend-info {
          display: flex;
          flex-direction: column;
        }

        .legend-tier {
          font-weight: 700;
          font-size: 1.1rem;
          color: #1e293b;
        }

        .legend-color {
          font-family: monospace;
          color: #64748b;
          font-size: 0.9rem;
        }

        /* Badge Grid */
        .badge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
        }

        .badge-column {
          text-align: center;
        }

        .column-title {
          font-size: 1rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 1rem;
        }

        .badge-row {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
        }

        .badge-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .size-label {
          font-size: 0.75rem;
          color: #94a3b8;
          width: 50px;
          text-align: right;
        }

        /* Icon Grid */
        .icon-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 2rem;
        }

        .icon-column {
          text-align: center;
        }

        .icon-row {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .icon-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        /* Context Examples */
        .context-example {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #f8fafc;
          border-radius: 12px;
        }

        .example-title {
          font-size: 1rem;
          font-weight: 600;
          color: #475569;
          margin-bottom: 1rem;
        }

        .profile-header-examples {
          display: flex;
          flex-wrap: wrap;
          gap: 2rem;
          justify-content: center;
        }

        .profile-header-example {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        }

        .profile-avatar {
          position: relative;
          width: 50px;
          height: 50px;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-tier-icon {
          position: absolute;
          bottom: -4px;
          right: -4px;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .profile-name {
          font-weight: 600;
          color: #1e293b;
        }

        /* Chat Examples */
        .chat-examples {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          max-width: 400px;
        }

        .chat-message {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .message-avatar img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .message-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: #1e293b;
        }

        .message-text {
          font-size: 0.9rem;
          color: #475569;
        }

        /* Tier Cards Grid */
        .tier-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          justify-items: center;
        }

        /* Reference Table */
        .reference-table {
          overflow-x: auto;
        }

        .reference-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .reference-table th,
        .reference-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .reference-table th {
          font-weight: 600;
          color: #475569;
          background: #f8fafc;
        }

        .tier-name {
          font-weight: 600;
          color: #1e293b;
        }

        .tier-emoji {
          font-size: 1.5rem;
        }

        .color-chip {
          display: inline-block;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          vertical-align: middle;
          margin-right: 0.5rem;
        }

        @media (max-width: 768px) {
          .tier-showcase {
            padding: 1rem;
          }

          .showcase-title {
            font-size: 1.75rem;
          }

          .section {
            padding: 1rem;
          }

          .badge-grid,
          .icon-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default TierShowcase;
