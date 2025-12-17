import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export interface DatePlan {
  id: string;
  title: string;
  type: 'casual' | 'active' | 'cultural' | 'romantic' | 'adventurous' | 'foodie';
  budget: 'low' | 'medium' | 'high';
  duration: string; // e.g., "2-3 hours"
  itinerary: DateActivity[];
  conversation_topics: string[];
  outfit_suggestions: string[];
  pro_tips: string[];
  backup_plan: string;
  personalization_score: number; // 0-100
}

export interface DateActivity {
  time: string;
  activity: string;
  location?: string;
  why: string;
  estimated_cost?: string;
}

export const generateDatePlan = (
  user1Interests: string[],
  user2Interests: string[],
  location: string,
  budget: 'low' | 'medium' | 'high',
  dateType?: string
): DatePlan => {
  const sharedInterests = user1Interests.filter(i => user2Interests.includes(i));

  // Determine best date type based on interests
  let type: DatePlan['type'] = 'casual';
  if (sharedInterests.includes('hiking') || sharedInterests.includes('sports')) type = 'active';
  if (sharedInterests.includes('art') || sharedInterests.includes('museums')) type = 'cultural';
  if (sharedInterests.includes('food') || sharedInterests.includes('cooking')) type = 'foodie';

  const plans: Record<DatePlan['type'], DatePlan> = {
    casual: {
      id: '1',
      title: 'Coffee & Walk First Date',
      type: 'casual',
      budget: 'low',
      duration: '2-3 hours',
      itinerary: [
        {
          time: '2:00 PM',
          activity: 'Meet at local coffee shop',
          location: 'Downtown coffee shop',
          why: 'Casual setting, easy conversation, natural lighting',
          estimated_cost: '$10-15',
        },
        {
          time: '2:45 PM',
          activity: 'Walk through nearby park or neighborhood',
          location: 'Local park',
          why: 'Movement eases nerves, beautiful scenery, easier to talk while walking',
        },
        {
          time: '3:30 PM',
          activity: 'Browse local bookstore or market',
          why: 'Learn about each other\'s interests, natural conversation starters',
        },
      ],
      conversation_topics: [
        'Favorite coffee order and why',
        'Best recent read or show',
        'Dream travel destinations',
        'Fun childhood memories',
        'Current hobbies and interests',
      ],
      outfit_suggestions: [
        'Casual chic: jeans and nice top',
        'Comfortable shoes for walking',
        'Layer (cardigan or jacket)',
      ],
      pro_tips: [
        'Arrive 5 minutes early to get settled',
        'Put your phone on silent',
        'Offer to pay, but don\'t insist',
        'Have a graceful exit plan (90 min mark)',
      ],
      backup_plan: 'If weather is bad, replace walk with browsing a bookstore or art gallery',
      personalization_score: 75,
    },
    active: {
      id: '2',
      title: 'Active Adventure Date',
      type: 'active',
      budget: 'low',
      duration: '3-4 hours',
      itinerary: [
        {
          time: '10:00 AM',
          activity: 'Morning hike on easy trail',
          location: 'Local nature trail',
          why: 'Physical activity reduces first-date nerves, shared accomplishment',
          estimated_cost: '$0',
        },
        {
          time: '12:00 PM',
          activity: 'Picnic lunch at scenic viewpoint',
          why: 'Intimate setting, shows planning thoughtfulness',
          estimated_cost: '$20-30',
        },
        {
          time: '1:30 PM',
          activity: 'Visit nearby farmers market or outdoor venue',
          why: 'Relaxed browsing, discover shared interests',
        },
      ],
      conversation_topics: [
        'Favorite outdoor activities',
        'Best travel adventures',
        'Fitness goals and motivations',
        'Bucket list experiences',
      ],
      outfit_suggestions: [
        'Athletic wear with style',
        'Good hiking shoes',
        'Bring extra layer and water bottle',
      ],
      pro_tips: [
        'Choose an easy trail (under 3 miles)',
        'Bring water and snacks',
        'Check weather forecast',
        'Pack a small first aid kit',
      ],
      backup_plan: 'Indoor rock climbing gym or bowling as rain alternative',
      personalization_score: 82,
    },
    foodie: {
      id: '3',
      title: 'Culinary Explorer Date',
      type: 'foodie',
      budget: 'medium',
      duration: '3-4 hours',
      itinerary: [
        {
          time: '6:00 PM',
          activity: 'Start at food hall or tapas restaurant',
          why: 'Multiple small dishes = built-in conversation topics, sharing creates intimacy',
          estimated_cost: '$40-60',
        },
        {
          time: '7:30 PM',
          activity: 'Walk to artisan ice cream or dessert spot',
          why: 'Sweet ending, casual atmosphere, easy to extend or end date',
          estimated_cost: '$10-15',
        },
        {
          time: '8:15 PM',
          activity: 'Optional: rooftop bar or wine bar nearby',
          why: 'Continue if connection is strong',
          estimated_cost: '$20-30',
        },
      ],
      conversation_topics: [
        'Favorite cuisines and why',
        'Best meal you\'ve ever had',
        'Cooking skills and disasters',
        'Dream restaurant to visit',
      ],
      outfit_suggestions: [
        'Dressy casual',
        'Avoid white (food mishaps!)',
        'Comfortable but stylish',
      ],
      pro_tips: [
        'Make reservation for 2 people',
        'Check for dietary restrictions beforehand',
        'Order different dishes to share',
        'Don\'t order messy food on first date',
      ],
      backup_plan: 'Cooking class together if they prefer more activity',
      personalization_score: 88,
    },
    cultural: {
      id: '4',
      title: 'Art & Culture Date',
      type: 'cultural',
      budget: 'medium',
      duration: '3-4 hours',
      itinerary: [
        {
          time: '2:00 PM',
          activity: 'Visit art museum or gallery',
          location: 'Local museum',
          why: 'Thought-provoking conversations, learn each other\'s perspectives',
          estimated_cost: '$20-30',
        },
        {
          time: '3:30 PM',
          activity: 'Coffee or wine at museum café',
          why: 'Discuss what you saw, relax and continue conversation',
          estimated_cost: '$15-25',
        },
        {
          time: '4:30 PM',
          activity: 'Stroll through historic neighborhood',
          why: 'Beautiful setting, good for deeper conversation',
        },
      ],
      conversation_topics: [
        'Favorite artists or art styles',
        'Most memorable museum visit',
        'Cultural experiences that shaped you',
        'Creative outlets and hobbies',
      ],
      outfit_suggestions: [
        'Smart casual',
        'Comfortable walking shoes',
        'Something you feel confident in',
      ],
      pro_tips: [
        'Research current exhibitions',
        'Don\'t feel pressure to see everything',
        'Ask open-ended questions about their interpretations',
        'Museums are quieter on weekday afternoons',
      ],
      backup_plan: 'Live music venue or theater if museum isn\'t appealing',
      personalization_score: 85,
    },
    romantic: {
      id: '5',
      title: 'Romantic Evening Date',
      type: 'romantic',
      budget: 'high',
      duration: '3-4 hours',
      itinerary: [
        {
          time: '6:30 PM',
          activity: 'Sunset cocktails at rooftop bar',
          why: 'Beautiful views, intimate setting, sophisticated atmosphere',
          estimated_cost: '$30-40',
        },
        {
          time: '7:30 PM',
          activity: 'Dinner at upscale restaurant',
          location: 'Romantic restaurant',
          why: 'Special occasion feel, shows effort and interest',
          estimated_cost: '$80-120',
        },
        {
          time: '9:30 PM',
          activity: 'Evening walk along waterfront or city lights',
          why: 'Romantic setting for end-of-date connection',
        },
      ],
      conversation_topics: [
        'Life dreams and aspirations',
        'What makes you feel alive',
        'Most meaningful relationships',
        'Your definition of romance',
      ],
      outfit_suggestions: [
        'Dress to impress',
        'Elegant but comfortable',
        'Consider the venue\'s dress code',
      ],
      pro_tips: [
        'Make reservations well in advance',
        'Confirm restaurant ambiance beforehand',
        'Turn off phone and be fully present',
        'Plan transportation (parking or rideshare)',
      ],
      backup_plan: 'Wine tasting room if dinner doesn\'t feel right',
      personalization_score: 90,
    },
    adventurous: {
      id: '6',
      title: 'Adventure Date',
      type: 'adventurous',
      budget: 'medium',
      duration: '4-5 hours',
      itinerary: [
        {
          time: '1:00 PM',
          activity: 'Try something new together (rock climbing, kayaking, etc.)',
          why: 'Shared challenge builds connection, fun and memorable',
          estimated_cost: '$50-80',
        },
        {
          time: '3:30 PM',
          activity: 'Casual meal at unique local spot',
          why: 'Debrief the experience, share laughs',
          estimated_cost: '$30-40',
        },
        {
          time: '5:00 PM',
          activity: 'Explore quirky neighborhood or vintage shops',
          why: 'Keep the adventure going, discover more',
        },
      ],
      conversation_topics: [
        'Craziest thing you\'ve ever done',
        'Adventure bucket list',
        'Best adrenaline rush',
        'Comfort zone challenges',
      ],
      outfit_suggestions: [
        'Athletic and activity-appropriate',
        'Bring change of clothes',
        'Secure shoes',
      ],
      pro_tips: [
        'Book activity in advance',
        'Ensure both comfortable with activity level',
        'Bring change of clothes for after',
        'Have backup indoor activity',
      ],
      backup_plan: 'Escape room or indoor climbing',
      personalization_score: 92,
    },
  };

  return plans[type];
};

