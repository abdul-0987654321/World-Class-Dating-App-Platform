import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TravelModeToggle } from '../../components/travel/TravelModeToggle';
import { TravelScheduleView } from '../../components/travel/TravelScheduleView';
import { DestinationPicker } from '../../components/travel/DestinationPicker';
import { DateRangeSelector } from '../../components/travel/DateRangeSelector';

interface TravelModeScreenProps {
  userId: string;
  navigation: any;
}

export const TravelModeScreen: React.FC<TravelModeScreenProps> = ({ userId, navigation }) => {
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const [showAddTripModal, setShowAddTripModal] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<any>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [travelNotes, setTravelNotes] = useState('');

  const handleSelectDestination = (destination: any) => {
    setSelectedDestination(destination);
    setShowAddTripModal(true);
  };

  const handleAddTrip = async () => {
    if (!selectedDestination) {
      Alert.alert('Error', 'Please select a destination');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    try {
      const response = await fetch('/api/travel-mode/destinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          city: selectedDestination.city,
          state: selectedDestination.state,
          country: selectedDestination.country,
          country_code: selectedDestination.country_code,
          airport_code: selectedDestination.airport_code,
          latitude: selectedDestination.latitude,
          longitude: selectedDestination.longitude,
          timezone: selectedDestination.timezone,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          show_on_profile: true,
          match_before_arrival: true,
          travel_notes: travelNotes,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Travel destination added successfully!');
        setShowAddTripModal(false);
        setSelectedDestination(null);
        setTravelNotes('');
        // Refresh the travel schedule
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to add travel destination');
      }
    } catch (error) {
      console.error('Failed to add trip:', error);
      Alert.alert('Error', 'Failed to add travel destination');
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // Implement your auth token retrieval logic
    return '';
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TravelModeToggle userId={userId} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Travel Mode Works</Text>
          <View style={styles.featureCard}>
            <Icon name="map-marker-radius" size={32} color="#FF6B6B" />
            <Text style={styles.featureTitle}>Match Before You Arrive</Text>
            <Text style={styles.featureDescription}>
              Set your destination and start matching with people in that city before you even get
              there
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Icon name="airplane" size={32} color="#FF6B6B" />
            <Text style={styles.featureTitle}>Show You're Traveling</Text>
            <Text style={styles.featureDescription}>
              Your profile displays a "Traveling to [City]" badge, making it easy for locals to
              discover you
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Icon name="calendar-clock" size={32} color="#FF6B6B" />
            <Text style={styles.featureTitle}>Automatic Switching</Text>
            <Text style={styles.featureDescription}>
              Your location automatically updates when your travel dates arrive and resets when you
              return
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Icon name="crown" size={16} color="#FFD700" />
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.premiumFeaturesList}>
            <View style={styles.premiumFeatureItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.premiumFeatureText}>
                Unlimited Passport - Change location anytime
              </Text>
            </View>
            <View style={styles.premiumFeatureItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.premiumFeatureText}>Multiple destinations simultaneously</Text>
            </View>
            <View style={styles.premiumFeatureItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.premiumFeatureText}>Travel buddy matching</Text>
            </View>
            <View style={styles.premiumFeatureItem}>
              <Icon name="check-circle" size={20} color="#4CAF50" />
              <Text style={styles.premiumFeatureText}>Full travel history</Text>
            </View>
          </View>
        </View>

        <TravelScheduleView
          userId={userId}
          onAddDestination={() => setShowDestinationPicker(true)}
          onEditDestination={(destination) => {
            // Handle edit destination
          }}
        />
      </ScrollView>

      <DestinationPicker
        visible={showDestinationPicker}
        onClose={() => setShowDestinationPicker(false)}
        onSelect={handleSelectDestination}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    marginLeft: 6,
  },
  premiumFeaturesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  premiumFeatureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
});

export default TravelModeScreen;
