/**
 * Discovery Feature Page
 * Features: Grid/Swipe toggle, Curated Picks, Passport Mode, Advanced Search
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FiSliders, FiGlobe, FiStar, FiMapPin, FiGrid, FiLayers } from 'react-icons/fi';

// Components
import { Navigation } from '../../components/Navigation';
import FlamoralBackground from '../../components/theme/FlamoralBackground';
import { ProfileGrid } from '../../components/Discovery/ProfileGrid';
import { ViewToggle, DiscoveryViewMode } from '../../components/Discovery/ViewToggle';
import { CuratedPicks } from '../../components/Discovery/CuratedPicks';
import { PassportMode } from '../../components/Discovery/PassportMode';
import { AdvancedSearchUI, SearchFilters, FilterPreset } from '../../components/Discovery/AdvancedSearchUI';
import { SwipeCard } from '../../components/SwipeCard';

// Services
import { discoveryService, DiscoveryProfile } from '../../services/discovery.service';
import { curatedPicksService, CuratedPick } from '../../services/curated-picks.service';
import { passportService, PassportStatus, PopularDestination, PassportLocation } from '../../services/passport.service';

type DiscoveryTab = 'discover' | 'picks' | 'passport';

const PageContainer = styled.div`
  min-height: 100vh;
`;

const MainContent = styled.main`
  max-width: 800px;
  margin: 0 auto;
  padding: 16px;
`;

const TabNav = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const TabButton = styled.button<{ active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: ${props => props.active
    ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)'
    : 'transparent'
  };
  border: none;
  border-radius: 8px;
  color: ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: white;
    background: ${props => props.active
      ? 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)'
      : 'rgba(255, 255, 255, 0.1)'
    };
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ControlBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const FilterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 107, 107, 0.3);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const PassportIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(78, 205, 196, 0.15);
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 20px;
  font-size: 13px;
  color: #4ECDC4;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const StatsBar = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 16px;
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
`;

const StatItem = styled.div`
  p:first-child {
    font-size: 24px;
    font-weight: 700;
    color: #FF6B6B;
    margin: 0;
  }

  p:last-child {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    margin: 4px 0 0 0;
  }

  &:nth-child(2) p:first-child {
    color: #4ECDC4;
  }

  &:nth-child(3) p:first-child {
    color: #A78BFA;
  }
`;

const SwipeCardContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);

  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
    opacity: 0.4;
  }

  h3 {
    font-size: 20px;
    margin-bottom: 8px;
    color: white;
  }

  p {
    font-size: 14px;
    max-width: 300px;
    margin: 0 auto;
  }
`;

const MatchModal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const MatchContent = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 24px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: scaleIn 0.3s ease-out;

  @keyframes scaleIn {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .emoji {
    font-size: 64px;
    margin-bottom: 20px;
  }

  h2 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 12px 0;
  }

  p {
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 24px 0;
    font-size: 16px;
  }

  img {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid #FF6B6B;
    margin-bottom: 24px;
  }

  .buttons {
    display: flex;
    gap: 12px;

    button {
      flex: 1;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &.primary {
        background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
        border: none;
        color: white;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
        }
      }

      &.secondary {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;

        &:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      }
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(255, 107, 107, 0.2);
    border-top-color: #FF6B6B;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const DiscoveryFeaturePage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('discover');
  const [viewMode, setViewMode] = useState<DiscoveryViewMode>('swipe');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  // Match modal state
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);

  // Curated picks state
  const [curatedPicks, setCuratedPicks] = useState<CuratedPick[]>([]);
  const [picksExpiry, setPicksExpiry] = useState<string>('');
  const [picksTier, setPicksTier] = useState<string>('free');
  const [picksLoading, setPicksLoading] = useState(false);
  const [picksError, setPicksError] = useState<string | null>(null);

  // Passport mode state
  const [passportStatus, setPassportStatus] = useState<PassportStatus | null>(null);
  const [popularDestinations, setPopularDestinations] = useState<PopularDestination[]>([]);
  const [passportLoading, setPassportLoading] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);

  // Filter presets state
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);
  const [activeFilters, setActiveFilters] = useState<SearchFilters | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProfiles(),
        loadStats(),
        loadCuratedPicks(),
        loadPassportStatus(),
        loadPopularDestinations(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const data = await discoveryService.getRecommendations();
      setProfiles(data.profiles);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await discoveryService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadCuratedPicks = async () => {
    setPicksLoading(true);
    setPicksError(null);
    try {
      const data = await curatedPicksService.getDailyPicks();
      setCuratedPicks(data.picks);
      setPicksExpiry(data.expiresAt);
      setPicksTier(data.tier);
    } catch (error: any) {
      console.error('Failed to load curated picks:', error);
      setPicksError(error.message || 'Failed to load curated picks. Please try again.');
    } finally {
      setPicksLoading(false);
    }
  };

  const loadPassportStatus = async () => {
    setPassportLoading(true);
    setPassportError(null);
    try {
      const status = await passportService.getStatus();
      setPassportStatus(status);
    } catch (error: any) {
      console.error('Failed to load passport status:', error);
      setPassportError(error.message || 'Failed to load passport status.');
    } finally {
      setPassportLoading(false);
    }
  };

  const loadPopularDestinations = async () => {
    try {
      const destinations = await passportService.getPopularDestinations();
      setPopularDestinations(destinations);
    } catch (error: any) {
      console.error('Failed to load popular destinations:', error);
      // Don't set error here, destinations are not critical
    }
  };

  // Swipe handlers
  const handleLike = useCallback(async (userId?: string) => {
    const targetId = userId || profiles[currentIndex]?.user_id;
    if (!targetId) return;

    try {
      const result = await discoveryService.swipe(targetId, 'like');
      if (result.isMatch) {
        setMatchedProfile(result.match);
        setShowMatch(true);
      }
      if (!userId) nextProfile();
    } catch (error) {
      console.error('Like failed:', error);
    }
  }, [profiles, currentIndex]);

  const handlePass = useCallback(async (userId?: string) => {
    const targetId = userId || profiles[currentIndex]?.user_id;
    if (!targetId) return;

    try {
      await discoveryService.swipe(targetId, 'pass');
      if (!userId) nextProfile();
    } catch (error) {
      console.error('Pass failed:', error);
    }
  }, [profiles, currentIndex]);

  const handleSuperLike = useCallback(async (userId?: string) => {
    const targetId = userId || profiles[currentIndex]?.user_id;
    if (!targetId) return;

    try {
      const result = await discoveryService.swipe(targetId, 'super_like');
      if (result.isMatch) {
        setMatchedProfile(result.match);
        setShowMatch(true);
      }
      if (!userId) nextProfile();
    } catch (error) {
      console.error('Super like failed:', error);
    }
  }, [profiles, currentIndex]);

  const nextProfile = useCallback(() => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      loadProfiles();
      setCurrentIndex(0);
    }
  }, [currentIndex, profiles.length]);

  // Profile click handler for grid view
  const handleProfileClick = useCallback((profile: DiscoveryProfile) => {
    console.log('Profile clicked:', profile);
  }, []);

  // Curated pick handlers
  const handlePickClick = useCallback((pick: CuratedPick) => {
    curatedPicksService.markViewed(pick.pickId);
    console.log('Pick clicked:', pick);
  }, []);

  const handlePickLike = useCallback(async (userId: string, pickId: string) => {
    await handleLike(userId);
    curatedPicksService.markActedUpon(pickId);
  }, [handleLike]);

  const handleRefreshPicks = useCallback(async () => {
    setPicksLoading(true);
    setPicksError(null);
    try {
      const data = await curatedPicksService.regeneratePicks();
      setCuratedPicks(data.picks);
      setPicksExpiry(data.expiresAt);
    } catch (error: any) {
      console.error('Failed to refresh picks:', error);
      setPicksError(error.message || 'Failed to refresh picks. Please try again.');
    } finally {
      setPicksLoading(false);
    }
  }, []);

  // Passport handlers
  const handleSetPassportLocation = useCallback(async (location: PassportLocation) => {
    try {
      await passportService.setLocation(location);
      await loadPassportStatus();
      await loadProfiles();
    } catch (error: any) {
      console.error('Failed to set passport location:', error);
      throw error; // Re-throw so component can handle it
    }
  }, []);

  const handleDeactivatePassport = useCallback(async () => {
    try {
      await passportService.deactivate();
      await loadPassportStatus();
      await loadProfiles();
    } catch (error: any) {
      console.error('Failed to deactivate passport:', error);
      throw error; // Re-throw so component can handle it
    }
  }, []);

  const handleSearchLocations = useCallback(async (query: string) => {
    return passportService.searchLocations(query);
  }, []);

  // Advanced search handlers
  const handleApplyFilters = useCallback((filters: SearchFilters) => {
    setActiveFilters(filters);
    loadProfiles();
  }, []);

  const handleSavePreset = useCallback(async (name: string, filters: SearchFilters) => {
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name,
      filters,
      isDefault: false,
      createdAt: new Date(),
    };
    setFilterPresets(prev => [...prev, newPreset]);
  }, []);

  const handleDeletePreset = useCallback(async (id: string) => {
    setFilterPresets(prev => prev.filter(p => p.id !== id));
  }, []);

  const currentProfile = profiles[currentIndex];

  return (
    <FlamoralBackground>
      <PageContainer>
        <Navigation />

        <MainContent>
          {/* Tab Navigation */}
          <TabNav>
            <TabButton
              active={activeTab === 'discover'}
              onClick={() => setActiveTab('discover')}
            >
              <FiLayers />
              Discover
            </TabButton>
            <TabButton
              active={activeTab === 'picks'}
              onClick={() => setActiveTab('picks')}
            >
              <FiStar />
              Today's Picks
            </TabButton>
            <TabButton
              active={activeTab === 'passport'}
              onClick={() => setActiveTab('passport')}
            >
              <FiGlobe />
              Passport
            </TabButton>
          </TabNav>

          {/* Stats Bar */}
          {stats && activeTab === 'discover' && (
            <StatsBar>
              <StatItem>
                <p>{stats.remainingLikes}</p>
                <p>Likes Left</p>
              </StatItem>
              <StatItem>
                <p>{stats.remainingSuperLikes}</p>
                <p>Super Likes</p>
              </StatItem>
              <StatItem>
                <p>{stats.remainingBoosts}</p>
                <p>Boosts</p>
              </StatItem>
            </StatsBar>
          )}

          {/* Control Bar for Discovery Tab */}
          {activeTab === 'discover' && (
            <ControlBar>
              <ControlGroup>
                <ViewToggle
                  currentView={viewMode}
                  onViewChange={setViewMode}
                />
              </ControlGroup>
              <ControlGroup>
                {passportStatus?.activeLocation && (
                  <PassportIndicator>
                    <FiMapPin />
                    {passportStatus.activeLocation.city}
                  </PassportIndicator>
                )}
                <FilterButton onClick={() => setShowAdvancedSearch(true)}>
                  <FiSliders />
                  Filters
                </FilterButton>
              </ControlGroup>
            </ControlBar>
          )}

          {/* Main Content */}
          {loading ? (
            <LoadingSpinner>
              <div className="spinner" />
            </LoadingSpinner>
          ) : (
            <>
              {/* Discovery Tab */}
              {activeTab === 'discover' && (
                <>
                  {viewMode === 'grid' ? (
                    <ProfileGrid
                      profiles={profiles}
                      onLike={handleLike}
                      onPass={handlePass}
                      onSuperLike={handleSuperLike}
                      onProfileClick={handleProfileClick}
                      columns={2}
                      hasMore={true}
                      onLoadMore={loadProfiles}
                    />
                  ) : (
                    <SwipeCardContainer>
                      {currentProfile ? (
                        <SwipeCard
                          profile={currentProfile}
                          onLike={() => handleLike()}
                          onPass={() => handlePass()}
                          onSuperLike={() => handleSuperLike()}
                        />
                      ) : (
                        <EmptyState>
                          <FiStar />
                          <h3>No more profiles</h3>
                          <p>Check back later for new matches or adjust your filters</p>
                        </EmptyState>
                      )}
                    </SwipeCardContainer>
                  )}
                </>
              )}

              {/* Curated Picks Tab */}
              {activeTab === 'picks' && (
                <CuratedPicks
                  picks={curatedPicks}
                  expiresAt={picksExpiry}
                  tier={picksTier}
                  onPickClick={handlePickClick}
                  onLike={handlePickLike}
                  onRefresh={handleRefreshPicks}
                  loading={picksLoading}
                  error={picksError}
                />
              )}

              {/* Passport Tab */}
              {activeTab === 'passport' && (
                <PassportMode
                  status={passportStatus}
                  popularDestinations={popularDestinations}
                  onSetLocation={handleSetPassportLocation}
                  onDeactivate={handleDeactivatePassport}
                  onSearch={handleSearchLocations}
                  onUpgradeClick={() => navigate('/subscription')}
                  loading={passportLoading}
                  error={passportError}
                />
              )}
            </>
          )}
        </MainContent>

        {/* Advanced Search Modal */}
        <AdvancedSearchUI
          isOpen={showAdvancedSearch}
          initialFilters={activeFilters || undefined}
          presets={filterPresets}
          onApply={handleApplyFilters}
          onSavePreset={handleSavePreset}
          onDeletePreset={handleDeletePreset}
          onClose={() => setShowAdvancedSearch(false)}
        />

        {/* Match Modal */}
        {showMatch && matchedProfile && (
          <MatchModal onClick={() => setShowMatch(false)}>
            <MatchContent onClick={(e) => e.stopPropagation()}>
              <div className="emoji">🎉</div>
              <h2>It's a Match!</h2>
              <p>You and {matchedProfile.matchedUser?.name} liked each other!</p>
              {matchedProfile.matchedUser?.photoUrl && (
                <img
                  src={matchedProfile.matchedUser.photoUrl}
                  alt={matchedProfile.matchedUser.name}
                />
              )}
              <div className="buttons">
                <button
                  className="primary"
                  onClick={() => {
                    setShowMatch(false);
                    navigate('/messages');
                  }}
                >
                  Send Message
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setShowMatch(false);
                    nextProfile();
                  }}
                >
                  Keep Swiping
                </button>
              </div>
            </MatchContent>
          </MatchModal>
        )}
      </PageContainer>
    </FlamoralBackground>
  );
};

export default DiscoveryFeaturePage;
