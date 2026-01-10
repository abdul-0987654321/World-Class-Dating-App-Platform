/**
 * GamificationScreen - Main gamification hub
 * Matches web app GamificationPage.tsx functionality
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGamification } from '../../hooks/useGamification';
import { useQuests } from '../../hooks/useQuests';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
type TabType = 'overview' | 'achievements' | 'quests' | 'rewards';

const GamificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { dashboard, loading, refreshing, refresh, claimDailyReward } = useGamification();
  const { dailyQuests, claimQuest } = useQuests();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [claimingReward, setClaimingReward] = useState(false);

  const handleClaimDailyReward = async () => {
    setClaimingReward(true);
    await claimDailyReward();
    setClaimingReward(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#FF6B6B']} />}
      >
        {/* Level Card */}
        {dashboard?.level && (
          <LinearGradient colors={['#FF6B6B', '#9C27B0']} style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelNumber}>{dashboard.level.currentLevel}</Text>
              </View>
              <View style={styles.levelInfo}>
                <Text style={styles.levelTitle}>{dashboard.level.title}</Text>
                <Text style={styles.levelSubtitle}>Level {dashboard.level.currentLevel}</Text>
              </View>
              <View style={styles.levelXP}>
                <Text style={styles.levelXPValue}>{dashboard.level.totalXP.toLocaleString()}</Text>
                <Text style={styles.levelXPLabel}>Total XP</Text>
              </View>
            </View>
            <View style={styles.levelProgress}>
              <View style={styles.levelProgressBar}>
                <View style={[styles.levelProgressFill, { width: `${(dashboard.level.xpProgress / dashboard.level.xpNeeded) * 100}%` }]} />
              </View>
              <Text style={styles.levelProgressText}>{dashboard.level.xpNeeded - dashboard.level.xpProgress} XP to next level</Text>
            </View>
          </LinearGradient>
        )}

        {/* Wallet Banner */}
        {dashboard && (
          <LinearGradient colors={['#D4A574', '#C77A45']} style={styles.walletBanner}>
            <View style={styles.walletContent}>
              <View>
                <Text style={styles.walletTitle}>Your Wallet</Text>
                <View style={styles.walletBalances}>
                  <View style={styles.walletItem}>
                    <Ionicons name="cash" size={28} color="#FFD700" />
                    <Text style={styles.walletAmount}>{dashboard.wallet.coins}</Text>
                  </View>
                  <View style={styles.walletItem}>
                    <Ionicons name="diamond" size={28} color="#9C27B0" />
                    <Text style={styles.walletAmount}>{dashboard.wallet.gems}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.claimDailyButton} onPress={handleClaimDailyReward} disabled={claimingReward}>
                {claimingReward ? <ActivityIndicator color="#D4A574" /> : <Text style={styles.claimDailyButtonText}>{dashboard.dailyRewards.canClaim ? 'Claim Daily' : 'Claimed!'}</Text>}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}

        {/* Streak Card */}
        {dashboard?.streaks.login && (
          <TouchableOpacity style={styles.streakCard} onPress={() => navigation.navigate('Streaks')}>
            <View style={styles.streakLeft}>
              <LinearGradient colors={['#FF6B6B', '#9C27B0']} style={styles.streakIcon}>
                <Ionicons name="flame" size={32} color="#FFF" />
              </LinearGradient>
              <View style={styles.streakInfo}>
                <Text style={styles.streakCount}>{dashboard.streaks.login.currentStreak} Day Streak!</Text>
                <Text style={styles.streakBest}>Best: {dashboard.streaks.login.longestStreak} days</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['overview', 'achievements', 'quests', 'rewards'] as TabType[]).map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View>
              <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Achievements')}>
                <Ionicons name="trophy" size={24} color="#FF6B6B" />
                <Text style={styles.navButtonText}>View All Achievements</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Quests')}>
                <Ionicons name="list" size={24} color="#FF6B6B" />
                <Text style={styles.navButtonText}>View All Quests</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Leaderboard')}>
                <Ionicons name="podium" size={24} color="#FF6B6B" />
                <Text style={styles.navButtonText}>View Leaderboard</Text>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>
            </View>
          )}
          {activeTab === 'achievements' && (
            <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Achievements')}>
              <Ionicons name="trophy" size={24} color="#FF6B6B" />
              <Text style={styles.navButtonText}>View All Achievements</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          )}
          {activeTab === 'quests' && (
            <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Quests')}>
              <Ionicons name="list" size={24} color="#FF6B6B" />
              <Text style={styles.navButtonText}>View All Quests</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          )}
          {activeTab === 'rewards' && (
            <View style={styles.rewardShopGrid}>
              {[
                { name: 'Super Like', price: 50, icon: 'star' },
                { name: 'Boost', price: 100, icon: 'rocket' },
                { name: 'Undo', price: 25, icon: 'arrow-undo' },
                { name: 'Spotlight', price: 5, icon: 'sparkles' },
              ].map((item, idx) => (
                <View key={idx} style={styles.rewardShopItem}>
                  <View style={styles.rewardShopIcon}>
                    <Ionicons name={item.icon as any} size={28} color="#FF6B6B" />
                  </View>
                  <Text style={styles.rewardShopName}>{item.name}</Text>
                  <Text style={styles.rewardShopPrice}>{item.price}</Text>
                  <TouchableOpacity style={styles.rewardShopButton}>
                    <Text style={styles.rewardShopButtonText}>Redeem</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  levelCard: { margin: 15, borderRadius: 16, padding: 20 },
  levelHeader: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  levelNumber: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  levelInfo: { flex: 1, marginLeft: 15 },
  levelTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  levelSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  levelXP: { alignItems: 'flex-end' },
  levelXPValue: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  levelXPLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  levelProgress: { marginTop: 20 },
  levelProgressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  levelProgressFill: { height: '100%', backgroundColor: '#FFF', borderRadius: 4 },
  levelProgressText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8 },
  walletBanner: { marginHorizontal: 15, borderRadius: 16, padding: 20, marginBottom: 15 },
  walletContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 12 },
  walletBalances: { flexDirection: 'row', gap: 24 },
  walletItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletAmount: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  claimDailyButton: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  claimDailyButtonText: { color: '#D4A574', fontWeight: 'bold', fontSize: 14 },
  streakCard: { marginHorizontal: 15, backgroundColor: '#FFF', borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  streakLeft: { flexDirection: 'row', alignItems: 'center' },
  streakIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  streakInfo: { marginLeft: 15 },
  streakCount: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  streakBest: { fontSize: 14, color: '#666', marginTop: 2 },
  tabsContainer: { flexDirection: 'row', marginHorizontal: 15, backgroundColor: '#FFF', borderRadius: 12, padding: 4, marginBottom: 15 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FF6B6B' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#FFF' },
  tabContent: { paddingHorizontal: 15, paddingBottom: 30 },
  navButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  navButtonText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 12 },
  rewardShopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  rewardShopItem: { width: (SCREEN_WIDTH - 50) / 2, backgroundColor: '#FFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  rewardShopIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,107,107,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  rewardShopName: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 6 },
  rewardShopPrice: { fontSize: 16, fontWeight: 'bold', color: '#D4A574', marginBottom: 12 },
  rewardShopButton: { backgroundColor: '#FF6B6B', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  rewardShopButtonText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});

export default GamificationScreen;
