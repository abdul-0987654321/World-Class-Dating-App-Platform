/// <reference types="cypress" />

describe('Messaging System', () => {
  const testUser = {
    email: 'messaging-test@flamoral.com',
    password: 'Test123!@#',
  };

  beforeEach(() => {
    cy.login(testUser.email, testUser.password);
    cy.waitForWebSocket();
    cy.visit('/messages');
  });

  describe('Conversations List', () => {
    it('should display conversations list', () => {
      cy.get('[data-testid="conversations-list"]').should('be.visible');
    });

    it('should show conversation preview', () => {
      cy.get('[data-testid^="conversation-"]').first().within(() => {
        cy.get('[data-testid="match-photo"]').should('be.visible');
        cy.get('[data-testid="match-name"]').should('be.visible');
        cy.get('[data-testid="last-message"]').should('be.visible');
        cy.get('[data-testid="timestamp"]').should('be.visible');
      });
    });

    it('should show unread message indicator', () => {
      cy.get('[data-testid="unread-badge"]').should('be.visible');
      cy.get('[data-testid="unread-count"]').should('contain', /\d+/);
    });

    it('should sort conversations by most recent', () => {
      cy.get('[data-testid^="conversation-"]').then(($convos) => {
        const timestamps = [];
        $convos.each((i, el) => {
          const timestamp = Cypress.$(el).find('[data-testid="timestamp"]').attr('data-time');
          timestamps.push(new Date(timestamp).getTime());
        });

        const sorted = [...timestamps].sort((a, b) => b - a);
        expect(timestamps).to.deep.equal(sorted);
      });
    });

    it('should filter conversations by search', () => {
      const searchTerm = 'John';
      cy.get('[data-testid="search-conversations"]').type(searchTerm);

      cy.get('[data-testid^="conversation-"]').each(($el) => {
        cy.wrap($el)
          .find('[data-testid="match-name"]')
          .should('contain', searchTerm);
      });
    });
  });

  describe('Message Thread', () => {
    beforeEach(() => {
      cy.get('[data-testid^="conversation-"]').first().click();
    });

    it('should display message thread', () => {
      cy.get('[data-testid="message-thread"]').should('be.visible');
      cy.get('[data-testid="match-header"]').should('be.visible');
      cy.get('[data-testid="message-list"]').should('be.visible');
      cy.get('[data-testid="message-input"]').should('be.visible');
    });

    it('should display messages in chronological order', () => {
      cy.get('[data-testid="message-item"]').then(($messages) => {
        const timestamps = [];
        $messages.each((i, el) => {
          const timestamp = Cypress.$(el).attr('data-timestamp');
          timestamps.push(new Date(timestamp).getTime());
        });

        const sorted = [...timestamps].sort((a, b) => a - b);
        expect(timestamps).to.deep.equal(sorted);
      });
    });

    it('should show message status indicators', () => {
      cy.get('[data-testid="message-item"]').last().within(() => {
        cy.get('[data-testid="message-status"]').should('exist');
        // Status can be: sent, delivered, read
      });
    });

    it('should scroll to bottom on load', () => {
      cy.get('[data-testid="message-list"]').should(($list) => {
        const scrollHeight = $list[0].scrollHeight;
        const scrollTop = $list[0].scrollTop;
        const clientHeight = $list[0].clientHeight;

        expect(scrollTop + clientHeight).to.be.closeTo(scrollHeight, 10);
      });
    });
  });

  describe('Sending Messages', () => {
    beforeEach(() => {
      cy.get('[data-testid^="conversation-"]').first().click();
    });

    it('should send text message', () => {
      const messageText = 'Hello! How are you?';

      cy.interceptAPI('POST', '**/api/v1/messages', {
        id: 'msg-123',
        text: messageText,
        timestamp: new Date().toISOString(),
      }, 'sendMessage');

      cy.sendMessage('test-conversation', messageText);

      cy.wait('@sendMessage');
      cy.get('[data-testid="message-list"]')
        .should('contain', messageText);
    });

    it('should disable send button for empty messages', () => {
      cy.get('[data-testid="message-input"]').clear();
      cy.get('[data-testid="send-button"]').should('be.disabled');
    });

    it('should handle multi-line messages', () => {
      const multiLineMessage = 'Line 1\nLine 2\nLine 3';

      cy.get('[data-testid="message-input"]').type(multiLineMessage.replace(/\n/g, '{shift}{enter}'));
      cy.get('[data-testid="send-button"]').click();

      cy.get('[data-testid="message-list"]')
        .should('contain', 'Line 1')
        .and('contain', 'Line 2')
        .and('contain', 'Line 3');
    });

    it('should send message with Enter key', () => {
      cy.get('[data-testid="message-input"]').type('Quick message{enter}');

      cy.get('[data-testid="message-list"]').should('contain', 'Quick message');
    });

    it('should show typing indicator when typing', () => {
      cy.get('[data-testid="message-input"]').type('Test');

      // Other user's typing indicator
      cy.window().then((win) => {
        const event = new CustomEvent('websocket-message', {
          detail: {
            type: 'typing',
            userId: 'other-user-id',
          },
        });
        win.dispatchEvent(event);
      });

      cy.get('[data-testid="typing-indicator"]').should('be.visible');
    });

    it('should handle send failures gracefully', () => {
      cy.interceptAPI('POST', '**/api/v1/messages', {
        statusCode: 500,
      }, 'failedSend');

      cy.get('[data-testid="message-input"]').type('Failed message');
      cy.get('[data-testid="send-button"]').click();

      cy.wait('@failedSend');
      cy.get('[data-testid="message-error"]').should('be.visible');
      cy.get('[data-testid="retry-send"]').should('be.visible');
    });

    it('should retry failed messages', () => {
      cy.interceptAPI('POST', '**/api/v1/messages', {
        statusCode: 500,
      }, 'firstAttempt');

      cy.get('[data-testid="message-input"]').type('Retry message');
      cy.get('[data-testid="send-button"]').click();

      cy.wait('@firstAttempt');

      cy.interceptAPI('POST', '**/api/v1/messages', {
        id: 'msg-retry',
        text: 'Retry message',
      }, 'retryAttempt');

      cy.get('[data-testid="retry-send"]').click();
      cy.wait('@retryAttempt');

      cy.get('[data-testid="message-error"]').should('not.exist');
    });
  });

  describe('Media Messages', () => {
    beforeEach(() => {
      cy.get('[data-testid^="conversation-"]').first().click();
    });

    it('should send photo message', () => {
      cy.get('[data-testid="attach-button"]').click();
      cy.get('[data-testid="photo-option"]').click();

      cy.fixture('test-photo.jpg').then((fileContent) => {
        cy.get('[data-testid="photo-upload"]').selectFile({
          contents: fileContent,
          fileName: 'test-photo.jpg',
          mimeType: 'image/jpeg',
        }, { force: true });
      });

      cy.get('[data-testid="send-photo-button"]').click();
      cy.get('[data-testid="message-photo"]').should('be.visible');
    });

    it('should show photo preview before sending', () => {
      cy.get('[data-testid="attach-button"]').click();
      cy.get('[data-testid="photo-option"]').click();

      cy.fixture('test-photo.jpg').then((fileContent) => {
        cy.get('[data-testid="photo-upload"]').selectFile({
          contents: fileContent,
          fileName: 'test-photo.jpg',
        }, { force: true });
      });

      cy.get('[data-testid="photo-preview"]').should('be.visible');
      cy.get('[data-testid="cancel-photo"]').should('be.visible');
      cy.get('[data-testid="send-photo-button"]').should('be.visible');
    });

    it('should open photo viewer on click', () => {
      cy.get('[data-testid="message-photo"]').first().click();

      cy.get('[data-testid="photo-viewer"]').should('be.visible');
      cy.get('[data-testid="close-viewer"]').should('be.visible');
    });

    it('should send GIF (premium feature)', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('userPlan', 'premium');
      });

      cy.get('[data-testid="attach-button"]').click();
      cy.get('[data-testid="gif-option"]').should('be.visible');
      cy.get('[data-testid="gif-option"]').click();

      cy.get('[data-testid="gif-picker"]').should('be.visible');
      cy.get('[data-testid="gif-item"]').first().click();

      cy.get('[data-testid="message-gif"]').should('be.visible');
    });
  });

  describe('Real-time Updates', () => {
    it('should receive new messages in real-time', () => {
      cy.get('[data-testid^="conversation-"]').first().click();

      // Simulate incoming WebSocket message
      cy.window().then((win) => {
        const event = new CustomEvent('websocket-message', {
          detail: {
            type: 'new_message',
            message: {
              id: 'new-msg-123',
              text: 'Real-time message',
              senderId: 'other-user-id',
              timestamp: new Date().toISOString(),
            },
          },
        });
        win.dispatchEvent(event);
      });

      cy.get('[data-testid="message-list"]')
        .should('contain', 'Real-time message');
    });

    it('should update message read status', () => {
      cy.get('[data-testid^="conversation-"]').first().click();

      // Mark messages as read
      cy.window().then((win) => {
        const event = new CustomEvent('websocket-message', {
          detail: {
            type: 'messages_read',
            conversationId: 'test-conversation',
          },
        });
        win.dispatchEvent(event);
      });

      cy.get('[data-testid="message-status"]').should('contain', 'Read');
    });

    it('should show online status', () => {
      cy.get('[data-testid="match-header"]').within(() => {
        cy.get('[data-testid="online-status"]').should('exist');
      });
    });
  });

  describe('Message Actions', () => {
    beforeEach(() => {
      cy.get('[data-testid^="conversation-"]').first().click();
    });

    it('should delete message', () => {
      cy.get('[data-testid="message-item"]').first().rightclick();
      cy.get('[data-testid="delete-message"]').click();

      cy.get('[data-testid="confirm-delete"]').click();

      cy.get('[data-testid="message-deleted-indicator"]').should('be.visible');
    });

    it('should copy message text', () => {
      cy.get('[data-testid="message-item"]').first().rightclick();
      cy.get('[data-testid="copy-message"]').click();

      cy.get('[data-testid="copied-toast"]').should('be.visible');
    });

    it('should report message', () => {
      cy.get('[data-testid="message-item"]').first().rightclick();
      cy.get('[data-testid="report-message"]').click();

      cy.get('[data-testid="report-modal"]').should('be.visible');
      cy.get('[data-testid="report-reason-harassment"]').click();
      cy.get('[data-testid="submit-report"]').click();

      cy.get('[data-testid="report-success-toast"]').should('be.visible');
    });
  });

  describe('Conversation Actions', () => {
    it('should unmatch user', () => {
      cy.get('[data-testid^="conversation-"]').first().click();

      cy.get('[data-testid="conversation-menu"]').click();
      cy.get('[data-testid="unmatch-option"]').click();

      cy.get('[data-testid="unmatch-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-unmatch"]').click();

      cy.url().should('include', '/messages');
      cy.get('[data-testid="unmatch-success-toast"]').should('be.visible');
    });

    it('should block user', () => {
      cy.get('[data-testid^="conversation-"]').first().click();

      cy.get('[data-testid="conversation-menu"]').click();
      cy.get('[data-testid="block-option"]').click();

      cy.get('[data-testid="block-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-block"]').click();

      cy.get('[data-testid="block-success-toast"]').should('be.visible');
    });

    it('should mute conversation', () => {
      cy.get('[data-testid^="conversation-"]').first().click();

      cy.get('[data-testid="conversation-menu"]').click();
      cy.get('[data-testid="mute-option"]').click();

      cy.get('[data-testid="muted-indicator"]').should('be.visible');
    });
  });

  describe('Icebreakers & Prompts', () => {
    beforeEach(() => {
      cy.get('[data-testid^="conversation-"]').first().click();
    });

    it('should show conversation starters', () => {
      cy.get('[data-testid="icebreaker-button"]').click();
      cy.get('[data-testid="icebreaker-suggestions"]').should('be.visible');
      cy.get('[data-testid="icebreaker-item"]').should('have.length.at.least', 3);
    });

    it('should use icebreaker suggestion', () => {
      cy.get('[data-testid="icebreaker-button"]').click();
      cy.get('[data-testid="icebreaker-item"]').first().click();

      cy.get('[data-testid="message-input"]').should('not.be.empty');
    });
  });

  describe('Performance & Optimization', () => {
    it('should load messages in batches', () => {
      cy.get('[data-testid^="conversation-"]').first().click();

      cy.get('[data-testid="message-list"]').scrollTo('top');

      cy.get('[data-testid="loading-older-messages"]').should('be.visible');
    });

    it('should virtualize long message lists', () => {
      // Test that not all messages are in DOM
      cy.get('[data-testid="message-list"]').then(($list) => {
        const totalMessages = $list.attr('data-total-messages');
        const renderedMessages = $list.find('[data-testid="message-item"]').length;

        expect(parseInt(totalMessages)).to.be.greaterThan(renderedMessages);
      });
    });
  });

  describe('Notifications', () => {
    it('should show desktop notification for new message', () => {
      cy.window().then((win) => {
        cy.stub(win.Notification, 'requestPermission').resolves('granted');
        cy.stub(win, 'Notification').as('notification');
      });

      cy.visit('/discover'); // Navigate away from messages

      // Simulate new message
      cy.window().then((win) => {
        const event = new CustomEvent('websocket-message', {
          detail: {
            type: 'new_message',
            message: {
              text: 'New notification message',
              senderId: 'other-user-id',
            },
          },
        });
        win.dispatchEvent(event);
      });

      cy.get('@notification').should('have.been.called');
    });

    it('should update unread count badge', () => {
      cy.visit('/discover');

      // Simulate new message
      cy.window().then((win) => {
        const event = new CustomEvent('websocket-message', {
          detail: {
            type: 'new_message',
            conversationId: 'test-convo',
          },
        });
        win.dispatchEvent(event);
      });

      cy.get('[data-testid="messages-badge"]').should('be.visible');
    });
  });
});
