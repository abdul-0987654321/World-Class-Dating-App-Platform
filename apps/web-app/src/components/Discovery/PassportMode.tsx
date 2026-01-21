/**
 * Passport Mode Component
 * Allows premium users to browse profiles in different locations
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FiMapPin,
  FiGlobe,
  FiSearch,
  FiX,
  FiClock,
  FiUsers,
  FiNavigation,
  FiLock,
  FiChevronRight,
  FiAlertCircle,
  FiLoader,
} from 'react-icons/fi';
import {
  PassportLocation,
  PopularDestination,
  PassportStatus,
} from '../../services/passport.service';

export interface PassportModeProps {
  status: PassportStatus | null;
  popularDestinations: PopularDestination[];
  onSetLocation: (location: PassportLocation) => Promise<void>;
  onDeactivate: () => Promise<void>;
  onSearch: (query: string) => Promise<PassportLocation[]>;
  loading?: boolean;
  error?: string | null;
  onUpgradeClick?: () => void;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  padding: 16px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: #4ecdc4;
  }
`;

const ActiveLocationCard = styled.div`
  background: linear-gradient(135deg, rgba(78, 205, 196, 0.2) 0%, rgba(78, 205, 196, 0.1) 100%);
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  animation: ${fadeIn} 0.3s ease-out;
`;

const ActiveLocationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const LocationInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const LocationIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(78, 205, 196, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 24px;
    height: 24px;
    color: #4ecdc4;
  }
`;

const LocationText = styled.div`
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: white;
    margin: 0 0 4px 0;
  }

  p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
`;

const DeactivateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 107, 107, 0.3);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const TimeRemaining = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;

  svg {
    width: 16px;
    height: 16px;
    color: #4ecdc4;
  }

  span {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
  }
`;

const SearchSection = styled.div`
  margin-bottom: 24px;
`;

const SearchInputContainer = styled.div`
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 16px 14px 44px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 16px;
  outline: none;
  transition: all 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    border-color: rgba(78, 205, 196, 0.5);
    background: rgba(255, 255, 255, 0.15);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);

  svg {
    width: 20px;
    height: 20px;
  }
`;

const SearchResults = styled.div`
  margin-top: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 200px;
  overflow-y: auto;
`;

const SearchResultItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: transparent;
  border: none;
  color: white;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .city-info {
    display: flex;
    align-items: center;
    gap: 10px;

    svg {
      width: 16px;
      height: 16px;
      color: #4ecdc4;
    }

    span {
      font-size: 14px;
    }
  }

  .chevron {
    color: rgba(255, 255, 255, 0.4);

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 18px;
    height: 18px;
    color: #4ecdc4;
  }
`;

const DestinationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const DestinationCard = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(78, 205, 196, 0.3);
    transform: translateY(-2px);
  }

  .flag {
    font-size: 24px;
  }

  .info {
    flex: 1;
    min-width: 0;

    .city {
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .country {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 2px;
    }
  }

  .users {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);

    svg {
      width: 12px;
      height: 12px;
    }
  }
`;

const LockedOverlay = styled.div`
  position: relative;
  padding: 32px;
  text-align: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
`;

const LockIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: rgba(255, 107, 107, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 32px;
    height: 32px;
    color: #ff6b6b;
  }
`;

const LockedTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0 0 8px 0;
`;

const LockedDescription = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 20px 0;
  line-height: 1.5;
`;

const UpgradeButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.02);
    box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin-bottom: 16px;
  background: rgba(255, 107, 107, 0.15);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  color: #ff6b6b;
  font-size: 14px;

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  span {
    flex: 1;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.6);

  svg {
    width: 32px;
    height: 32px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const NoResultsMessage = styled.div`
  padding: 12px 16px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
`;

const SearchingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;

  svg {
    width: 16px;
    height: 16px;
    animation: spin 1s linear infinite;
  }
`;

const SavedLocationsList = styled.div`
  margin-top: 16px;
`;

const SavedLocationItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: white;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 8px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(78, 205, 196, 0.3);
  }

  .location-info {
    display: flex;
    align-items: center;
    gap: 10px;

    svg {
      width: 16px;
      height: 16px;
      color: #4ecdc4;
    }

    .text {
      font-size: 14px;
    }
  }

  .use-btn {
    font-size: 12px;
    color: #4ecdc4;
  }
`;

const getCountryFlag = (countryCode: string): string => {
  // Convert country code to flag emoji
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const formatUserCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};

export const PassportMode: React.FC<PassportModeProps> = ({
  status,
  popularDestinations,
  onSetLocation,
  onDeactivate,
  onSearch,
  loading = false,
  error = null,
  onUpgradeClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PassportLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }

      setSearching(true);
      setSearchError(null);
      try {
        const results = await onSearch(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchError('Failed to search locations. Please try again.');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [onSearch]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  const handleSelectLocation = async (location: PassportLocation) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await onSetLocation(location);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Failed to set location:', error);
      setActionError(error.message || 'Failed to set location. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await onDeactivate();
    } catch (error: any) {
      console.error('Failed to deactivate:', error);
      setActionError(error.message || 'Failed to return home. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Clear action error after 5 seconds
  useEffect(() => {
    if (actionError) {
      const timeout = setTimeout(() => setActionError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [actionError]);

  // Show locked state for non-premium users
  if (!status?.enabled) {
    return (
      <Container>
        <Header>
          <Title>
            <FiGlobe />
            Passport Mode
          </Title>
        </Header>

        <LockedOverlay>
          <LockIcon>
            <FiLock />
          </LockIcon>
          <LockedTitle>Unlock Passport Mode</LockedTitle>
          <LockedDescription>
            With Passport, you can teleport your location to anywhere in the world and match with
            people before you even arrive. Perfect for travel planning!
          </LockedDescription>
          <UpgradeButton onClick={onUpgradeClick}>
            <FiNavigation />
            Upgrade to Plus
          </UpgradeButton>
        </LockedOverlay>
      </Container>
    );
  }

  // Show loading state
  if (loading && !status) {
    return (
      <Container>
        <Header>
          <Title>
            <FiGlobe />
            Passport Mode
          </Title>
        </Header>
        <LoadingSpinner>
          <FiLoader />
        </LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <FiGlobe />
          Passport Mode
        </Title>
      </Header>

      {/* Error Banner */}
      {(error || actionError) && (
        <ErrorBanner>
          <FiAlertCircle />
          <span>{error || actionError}</span>
        </ErrorBanner>
      )}

      {/* Active Location Card */}
      {status?.activeLocation && (
        <ActiveLocationCard>
          <ActiveLocationHeader>
            <LocationInfo>
              <LocationIcon>
                <FiNavigation />
              </LocationIcon>
              <LocationText>
                <h3>
                  {status.activeLocation.city}, {status.activeLocation.country}
                </h3>
                <p>Your current virtual location</p>
              </LocationText>
            </LocationInfo>
            <DeactivateButton onClick={handleDeactivate} disabled={actionLoading}>
              {actionLoading ? (
                <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <FiX />
              )}
              {actionLoading ? 'Returning...' : 'Return Home'}
            </DeactivateButton>
          </ActiveLocationHeader>

          <TimeRemaining>
            <FiClock />
            <span>
              {status.remainingDays} {status.remainingDays === 1 ? 'day' : 'days'} remaining
            </span>
          </TimeRemaining>
        </ActiveLocationCard>
      )}

      {/* Saved Locations */}
      {status?.savedLocations && status.savedLocations.length > 0 && !status.activeLocation && (
        <SavedLocationsList>
          <SectionTitle>
            <FiMapPin />
            Recent Locations
          </SectionTitle>
          {status.savedLocations.slice(0, 3).map((loc, index) => (
            <SavedLocationItem
              key={`saved-${index}`}
              onClick={() => handleSelectLocation(loc)}
              disabled={actionLoading}
            >
              <div className="location-info">
                <FiMapPin />
                <span className="text">
                  {loc.city}, {loc.country}
                </span>
              </div>
              <span className="use-btn">Use</span>
            </SavedLocationItem>
          ))}
        </SavedLocationsList>
      )}

      {/* Search Section */}
      <SearchSection>
        <SearchInputContainer>
          <SearchIcon>
            <FiSearch />
          </SearchIcon>
          <SearchInput
            type="text"
            placeholder="Search for a city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={actionLoading}
          />
        </SearchInputContainer>

        {searching && (
          <SearchResults>
            <SearchingIndicator>
              <FiLoader />
              Searching...
            </SearchingIndicator>
          </SearchResults>
        )}

        {!searching && searchQuery.length >= 2 && searchResults.length === 0 && !searchError && (
          <SearchResults>
            <NoResultsMessage>No cities found matching "{searchQuery}"</NoResultsMessage>
          </SearchResults>
        )}

        {!searching && searchError && (
          <SearchResults>
            <NoResultsMessage style={{ color: '#FF6B6B' }}>{searchError}</NoResultsMessage>
          </SearchResults>
        )}

        {!searching && searchResults.length > 0 && (
          <SearchResults>
            {searchResults.map((result, index) => (
              <SearchResultItem
                key={`${result.city}-${index}`}
                onClick={() => handleSelectLocation(result)}
                disabled={actionLoading}
              >
                <div className="city-info">
                  <FiMapPin />
                  <span>
                    {result.city}, {result.country}
                  </span>
                </div>
                <div className="chevron">
                  {actionLoading ? (
                    <FiLoader style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <FiChevronRight />
                  )}
                </div>
              </SearchResultItem>
            ))}
          </SearchResults>
        )}
      </SearchSection>

      {/* Popular Destinations */}
      <SectionTitle>
        <FiGlobe />
        Popular Destinations
      </SectionTitle>
      {popularDestinations.length === 0 ? (
        <LoadingSpinner>
          <FiLoader />
        </LoadingSpinner>
      ) : (
        <DestinationsGrid>
          {popularDestinations.map((dest) => (
            <DestinationCard
              key={`${dest.city}-${dest.country}`}
              onClick={() =>
                handleSelectLocation({
                  city: dest.city,
                  country: dest.country,
                  latitude: dest.latitude,
                  longitude: dest.longitude,
                })
              }
              disabled={actionLoading}
            >
              <div className="flag">{getCountryFlag(dest.countryCode)}</div>
              <div className="info">
                <div className="city">{dest.city}</div>
                <div className="country">{dest.country}</div>
              </div>
              <div className="users">
                <FiUsers />
                {formatUserCount(dest.activeUsers)}
              </div>
            </DestinationCard>
          ))}
        </DestinationsGrid>
      )}
    </Container>
  );
};

export default PassportMode;
