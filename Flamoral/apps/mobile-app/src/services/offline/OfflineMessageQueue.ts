import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_MESSAGES_KEY = '@flamoral:offline_messages';

export interface OfflineMessage {
  id: string;
  matchId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'voice' | 'gif';
  metadata?: any;
}

class OfflineMessageQueue {
  private messages: OfflineMessage[] = [];

  async initialize(): Promise<void> {
    try {
      const storedMessages = await AsyncStorage.getItem(OFFLINE_MESSAGES_KEY);
      if (storedMessages) {
        this.messages = JSON.parse(storedMessages);
      }
    } catch (error) {
      console.error('Failed to initialize offline message queue:', error);
    }
  }

  async addMessage(message: Omit<OfflineMessage, 'id' | 'timestamp'>): Promise<void> {
    const offlineMessage: OfflineMessage = {
      ...message,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.messages.push(offlineMessage);
    await this.persist();
  }

  async getMessages(): Promise<OfflineMessage[]> {
    return [...this.messages];
  }

  async getMessagesByMatch(matchId: string): Promise<OfflineMessage[]> {
    return this.messages.filter((msg) => msg.matchId === matchId);
  }

  async removeMessage(messageId: string): Promise<void> {
    this.messages = this.messages.filter((msg) => msg.id !== messageId);
    await this.persist();
  }

  async clearAll(): Promise<void> {
    this.messages = [];
    await this.persist();
  }

  async processPendingMessages(
    sendCallback: (message: OfflineMessage) => Promise<boolean>
  ): Promise<void> {
    const messagesToProcess = [...this.messages];

    for (const message of messagesToProcess) {
      try {
        const sent = await sendCallback(message);
        if (sent) {
          await this.removeMessage(message.id);
        }
      } catch (error) {
        console.error('Failed to send offline message:', message.id, error);
      }
    }
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        OFFLINE_MESSAGES_KEY,
        JSON.stringify(this.messages)
      );
    } catch (error) {
      console.error('Failed to persist offline messages:', error);
    }
  }

  getPendingCount(): number {
    return this.messages.length;
  }
}

export default new OfflineMessageQueue();
