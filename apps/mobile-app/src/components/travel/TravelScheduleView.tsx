import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, differenceInDays } from 'date-fns';

interface TravelDestination {
  id: string;
  city: string;
  state?: string;
  country: string;
  country_code: string;
  start_date: string;
  end_date: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  is_active: boolean;
  show_on_profile: boolean;
  match_before_arrival: boolean;
  days_until_arrival?: number;
  days_remaining?: number;
  travel_notes?: string;
}

interface TravelScheduleViewProps {
  userId: string;
  onAddDestination: () => void;
  onEditDestination: (destination: TravelDestination) => void;
}

export const TravelScheduleView: React.FC<TravelScheduleViewProps> = ({
  userId,
  onAddDestination,
  onEditDestination,
}) => {
  const [destinations, setDestinations] = useState<TravelDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDestinations();
  }, [userId]);

  const fetchDestinations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch('/api/travel-mode/destinations', {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDestinations(data);
      }
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelDestination = async (destinationId: string) => {
    Alert.alert('Cancel Trip', 'Are you sure you want to cancel this trip?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`/api/travel-mode/destinations/${destinationId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${await getAuthToken()}`,
              },
            });

            if (response.ok) {
              fetchDestinations();
            } else {
              Alert.alert('Error', 'Failed to cancel trip');
            }
          } catch (error) {
            console.error('Failed to cancel destination:', error);
            Alert.alert('Error', 'Failed to cancel trip');
          }
        },
      },
    ]);
  };

  const getAuthToken = async (): Promise<string> => {
    // Implement your auth token retrieval logic
    return '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'scheduled':
        return '#2196F3';
      case 'completed':
        return '#9E9E9E';
      case 'cancelled':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'airplane';
      case 'scheduled':
        return 'calendar-clock';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'cancel';
      default:
        return 'help-circle';
    }
  };

  const renderDestinationItem = ({ item }: { item: TravelDestination }) => {
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);
    const duration = differenceInDays(endDate, startDate);

    return (
      <TouchableOpacity
        style={[styles.destinationCard, item.is_active && styles.activeDestinationCard]}
        onPress={() => onEditDestination(item)}
      >
        <View style={styles.destinationHeader}>
          <View style={styles.destinationTitleContainer}>
            <Icon name={getStatusIcon(item.status)} size={24} color={getStatusColor(item.status)} />
            <View style={styles.destinationTitleText}>
              <Text style={styles.destinationCity}>
                {item.city}
                {item.state ? `, ${item.state}` : ''}
              </Text>
              <Text style={styles.destinationCountry}>{item.country}</Text>
            </View>
          </View>
          {item.is_active && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>

        <View style={styles.destinationDates}>
          <View style={styles.dateItem}>
            <Icon name="calendar-start" size={16} color="#666" />
            <Text style={styles.dateText}>{format(startDate, 'MMM dd, yyyy')}</Text>
          </View>
          <Icon name="arrow-right" size={16} color="#ccc" />
          <View style={styles.dateItem}>
            <Icon name="calendar-end" size={16} color="#666" />
            <Text style={styles.dateText}>{format(endDate, 'MMM dd, yyyy')}</Text>
          </View>
        </View>

        <View style={styles.destinationInfo}>
          <View style={styles.infoItem}>
            <Icon name="clock-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{duration} days</Text>
          </View>

          {item.days_until_arrival !== undefined && item.days_until_arrival > 0 && (
            <View style={styles.infoItem}>
              <Icon name="airplane-clock" size={16} color="#666" />
              <Text style={styles.infoText}>Arrives in {item.days_until_arrival} days</Text>
            </View>
          )}

          {item.days_remaining !== undefined && item.days_remaining > 0 && (
            <View style={styles.infoItem}>
              <Icon name="timer-sand" size={16} color="#666" />
              <Text style={styles.infoText}>{item.days_remaining} days remaining</Text>
            </View>
          )}
        </View>

        {item.travel_notes && (
          <Text style={styles.travelNotes} numberOfLines={2}>
            {item.travel_notes}
          </Text>
        )}

        <View style={styles.destinationActions}>
          <View style={styles.badges}>
            {item.show_on_profile && (
              <View style={styles.badge}>
                <Icon name="eye" size={12} color="#666" />
                <Text style={styles.badgeText}>Visible on profile</Text>
              </View>
            )}
            {item.match_before_arrival && (
              <View style={styles.badge}>
                <Icon name="heart-flash" size={12} color="#666" />
                <Text style={styles.badgeText}>Early matching</Text>
              </View>
            )}
          </View>

          {item.status === 'scheduled' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelDestination(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="airplane-off" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Travel Plans Yet</Text>
      <Text style={styles.emptyText}>
        Add your first destination to start matching with people in different cities
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={onAddDestination}>
        <Icon name="plus" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Destination</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Travel Plans</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onAddDestination}>
          <Icon name="plus" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={destinations}
        keyExtractor={(item) => item.id}
        renderItem={renderDestinationItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={() => fetchDestinations(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  destinationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeDestinationCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  destinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  destinationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  destinationTitleText: {
    marginLeft: 12,
    flex: 1,
  },
  destinationCity: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  destinationCountry: {
    fontSize: 14,
    color: '#666',
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  destinationDates: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  destinationInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  travelNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  destinationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});
