import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Button } from '../common/Button';

export interface DiscoveryFilters {
  distanceMax: number;
  ageMin: number;
  ageMax: number;
  heightMin?: number;
  heightMax?: number;
  educationLevels: string[];
  relationshipGoals: string[];
  smokingPreferences: string[];
  drinkingPreferences: string[];
  exercisePreferences: string[];
  interests: string[];
  sexualOrientations: string[];
  verifiedOnly: boolean;
  showRecentlyActive: boolean;
}

interface AdvancedFiltersProps {
  initialFilters: DiscoveryFilters;
  onApply: (filters: DiscoveryFilters) => void;
  onReset: () => void;
}

const EDUCATION_LEVELS = [
  'High School',
  'Trade School',
  'Some College',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD',
  'Other',
];

const RELATIONSHIP_GOALS = [
  'Casual Dating',
  'Serious Relationship',
  'Marriage',
  'Friendship',
  'Not Sure Yet',
];

const LIFESTYLE_OPTIONS = {
  smoking: ['Never', 'Sometimes', 'Regularly'],
  drinking: ['Never', 'Socially', 'Regularly'],
  exercise: ['Never', 'Sometimes', 'Regularly', 'Very Often'],
};

const POPULAR_INTERESTS = [
  'Travel',
  'Photography',
  'Music',
  'Sports',
  'Cooking',
  'Reading',
  'Movies',
  'Art',
  'Fitness',
  'Gaming',
  'Hiking',
  'Dancing',
  'Yoga',
  'Wine',
  'Coffee',
  'Dogs',
  'Cats',
  'Fashion',
  'Technology',
  'Volunteering',
];