const AIDatePlanner: React.FC<{
  datePlan: DatePlan;
  onSelectActivity?: (activity: DateActivity) => void;
}> = ({ datePlan, onSelectActivity }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const getBudgetColor = (budget: string) => {
    if (budget === 'low') return '#10b981';
    if (budget === 'medium') return '#3b82f6';
    return '#ec4899';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{datePlan.title}</Text>
        <View style={styles.metaInfo}>
          <View style={[styles.badge, { backgroundColor: getBudgetColor(datePlan.budget) }]}>
            <Text style={styles.badgeText}>{datePlan.budget.toUpperCase()}</Text>
          </View>
          <Text style={styles.duration}>⏱️ {datePlan.duration}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Personalization Score:</Text>
          <Text style={styles.scoreValue}>{datePlan.personalization_score}%</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Itinerary</Text>
        {datePlan.itinerary.map((activity, index) => (
          <TouchableOpacity
            key={index}
            style={styles.activityCard}
            onPress={() => onSelectActivity?.(activity)}
          >
            <View style={styles.activityHeader}>
              <Text style={styles.activityTime}>{activity.time}</Text>
              {activity.estimated_cost && (
                <Text style={styles.activityCost}>{activity.estimated_cost}</Text>
              )}
            </View>
            <Text style={styles.activityName}>{activity.activity}</Text>
            {activity.location && (
              <Text style={styles.activityLocation}>📍 {activity.location}</Text>
            )}
            <Text style={styles.activityWhy}>💡 {activity.why}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.collapsibleSection}
        onPress={() => setExpandedSection(expandedSection === 'topics' ? null : 'topics')}
      >
        <Text style={styles.collapsibleTitle}>💬 Conversation Topics</Text>
        {expandedSection === 'topics' && (
          <View style={styles.collapsibleContent}>
            {datePlan.conversation_topics.map((topic, i) => (
              <Text key={i} style={styles.listItem}>• {topic}</Text>
            ))}
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.collapsibleSection}
        onPress={() => setExpandedSection(expandedSection === 'outfit' ? null : 'outfit')}
      >
        <Text style={styles.collapsibleTitle}>👔 Outfit Suggestions</Text>
        {expandedSection === 'outfit' && (
          <View style={styles.collapsibleContent}>
            {datePlan.outfit_suggestions.map((outfit, i) => (
              <Text key={i} style={styles.listItem}>• {outfit}</Text>
            ))}
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.collapsibleSection}
        onPress={() => setExpandedSection(expandedSection === 'tips' ? null : 'tips')}
      >
        <Text style={styles.collapsibleTitle}>⭐ Pro Tips</Text>
        {expandedSection === 'tips' && (
          <View style={styles.collapsibleContent}>
            {datePlan.pro_tips.map((tip, i) => (
              <Text key={i} style={styles.listItem}>• {tip}</Text>
            ))}
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.backupSection}>
        <Text style={styles.backupTitle}>🔄 Backup Plan</Text>
        <Text style={styles.backupText}>{datePlan.backup_plan}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#f9fafb', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  duration: { fontSize: 14, color: '#6b7280' },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreLabel: { fontSize: 14, color: '#6b7280' },
  scoreValue: { fontSize: 18, fontWeight: '700', color: '#ec4899' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  activityCard: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 12 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  activityTime: { fontSize: 14, fontWeight: '700', color: '#ec4899' },
  activityCost: { fontSize: 13, color: '#6b7280' },
  activityName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  activityLocation: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  activityWhy: { fontSize: 13, color: '#374151', fontStyle: 'italic', lineHeight: 18 },
  collapsibleSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  collapsibleTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  collapsibleContent: { marginTop: 12 },
  listItem: { fontSize: 14, color: '#374151', marginBottom: 6, lineHeight: 20 },
  backupSection: { padding: 16, backgroundColor: '#fef3f8' },
  backupTitle: { fontSize: 16, fontWeight: '600', color: '#9f1239', marginBottom: 8 },
  backupText: { fontSize: 14, color: '#881337', lineHeight: 20 },
});

export default AIDatePlanner;
