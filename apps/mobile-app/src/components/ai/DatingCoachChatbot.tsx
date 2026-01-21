import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

// Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
  category?: CoachCategory;
  suggestions?: string[];
}

export type CoachCategory =
  | 'profile_advice'
  | 'conversation_help'
  | 'date_planning'
  | 'relationship_questions'
  | 'breakup_support'
  | 'confidence_building'
  | 'communication_skills'
  | 'general';

export interface QuickPrompt {
  id: string;
  text: string;
  category: CoachCategory;
  icon: string;
}

interface DatingCoachChatbotProps {
  userId: string;
  userContext?: {
    name?: string;
    age?: number;
    relationshipStatus?: string;
    currentSituation?: string;
  };
}

const DatingCoachChatbot: React.FC<DatingCoachChatbotProps> = ({ userId, userContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const quickPrompts: QuickPrompt[] = [
    { id: '1', text: 'Help me improve my profile', category: 'profile_advice', icon: '📝' },
    {
      id: '2',
      text: 'What should I say to break the ice?',
      category: 'conversation_help',
      icon: '💬',
    },
    { id: '3', text: 'Plan a great first date', category: 'date_planning', icon: '🎯' },
    {
      id: '4',
      text: 'When should I ask them out?',
      category: 'relationship_questions',
      icon: '❤️',
    },
    { id: '5', text: 'How do I handle rejection?', category: 'confidence_building', icon: '💪' },
    { id: '6', text: "They're not responding", category: 'communication_skills', icon: '📱' },
  ];

  useEffect(() => {
    // Send welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'coach',
      content: `Hi${userContext?.name ? ` ${userContext.name}` : ''}! 👋 I'm your AI dating coach. I'm here to help you with:\n\n• Profile optimization\n• Conversation advice\n• Date planning\n• Relationship questions\n• Building confidence\n\nWhat would you like help with today?`,
      timestamp: new Date(),
      category: 'general',
    };

    setMessages([welcomeMessage]);
  }, []);

  const sendMessage = async (text: string, category?: CoachCategory) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Get AI response
    const response = await getCoachResponse(text, category, messages);

    setIsTyping(false);

    const coachMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'coach',
      content: response.content,
      timestamp: new Date(),
      category: response.category,
      suggestions: response.suggestions,
    };

    setMessages((prev) => [...prev, coachMessage]);

    // Scroll to bottom again
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const getCoachResponse = async (
    userMessage: string,
    category?: CoachCategory,
    conversationHistory?: ChatMessage[]
  ): Promise<{ content: string; category: CoachCategory; suggestions?: string[] }> => {
    // Detect category from message if not provided
    const detectedCategory = category || detectCategory(userMessage);

    // In production, this would call your AI API
    // For now, we'll use rule-based responses

    let content = '';
    let suggestions: string[] = [];

    switch (detectedCategory) {
      case 'profile_advice':
        content = generateProfileAdvice(userMessage);
        suggestions = [
          'Show me examples of great bios',
          'Help me choose better photos',
          'What hobbies should I highlight?',
        ];
        break;

      case 'conversation_help':
        content = generateConversationAdvice(userMessage);
        suggestions = [
          'Give me more conversation starters',
          'How do I keep the conversation going?',
          'What topics should I avoid?',
        ];
        break;

      case 'date_planning':
        content = generateDatePlanningAdvice(userMessage);
        suggestions = [
          'Suggest unique date ideas',
          'Help me plan a second date',
          'What are good coffee shop alternatives?',
        ];
        break;

      case 'relationship_questions':
        content = generateRelationshipAdvice(userMessage);
        suggestions = [
          "How do I know if they're interested?",
          'What are green flags to look for?',
          'When is it too soon to be exclusive?',
        ];
        break;

      case 'breakup_support':
        content = generateBreakupSupport(userMessage);
        suggestions = [
          'How long does it take to move on?',
          'Should I stay friends with my ex?',
          'How do I start dating again?',
        ];
        break;

      case 'confidence_building':
        content = generateConfidenceAdvice(userMessage);
        suggestions = [
          'How do I overcome fear of rejection?',
          'Build my self-esteem tips',
          'How to be more authentic?',
        ];
        break;

      case 'communication_skills':
        content = generateCommunicationAdvice(userMessage);
        suggestions = [
          'How to express my feelings?',
          'Deal with mixed signals',
          'When to have difficult conversations?',
        ];
        break;

      default:
        content =
          "I'm here to help with any dating or relationship questions you have. Could you tell me more about what's on your mind?";
        suggestions = quickPrompts.slice(0, 3).map((p) => p.text);
    }

    return { content, category: detectedCategory, suggestions };
  };

  const detectCategory = (message: string): CoachCategory => {
    const lower = message.toLowerCase();

    if (lower.includes('profile') || lower.includes('bio') || lower.includes('photo')) {
      return 'profile_advice';
    }
    if (lower.includes('conversation') || lower.includes('message') || lower.includes('say')) {
      return 'conversation_help';
    }
    if (
      lower.includes('date') &&
      (lower.includes('plan') || lower.includes('where') || lower.includes('idea'))
    ) {
      return 'date_planning';
    }
    if (
      lower.includes('relationship') ||
      lower.includes('exclusive') ||
      lower.includes('serious')
    ) {
      return 'relationship_questions';
    }
    if (lower.includes('breakup') || lower.includes('broke up') || lower.includes('ex')) {
      return 'breakup_support';
    }
    if (
      lower.includes('confidence') ||
      lower.includes('nervous') ||
      lower.includes('anxious') ||
      lower.includes('scared')
    ) {
      return 'confidence_building';
    }
    if (lower.includes('communicate') || lower.includes('express') || lower.includes('tell them')) {
      return 'communication_skills';
    }

    return 'general';
  };

  const generateProfileAdvice = (message: string): string => {
    return `Great question about profile optimization! Here's my advice:\n\n**Profile Photos:**\n• Use 4-6 clear photos showing different aspects of your life\n• Lead with a genuine smile and eye contact\n• Mix close-ups with full-body shots\n• Show yourself doing activities you love\n\n**Bio Tips:**\n• Be specific about your interests (not just "traveling")\n• Show personality with a touch of humor\n• Mention what you're looking for\n• Keep it concise (50-150 words)\n• End with a conversation hook\n\n**Pro Tip:**\nProfiles with activity photos get 40% more matches! Show yourself hiking, cooking, or enjoying your hobbies.\n\nWould you like me to review your current profile or help you write a better bio?`;
  };

  const generateConversationAdvice = (message: string): string => {
    return `Let me help you start great conversations! 💬\n\n**Conversation Starters:**\n1. Reference something specific from their profile\n   "I noticed you love hiking! What's your favorite trail?"\n\n2. Ask open-ended questions\n   "What's the story behind that photo in [location]?"\n\n3. Share + Ask pattern\n   "I'm really into pottery right now. What hobbies are you exploring?"\n\n**Keep it Going:**\n• Listen actively and build on their answers\n• Share stories, not just facts\n• Use humor naturally (don't force it)\n• Balance questions with sharing about yourself\n\n**Red Flags to Avoid:**\n❌ One-word responses\n❌ Generic compliments only\n❌ Talking only about yourself\n❌ Being too serious too fast\n\nRemember: The goal is to find common ground and show genuine interest!`;
  };

  const generateDatePlanningAdvice = (message: string): string => {
    return `Let's plan a memorable first date! 🎯\n\n**Great First Date Ideas:**\n\n1. **Coffee + Walk** (Classic for a reason)\n   Low pressure, easy to extend if going well\n\n2. **Activity Dates**\n   • Mini golf or bowling\n   • Museum or art gallery\n   • Cooking class\n   • Outdoor market exploration\n\n3. **Casual Dining**\n   • Brunch spot with ambiance\n   • Food truck festival\n   • Cozy wine bar\n\n**First Date Tips:**\n✓ Choose somewhere you can talk easily\n✓ Pick a place you're familiar with\n✓ Have a backup plan\n✓ Keep it 1-2 hours initially\n✓ Suggest a specific day/time (shows confidence)\n\n**Asking Them Out:**\n"I've really enjoyed chatting with you! Would you like to grab coffee at [specific place] this weekend?"\n\n**Pro Tip:**\nActivity dates reduce awkward silences and give you natural things to talk about!`;
  };

  const generateRelationshipAdvice = (message: string): string => {
    return `Great relationship question! Here's my perspective:\n\n**Signs They're Interested:**\n• They respond thoughtfully and ask questions back\n• They initiate conversations\n• They make time to see you\n• They remember details you've shared\n• Body language is open and engaged\n\n**Green Flags to Look For:**\n✅ Consistent communication\n✅ Respects your boundaries\n✅ Shows genuine curiosity about you\n✅ Shares vulnerably\n✅ Makes plans and follows through\n✅ Introduces you to their life\n\n**Red Flags to Watch:**\n🚩 Hot and cold behavior\n🚩 Only reaches out late at night\n🚩 Keeps you at arm's length\n🚩 Avoids making future plans\n🚩 Doesn't ask about your life\n\n**Remember:**\nHealthy relationships develop naturally. If you're constantly anxious or confused about where you stand, that's information too.\n\nTrust your instincts and communicate openly!`;
  };

  const generateBreakupSupport = (message: string): string => {
    return `I'm sorry you're going through this. Breakups are tough, but you're going to get through this. 💙\n\n**Healing Takes Time:**\n• It's normal to feel sad, angry, or confused\n• Give yourself permission to grieve\n• Don't rush the process\n• Most people feel significantly better after 3-6 months\n\n**Healthy Coping Strategies:**\n✓ Lean on friends and family\n✓ Journal your feelings\n✓ Exercise and stay active\n✓ Try new hobbies or revisit old ones\n✓ Focus on personal growth\n✓ Consider therapy if needed\n\n**What to Avoid:**\n❌ Stalking their social media\n❌ Drunk texting\n❌ Jumping into a rebound\n❌ Isolating yourself completely\n\n**When You're Ready to Date Again:**\n• You think about them less\n• You've processed the relationship\n• You're excited about meeting someone new\n• You're not comparing everyone to your ex\n\n**Remember:**\nThis ending makes room for something better. Take time to rediscover yourself!`;
  };

  const generateConfidenceAdvice = (message: string): string => {
    return `Building confidence in dating is a journey, and you're already taking the right step by seeking advice! 💪\n\n**Confidence Building Strategies:**\n\n1. **Reframe Rejection**\n   Rejection isn't about your worth—it's about compatibility. The right person will appreciate you!\n\n2. **Focus on Connection, Not Perfection**\n   Authenticity > Trying to impress\n\n3. **Prepare, Don't Obsess**\n   Have conversation topics ready, but stay present\n\n4. **Practice Self-Compassion**\n   Talk to yourself like you would a friend\n\n5. **Celebrate Small Wins**\n   Sent a message? Great! Got a response? Awesome!\n\n**Confidence Mindset Shifts:**\n❌ "I hope they like me"\n✅ "Let's see if we connect"\n\n❌ "I need to be perfect"\n✅ "I'll be my authentic self"\n\n❌ "Rejection means I'm not good enough"\n✅ "Rejection means we weren't a match"\n\n**Pro Tip:**\nConfidence comes from taking action despite fear. Each conversation, each date, each "yes" makes the next one easier!`;
  };

  const generateCommunicationAdvice = (message: string): string => {
    return `Communication is the foundation of any relationship. Let me help! 💬\n\n**Effective Communication:**\n\n1. **Use "I" Statements**\n   ❌ "You never text me back"\n   ✅ "I feel anxious when I don't hear from you"\n\n2. **Be Direct but Kind**\n   ❌ Hinting or expecting mind-reading\n   ✅ "I'd love to see you more often. How do you feel about that?"\n\n3. **Active Listening**\n   • Put phone away\n   • Maintain eye contact\n   • Reflect back what you heard\n   • Ask clarifying questions\n\n4. **Choose the Right Time**\n   • Not when tired, hungry, or distracted\n   • Ask: "Is now a good time to talk about something?"\n\n5. **Stay Curious, Not Accusatory**\n   ❌ "Why didn't you..."\n   ✅ "Help me understand..."\n\n**Difficult Conversations:**\n• Start with something positive\n• Be specific about the issue\n• Express how you feel\n• Listen to their perspective\n• Work together on solutions\n\n**Remember:**\nGood communication = vulnerability + respect. It gets easier with practice!`;
  };

  const handleQuickPrompt = (prompt: QuickPrompt) => {
    sendMessage(prompt.text, prompt.category);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💝 AI Dating Coach</Text>
        <Text style={styles.headerSubtitle}>24/7 relationship guidance</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 1 && (
          <View style={styles.quickPromptsContainer}>
            <Text style={styles.quickPromptsTitle}>Quick Questions:</Text>
            <View style={styles.quickPromptsGrid}>
              {quickPrompts.map((prompt) => (
                <TouchableOpacity
                  key={prompt.id}
                  style={styles.quickPromptButton}
                  onPress={() => handleQuickPrompt(prompt)}
                >
                  <Text style={styles.quickPromptIcon}>{prompt.icon}</Text>
                  <Text style={styles.quickPromptText}>{prompt.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageRow,
              message.role === 'user' ? styles.userMessageRow : styles.coachMessageRow,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userBubble : styles.coachBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.coachText,
                ]}
              >
                {message.content}
              </Text>
              <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={[styles.messageRow, styles.coachMessageRow]}>
            <View style={[styles.messageBubble, styles.coachBubble]}>
              <ActivityIndicator size="small" color="#ec4899" />
              <Text style={styles.typingText}>Coach is typing...</Text>
            </View>
          </View>
        )}

        {messages.length > 1 &&
          messages[messages.length - 1].suggestions &&
          messages[messages.length - 1].suggestions!.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>You might also ask:</Text>
              {messages[messages.length - 1].suggestions!.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionButton}
                  onPress={() => sendMessage(suggestion)}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything about dating..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isTyping}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  quickPromptsContainer: {
    marginBottom: 20,
  },
  quickPromptsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  quickPromptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPromptButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  quickPromptIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  quickPromptText: {
    fontSize: 13,
    color: '#374151',
  },
  messageRow: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  coachMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#ec4899',
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  coachText: {
    color: '#111827',
  },
  timestamp: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  typingText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 6,
  },
  suggestionsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3f8',
    borderRadius: 12,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ec4899',
    marginBottom: 8,
  },
  suggestionButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#fce7f3',
  },
  suggestionText: {
    fontSize: 13,
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#fff',
  },
});

export default DatingCoachChatbot;
