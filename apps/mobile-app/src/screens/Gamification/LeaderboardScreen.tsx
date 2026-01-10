/**
 * LeaderboardScreen - Competition rankings
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  level: number;
  title: string;
  xp: number;
  streak: number;
  achievements: number;
  isCurrentUser: boolean;
  change: 'up' | 'down' | 'same';
  changeAmount?: number;
}

type LeaderboardType = 'xp' | 'streak' | 'achievements';

const LeaderboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('xp');
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);

  const getMockLeaderboard = (): LeaderboardEntry[] => [
    { id: '1', rank: 1, username: 'LoveSeeker99', level: 25, title: 'Dating Legend', xp: 12500, streak: 45, achievements: 32, isCurrentUser: false, change: 'same' },
    { id: '2', rank: 2, username: 'SoulMateHunter', level: 22, title: 'Connection Pro', xp: 10800, streak: 38, achievements: 28, isCurrentUser: false, change: 'up', changeAmount: 2 },
    { id: '3', rank: 3, username: 'HeartChaser', level: 20, title: 'Social Spark', xp: 9500, streak: 30, achievements: 25, isCurrentUser: false, change: 'down', changeAmount: 1 },
    { id: '4', rank: 4, username: 'RomanceExplorer', level: 18, title: 'Match Master', xp: 8200, streak: 28, achievements: 22, isCurrentUser: false, change: 'up', changeAmount: 3 },
    { id: '5', rank: 5, username: 'You', level: 15, title: 'Rising Star', xp: 6500, streak: 12, achievements: 18, isCurrentUser: true, change: 'up', changeAmount: 5 },
    { id: '6', rank: 6, username: 'CupidArrow', level: 14, title: 'Conversation Starter', xp: 5800, streak: 15, achievements: 16, isCurrentUser: false, change: 'same' },
    { id: '7', rank: 7, username: 'LovelyDreamer', level: 13, title: 'Social Butterfly', xp: 5200, streak: 10, achievements: 14, isCurrentUser: false, change: 'down', changeAmount: 2 },
    { id: '8', rank: 8, username: 'HeartfeltHero', level: 12, title: 'Chat Champion', xp: 4800, streak: 8, achievements: 12, isCurrentUser: false, change: 'up', changeAmount: 1 },
    { id: '9', rank: 9, username: 'SweetSoul', level: 11, title: 'Profile Pro', xp: 4200, streak: 6, achievements: 10, isCurrentUser: false, change: 'same' },
    { id: '10', rank: 10, username: 'CharmingOne', level: 10, title: 'Active Member', xp: 3800, streak: 5, achievements: 8, isCurrentUser: false, change: 'up', changeAmount: 4 },
  ];

  useEffect(() => {
    const loadLeaderboard = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      let data = getMockLeaderboard();
      if (leaderboardType === 'streak') data.sort((a, b) => b.streak - a.streak).forEach((e, i) => e.rank = i + 1);
      else if (leaderboardType === 'achievements') data.sort((a, b) => b.achievements - a.achievements).forEach((e, i) => e.rank = i + 1);
      setLeaderboard(data);
      setUserRank(data.find(e => e.isCurrentUser) || null);
      setLoading(false);
      setRefreshing(false);
    };
    loadLeaderboard();
  }, [leaderboardType]);

  const refresh = () => { setRefreshing(true); };

  const getRankColor = (rank: number): string[] => {
    if (rank === 1) return ['#FFD700', '#FFA500'];
    if (rank === 2) return ['#C0C0C0', '#A8A8A8'];
    if (rank === 3) return ['#CD7F32', '#8B4513'];
    return ['#E0E0E0', '#BDBDBD'];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const podiumOrder = topThree.length >= 3 ? [topThree[1], topThree[0], topThree[2]] : topThree;

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    if (index < 3) return null;
    return (
      <View style={[styles.entryCard, item.isCurrentUser && styles.entryCardCurrentUser]}>
        <View style={styles.entryRank}><Text style={styles.entryRankText}>{item.rank}</Text></View>
        <View style={styles.entryAvatar}><Text style={styles.entryAvatarInitial}>{item.username.charAt(0)}</Text></View>
        <View style={styles.entryInfo}>
          <Text style={[styles.entryUsername, item.isCurrentUser && styles.entryUsernameCurrentUser]}>{item.username} {item.isCurrentUser && '(You)'}</Text>
          <Text style={styles.entryTitle}>Lv. {item.level} - {item.title}</Text>
        </View>
        <View style={styles.entryScore}>
          <Text style={styles.entryScoreValue}>{leaderboardType === 'xp' ? item.xp.toLocaleString() : leaderboardType === 'streak' ? item.streak : item.achievements}</Text>
          <Text style={styles.entryScoreLabel}>{leaderboardType === 'xp' ? 'XP' : leaderboardType === 'streak' ? 'days' : 'badges'}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshButton}><Ionicons name="refresh" size={22} color="#FF6B6B" /></TouchableOpacity>
      </View>

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        ListHeaderComponent={
          <>
            <View style={styles.podiumContainer}>
              <LinearGradient colors={['#FF6B6B', '#9C27B0']} style={styles.podiumGradient}>
                <Text style={styles.podiumTitle}>Top Players</Text>
                <View style={styles.podium}>
                  {podiumOrder.map((entry, index) => (
                    <View key={entry.id} style={styles.podiumItem}>
                      <View style={[styles.podiumAvatar, index === 1 && styles.podiumAvatarFirst]}>
                        <Text style={styles.avatarInitial}>{entry.username.charAt(0)}</Text>
                        <View style={[styles.rankBadge, { backgroundColor: getRankColor(entry.rank)[0] }]}><Text style={styles.rankBadgeText}>{entry.rank}</Text></View>
                      </View>
                      <Text style={styles.podiumUsername} numberOfLines={1}>{entry.username}</Text>
                      <Text style={styles.podiumXP}>{leaderboardType === 'xp' ? `${entry.xp.toLocaleString()} XP` : leaderboardType === 'streak' ? `${entry.streak} days` : `${entry.achievements} badges`}</Text>
                      <LinearGradient colors={getRankColor(entry.rank)} style={[styles.podiumBase, { height: index === 1 ? 100 : index === 0 ? 80 : 60 }]} />
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </View>
            <View style={styles.typeSelectorContainer}>
              {(['xp', 'streak', 'achievements'] as LeaderboardType[]).map((type) => (
                <TouchableOpacity key={type} style={[styles.typeButton, leaderboardType === type && styles.typeButtonActive]} onPress={() => setLeaderboardType(type)}>
                  <Ionicons name={type === 'xp' ? 'flash' : type === 'streak' ? 'flame' : 'trophy'} size={18} color={leaderboardType === type ? '#FFF' : '#666'} />
                  <Text style={[styles.typeButtonText, leaderboardType === type && styles.typeButtonTextActive]}>{type === 'xp' ? 'XP' : type === 'streak' ? 'Streak' : 'Badges'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {userRank && userRank.rank > 3 && (
              <LinearGradient colors={['#FF6B6B', '#9C27B0']} style={styles.userRankBanner}>
                <View style={styles.userRankContent}>
                  <View><Text style={styles.userRankLabel}>Your Rank</Text><Text style={styles.userRankNumber}>#{userRank.rank}</Text></View>
                  <Text style={styles.userRankScore}>{leaderboardType === 'xp' ? `${userRank.xp.toLocaleString()} XP` : leaderboardType === 'streak' ? `${userRank.streak} days` : `${userRank.achievements} badges`}</Text>
                </View>
              </LinearGradient>
            )}
            <Text style={styles.listHeader}>Other Players</Text>
          </>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#FF6B6B']} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  refreshButton: { padding: 8 },
  podiumContainer: { margin: 15, borderRadius: 16, overflow: 'hidden' },
  podiumGradient: { padding: 20, paddingBottom: 0 },
  podiumTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 20 },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  podiumAvatarFirst: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#FFD700' },
  avatarInitial: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  rankBadge: { position: 'absolute', bottom: -5, right: -5, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  rankBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#FFF' },
  podiumUsername: { fontSize: 12, fontWeight: '600', color: '#FFF', maxWidth: 80, textAlign: 'center' },
  podiumXP: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, marginBottom: 8 },
  podiumBase: { width: '90%', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  typeSelectorContainer: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 12, backgroundColor: '#FFF', borderRadius: 12, padding: 4 },
  typeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  typeButtonActive: { backgroundColor: '#FF6B6B' },
  typeButtonText: { fontSize: 14, fontWeight: '600', color: '#666' },
  typeButtonTextActive: { color: '#FFF' },
  userRankBanner: { marginHorizontal: 15, marginBottom: 12, borderRadius: 12, padding: 16 },
  userRankContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userRankLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  userRankNumber: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  userRankScore: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  listContent: { paddingBottom: 30 },
  listHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginHorizontal: 15, marginBottom: 12, marginTop: 8 },
  entryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 15, marginBottom: 8, padding: 12, borderRadius: 12 },
  entryCardCurrentUser: { backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 2, borderColor: '#FF6B6B' },
  entryRank: { width: 40, alignItems: 'center' },
  entryRankText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  entryAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
  entryAvatarInitial: { fontSize: 18, fontWeight: 'bold', color: '#666' },
  entryInfo: { flex: 1 },
  entryUsername: { fontSize: 15, fontWeight: '600', color: '#333' },
  entryUsernameCurrentUser: { color: '#FF6B6B' },
  entryTitle: { fontSize: 12, color: '#666', marginTop: 2 },
  entryScore: { alignItems: 'flex-end' },
  entryScoreValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  entryScoreLabel: { fontSize: 10, color: '#999', marginTop: 2 },
});

export default LeaderboardScreen;
