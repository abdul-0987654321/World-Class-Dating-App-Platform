import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type UserMode = 'date' | 'friends' | 'network';

interface ModeConfig {
  mode: UserMode;
  enabled: boolean;
  preferences: Record<string, any>;
}

interface ModesState {
  date: ModeConfig;
  friends: ModeConfig;
  network: ModeConfig;
  current_mode: UserMode;
}

interface ModeSwitcherProps {
  currentMode: UserMode;
  modesState?: ModesState;
  onModeChange: (mode: UserMode) => Promise<void>;
  onEnableMode?: (mode: UserMode) => Promise<void>;
}

const MODE_INFO = {
  date: {
    icon: 'heart',
    color: '#FF6B6B',
    title: 'Date Mode',
    description: 'Find romantic connections',
    features: ['Romantic matches', 'Relationship-focused', 'Chemistry-based'],
  },
  friends: {
    icon: 'account-group',
    color: '#4ECDC4',
    title: 'Friends Mode',
    description: 'Make platonic friendships',
    features: ['Activity buddies', 'Shared hobbies', 'Group hangouts'],
  },
  network: {
    icon: 'briefcase',
    color: '#95E1D3',
    title: 'Network Mode',
    description: 'Build professional connections',
    features: ['Career networking', 'Mentorship', 'Collaboration'],
  },
};

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({
  currentMode,
  modesState,
  onModeChange,
  onEnableMode,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<UserMode>(currentMode);

  useEffect(() => {
    setSelectedMode(currentMode);
  }, [currentMode]);

  const handleModeSelect = async (mode: UserMode) => {
    if (mode === currentMode) {
      setModalVisible(false);
      return;
    }

    // Check if mode is enabled
    if (modesState && !modesState[mode].enabled) {
      // Ask to enable the mode first
      if (onEnableMode) {
        try {
          setLoading(true);
          await onEnableMode(mode);
        } catch (error) {
          console.error('Failed to enable mode:', error);
          setLoading(false);
          return;
        }
      }
    }

    try {
      setLoading(true);
      await onModeChange(mode);
      setSelectedMode(mode);
      setModalVisible(false);
    } catch (error) {
      console.error('Failed to switch mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentModeInfo = MODE_INFO[currentMode];

  return (
    <>
      {/* Mode Switcher Button */}
      <TouchableOpacity
        style={[styles.modeButton, { backgroundColor: currentModeInfo.color }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Icon name={currentModeInfo.icon} size={20} color="#FFFFFF" />
        <Text style={styles.modeButtonText}>{currentModeInfo.title}</Text>
        <Icon name="chevron-down" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Mode Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Mode</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modesContainer}>
              {/* Date Mode */}
              {renderModeOption('date')}

              {/* Friends Mode */}
              {renderModeOption('friends')}

              {/* Network Mode */}
              {renderModeOption('network')}
            </ScrollView>

            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={currentModeInfo.color} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );

  function renderModeOption(mode: UserMode) {
    const modeInfo = MODE_INFO[mode];
    const isEnabled = !modesState || modesState[mode].enabled;
    const isCurrent = mode === currentMode;

    return (
      <TouchableOpacity
        key={mode}
        style={[
          styles.modeOption,
          isCurrent && styles.modeOptionActive,
          !isEnabled && styles.modeOptionDisabled,
        ]}
        onPress={() => handleModeSelect(mode)}
        disabled={loading}
      >
        <View style={[styles.modeIconContainer, { backgroundColor: modeInfo.color }]}>
          <Icon name={modeInfo.icon} size={32} color="#FFFFFF" />
        </View>

        <View style={styles.modeInfoContainer}>
          <View style={styles.modeTitleRow}>
            <Text style={styles.modeTitle}>{modeInfo.title}</Text>
            {isCurrent && (
              <View style={[styles.currentBadge, { backgroundColor: modeInfo.color }]}>
                <Text style={styles.currentBadgeText}>Active</Text>
              </View>
            )}
            {!isEnabled && (
              <View style={styles.disabledBadge}>
                <Text style={styles.disabledBadgeText}>Disabled</Text>
              </View>
            )}
          </View>

          <Text style={styles.modeDescription}>{modeInfo.description}</Text>

          <View style={styles.featuresContainer}>
            {modeInfo.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Icon name="check-circle" size={14} color={modeInfo.color} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        {isCurrent && <Icon name="check" size={24} color={modeInfo.color} />}
      </TouchableOpacity>
    );
  }
};

const styles = StyleSheet.create({
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  modeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modesContainer: {
    padding: 16,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  modeOptionActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  modeOptionDisabled: {
    opacity: 0.6,
  },
  modeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeInfoContainer: {
    flex: 1,
  },
  modeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  disabledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#BDBDBD',
  },
  disabledBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  featuresContainer: {
    gap: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#888',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
