/**
 * QuestsScreen - Daily and weekly quests
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuests, Quest } from '../../hooks/useQuests';

const QuestsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { dailyQuests, weeklyQuests, stats, loading, refreshing, claiming, refresh, claimQuest, getTimeRemaining, getProgressPercentage } = useQuests();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  const renderQuest = (quest: Quest) => {
    const progressPercentage = getProgressPercentage(quest);
    const isComplete = quest.isCompleted;
    const canClaim = isComplete && !quest.isClaimed;

    return (
      <View key={quest.id} style={[styles.questCard, isComplete && styles.questCardComplete, quest.isClaimed && styles.questCardClaimed]}>
        <View style={styles.questHeader}>
          <View style={[styles.questIcon, isComplete && styles.questIconComplete]}>
            <Ionicons name={quest.iconName as any} size={24} color={isComplete ? '#FFF' : '#FF6B6B'} />
          </View>
          <View style={styles.questInfo}>
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDescription}>{quest.description}</Text>
          </View>
        </View>
        <View style={styles.questProgressSection}>
          <View style={styles.questProgressBar}>
            <View style={[styles.questProgressFill, { width: `${progressPercentage}%` }, isComplete && styles.questProgressFillComplete]} />
          </View>
          <View style={styles.questProgressInfo}>
            <Text style={styles.questProgressText}>{quest.progress}/{quest.maxProgress}</Text>
            <Text style={styles.questTimeRemaining}>{getTimeRemaining(quest.expiresAt)}</Text>
          </View>
        </View>
        <View style={styles.questFooter}>
          <View style={styles.questRewards}>
            {quest.reward.coins && <View style={styles.rewardItem}><Ionicons name="cash" size={16} color="#FFD700" /><Text style={styles.rewardText}>+{quest.reward.coins}</Text></View>}
            {quest.reward.gems && <View style={styles.rewardItem}><Ionicons name="diamond" size={16} color="#9C27B0" /><Text style={styles.rewardText}>+{quest.reward.gems}</Text></View>}
            {quest.reward.xp && <View style={styles.rewardItem}><Ionicons name="flash" size={16} color="#4CAF50" /><Text style={styles.rewardText}>+{quest.reward.xp}</Text></View>}
          </View>
          {canClaim && (
            <TouchableOpacity style={styles.claimButton} onPress={() => claimQuest(quest.id)} disabled={claiming}>
              <Ionicons name="gift" size={16} color="#FFF" />
              <Text style={styles.claimButtonText}>Claim</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const quests = activeTab === 'daily' ? dailyQuests : weeklyQuests;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quests</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <LinearGradient colors={['#FF6B6B', '#9C27B0']} style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.dailyCompleted}/{stats.dailyTotal}</Text><Text style={styles.statLabel}>Daily</Text></View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}><Text style={styles.statValue}>{stats.weeklyCompleted}/{stats.weeklyTotal}</Text><Text style={styles.statLabel}>Weekly</Text></View>
        </View>
      </LinearGradient>

      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'daily' && styles.tabActive]} onPress={() => setActiveTab('daily')}>
          <Ionicons name="today" size={20} color={activeTab === 'daily' ? '#FFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'weekly' && styles.tabActive]} onPress={() => setActiveTab('weekly')}>
          <Ionicons name="calendar" size={20} color={activeTab === 'weekly' ? '#FFF' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>Weekly</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#FF6B6B']} />}>
        <View style={styles.questsList}>
          {quests.map(renderQuest)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  refreshButton: { padding: 8 },
  statsContainer: { margin: 15, borderRadius: 16, padding: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)' },
  tabsContainer: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 15, backgroundColor: '#FFF', borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  tabActive: { backgroundColor: '#FF6B6B' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },
  questsList: { paddingHorizontal: 15, paddingBottom: 30 },
  questCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  questCardComplete: { borderWidth: 2, borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.05)' },
  questCardClaimed: { opacity: 0.6, backgroundColor: '#F5F5F5' },
  questHeader: { flexDirection: 'row', marginBottom: 12 },
  questIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,107,107,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  questIconComplete: { backgroundColor: '#4CAF50' },
  questInfo: { flex: 1 },
  questTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  questDescription: { fontSize: 14, color: '#666' },
  questProgressSection: { marginBottom: 12 },
  questProgressBar: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  questProgressFill: { height: '100%', backgroundColor: '#FF6B6B', borderRadius: 4 },
  questProgressFillComplete: { backgroundColor: '#4CAF50' },
  questProgressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questProgressText: { fontSize: 12, fontWeight: '600', color: '#666' },
  questTimeRemaining: { fontSize: 12, color: '#999' },
  questFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questRewards: { flexDirection: 'row', gap: 12 },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardText: { fontSize: 14, fontWeight: '600', color: '#333' },
  claimButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
  claimButtonText: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
});

export default QuestsScreen;
