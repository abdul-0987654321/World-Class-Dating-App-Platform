import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Plane } from 'lucide-react';

interface City {
  id: string;
  city: string;
  state?: string;
  country: string;
  country_code: string;
  airport_code?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  display_name: string;
  traveler_count?: number;
}

interface DestinationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (destination: City) => void;
}

export const DestinationPicker: React.FC<DestinationPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [popularDestinations, setPopularDestinations] = useState<City[]>([]);
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'search'>('popular');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPopularDestinations();
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchCities(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setActiveTab('popular');
    }
  }, [searchQuery]);

  const fetchPopularDestinations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/travel-mode/popular-destinations?limit=20', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPopularDestinations(data);
      }
    } catch (error) {
      console.error('Failed to fetch popular destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchCities = async (query: string) => {
    try {
      setLoading(true);
      setActiveTab('search');

      const response = await fetch(
        `/api/v1/geocoding/search?query=${encodeURIComponent(query)}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Failed to search cities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDestination = (destination: City) => {
    onSelect(destination);
    onClose();
    setSearchQuery('');
  };

  if (!isOpen) return null;

  const destinations =
    activeTab === 'popular' ? popularDestinations : searchResults;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Choose Destination
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                placeholder="Search cities or airports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-96">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500" />
              </div>
            ) : (
              <>
                {activeTab === 'popular' && destinations.length > 0 && (
                  <div className="px-6 py-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Popular Destinations
                    </h3>
                  </div>
                )}

                {destinations.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {destinations.map((destination) => (
                      <button
                        key={destination.id}
                        onClick={() => handleSelectDestination(destination)}
                        className="w-full px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-red-500" />
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-gray-900 group-hover:text-red-500 transition-colors">
                              {destination.display_name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {destination.country}
                              {destination.airport_code &&
                                ` (${destination.airport_code})`}
                            </p>
                            {destination.traveler_count !== undefined && (
                              <p className="text-xs text-gray-500 mt-1">
                                {destination.traveler_count} travelers
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-gray-400 group-hover:text-red-500 transition-colors">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Plane className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">
                      {activeTab === 'search'
                        ? 'No cities found'
                        : 'No popular destinations available'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
