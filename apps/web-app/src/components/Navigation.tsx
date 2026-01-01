import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const mainNavItems = [
    { path: '/discover', label: 'Discover', icon: 'compass' },
    { path: '/matches', label: 'Matches', icon: 'heart' },
    { path: '/messages', label: 'Messages', icon: 'chat' },
    { path: '/rewards', label: 'Rewards', icon: 'gift' },
  ];

  const moreNavItems = [
    { path: '/communities', label: 'Communities', icon: 'users', color: 'text-ember-500' },
    { path: '/speed-dating', label: 'Speed Dating', icon: 'video', color: 'text-flame-500' },
    { path: '/referrals', label: 'Referrals', icon: 'share', color: 'text-green-500' },
    { path: '/subscription', label: 'Subscription', icon: 'crown', color: 'text-gold-500' },
    { path: '/safety', label: 'Safety Center', icon: 'shield', color: 'text-flame-400' },
    { path: '/profile', label: 'Profile', icon: 'user', color: 'text-charcoal-500' },
  ];

  const getIcon = (name: string, className: string = 'w-5 h-5') => {
    switch (name) {
      case 'compass':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        );
      case 'heart':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'chat':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'gift':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        );
      case 'users':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'video':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'share':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        );
      case 'crown':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l3.057 6.114 6.943-.886L12 12l6-4-2 13H8L6 8 3 12l2-9z" />
          </svg>
        );
      case 'shield':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'user':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'more':
        return (
          <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-[#111318] border-b border-white/8 sticky top-0 z-40 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo - Brand colors: Pink #FF2E93, Purple #7B61FF, Blue #2ED4FF */}
        <div
          onClick={() => navigate('/discover')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="navLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF2E93"/>
                <stop offset="50%" stopColor="#7B61FF"/>
                <stop offset="100%" stopColor="#2ED4FF"/>
              </linearGradient>
            </defs>
            <path d="M16 28.5l-1.9-1.7C7.2 20.5 3 16.8 3 12c0-4.1 3.2-7.5 7.3-7.5c2.3 0 4.5 1.1 6 2.8c1.4-1.7 3.6-2.8 6-2.8c4 0 7.3 3.4 7.3 7.5c0 4.8-4.2 8.5-11.1 14.8L16 28.5z" fill="url(#navLogoGrad)"/>
            <path d="M16 9c0 0-2 2-2 4.6c0 2 1.3 3.3 2 4c0.7-0.7 2-2 2-4C18 11 16 9 16 9z" fill="#FFFFFF" opacity="0.85"/>
          </svg>
          <h1 className="text-2xl font-heading font-bold text-gradient-flamoral">
            Flamoral
          </h1>
        </div>

        <nav className="flex items-center gap-1">
          {/* Main Nav Items */}
          {mainNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                isActive(item.path)
                  ? 'bg-[#FF2E93]/20 text-[#FF2E93] font-medium'
                  : 'text-white/70 hover:bg-white/5 hover:text-[#FF2E93]'
              }`}
            >
              {getIcon(item.icon)}
              <span className="hidden md:inline">{item.label}</span>
            </button>
          ))}

          {/* More Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                moreNavItems.some(item => isActive(item.path))
                  ? 'bg-[#FF2E93]/20 text-[#FF2E93] font-medium'
                  : 'text-white/70 hover:bg-white/5 hover:text-[#FF2E93]'
              }`}
            >
              {getIcon('more')}
              <span className="hidden md:inline">More</span>
            </button>

            {/* Dropdown - Dark theme */}
            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-[#1A1D24] rounded-xl shadow-lg border border-white/10 py-2 z-50">
                  {moreNavItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setShowMoreMenu(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                        isActive(item.path)
                          ? 'bg-[#FF2E93]/20 text-[#FF2E93]'
                          : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      <span className={isActive(item.path) ? 'text-[#FF2E93]' : item.color}>
                        {getIcon(item.icon)}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navigation;