const SEXUAL_ORIENTATIONS = [
  'Straight',
  'Gay',
  'Lesbian',
  'Bisexual',
  'Pansexual',
  'Asexual',
  'Queer',
  'Other',
];

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  initialFilters,
  onApply,
  onReset,
}) => {
  const [filters, setFilters] = useState<DiscoveryFilters>(initialFilters);

  const updateFilter = <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = <K extends keyof DiscoveryFilters>(key: K, item: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    updateFilter(key, newArray as DiscoveryFilters[K]);
  };

  const handleReset = () => {
    setFilters(initialFilters);
    onReset();
  };

  const renderSlider = (
    label: string,
    min: number,
    max: number,
    value: number,
    onValueChange: (value: number) => void,
    unit: string = ''
  ) => {
    return (
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{label}</Text>
          <Text style={styles.sliderValue}>
            {value}
            {unit}
          </Text>
        </View>
        <View style={styles.sliderTrack}>
          <View style={styles.sliderTrackActive} />
          <TouchableOpacity
            style={[
              styles.sliderThumb,
              {
                left: `${((value - min) / (max - min)) * 100}%`,
              },
            ]}
          />
        </View>
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderMinMax}>
            {min}
            {unit}
          </Text>
          <Text style={styles.sliderMinMax}>
            {max}
            {unit}
          </Text>
        </View>
      </View>
    );
  };

  const renderRangeSlider = (
    label: string,
    min: number,
    max: number,
    valueMin: number,
    valueMax: number,
    onValueMinChange: (value: number) => void,
    onValueMaxChange: (value: number) => void,
    unit: string = ''
  ) => {
    return (
      <View style={styles.sliderContainer}>
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{label}</Text>
          <Text style={styles.sliderValue}>
            {valueMin}
            {unit} - {valueMax}
            {unit}
          </Text>
        </View>
        <View style={styles.sliderTrack}>
          <View
            style={[
              styles.sliderTrackActive,
              {
                left: `${((valueMin - min) / (max - min)) * 100}%`,
                width: `${((valueMax - valueMin) / (max - min)) * 100}%`,
              },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.sliderThumb,
              {
                left: `${((valueMin - min) / (max - min)) * 100}%`,
              },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.sliderThumb,
              {
                left: `${((valueMax - min) / (max - min)) * 100}%`,
              },
            ]}
          />
        </View>
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderMinMax}>
            {min}
            {unit}
          </Text>
          <Text style={styles.sliderMinMax}>
            {max}
            {unit}
          </Text>
        </View>
      </View>
    );
  };

  const renderMultiSelect = (
    label: string,
    options: string[],
    selectedValues: string[],
    onToggle: (value: string) => void
  ) => {
    return (
      <View style={styles.multiSelectContainer}>
        <Text style={styles.multiSelectLabel}>{label}</Text>
        <View style={styles.optionsGrid}>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option);
            return (
              <TouchableOpacity
                key={option}
                style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                onPress={() => onToggle(option)}
              >
                <Text style={[styles.optionChipText, isSelected && styles.optionChipTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderToggle = (label: string, value: boolean, onToggle: () => void) => {
    return (
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#E0E0E0', true: '#FFC0CB' }}
          thumbColor={value ? '#E91E63' : '#F5F5F5'}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Discovery Settings</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Reset All</Text>
          </TouchableOpacity>
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          {renderSlider(
            'Maximum Distance',
            1,
            100,
            filters.distanceMax,
            (value) => updateFilter('distanceMax', value),
            ' km'
          )}
        </View>

        {/* Age Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Age Range</Text>
          {renderRangeSlider(
            'Age',
            18,
            100,
            filters.ageMin,
            filters.ageMax,
            (value) => updateFilter('ageMin', value),
            (value) => updateFilter('ageMax', value),
            ''
          )}
        </View>

        {/* Height Range (Optional) */}
        {filters.heightMin !== undefined && filters.heightMax !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Height</Text>
            {renderRangeSlider(
              'Height',
              140,
              220,
              filters.heightMin,
              filters.heightMax,
              (value) => updateFilter('heightMin', value),
              (value) => updateFilter('heightMax', value),
              ' cm'
            )}
          </View>
        )}

        {/* Education */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {renderMultiSelect(
            'Select education levels',
            EDUCATION_LEVELS,
            filters.educationLevels,
            (item) => toggleArrayItem('educationLevels', item)
          )}
        </View>

        {/* Relationship Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relationship Goals</Text>
          {renderMultiSelect('Looking for', RELATIONSHIP_GOALS, filters.relationshipGoals, (item) =>
            toggleArrayItem('relationshipGoals', item)
          )}
        </View>

        {/* Lifestyle Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle</Text>

          <View style={styles.lifestyleGroup}>
            <Text style={styles.lifestyleLabel}>Smoking</Text>
            {renderMultiSelect('', LIFESTYLE_OPTIONS.smoking, filters.smokingPreferences, (item) =>
              toggleArrayItem('smokingPreferences', item)
            )}
          </View>

          <View style={styles.lifestyleGroup}>
            <Text style={styles.lifestyleLabel}>Drinking</Text>
            {renderMultiSelect(
              '',
              LIFESTYLE_OPTIONS.drinking,
              filters.drinkingPreferences,
              (item) => toggleArrayItem('drinkingPreferences', item)
            )}
          </View>

          <View style={styles.lifestyleGroup}>
            <Text style={styles.lifestyleLabel}>Exercise</Text>
            {renderMultiSelect(
              '',
              LIFESTYLE_OPTIONS.exercise,
              filters.exercisePreferences,
              (item) => toggleArrayItem('exercisePreferences', item)
            )}
          </View>
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          {renderMultiSelect(
            'Select common interests',
            POPULAR_INTERESTS,
            filters.interests,
            (item) => toggleArrayItem('interests', item)
          )}
        </View>

        {/* Sexual Orientation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sexual Orientation</Text>
          {renderMultiSelect('Show me', SEXUAL_ORIENTATIONS, filters.sexualOrientations, (item) =>
            toggleArrayItem('sexualOrientations', item)
          )}
        </View>

        {/* Additional Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Preferences</Text>
          {renderToggle('Verified Profiles Only', filters.verifiedOnly, () =>
            updateFilter('verifiedOnly', !filters.verifiedOnly)
          )}
          {renderToggle('Recently Active', filters.showRecentlyActive, () =>
            updateFilter('showRecentlyActive', !filters.showRecentlyActive)
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Apply Filters"
          onPress={() => onApply(filters)}
          fullWidth
          variant="primary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  resetText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 16,
    color: '#666',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E91E63',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    position: 'relative',
    marginVertical: 12,
  },
  sliderTrackActive: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#E91E63',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E91E63',
    top: -10,
    marginLeft: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderMinMax: {
    fontSize: 12,
    color: '#999',
  },
  multiSelectContainer: {
    marginBottom: 8,
  },
  multiSelectLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    margin: 4,
  },
  optionChipSelected: {
    backgroundColor: '#E91E63',
    borderColor: '#E91E63',
  },
  optionChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  optionChipTextSelected: {
    color: '#FFF',
  },
  lifestyleGroup: {
    marginBottom: 16,
  },
  lifestyleLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  spacer: {
    height: 80,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});
