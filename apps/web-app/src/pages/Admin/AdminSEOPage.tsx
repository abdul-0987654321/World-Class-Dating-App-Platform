/**
 * Admin SEO Dashboard Page
 * Comprehensive SEO management, analytics, and optimization tools
 */

import React, { useState, useEffect } from 'react';

// Types
interface SEOHealthScore {
  overall: number;
  technical: number;
  content: number;
  performance: number;
  mobile: number;
  security: number;
}

interface SEOIssue {
  id: string;
  severity: 'critical' | 'error' | 'warning';
  code: string;
  message: string;
  url?: string;
  suggestion?: string;
}

interface CoreWebVitals {
  lcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  fid: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  cls: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  ttfb: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
}

interface Redirect {
  id: string;
  source: string;
  destination: string;
  type: 301 | 302;
  hits: number;
  enabled: boolean;
}

interface KeywordRanking {
  keyword: string;
  position: number;
  previousPosition: number;
  url: string;
  searchVolume: number;
}

// Mock data
const mockHealthScore: SEOHealthScore = {
  overall: 85,
  technical: 90,
  content: 82,
  performance: 88,
  mobile: 85,
  security: 95,
};

const mockIssues: SEOIssue[] = [
  {
    id: '1',
    severity: 'critical',
    code: 'IMG_ALT_MISSING',
    message: '12 images missing alt text',
    url: '/discover',
    suggestion: 'Add descriptive alt text to all images',
  },
  {
    id: '2',
    severity: 'error',
    code: 'META_DESC_SHORT',
    message: '5 pages have short meta descriptions',
    suggestion: 'Expand meta descriptions to 150-160 characters',
  },
  {
    id: '3',
    severity: 'warning',
    code: 'H1_MISSING',
    message: '2 pages missing H1 heading',
    url: '/pricing',
    suggestion: 'Add a single H1 heading to each page',
  },
  {
    id: '4',
    severity: 'warning',
    code: 'INTERNAL_LINKS_LOW',
    message: '8 pages have fewer than 3 internal links',
    suggestion: 'Add more internal links to improve navigation',
  },
];

const mockVitals: CoreWebVitals = {
  lcp: { value: 2100, rating: 'good' },
  fid: { value: 45, rating: 'good' },
  cls: { value: 0.08, rating: 'good' },
  ttfb: { value: 650, rating: 'good' },
};

const mockRedirects: Redirect[] = [
  {
    id: '1',
    source: '/old-pricing',
    destination: '/pricing',
    type: 301,
    hits: 1250,
    enabled: true,
  },
  { id: '2', source: '/signup', destination: '/register', type: 301, hits: 3420, enabled: true },
  { id: '3', source: '/app', destination: '/download', type: 302, hits: 890, enabled: true },
];

const mockKeywords: KeywordRanking[] = [
  {
    keyword: 'premium dating app',
    position: 3,
    previousPosition: 5,
    url: '/',
    searchVolume: 12000,
  },
  {
    keyword: 'best dating app 2026',
    position: 7,
    previousPosition: 12,
    url: '/',
    searchVolume: 8500,
  },
  {
    keyword: 'verified dating profiles',
    position: 4,
    previousPosition: 4,
    url: '/features',
    searchVolume: 5200,
  },
  {
    keyword: 'safe online dating',
    position: 8,
    previousPosition: 6,
    url: '/safety',
    searchVolume: 9800,
  },
  {
    keyword: 'dating app with video calls',
    position: 2,
    previousPosition: 3,
    url: '/features',
    searchVolume: 4300,
  },
];

// Score color utility
const getScoreColor = (score: number): string => {
  if (score >= 90) return '#10b981'; // green
  if (score >= 70) return '#f59e0b'; // yellow
  if (score >= 50) return '#f97316'; // orange
  return '#ef4444'; // red
};

const getRatingColor = (rating: 'good' | 'needs-improvement' | 'poor'): string => {
  switch (rating) {
    case 'good':
      return '#10b981';
    case 'needs-improvement':
      return '#f59e0b';
    case 'poor':
      return '#ef4444';
  }
};

const getSeverityColor = (severity: 'critical' | 'error' | 'warning'): string => {
  switch (severity) {
    case 'critical':
      return '#ef4444';
    case 'error':
      return '#f97316';
    case 'warning':
      return '#f59e0b';
  }
};

