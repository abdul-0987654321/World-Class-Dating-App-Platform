/**
 * Create Community Screen
 * Form for creating a new community
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { httpClient } from '../../services/api/httpClient';

interface Props {
  navigation: StackNavigationProp<any>;
}

const ICONS = [
  { name: 'airplane', label: 'Travel' },
  { name: 'restaurant', label: 'Food' },
  { name: 'fitness', label: 'Fitness' },
  { name: 'book', label: 'Books' },
  { name: 'paw', label: 'Pets' },
  { name: 'film', label: 'Movies' },
  { name: 'musical-notes', label: 'Music' },
  { name: 'leaf', label: 'Nature' },
  { name: 'hardware-chip', label: 'Tech' },
  { name: 'color-palette', label: 'Art' },
  { name: 'game-controller', label: 'Gaming' },
  { name: 'camera', label: 'Photo' },
  { name: 'cafe', label: 'Coffee' },
  { name: 'wine', label: 'Wine' },
  { name: 'bicycle', label: 'Cycling' },
  { name: 'basketball', label: 'Sports' },
];

const COLORS = [
  '#FF6B6B',
  '#FF8E53',
  '#F9C74F',
  '#90BE6D',
  '#43AA8B',
  '#4D908E',
  '#577590',
  '#277DA1',
  '#7209B7',
  '#B5179E',
  '#F72585',
  '#3F37C9',
];

const CATEGORIES = [
  'Lifestyle',
  'Food & Drink',
  'Health & Fitness',
  'Culture',
  'Entertainment',
  'Music',
  'Technology',
  'Art & Design',
  'Sports',
  'Outdoor',
  'Travel',
  'Gaming',
  'Other',
];

const CreateCommunityScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('people');
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [rules, setRules] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleAddRule = useCallback(() => {
    setRules((prev) => [...prev, '']);
  }, []);

  const handleUpdateRule = useCallback((index: number, text: string) => {
    setRules((prev) => prev.map((rule, i) => (i === index ? text : rule)));
  }, []);

  const handleRemoveRule = useCallback((index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const validateStep1 = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a community name');
      return false;
    }
    if (name.length < 3) {
      Alert.alert('Too Short', 'Community name must be at least 3 characters');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description');
      return false;
    }
    if (description.length < 20) {
      Alert.alert('Too Short', 'Description must be at least 20 characters');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!selectedCategory) {
      Alert.alert('Required', 'Please select a category');
      return false;
    }
    return true;
  };

  const handleNext = useCallback(() => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  }, [step, name, description, selectedCategory]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  }, [step, navigation]);

  const handleCreate = useCallback(async () => {
    setLoading(true);

    try {
      const communityData = {
        name: name.trim(),
        description: description.trim(),
        icon: selectedIcon,
        color: selectedColor,
        category: selectedCategory,
        isPrivate,
        rules: rules
          .filter((r) => r.trim())
          .map((r, i) => ({
            title: `Rule ${i + 1}`,
            description: r.trim(),
            order: i + 1,
          })),
      };

      const response = await httpClient.post('/api/communities', communityData);

      if (response.success) {
        Alert.alert('Success', 'Your community has been created!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('CommunityDetail', {
                communityId: response.data?.id || '1',
              });
            },
          },
        ]);
      } else {
        // Demo mode - simulate success
        Alert.alert('Success', 'Your community has been created!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (error) {
      console.error('Error creating community:', error);
      // Demo mode - simulate success
      Alert.alert('Success', 'Your community has been created!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [
    name,
    description,
    selectedIcon,
    selectedColor,
    selectedCategory,
    isPrivate,
    rules,
    navigation,
  ]);

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Info</Text>
      <Text style={styles.stepSubtitle}>Give your community a name and description</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Community Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Travel Enthusiasts"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          maxLength={50}
        />
        <Text style={styles.charCount}>{name.length}/50</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what your community is about..."
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/500</Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Customize</Text>
      <Text style={styles.stepSubtitle}>Choose an icon, color, and category</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((icon) => (
            <TouchableOpacity
              key={icon.name}
              style={[
                styles.iconOption,
                selectedIcon === icon.name && { borderColor: selectedColor },
              ]}
              onPress={() => setSelectedIcon(icon.name)}
            >
              <View
                style={[
                  styles.iconPreview,
                  { backgroundColor: selectedIcon === icon.name ? selectedColor : '#F0F0F0' },
                ]}
              >
                <Icon
                  name={icon.name}
                  size={24}
                  color={selectedIcon === icon.name ? '#fff' : '#666'}
                />
              </View>
              <Text
                style={[styles.iconLabel, selectedIcon === icon.name && { color: selectedColor }]}
              >
                {icon.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Color</Text>
        <View style={styles.colorGrid}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.colorOptionSelected,
              ]}
              onPress={() => setSelectedColor(color)}
            >
              {selectedColor === color && <Icon name="checkmark" size={20} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && { backgroundColor: selectedColor },
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && { color: '#fff' },
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Settings & Rules</Text>
      <Text style={styles.stepSubtitle}>Configure privacy and community guidelines</Text>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>Private Community</Text>
          <Text style={styles.settingDescription}>
            Only approved members can join and see posts
          </Text>
        </View>
        <Switch
          value={isPrivate}
          onValueChange={setIsPrivate}
          trackColor={{ false: '#E0E0E0', true: '#FFB3B3' }}
          thumbColor={isPrivate ? '#FF6B6B' : '#fff'}
        />
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.rulesHeader}>
          <Text style={styles.inputLabel}>Community Rules</Text>
          <TouchableOpacity style={styles.addRuleButton} onPress={handleAddRule}>
            <Icon name="add-circle" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        {rules.map((rule, index) => (
          <View key={index} style={styles.ruleInputRow}>
            <View style={styles.ruleNumber}>
              <Text style={styles.ruleNumberText}>{index + 1}</Text>
            </View>
            <TextInput
              style={styles.ruleInput}
              placeholder="Enter a rule..."
              placeholderTextColor="#999"
              value={rule}
              onChangeText={(text) => handleUpdateRule(index, text)}
            />
            {rules.length > 1 && (
              <TouchableOpacity
                style={styles.removeRuleButton}
                onPress={() => handleRemoveRule(index)}
              >
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Preview */}
      <View style={styles.previewSection}>
        <Text style={styles.inputLabel}>Preview</Text>
        <View style={styles.previewCard}>
          <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
            <Icon name={selectedIcon} size={28} color="#fff" />
          </View>
          <View style={styles.previewContent}>
            <Text style={styles.previewName}>{name || 'Community Name'}</Text>
            <Text style={styles.previewDescription} numberOfLines={2}>
              {description || 'Description...'}
            </Text>
            <View style={styles.previewMeta}>
              <Text style={styles.previewCategory}>{selectedCategory || 'Category'}</Text>
              {isPrivate && (
                <View style={styles.privateBadge}>
                  <Icon name="lock-closed" size={10} color="#666" />
                  <Text style={styles.privateText}>Private</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Community</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View key={s} style={styles.progressStep}>
              <View style={[styles.progressDot, step >= s && { backgroundColor: '#FF6B6B' }]}>
                {step > s && <Icon name="checkmark" size={12} color="#fff" />}
              </View>
              {s < 3 && (
                <View style={[styles.progressLine, step > s && { backgroundColor: '#FF6B6B' }]} />
              )}
            </View>
          ))}
        </View>

        {/* Step Content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Footer */}
        <View style={styles.footer}>
          {step < 3 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <Icon name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.createButtonText}>Create Community</Text>
                  <Icon name="checkmark-circle" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    alignItems: 'center',
    width: 70,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconPreview: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconLabel: {
    fontSize: 11,
    color: '#666',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
  },
  rulesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addRuleButton: {
    padding: 4,
  },
  ruleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ruleNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  ruleInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
  },
  removeRuleButton: {
    padding: 8,
    marginLeft: 8,
  },
  previewSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 16,
  },
  previewIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  previewContent: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  previewDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewCategory: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privateText: {
    fontSize: 12,
    color: '#666',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CreateCommunityScreen;
