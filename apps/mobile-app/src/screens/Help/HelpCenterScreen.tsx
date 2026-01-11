import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'How do I create an account?',
    answer:
      'To create an account, download the Flamoral app and tap "Sign Up". You can register using your phone number, email, or social media accounts like Google or Apple.',
    category: 'Getting Started',
  },
  {
    id: '2',
    question: 'How does matching work?',
    answer:
      'Matching works by swiping right on profiles you like. If they also swipe right on you, it\'s a match! You\'ll then be able to start messaging each other.',
    category: 'Matching',
  },
  {
    id: '3',
    question: 'What is Photo Verification?',
    answer:
      'Photo Verification helps ensure profiles are authentic. Take a selfie following the on-screen instructions, and we\'ll verify it matches your profile photos. Verified profiles get a blue checkmark badge.',
    category: 'Safety',
  },
  {
    id: '4',
    question: 'How do I report or block someone?',
    answer:
      'To report or block someone, go to their profile, tap the three dots menu, and select "Report" or "Block". You can also unmatch them if you\'re already matched.',
    category: 'Safety',
  },
  {
    id: '5',
    question: 'What are Super Likes?',
    answer:
      'A Super Like lets someone know you\'re really interested in them before they make a decision about you. They\'ll see a blue star on your profile. Free users get 1 Super Like per day.',
    category: 'Features',
  },
  {
    id: '6',
    question: 'How do I cancel my subscription?',
    answer:
      'To cancel your subscription, go to Settings > Subscription > Manage Subscription. Follow the instructions for your platform (iOS App Store or Google Play).',
    category: 'Subscription',
  },
  {
    id: '7',
    question: 'Why can\'t I see my matches?',
    answer:
      'If you can\'t see your matches, try refreshing the app or logging out and back in. If the issue persists, contact our support team.',
    category: 'Troubleshooting',
  },
  {
    id: '8',
    question: 'How do I change my location?',
    answer:
      'Your location updates automatically based on your device\'s GPS. Premium users can use Travel Mode to change their location to anywhere in the world.',
    category: 'Features',
  },
];

const categories = [
  'All',
  'Getting Started',
  'Matching',
  'Safety',
  'Features',
  'Subscription',
  'Troubleshooting',
];

interface AccordionItemProps {
  item: FAQItem;
  isExpanded: boolean;
  onPress: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  item,
  isExpanded,
  onPress,
}) => {
  return (
    <View style={styles.accordionItem}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={item.question}
        accessibilityState={{ expanded: isExpanded }}
      >
        <Text style={styles.accordionQuestion}>{item.question}</Text>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#8E8E93"
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.accordionContent}>
          <Text style={styles.accordionAnswer}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
};

const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredFAQs = faqData.filter((faq) => {
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@flamoral.com');
  };

  const handleChatSupport = () => {
    // Navigate to chat support - functionality to be implemented
    navigation.navigate('ChatSupport' as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for help..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
            accessibilityLabel="Search help articles"
          />
          {searchQuery !== '' && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${category}`}
              accessibilityState={{ selected: selectedCategory === category }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleContactSupport}
              accessibilityRole="button"
              accessibilityLabel="Email support"
            >
              <Icon name="mail" size={24} color="#FF6B6B" />
              <Text style={styles.quickActionText}>Email Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={handleChatSupport}
              accessibilityRole="button"
              accessibilityLabel="Live chat"
            >
              <Icon name="chatbubbles" size={24} color="#FF6B6B" />
              <Text style={styles.quickActionText}>Live Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('SafetyTips' as never)}
              accessibilityRole="button"
              accessibilityLabel="Safety tips"
            >
              <Icon name="shield-checkmark" size={24} color="#FF6B6B" />
              <Text style={styles.quickActionText}>Safety Tips</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.faqContainer}>
          <Text style={styles.sectionTitle}>
            Frequently Asked Questions ({filteredFAQs.length})
          </Text>
          <View style={styles.faqList}>
            {filteredFAQs.map((faq) => (
              <AccordionItem
                key={faq.id}
                item={faq}
                isExpanded={expandedId === faq.id}
                onPress={() =>
                  setExpandedId(expandedId === faq.id ? null : faq.id)
                }
              />
            ))}
          </View>
        </View>

        {filteredFAQs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Icon name="search-outline" size={60} color="#E5E5EA" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySubtitle}>
              Try different keywords or contact support
            </Text>
          </View>
        )}

        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactSubtitle}>
            Our support team is here to help you 24/7
          </Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleContactSupport}
            accessibilityRole="button"
            accessibilityLabel="Contact support team"
          >
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryChipActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  quickActionsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    marginTop: 8,
    textAlign: 'center',
  },
  faqContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  faqList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  accordionItem: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  accordionQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 12,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  accordionAnswer: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  contactContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  contactButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HelpCenterScreen;
