/**
 * AchievementsScreen - Achievement list with unlock animations
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAchievements, Achievement } from '../../hooks/useAchievements';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AchievementsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { achievements, categories, stats, loading, refreshing, selectedCategory, setSelectedCategory, refresh, getFilteredAchievements, getProgressPercentage, getRarityColor } = useAchievements();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  const renderAchievement = ({ item }: { item: Achievement }) => {
    const progressPercentage = getProgressPercentage(item);
    const rarityColor = getRarityColor(item.rarity);
    return (
      <TouchableOpacity style={[styles.achievementCard, item.isUnlocked && styles.achievementCardUnlocked]} onPress={() => setSelectedAchievement(item)}>
        <LinearGradient colors={item.isUnlocked ? [item.iconColor, item.backgroundColor] : ['#ECF0F1', '#BDC3C7']} style={styles.achievementGradient}>
          <View style={styles.achievementIconContainer}>
            <Ionicons name={item.iconName as any} size={36} color={item.isUnlocked ? '#FFF' : '#95A5A6'} />
            {item.isUnlocked && <View style={styles.unlockedCheckmark}><Ionicons name="checkmark-circle" size={20} color="#4CAF50" /></View>}
          </View>
          <View style={styles.achievementContent}>
            <View style={styles.achievementHeader}>
              <Text style={[styles.achievementName, !item.isUnlocked && styles.textLocked]} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '40' }]}>
                <Text style={[styles.rarityText, { color: rarityColor }]}>{item.rarity.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.achievementDescription, !item.isUnlocked && styles.textLocked]} numberOfLines={2}>{item.description}</Text>
            {!item.isUnlocked && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
                </View>
                <Text style={styles.progressText}>{item.currentProgress}/{item.targetProgress}</Text>
              </View>
            )}
            <View style={styles.achievementRewards}>
              {item.coinReward > 0 && <View style={styles.rewardBadge}><Ionicons name="cash" size={14} color="#FFD700" /><Text style={styles.rewardBadgeText}>{item.coinReward}</Text></View>}
              {item.xpReward > 0 && <View style={styles.rewardBadge}><Ionicons name="flash" size={14} color="#4CAF50" /><Text style={styles.rewardBadgeText}>{item.xpReward}</Text></View>}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={styles.headerRight} />
      </View>

      <LinearGradient colors={['#FF6B6B', '#9C27B0']} style={styles.statsHeader}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}><Text style={styles.statValue}>{stats.unlockedAchievements}</Text><Text style={styles.statLabel}>Unlocked</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>{stats.totalAchievements}</Text><Text style={styles.statLabel}>Total</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}><Text style={styles.statValue}>{stats.progressPercentage}%</Text><Text style={styles.statLabel}>Complete</Text></View>
        </View>
      </LinearGradient>

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.categoryButton, selectedCategory === item.id && styles.categoryButtonActive]} onPress={() => setSelectedCategory(item.id)}>
            <Text style={[styles.categoryButtonText, selectedCategory === item.id && styles.categoryButtonTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={getFilteredAchievements()}
        keyExtractor={(item) => item.id}
        renderItem={renderAchievement}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#FF6B6B']} />}
      />

      <Modal visible={!!selectedAchievement} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedAchievement(null)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            {selectedAchievement && (
              <>
                <LinearGradient colors={selectedAchievement.isUnlocked ? [selectedAchievement.iconColor, selectedAchievement.backgroundColor] : ['#ECF0F1', '#BDC3C7']} style={styles.modalBadge}>
                  <Ionicons name={selectedAchievement.iconName as any} size={56} color={selectedAchievement.isUnlocked ? '#FFF' : '#95A5A6'} />
                </LinearGradient>
                <Text style={styles.modalName}>{selectedAchievement.name}</Text>
                <Text style={styles.modalDescription}>{selectedAchievement.description}</Text>
                {!selectedAchievement.isUnlocked && (
                  <View style={styles.modalProgress}>
                    <View style={styles.modalProgressBar}><View style={[styles.modalProgressFill, { width: `${getProgressPercentage(selectedAchievement)}%` }]} /></View>
                    <Text style={styles.modalProgressText}>{selectedAchievement.currentProgress} / {selectedAchievement.targetProgress}</Text>
                  </View>
                )}
                <View style={styles.modalRewards}>
                  {selectedAchievement.coinReward > 0 && <View style={styles.modalRewardItem}><Ionicons name="cash" size={24} color="#FFD700" /><Text style={styles.modalRewardValue}>+{selectedAchievement.coinReward}</Text></View>}
                  {selectedAchievement.xpReward > 0 && <View style={styles.modalRewardItem}><Ionicons name="flash" size={24} color="#4CAF50" /><Text style={styles.modalRewardValue}>+{selectedAchievement.xpReward}</Text></View>}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerRight: { width: 40 },
  statsHeader: { margin: 15, borderRadius: 16, padding: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  categoryList: { maxHeight: 50, marginBottom: 10 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 5, borderRadius: 20, backgroundColor: '#FFF' },
  categoryButtonActive: { backgroundColor: '#FF6B6B' },
  categoryButtonText: { fontSize: 14, fontWeight: '600', color: '#666' },
  categoryButtonTextActive: { color: '#FFF' },
  listContent: { padding: 15, paddingTop: 5 },
  achievementCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  achievementCardUnlocked: { borderWidth: 1, borderColor: '#FFD700' },
  achievementGradient: { flexDirection: 'row', padding: 16 },
  achievementIconContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  unlockedCheckmark: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFF', borderRadius: 12, padding: 2 },
  achievementContent: { flex: 1 },
  achievementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  achievementName: { fontSize: 16, fontWeight: 'bold', color: '#FFF', flex: 1 },
  textLocked: { color: '#7F8C8D' },
  rarityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  rarityText: { fontSize: 10, fontWeight: 'bold' },
  achievementDescription: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 10 },
  progressSection: { marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: '#FF6B6B', borderRadius: 3 },
  progressText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  achievementRewards: { flexDirection: 'row', gap: 10 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  rewardBadgeText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center', minHeight: SCREEN_HEIGHT * 0.5 },
  modalClose: { position: 'absolute', top: 16, right: 16, padding: 8 },
  modalBadge: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalName: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 8 },
  modalDescription: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  modalProgress: { width: '100%', marginBottom: 20 },
  modalProgressBar: { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  modalProgressFill: { height: '100%', backgroundColor: '#FF6B6B', borderRadius: 5 },
  modalProgressText: { fontSize: 14, color: '#666', textAlign: 'center' },
  modalRewards: { flexDirection: 'row', justifyContent: 'center', gap: 30, marginBottom: 24 },
  modalRewardItem: { alignItems: 'center' },
  modalRewardValue: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 4 },
});

export default AchievementsScreen;