// Components
const ScoreCard: React.FC<{ title: string; score: number; subtitle?: string }> = ({
  title,
  score,
  subtitle,
}) => (
  <div
    style={{
      background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>{title}</div>
    <div
      style={{
        fontSize: '36px',
        fontWeight: 'bold',
        color: getScoreColor(score),
        lineHeight: 1,
      }}
    >
      {score}
    </div>
    {subtitle && (
      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{subtitle}</div>
    )}
  </div>
);

const VitalCard: React.FC<{
  name: string;
  value: number;
  unit: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}> = ({ name, value, unit, rating }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      padding: '16px',
      borderLeft: `4px solid ${getRatingColor(rating)}`,
    }}
  >
    <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase' }}>{name}</div>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', marginTop: '4px' }}>
      {value}
      {unit}
    </div>
    <div
      style={{
        fontSize: '11px',
        color: getRatingColor(rating),
        marginTop: '4px',
        textTransform: 'capitalize',
      }}
    >
      {rating.replace('-', ' ')}
    </div>
  </div>
);

const IssueRow: React.FC<{ issue: SEOIssue }> = ({ issue }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      padding: '12px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      gap: '12px',
    }}
  >
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: getSeverityColor(issue.severity),
        marginTop: '6px',
        flexShrink: 0,
      }}
    />
    <div style={{ flex: 1 }}>
      <div style={{ color: '#fff', fontSize: '14px' }}>{issue.message}</div>
      {issue.suggestion && (
        <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
          {issue.suggestion}
        </div>
      )}
    </div>
    <div
      style={{
        fontSize: '11px',
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: `${getSeverityColor(issue.severity)}20`,
        color: getSeverityColor(issue.severity),
        textTransform: 'uppercase',
      }}
    >
      {issue.severity}
    </div>
  </div>
);

const AdminSEOPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'audit' | 'keywords' | 'redirects' | 'vitals'
  >('overview');
  const [healthScore, setHealthScore] = useState<SEOHealthScore>(mockHealthScore);
  const [issues, setIssues] = useState<SEOIssue[]>(mockIssues);
  const [vitals, setVitals] = useState<CoreWebVitals>(mockVitals);
  const [redirects, setRedirects] = useState<Redirect[]>(mockRedirects);
  const [keywords, setKeywords] = useState<KeywordRanking[]>(mockKeywords);
  const [auditUrl, setAuditUrl] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);

  // New redirect form
  const [newRedirect, setNewRedirect] = useState({
    source: '',
    destination: '',
    type: 301 as 301 | 302,
  });

  const runAudit = async () => {
    if (!auditUrl) return;
    setIsAuditing(true);
    // In production, this would call the SEO service API
    setTimeout(() => {
      setIsAuditing(false);
      alert(`Audit completed for ${auditUrl}`);
    }, 2000);
  };

  const addRedirect = () => {
    if (!newRedirect.source || !newRedirect.destination) return;
    const redirect: Redirect = {
      id: Date.now().toString(),
      ...newRedirect,
      hits: 0,
      enabled: true,
    };
    setRedirects([redirect, ...redirects]);
    setNewRedirect({ source: '', destination: '', type: 301 });
  };

  const toggleRedirect = (id: string) => {
    setRedirects(redirects.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const deleteRedirect = (id: string) => {
    if (confirm('Are you sure you want to delete this redirect?')) {
      setRedirects(redirects.filter((r) => r.id !== id));
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'audit', label: 'Site Audit' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'redirects', label: 'Redirects' },
    { id: 'vitals', label: 'Web Vitals' },
  ] as const;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', margin: 0 }}>
          SEO Dashboard
        </h1>
        <p style={{ color: '#9ca3af', marginTop: '8px' }}>
          Monitor and optimize your search engine performance
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '12px',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(236,72,153,0.2)' : 'transparent',
              color: activeTab === tab.id ? '#ec4899' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Health Score Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <ScoreCard title="Overall Score" score={healthScore.overall} subtitle="SEO Health" />
            <ScoreCard title="Technical" score={healthScore.technical} />
            <ScoreCard title="Content" score={healthScore.content} />
            <ScoreCard title="Performance" score={healthScore.performance} />
            <ScoreCard title="Mobile" score={healthScore.mobile} />
            <ScoreCard title="Security" score={healthScore.security} />
          </div>

          {/* Issues Summary */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                Issues Found
              </h2>
              <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                <span style={{ color: '#ef4444' }}>
                  {issues.filter((i) => i.severity === 'critical').length} Critical
                </span>
                <span style={{ color: '#f97316' }}>
                  {issues.filter((i) => i.severity === 'error').length} Errors
                </span>
                <span style={{ color: '#f59e0b' }}>
                  {issues.filter((i) => i.severity === 'warning').length} Warnings
                </span>
              </div>
            </div>
            <div>
              {issues.slice(0, 5).map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
            {issues.length > 5 && (
              <div style={{ padding: '12px 20px', textAlign: 'center' }}>
                <button
                  onClick={() => setActiveTab('audit')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ec4899',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  View all {issues.length} issues
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Core Web Vitals Summary */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h3
                style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}
              >
                Core Web Vitals
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <VitalCard
                  name="LCP"
                  value={vitals.lcp.value}
                  unit="ms"
                  rating={vitals.lcp.rating}
                />
                <VitalCard
                  name="FID"
                  value={vitals.fid.value}
                  unit="ms"
                  rating={vitals.fid.rating}
                />
                <VitalCard name="CLS" value={vitals.cls.value} unit="" rating={vitals.cls.rating} />
                <VitalCard
                  name="TTFB"
                  value={vitals.ttfb.value}
                  unit="ms"
                  rating={vitals.ttfb.rating}
                />
              </div>
            </div>

            {/* Top Keywords */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h3
                style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}
              >
                Top Keywords
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {keywords.slice(0, 4).map((kw, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontSize: '14px' }}>{kw.keyword}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px' }}>
                        {kw.searchVolume.toLocaleString()} searches/mo
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
                        #{kw.position}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color:
                            kw.position < kw.previousPosition
                              ? '#10b981'
                              : kw.position > kw.previousPosition
                                ? '#ef4444'
                                : '#6b7280',
                        }}
                      >
                        {kw.position < kw.previousPosition
                          ? '↑'
                          : kw.position > kw.previousPosition
                            ? '↓'
                            : '→'}
                        {Math.abs(kw.position - kw.previousPosition) || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div>
          {/* Audit Form */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}
            >
              Run SEO Audit
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="url"
                value={auditUrl}
                onChange={(e) => setAuditUrl(e.target.value)}
                placeholder="Enter URL to audit (e.g., https://flamoral.com/pricing)"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={runAudit}
                disabled={isAuditing || !auditUrl}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isAuditing
                    ? '#4b5563'
                    : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: isAuditing || !auditUrl ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {isAuditing ? 'Auditing...' : 'Run Audit'}
              </button>
            </div>
          </div>

          {/* All Issues */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                All Issues ({issues.length})
              </h2>
            </div>
            <div>
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === 'keywords' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
              Keyword Rankings
            </h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    color: '#9ca3af',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  KEYWORD
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  POSITION
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  CHANGE
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'right',
                    color: '#9ca3af',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  VOLUME
                </th>
                <th
                  style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    color: '#9ca3af',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  URL
                </th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw, i) => {
                const change = kw.previousPosition - kw.position;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '16px 20px', color: '#fff', fontSize: '14px' }}>
                      {kw.keyword}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color:
                            kw.position <= 3 ? '#10b981' : kw.position <= 10 ? '#f59e0b' : '#fff',
                        }}
                      >
                        {kw.position}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span
                        style={{
                          color: change > 0 ? '#10b981' : change < 0 ? '#ef4444' : '#6b7280',
                          fontSize: '14px',
                        }}
                      >
                        {change > 0 ? `↑${change}` : change < 0 ? `↓${Math.abs(change)}` : '—'}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '16px 20px',
                        textAlign: 'right',
                        color: '#9ca3af',
                        fontSize: '14px',
                      }}
                    >
                      {kw.searchVolume.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#6b7280', fontSize: '14px' }}>
                      {kw.url}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Redirects Tab */}
      {activeTab === 'redirects' && (
        <div>
          {/* Add Redirect Form */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}
            >
              Add New Redirect
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newRedirect.source}
                onChange={(e) => setNewRedirect({ ...newRedirect, source: e.target.value })}
                placeholder="Source path (e.g., /old-page)"
                style={{
                  flex: '1 1 200px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
              <input
                type="text"
                value={newRedirect.destination}
                onChange={(e) => setNewRedirect({ ...newRedirect, destination: e.target.value })}
                placeholder="Destination path (e.g., /new-page)"
                style={{
                  flex: '1 1 200px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
              <select
                value={newRedirect.type}
                onChange={(e) =>
                  setNewRedirect({ ...newRedirect, type: parseInt(e.target.value) as 301 | 302 })
                }
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  fontSize: '14px',
                }}
              >
                <option value={301}>301 (Permanent)</option>
                <option value={302}>302 (Temporary)</option>
              </select>
              <button
                onClick={addRedirect}
                disabled={!newRedirect.source || !newRedirect.destination}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background:
                    !newRedirect.source || !newRedirect.destination
                      ? '#4b5563'
                      : 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  color: '#fff',
                  fontWeight: '600',
                  cursor:
                    !newRedirect.source || !newRedirect.destination ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                Add Redirect
              </button>
            </div>
          </div>

          {/* Redirects List */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', margin: 0 }}>
                Active Redirects ({redirects.length})
              </h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      color: '#9ca3af',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    SOURCE
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    TYPE
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'left',
                      color: '#9ca3af',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    DESTINATION
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'right',
                      color: '#9ca3af',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    HITS
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    STATUS
                  </th>
                  <th
                    style={{
                      padding: '12px 20px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {redirects.map((redirect) => (
                  <tr
                    key={redirect.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <td
                      style={{
                        padding: '16px 20px',
                        color: '#fff',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {redirect.source}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background:
                            redirect.type === 301 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                          color: redirect.type === 301 ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {redirect.type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '16px 20px',
                        color: '#9ca3af',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {redirect.destination}
                    </td>
                    <td
                      style={{
                        padding: '16px 20px',
                        textAlign: 'right',
                        color: '#9ca3af',
                        fontSize: '14px',
                      }}
                    >
                      {redirect.hits.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleRedirect(redirect.id)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: redirect.enabled
                            ? 'rgba(16,185,129,0.2)'
                            : 'rgba(107,114,128,0.2)',
                          color: redirect.enabled ? '#10b981' : '#6b7280',
                        }}
                      >
                        {redirect.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <button
                        onClick={() => deleteRedirect(redirect.id)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: 'rgba(239,68,68,0.2)',
                          color: '#ef4444',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Web Vitals Tab */}
      {activeTab === 'vitals' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            <VitalCard
              name="Largest Contentful Paint (LCP)"
              value={vitals.lcp.value}
              unit="ms"
              rating={vitals.lcp.rating}
            />
            <VitalCard
              name="First Input Delay (FID)"
              value={vitals.fid.value}
              unit="ms"
              rating={vitals.fid.rating}
            />
            <VitalCard
              name="Cumulative Layout Shift (CLS)"
              value={vitals.cls.value}
              unit=""
              rating={vitals.cls.rating}
            />
            <VitalCard
              name="Time to First Byte (TTFB)"
              value={vitals.ttfb.value}
              unit="ms"
              rating={vitals.ttfb.rating}
            />
          </div>

          {/* Recommendations */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h3
              style={{ fontSize: '16px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}
            >
              Performance Recommendations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  title: 'Optimize images',
                  description: 'Convert images to WebP format and enable lazy loading',
                  impact: 'High',
                },
                {
                  title: 'Enable text compression',
                  description: 'Use gzip or Brotli compression for text assets',
                  impact: 'Medium',
                },
                {
                  title: 'Preload key requests',
                  description: 'Preload fonts and critical CSS',
                  impact: 'Medium',
                },
                {
                  title: 'Reduce JavaScript execution time',
                  description: 'Split code and defer non-critical scripts',
                  impact: 'High',
                },
              ].map((rec, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                      {rec.title}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '2px' }}>
                      {rec.description}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background:
                        rec.impact === 'High' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      color: rec.impact === 'High' ? '#ef4444' : '#f59e0b',
                    }}
                  >
                    {rec.impact} Impact
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSEOPage;
