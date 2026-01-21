import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';

export type UserMode = 'date' | 'friends' | 'network';

interface DateModeFilters {
  age_min: number;
  age_max: number;
  distance_max: number;
  show_me: 'men' | 'women' | 'everyone';
  relationship_goals?: string[];
  lifestyle?: string[];
}

interface FriendsModeFilters {
  age_min: number;
  age_max: number;
  distance_max: number;
  gender_preference: 'men' | 'women' | 'everyone' | 'same-gender';
  activity_preferences?: string[];
  group_size_preference?: string;
}

interface NetworkModeFilters {
  industries?: string[];
  professions?: string[];
  experience_level?: 'entry' | 'mid' | 'senior' | 'executive';
  connection_type?: string[];
  distance_max: number;
}

interface ModeSpecificFiltersProps {
  mode: UserMode;
  dateFilters?: DateModeFilters;
  friendsFilters?: FriendsModeFilters;
  networkFilters?: NetworkModeFilters;
  onFiltersChange: (filters: any) => void;
}

export const ModeSpecificFilters: React.FC<ModeSpecificFiltersProps> = ({
  mode,
  dateFilters,
  friendsFilters,
  networkFilters,
  onFiltersChange,
}) => {
  const renderDateModeFilters = () => {
    if (!dateFilters) return null;

    const [filters, setFilters] = useState(dateFilters);

    const updateFilters = (key: keyof DateModeFilters, value: any) => {
      const updated = { ...filters, [key]: value };
      setFilters(updated);
      onFiltersChange(updated);
    };

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Dating Preferences</Text>

        {/* Age Range */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>
            Age Range: {filters.age_min} - {filters.age_max}
          </Text>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={18}
              maximumValue={100}
              step={1}
              value={filters.age_min}
              onValueChange={(value) => updateFilters('age_min', Math.floor(value))}
              minimumTrackTintColor="#FF6B6B"
              maximumTrackTintColor="#E0E0E0"
            />
            <Slider
              style={styles.slider}
              minimumValue={18}
              maximumValue={100}
              step={1}
              value={filters.age_max}
              onValueChange={(value) => updateFilters('age_max', Math.floor(value))}
              minimumTrackTintColor="#FF6B6B"
              maximumTrackTintColor="#E0E0E0"
            />
          </View>
        </View>

        {/* Distance */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Maximum Distance: {filters.distance_max} km</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={200}
            step={1}
            value={filters.distance_max}
            onValueChange={(value) => updateFilters('distance_max', Math.floor(value))}
            minimumTrackTintColor="#FF6B6B"
            maximumTrackTintColor="#E0E0E0"
          />
        </View>

        {/* Show Me */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Show me</Text>
          <View style={styles.optionsRow}>
            {['men', 'women', 'everyone'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  filters.show_me === option && styles.optionButtonActive,
                ]}
                onPress={() => updateFilters('show_me', option)}
              >
                <Text
                  style={[styles.optionText, filters.show_me === option && styles.optionTextActive]}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Relationship Goals */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Relationship Goals</Text>
          <View style={styles.tagsContainer}>
            {['Casual', 'Serious', 'Marriage', 'Not sure'].map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[
                  styles.tag,
                  filters.relationship_goals?.includes(goal.toLowerCase()) && styles.tagActive,
                ]}
                onPress={() => {
                  const current = filters.relationship_goals || [];
                  const updated = current.includes(goal.toLowerCase())
                    ? current.filter((g) => g !== goal.toLowerCase())
                    : [...current, goal.toLowerCase()];
                  updateFilters('relationship_goals', updated);
                }}
              >
                <Text
                  style={[
                    styles.tagText,
                    filters.relationship_goals?.includes(goal.toLowerCase()) &&
                      styles.tagTextActive,
                  ]}
                >
                  {goal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderFriendsModeFilters = () => {
    if (!friendsFilters) return null;

    const [filters, setFilters] = useState(friendsFilters);

    const updateFilters = (key: keyof FriendsModeFilters, value: any) => {
      const updated = { ...filters, [key]: value };
      setFilters(updated);
      onFiltersChange(updated);
    };

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Friend Preferences</Text>

        {/* Age Range */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>
            Age Range: {filters.age_min} - {filters.age_max}
          </Text>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={18}
              maximumValue={100}
              step={1}
              value={filters.age_min}
              onValueChange={(value) => updateFilters('age_min', Math.floor(value))}
              minimumTrackTintColor="#4ECDC4"
              maximumTrackTintColor="#E0E0E0"
            />
            <Slider
              style={styles.slider}
              minimumValue={18}
              maximumValue={100}
              step={1}
              value={filters.age_max}
              onValueChange={(value) => updateFilters('age_max', Math.floor(value))}
              minimumTrackTintColor="#4ECDC4"
              maximumTrackTintColor="#E0E0E0"
            />
          </View>
        </View>

        {/* Distance */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Maximum Distance: {filters.distance_max} km</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={100}
            step={1}
            value={filters.distance_max}
            onValueChange={(value) => updateFilters('distance_max', Math.floor(value))}
            minimumTrackTintColor="#4ECDC4"
            maximumTrackTintColor="#E0E0E0"
          />
        </View>

        {/* Gender Preference */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Gender Preference</Text>
          <View style={styles.optionsRow}>
            {['men', 'women', 'everyone', 'same-gender'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  filters.gender_preference === option && styles.optionButtonActive,
                ]}
                onPress={() => updateFilters('gender_preference', option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    filters.gender_preference === option && styles.optionTextActive,
                  ]}
                >
                  {option === 'same-gender'
                    ? 'Same gender'
                    : option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Activity Preferences */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Activity Preferences</Text>
          <View style={styles.tagsContainer}>
            {['Hiking', 'Gym', 'Gaming', 'Movies', 'Concerts', 'Sports', 'Art', 'Food'].map(
              (activity) => (
                <TouchableOpacity
                  key={activity}
                  style={[
                    styles.tag,
                    filters.activity_preferences?.includes(activity.toLowerCase()) &&
                      styles.tagActive,
                  ]}
                  onPress={() => {
                    const current = filters.activity_preferences || [];
                    const updated = current.includes(activity.toLowerCase())
                      ? current.filter((a) => a !== activity.toLowerCase())
                      : [...current, activity.toLowerCase()];
                    updateFilters('activity_preferences', updated);
                  }}
                >
                  <Text
                    style={[
                      styles.tagText,
                      filters.activity_preferences?.includes(activity.toLowerCase()) &&
                        styles.tagTextActive,
                    ]}
                  >
                    {activity}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderNetworkModeFilters = () => {
    if (!networkFilters) return null;

    const [filters, setFilters] = useState(networkFilters);

    const updateFilters = (key: keyof NetworkModeFilters, value: any) => {
      const updated = { ...filters, [key]: value };
      setFilters(updated);
      onFiltersChange(updated);
    };

    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Network Preferences</Text>

        {/* Distance */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Maximum Distance: {filters.distance_max} km</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={500}
            step={10}
            value={filters.distance_max}
            onValueChange={(value) => updateFilters('distance_max', Math.floor(value))}
            minimumTrackTintColor="#95E1D3"
            maximumTrackTintColor="#E0E0E0"
          />
        </View>

        {/* Experience Level */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Experience Level</Text>
          <View style={styles.optionsRow}>
            {['entry', 'mid', 'senior', 'executive'].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.optionButton,
                  filters.experience_level === level && styles.optionButtonActive,
                ]}
                onPress={() => updateFilters('experience_level', level)}
              >
                <Text
                  style={[
                    styles.optionText,
                    filters.experience_level === level && styles.optionTextActive,
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Connection Type */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Connection Type</Text>
          <View style={styles.tagsContainer}>
            {['Mentor', 'Mentee', 'Peer', 'Collaborator', 'Co-founder', 'Investor'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.tag,
                  filters.connection_type?.includes(type.toLowerCase()) && styles.tagActive,
                ]}
                onPress={() => {
                  const current = filters.connection_type || [];
                  const updated = current.includes(type.toLowerCase())
                    ? current.filter((t) => t !== type.toLowerCase())
                    : [...current, type.toLowerCase()];
                  updateFilters('connection_type', updated);
                }}
              >
                <Text
                  style={[
                    styles.tagText,
                    filters.connection_type?.includes(type.toLowerCase()) && styles.tagTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Industries */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Industries</Text>
          <View style={styles.tagsContainer}>
            {['Tech', 'Finance', 'Healthcare', 'Education', 'Marketing', 'Design', 'Sales'].map(
              (industry) => (
                <TouchableOpacity
                  key={industry}
                  style={[
                    styles.tag,
                    filters.industries?.includes(industry.toLowerCase()) && styles.tagActive,
                  ]}
                  onPress={() => {
                    const current = filters.industries || [];
                    const updated = current.includes(industry.toLowerCase())
                      ? current.filter((i) => i !== industry.toLowerCase())
                      : [...current, industry.toLowerCase()];
                    updateFilters('industries', updated);
                  }}
                >
                  <Text
                    style={[
                      styles.tagText,
                      filters.industries?.includes(industry.toLowerCase()) && styles.tagTextActive,
                    ]}
                  >
                    {industry}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  switch (mode) {
    case 'date':
      return renderDateModeFilters();
    case 'friends':
      return renderFriendsModeFilters();
    case 'network':
      return renderNetworkModeFilters();
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sliderContainer: {
    gap: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tagActive: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
  tagTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
