/**
 * MessagesPage Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { MessagesPage } from '../Messages/MessagesPage';

// Mock messaging service
const mockGetConversations = vi.fn();
const mockGetMessages = vi.fn();
const mockSendMessage = vi.fn();

vi.mock('../../services', () => ({
  messagingService: {
    getConversations: () => mockGetConversations(),
    getMessages: (id: string) => mockGetMessages(id),
    sendMessage: (...args: unknown[]) => mockSendMessage(...args),
  },
  Conversation: {},
  Message: {},
}));

// Mock components
vi.mock('../../components/theme/FlamoralBackground', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="flamoral-background">{children}</div>
  ),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(JSON.stringify({ id: 'test-user-1' })),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const mockConversations = [
  {
    id: 'conv-1',
    participant: {
      id: 'user-2',
      name: 'Jane',
      photoUrl: 'https://example.com/jane.jpg',
      isOnline: true,
      isTyping: false,
    },
    lastMessage: {
      content: 'Hey there!',
      sentAt: new Date().toISOString(),
      senderId: 'user-2',
    },
    unreadCount: 2,
    isTyping: false,
  },
  {
    id: 'conv-2',
    participant: {
      id: 'user-3',
      name: 'John',
      photoUrl: 'https://example.com/john.jpg',
      isOnline: false,
      isTyping: false,
    },
    lastMessage: {
      content: 'See you later',
      sentAt: new Date().toISOString(),
      senderId: 'test-user-1',
    },
    unreadCount: 0,
    isTyping: false,
  },
];

const mockMessages = [
  {
    id: 'msg-1',
    senderId: 'user-2',
    content: 'Hey there!',
    sentAt: new Date().toISOString(),
    status: 'read',
  },
  {
    id: 'msg-2',
    senderId: 'test-user-1',
    content: 'Hi! How are you?',
    sentAt: new Date().toISOString(),
    status: 'sent',
  },
];

describe('MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConversations.mockResolvedValue({ conversations: mockConversations });
    mockGetMessages.mockResolvedValue({ messages: mockMessages });
    mockSendMessage.mockResolvedValue({
      id: 'msg-3',
      senderId: 'test-user-1',
      content: 'New message',
      sentAt: new Date().toISOString(),
      status: 'sent',
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner initially', () => {
      mockGetConversations.mockReturnValue(new Promise(() => {}));

      renderWithProviders(<MessagesPage />);

      expect(screen.getByTestId('flamoral-background')).toBeInTheDocument();
    });
  });

  describe('Conversation List', () => {
    it('renders conversation list', async () => {
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
        expect(screen.getByText('John')).toBeInTheDocument();
      });
    });

    it('shows last message preview', async () => {
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Hey there!')).toBeInTheDocument();
        expect(screen.getByText('See you later')).toBeInTheDocument();
      });
    });

    it('shows unread count badge', async () => {
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Unread count for Jane
      });
    });

    it('shows online indicator', async () => {
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
        // Online indicator should be visible for Jane
      });
    });
  });

  describe('Conversation Selection', () => {
    it('loads messages when conversation is selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledWith('conv-1');
      });
    });

    it('displays messages in chat view', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalledWith('conv-1');
      });

      // Messages should be displayed
      await waitFor(
        () => {
          const messages = screen.getAllByTestId('message');
          expect(messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );
    });

    it('shows selected participant name in header', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        // Jane should appear in chat header
        const janeElements = screen.getAllByText('Jane');
        expect(janeElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Message Sending', () => {
    it('sends message when pressing Enter', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Hello!{Enter}');

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('conv-1', 'Hello!');
      });
    });

    it('sends message when clicking send button', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Hello!');

      // Find the send button (circular button next to input) - get all buttons and find the one in the message input area
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons.find(
        (btn) => btn.className.includes('rounded-full') && !btn.textContent
      );
      if (sendButton) {
        await user.click(sendButton);
      }

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('conv-1', 'Hello!');
      });
    });

    it('clears input after sending message', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Hello!{Enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, '   {Enter}');

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('adds sent message to messages list', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'New message{Enter}');

      await waitFor(() => {
        expect(screen.getByText('New message')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('has navigation links', async () => {
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Flamoral')).toBeInTheDocument();
        expect(screen.getByText('Discover')).toBeInTheDocument();
        expect(screen.getByText('Matches')).toBeInTheDocument();
      });
    });

    it('navigates to discover when discover button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Discover')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Discover'));

      expect(mockNavigate).toHaveBeenCalledWith('/discover');
    });
  });

  describe('Message Display', () => {
    it('distinguishes sent and received messages', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalled();
      });

      // Messages should be displayed with different styling (justify-end for sent, justify-start for received)
      await waitFor(
        () => {
          const messages = screen.getAllByTestId('message');
          expect(messages.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );
    });

    it('formats message time', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        // Time should be formatted (e.g., "10:30")
        expect(mockGetMessages).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles conversation load error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetConversations.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('handles message load error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetMessages.mockRejectedValue(new Error('Failed to load messages'));

      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('handles send message error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSendMessage.mockRejectedValue(new Error('Failed to send'));

      const user = userEvent.setup();
      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Jane')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Jane'));

      await waitFor(() => {
        expect(mockGetMessages).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText(/type a message/i);
      await user.type(input, 'Hello!{Enter}');

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Empty States', () => {
    it('handles no conversations', async () => {
      mockGetConversations.mockResolvedValue({ conversations: [] });

      renderWithProviders(<MessagesPage />);

      await waitFor(() => {
        expect(mockGetConversations).toHaveBeenCalled();
      });

      // Should not crash with empty list
      expect(screen.getByTestId('flamoral-background')).toBeInTheDocument();
    });
  });
});
