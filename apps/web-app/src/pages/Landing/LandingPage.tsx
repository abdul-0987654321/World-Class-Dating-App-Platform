import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * Flamoral Landing Page
 *
 * Design Philosophy: Refined minimalism with atmospheric depth
 * - Near-black canvas with soft animated gradients
 * - Typography-driven hierarchy
 * - Maximum breathing room
 * - Single conversion action
 */

const LandingPage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const emotionalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subtle gradient animation
    const animate = () => {
      const time = Date.now() * 0.00008;
      const x = 50 + Math.sin(time) * 15;
      const y = 50 + Math.cos(time * 0.7) * 15;

      if (heroRef.current) {
        heroRef.current.style.setProperty('--gradient-x', `${x}%`);
        heroRef.current.style.setProperty('--gradient-y', `${y}%`);
      }
      if (emotionalRef.current) {
        emotionalRef.current.style.setProperty('--gradient-x', `${100 - x}%`);
        emotionalRef.current.style.setProperty('--gradient-y', `${100 - y}%`);
      }
      requestAnimationFrame(animate);
    };
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="flamoral-landing">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;500&display=swap');

        .flamoral-landing {
          --color-bg: #08080c;
          --color-bg-elevated: #0f0f14;
          --color-text: #e8e6e3;
          --color-text-muted: #9a9590;
          --color-accent: #e8e6e3;
          --color-pink: #d4587a;
          --color-blue: #5b7fb8;
          --gradient-x: 50%;
          --gradient-y: 50%;

          font-family: 'DM Sans', -apple-system, sans-serif;
          background: var(--color-bg);
          color: var(--color-text);
          min-height: 100vh;
          line-height: 1.7;
          -webkit-font-smoothing: antialiased;
        }

        .flamoral-landing * {
          box-sizing: border-box;
        }

        .serif {
          font-family: 'Instrument Serif', Georgia, serif;
        }

        .gradient-hero {
          background:
            radial-gradient(
              ellipse 80% 60% at var(--gradient-x) var(--gradient-y),
              rgba(212, 88, 122, 0.15) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 60% 80% at calc(100% - var(--gradient-x)) calc(100% - var(--gradient-y)),
              rgba(91, 127, 184, 0.12) 0%,
              transparent 50%
            ),
            var(--color-bg);
        }

        .gradient-emotional {
          background:
            radial-gradient(
              ellipse 70% 50% at var(--gradient-x) var(--gradient-y),
              rgba(91, 127, 184, 0.12) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 50% 70% at calc(100% - var(--gradient-x)) calc(100% - var(--gradient-y)),
              rgba(212, 88, 122, 0.1) 0%,
              transparent 50%
            ),
            var(--color-bg);
        }

        .cta-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 2.5rem;
          background: var(--color-text);
          color: var(--color-bg);
          font-weight: 500;
          border-radius: 100px;
          text-decoration: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border: none;
          cursor: pointer;
        }

        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .cta-secondary {
          display: inline-flex;
          align-items: center;
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .cta-secondary:hover {
          color: var(--color-text);
        }

        .cta-secondary svg {
          margin-left: 0.5rem;
          transition: transform 0.2s ease;
        }

        .cta-secondary:hover svg {
          transform: translateX(4px);
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .container-narrow {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        @media (max-width: 768px) {
          .cta-primary {
            width: 100%;
            padding: 1.125rem 2rem;
          }
        }
      `}</style>

      {/* Hero Section */}
      <section ref={heroRef} className="gradient-hero" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Navigation */}
        <nav style={{ padding: '1.5rem 0' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link
              to="/"
              className="serif"
              style={{
                fontSize: '1.5rem',
                fontStyle: 'italic',
                color: 'var(--color-text)',
                textDecoration: 'none',
                letterSpacing: '-0.02em'
              }}
            >
              Flamoral
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <Link
                to="/login"
                style={{
                  color: 'var(--color-text-muted)',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  transition: 'color 0.2s'
                }}
              >
                Log in
              </Link>
              <Link to="/signup" className="cta-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingBottom: '6rem' }}>
          <div className="container-narrow" style={{ textAlign: 'center' }}>
            <h1
              className="serif"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                fontWeight: 400,
                lineHeight: 1.1,
                marginBottom: '1.5rem',
                letterSpacing: '-0.03em'
              }}
            >
              Real connections.<br />
              <span style={{ fontStyle: 'italic' }}>No noise.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'var(--color-text-muted)',
              maxWidth: '540px',
              margin: '0 auto 3rem',
              lineHeight: 1.7
            }}>
              Flamoral is a modern dating platform built for people who value clarity, privacy, and meaningful connection.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <Link to="/signup" className="cta-primary">
                Get Started
              </Link>
              <a href="#how" className="cta-secondary">
                See how it works
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section style={{ padding: '6rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <blockquote style={{ margin: 0 }}>
            <p
              className="serif"
              style={{
                fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                fontStyle: 'italic',
                fontWeight: 400,
                marginBottom: '1.5rem',
                lineHeight: 1.5
              }}
            >
              "Flamoral feels intentional. It's the first dating app that doesn't feel chaotic."
            </p>
            <footer style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              — Early access member
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Value Propositions */}
      <section style={{ padding: '6rem 0', background: 'var(--color-bg-elevated)' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '4rem'
          }}>
            {[
              {
                title: 'Intentional Matching',
                description: 'No endless swiping. Matches are designed around compatibility and intent.'
              },
              {
                title: 'Privacy First',
                description: 'Your data, conversations, and presence are protected by default.'
              },
              {
                title: 'Real Conversations',
                description: 'No bots. No spam. Just genuine people and meaningful dialogue.'
              }
            ].map((item, index) => (
              <div key={index}>
                <h3
                  className="serif"
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 400,
                    marginBottom: '1rem',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {item.title}
                </h3>
                <p style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '1rem',
                  lineHeight: 1.7
                }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" style={{ padding: '6rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container-narrow">
          <h2
            className="serif"
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 400,
              marginBottom: '3rem',
              textAlign: 'center',
              letterSpacing: '-0.02em'
            }}
          >
            How it works
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {[
              { step: '01', text: 'Create your profile in minutes' },
              { step: '02', text: 'Get matched intentionally' },
              { step: '03', text: 'Start real conversations' }
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '2rem',
                  paddingBottom: index < 2 ? '2.5rem' : 0,
                  borderBottom: index < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none'
                }}
              >
                <span style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                  minWidth: '2rem'
                }}>
                  {item.step}
                </span>
                <p style={{
                  fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)',
                  margin: 0
                }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emotional Anchor */}
      <section ref={emotionalRef} className="gradient-emotional" style={{ padding: '8rem 0' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <h2
            className="serif"
            style={{
              fontSize: 'clamp(2rem, 6vw, 3.5rem)',
              fontWeight: 400,
              marginBottom: '1.5rem',
              lineHeight: 1.2,
              letterSpacing: '-0.02em'
            }}
          >
            Dating shouldn't feel<br />
            <span style={{ fontStyle: 'italic' }}>exhausting.</span>
          </h2>
          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: 1.7
          }}>
            Flamoral is built for people who are done with noise and ready for something genuine.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '6rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <h2
            className="serif"
            style={{
              fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
              fontWeight: 400,
              marginBottom: '2rem',
              fontStyle: 'italic',
              letterSpacing: '-0.02em'
            }}
          >
            Connect differently.
          </h2>

          <Link to="/signup" className="cta-primary" style={{ marginBottom: '1.5rem' }}>
            Get Started
          </Link>

          <p style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.875rem',
            marginTop: '1.5rem'
          }}>
            Free to join. Upgrade when you're ready.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '3rem 0',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div className="container">
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              display: 'flex',
              gap: '2rem',
              fontSize: '0.875rem'
            }}>
              <Link
                to="/privacy-policy"
                style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
              >
                Privacy
              </Link>
              <Link
                to="/terms-of-service"
                style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
              >
                Terms
              </Link>
              <Link
                to="/contact"
                style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
              >
                Contact
              </Link>
            </div>
            <p style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
              margin: 0
            }}>
              &copy; {new Date().getFullYear()} Flamoral
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
