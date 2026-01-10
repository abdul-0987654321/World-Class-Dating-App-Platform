/**
 * StreaksScreen - Streak tracking with calendar view
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStreaks } from '../../hooks/useStreaks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = (SCREEN_WIDTH - 60) / 7;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const StreaksScreen: React.FC = () => {
  const navigation = useNavigation();
  const { streaks, milestones, stats, loading, refreshing, protecting, selectedMonth, refresh, protectStreak, setSelectedMonth, getStreakLevel, getCalendarForMonth } = useStreaks();
  const [calendar, setCalendar] = useState<any[]>([]);

  useEffect(() => {
    setCalendar(getCalendarForMonth(selectedMonth.getFullYear(), selectedMonth.getMonth()));
  }, [selectedMonth, getCalendarForMonth]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedMonth(newMonth);
  };

  const handleProtectStreak = (streakType: string) => {
    Alert.alert('Protect Your Streak', 'Spend 50 coins to protect for 24 hours?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Protect', onPress: () => protectStreak(streakType) },
    ]);
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

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Streaks</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#FF6B6B']} />}>
        {/* Streak Cards */}
        {streaks.login && (
          <View style={styles.streakCard}>
            <LinearGradient colors={[getStreakLevel(streaks.login.currentStreak).color, getStreakLevel(streaks.login.currentStreak).color + 'CC']} style={styles.streakCardGradient}>
              <View style={styles.streakCardHeader}>
                <Ionicons name="flame" size={32} color="#FFD700" />
                <View style={styles.streakCardInfo}>
                  <Text style={styles.streakCardLabel}>Login Streak</Text>
                  <Text style={styles.streakCardLevel}>{getStreakLevel(streaks.login.currentStreak).level}</Text>
                </View>
                {streaks.login.isProtected && <View style={styles.protectedBadge}><Ionicons name="shield-checkmark" size={16} color="#FFF" /><Text style={styles.protectedText}>Protected</Text></View>}
              </View>
              <View style={styles.streakNumbers}>
                <View style={styles.streakNumberItem}><Text style={styles.streakNumberValue}>{streaks.login.currentStreak}</Text><Text style={styles.streakNumberLabel}>Current</Text></View>
                <View style={styles.streakNumberDivider} />
                <View style={styles.streakNumberItem}><Text style={styles.streakNumberValue}>{streaks.login.longestStreak}</Text><Text style={styles.streakNumberLabel}>Longest</Text></View>
              </View>
              {!streaks.login.isProtected && (
                <TouchableOpacity style={styles.protectButton} onPress={() => handleProtectStreak('login')} disabled={protecting}>
                  <Ionicons name="shield" size={16} color={getStreakLevel(streaks.login.currentStreak).color} />
                  <Text style={[styles.protectButtonText, { color: getStreakLevel(streaks.login.currentStreak).color }]}>Protect Streak (50 coins)</Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Calendar View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Calendar</Text>
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => handleMonthChange('prev')} style={styles.calendarArrow}><Ionicons name="chevron-back" size={24} color="#333" /></TouchableOpacity>
              <Text style={styles.calendarMonth}>{monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}</Text>
              <TouchableOpacity onPress={() => handleMonthChange('next')} style={styles.calendarArrow}><Ionicons name="chevron-forward" size={24} color="#333" /></TouchableOpacity>
            </View>
            <View style={styles.calendarWeekdays}>{WEEKDAYS.map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}</View>
            <View style={styles.calendarDays}>
              {calendar.map((day, index) => (
                <View key={index} style={[styles.calendarDay, day.hasActivity && styles.calendarDayActive, day.isToday && styles.calendarDayToday]}>
                  {day.dayOfMonth > 0 && <Text style={[styles.calendarDayText, day.hasActivity && styles.calendarDayTextActive, day.isToday && styles.calendarDayTextToday]}>{day.dayOfMonth}</Text>}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          <View style={styles.milestonesList}>
            {milestones.map((milestone, index) => (
              <View key={index} style={[styles.milestoneItem, milestone.isAchieved && styles.milestoneItemAchieved]}>
                <View style={[styles.milestoneIcon, milestone.isAchieved && styles.milestoneIconAchieved]}><Ionicons name={milestone.icon as any} size={24} color={milestone.isAchieved ? '#FFF' : '#999'} /></View>
                <View style={styles.milestoneInfo}>
                  <Text style={[styles.milestoneName, milestone.isAchieved && styles.milestoneNameAchieved]}>{milestone.name}</Text>
                  <Text style={styles.milestoneDays}>{milestone.days} days</Text>
                </View>
                <View style={styles.milestoneRewards}>
                  {milestone.reward.coins && <View style={styles.milestoneReward}><Ionicons name="cash" size={14} color="#FFD700" /><Text style={styles.milestoneRewardText}>+{milestone.reward.coins}</Text></View>}
                  {milestone.isAchieved && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
                </View>
              </View>
            ))}
          </View>
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
  headerRight: { width: 40 },
  streakCard: { margin: 15, borderRadius: 16, overflow: 'hidden' },
  streakCardGradient: { padding: 20 },
  streakCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  streakCardInfo: { flex: 1, marginLeft: 12 },
  streakCardLabel: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  streakCardLevel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  protectedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  protectedText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  streakNumbers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  streakNumberItem: { alignItems: 'center', flex: 1 },
  streakNumberValue: { fontSize: 36, fontWeight: 'bold', color: '#FFF' },
  streakNumberLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  streakNumberDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 20 },
  protectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 25, gap: 8 },
  protectButtonText: { fontSize: 14, fontWeight: '600' },
  section: { paddingHorizontal: 15, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  calendarContainer: { backgroundColor: '#FFF', borderRadius: 16, padding: 16 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calendarArrow: { padding: 8 },
  calendarMonth: { fontSize: 18, fontWeight: '600', color: '#333' },
  calendarWeekdays: { flexDirection: 'row', marginBottom: 8 },
  calendarWeekday: { width: DAY_SIZE, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#999' },
  calendarDays: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: DAY_SIZE, height: DAY_SIZE, alignItems: 'center', justifyContent: 'center', borderRadius: DAY_SIZE / 2, marginBottom: 4 },
  calendarDayActive: { backgroundColor: 'rgba(255,107,107,0.1)' },
  calendarDayToday: { backgroundColor: '#FF6B6B' },
  calendarDayText: { fontSize: 14, color: '#333' },
  calendarDayTextActive: { fontWeight: '600', color: '#FF6B6B' },
  calendarDayTextToday: { fontWeight: 'bold', color: '#FFF' },
  milestonesList: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden' },
  milestoneItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  milestoneItemAchieved: { backgroundColor: 'rgba(76,175,80,0.05)' },
  milestoneIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  milestoneIconAchieved: { backgroundColor: '#4CAF50' },
  milestoneInfo: { flex: 1 },
  milestoneName: { fontSize: 16, fontWeight: '600', color: '#333' },
  milestoneNameAchieved: { color: '#4CAF50' },
  milestoneDays: { fontSize: 12, color: '#666', marginTop: 2 },
  milestoneRewards: { flexDirection: 'row', alignItems: 'center' },
  milestoneReward: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, gap: 2 },
  milestoneRewardText: { fontSize: 12, fontWeight: '600', color: '#333' },
});

export default StreaksScreen;
