import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TravelModeToggleProps {
  userId: string;
  onToggle?: (enabled: boolean) => void;
}

export const TravelModeToggle: React.FC<TravelModeToggleProps> = ({ userId, onToggle }) => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTraveling, setIsTraveling] = useState(false);

  useEffect(() => {
    fetchTravelModeStatus();
  }, [userId]);

  const fetchTravelModeStatus = async () => {
    try {
      const response = await fetch('/api/travel-mode/status', {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEnabled(data.settings.travel_mode_enabled);
        setIsTraveling(data.is_traveling);
      }
    } catch (error) {
      console.error('Failed to fetch travel mode status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (value: boolean) => {
    try {
      const response = await fetch('/api/travel-mode/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          travel_mode_enabled: value,
        }),
      });

      if (response.ok) {
        setEnabled(value);
        onToggle?.(value);
      } else {
        Alert.alert('Error', 'Failed to update travel mode settings');
      }
    } catch (error) {
      console.error('Failed to toggle travel mode:', error);
      Alert.alert('Error', 'Failed to update travel mode');
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // Implement your auth token retrieval logic
    return '';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="airplane" size={24} color={enabled ? '#FF6B6B' : '#999'} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Travel Mode</Text>
          <Text style={styles.subtitle}>
            {isTraveling ? 'Currently traveling' : 'Find matches in different locations'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#ccc', true: '#FFB6B6' }}
          thumbColor={enabled ? '#FF6B6B' : '#f4f3f4'}
        />
      </View>
      {isTraveling && (
        <View style={styles.badge}>
          <Icon name="airplane-takeoff" size={16} color="#FF6B6B" />
          <Text style={styles.badgeText}>Traveling</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 4,
  },
});
