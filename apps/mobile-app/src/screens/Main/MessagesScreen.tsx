import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';

// Mock conversation data
const MOCK_CONVERSATIONS = [
  {
    id: '1',
    matchId: 'm1',
    otherUser: {
      id: 'u1',
      name: 'Emma',
      photo: 'https://randomuser.me/api/portraits/women/1.jpg',
      isOnline: true,
    },
    lastMessage: {
      content: 'Hey! How are you doing today?',
      sentAt: new Date(Date.now() - 5 * 60 * 1000),
      senderId: 'u1',
    },
    unreadCount: 2,
    messages: [
      { id: 'm1', content: 'Hi there!', sentAt: new Date(Date.now() - 60 * 60 * 1000), senderId: 'me' },
      { id: 'm2', content: 'Hey! Nice to match with you!', sentAt: new Date(Date.now() - 55 * 60 * 1000), senderId: 'u1' },
      { id: 'm3', content: 'Same here! Your photos are amazing', sentAt: new Date(Date.now() - 50 * 60 * 1000), senderId: 'me' },
      { id: 'm4', content: 'Thanks! I love your bio', sentAt: new Date(Date.now() - 45 * 60 * 1000), senderId: 'u1' },
      { id: 'm5', content: 'Hey! How are you doing today?', sentAt: new Date(Date.now() - 5 * 60 * 1000), senderId: 'u1' },
    ],
  },
  {
    id: '2',
    matchId: 'm2',
    otherUser: {
      id: 'u2',
      name: 'Sophia',
      photo: 'https://randomuser.me/api/portraits/women/2.jpg',
      isOnline: false,
    },
    lastMessage: {
      content: 'That sounds like fun! When are you free?',
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      senderId: 'me',
    },
    unreadCount: 0,
    messages: [
      { id: 'm1', content: 'Hi Sophia!', sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000), senderId: 'me' },
      { id: 'm2', content: 'Hey! How are you?', sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000), senderId: 'u2' },
      { id: 'm3', content: 'Great! Want to grab coffee sometime?', sentAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000), senderId: 'me' },
      { id: 'm4', content: 'That sounds like fun! When are you free?', sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), senderId: 'me' },
    ],
  },
  {
    id: '3',
    matchId: 'm3',
    otherUser: {
      id: 'u3',
      name: 'Olivia',
      photo: 'https://randomuser.me/api/portraits/women/3.jpg',
      isOnline: true,
    },
    lastMessage: {
      content: 'I love hiking too! Have you been to the national park?',
      sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      senderId: 'u3',
    },
    unreadCount: 1,
    messages: [],
  },
  {
    id: '4',
    matchId: 'm4',
    otherUser: {
      id: 'u4',
      name: 'Ava',
      photo: 'https://randomuser.me/api/portraits/women/4.jpg',
      isOnline: false,
    },
    lastMessage: {
      content: 'Nice to meet you!',
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      senderId: 'u4',
    },
    unreadCount: 0,
    messages: [],
  },
];

type Conversation = typeof MOCK_CONVERSATIONS[0];
type Message = { id: string; content: string; sentAt: Date; senderId: string };

const MessagesScreen = () => {
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    // Mark as read
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversation.id ? { ...c, unreadCount: 0 } : c
      )
    );
    setSelectedConversation(conversation);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: `m${Date.now()}`,
      content: messageText.trim(),
      sentAt: new Date(),
      senderId: 'me',
    };

    // Update conversation
    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? {
              ...c,
              messages: [...c.messages, newMessage],
              lastMessage: {
                content: newMessage.content,
                sentAt: newMessage.sentAt,
                senderId: newMessage.senderId,
              },
            }
          : c
      )
    );

    setSelectedConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, newMessage],
            lastMessage: {
              content: newMessage.content,
              sentAt: newMessage.sentAt,
              senderId: newMessage.senderId,
            },
          }
        : null
    );

    setMessageText('');

    // Simulate typing response
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        // Simulate reply
        const replyMessage: Message = {
          id: `m${Date.now()}_reply`,
          content: getRandomReply(),
          sentAt: new Date(),
          senderId: selectedConversation.otherUser.id,
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  messages: [...c.messages, newMessage, replyMessage],
                  lastMessage: {
                    content: replyMessage.content,
                    sentAt: replyMessage.sentAt,
                    senderId: replyMessage.senderId,
                  },
                }
              : c
          )
        );

        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, replyMessage],
                lastMessage: {
                  content: replyMessage.content,
                  sentAt: replyMessage.sentAt,
                  senderId: replyMessage.senderId,
                },
              }
            : null
        );
      }, 2000);
    }, 1000);
  }, [messageText, selectedConversation]);

  const getRandomReply = (): string => {
    const replies = [
      "That's so interesting! Tell me more!",
      "Haha, I totally agree!",
      "Sounds great! I'd love that",
      "You're so sweet!",
      "That made me smile!",
      "I was just thinking the same thing!",
      "We should definitely do that sometime!",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleSelectConversation(item)}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.otherUser.photo }} style={styles.avatar} />
        {item.otherUser.isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{item.otherUser.name}</Text>
          <Text style={styles.timestamp}>{getTimeAgo(item.lastMessage.sentAt)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.lastMessage,
              item.unreadCount > 0 && styles.unreadMessage,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage.senderId === 'me' ? 'You: ' : ''}
            {item.lastMessage.content}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === 'me';
    return (
      <View
        style={[
          styles.messageBubble,
          isMe ? styles.myMessage : styles.theirMessage,
        ]}
      >
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
          {getTimeAgo(item.sentAt)}
        </Text>
      </View>
    );
  };

  // Chat View
  if (selectedConversation) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity
              onPress={() => setSelectedConversation(null)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Image
              source={{ uri: selectedConversation.otherUser.photo }}
              style={styles.chatAvatar}
            />
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatName}>
                {selectedConversation.otherUser.name}
              </Text>
              <Text style={styles.chatStatus}>
                {selectedConversation.otherUser.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <Text style={styles.moreButtonText}>...</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={selectedConversation.messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />

          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.typingContainer}>
              <Text style={styles.typingText}>
                {selectedConversation.otherUser.name} is typing...
              </Text>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !messageText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Text
                style={[
                  styles.sendButtonText,
                  !messageText.trim() && styles.sendButtonTextDisabled,
                ]}
              >
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Conversations List View
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#999"
        />
      </View>

      {/* Conversations List */}
      {conversations.length > 0 ? (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>
            Start swiping to find your matches!
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
  },
  listContainer: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#E91E63',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Chat View Styles
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#E91E63',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  chatStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  moreButton: {
    padding: 10,
  },
  moreButtonText: {
    fontSize: 20,
    color: '#666',
  },
  messagesList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E91E63',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  typingContainer: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
});

export default MessagesScreen;
