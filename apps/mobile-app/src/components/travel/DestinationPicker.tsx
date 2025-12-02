import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
}

interface DestinationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (destination: City) => void;
}

export const DestinationPicker: React.FC<DestinationPickerProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [popularDestinations, setPopularDestinations] = useState<City[]>([]);
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'popular' | 'search'>('popular');

  useEffect(() => {
    if (visible) {
      fetchPopularDestinations();
    }
  }, [visible]);

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
      const response = await fetch('/api/travel-mode/popular-destinations?limit=20', {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
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

      // This would typically call a geocoding API like Google Places or Mapbox
      const response = await fetch(
        `/api/geocoding/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${await getAuthToken()}`,
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

  const getAuthToken = async (): Promise<string> => {
    // Implement your auth token retrieval logic
    return '';
  };

  const handleSelectDestination = (destination: City) => {
    onSelect(destination);
    onClose();
    setSearchQuery('');
  };

  const renderDestinationItem = ({ item }: { item: City }) => (
    <TouchableOpacity
      style={styles.destinationItem}
      onPress={() => handleSelectDestination(item)}
    >
      <View style={styles.destinationIcon}>
        <Icon name="map-marker" size={24} color="#FF6B6B" />
      </View>
      <View style={styles.destinationInfo}>
        <Text style={styles.destinationName}>{item.display_name}</Text>
        <Text style={styles.destinationCountry}>
          {item.country} {item.airport_code ? `(${item.airport_code})` : ''}
        </Text>
        {item.traveler_count !== undefined && (
          <Text style={styles.travelerCount}>
            {item.traveler_count} travelers
          </Text>
        )}
      </View>
      <Icon name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Destination</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search cities or airports..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
          </View>
        ) : (
          <FlatList
            data={activeTab === 'popular' ? popularDestinations : searchResults}
            keyExtractor={(item) => item.id}
            renderItem={renderDestinationItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              activeTab === 'popular' && popularDestinations.length > 0 ? (
                <Text style={styles.sectionTitle}>Popular Destinations</Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="airplane-off" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  {activeTab === 'search'
                    ? 'No cities found'
                    : 'No popular destinations available'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  destinationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  destinationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  destinationCountry: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  travelerCount: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
