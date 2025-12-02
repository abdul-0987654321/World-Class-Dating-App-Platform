/**
 * Heartly Realtime Client SDK
 *
 * A JavaScript/TypeScript client for connecting to the Heartly Realtime Service
 *
 * Usage:
 *   const client = new HeartlyRealtimeClient('ws://localhost:8081/ws', 'your-jwt-token');
 *   client.connect();
 *   client.on('message:new', (data) => console.log('New message:', data));
 *   client.sendMessage('conv-123', 'Hello!');
 */

class HeartlyRealtimeClient {
    constructor(url, token, options = {}) {
        this.url = url;
        this.token = token;
        this.ws = null;
        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
        this.reconnectDelay = options.reconnectDelay || 3000;
        this.shouldReconnect = true;
        this.pingInterval = null;
        this.sessionId = null;
        this.userId = null;
    }

    /**
     * Connect to the WebSocket server
     */
    connect() {
        const wsUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;

        console.log('[Heartly] Connecting to', this.url);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[Heartly] Connected');
            this.reconnectAttempts = 0;
            this.startPingInterval();
            this.emit('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('[Heartly] Failed to parse message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('[Heartly] WebSocket error:', error);
            this.emit('error', error);
        };

        this.ws.onclose = (event) => {
            console.log('[Heartly] Disconnected', event.code, event.reason);
            this.stopPingInterval();
            this.emit('disconnected', { code: event.code, reason: event.reason });

            if (this.shouldReconnect) {
                this.attemptReconnect();
            }
        };
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        this.shouldReconnect = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[Heartly] Max reconnection attempts reached');
            this.emit('reconnect_failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`[Heartly] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => {
            this.emit('reconnecting', { attempt: this.reconnectAttempts });
            this.connect();
        }, delay);
    }

    /**
     * Handle incoming messages
     */
    handleMessage(message) {
        const { event, data } = message;

        console.log('[Heartly] Received:', event, data);

        // Handle special events
        if (event === 'connected') {
            this.sessionId = data.sessionId;
            this.userId = data.userId;
        }

        // Emit to event handlers
        this.emit(event, data);
    }

    /**
     * Send a message to the server
     */
    send(event, data, requestId = null) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('[Heartly] Cannot send - not connected');
            return false;
        }

        const message = {
            event,
            data,
            requestId: requestId || `req-${Date.now()}-${Math.random()}`,
            timestamp: new Date().toISOString()
        };

        try {
            this.ws.send(JSON.stringify(message));
            console.log('[Heartly] Sent:', event, data);
            return true;
        } catch (error) {
            console.error('[Heartly] Send failed:', error);
            return false;
        }
    }

    /**
     * Register an event handler
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Unregister an event handler
     */
    off(event, handler) {
        if (!this.eventHandlers.has(event)) return;

        const handlers = this.eventHandlers.get(event);
        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Emit an event to all registered handlers
     */
    emit(event, data) {
        if (!this.eventHandlers.has(event)) return;

        const handlers = this.eventHandlers.get(event);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error('[Heartly] Event handler error:', error);
            }
        });
    }

    /**
     * Start sending periodic pings
     */
    startPingInterval() {
        this.pingInterval = setInterval(() => {
            this.send('ping', {});
        }, 30000); // Ping every 30 seconds
    }

    /**
     * Stop sending pings
     */
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    // ========== High-level API Methods ==========

    /**
     * Send a chat message
     */
    sendMessage(conversationId, text, options = {}) {
        return this.send('message:send', {
            conversationId,
            type: options.type || 'TEXT',
            content: {
                text,
                ...options.content
            },
            tempId: options.tempId || `temp-${Date.now()}`,
            replyTo: options.replyTo
        });
    }

    /**
     * Mark a message as read
     */
    markAsRead(conversationId, messageId) {
        return this.send('message:read', {
            conversationId,
            messageId
        });
    }

    /**
     * React to a message
     */
    reactToMessage(messageId, emoji) {
        return this.send('message:react', {
            messageId,
            emoji
        });
    }

    /**
     * Start typing indicator
     */
    startTyping(conversationId) {
        return this.send('typing:start', { conversationId });
    }

    /**
     * Stop typing indicator
     */
    stopTyping(conversationId) {
        return this.send('typing:stop', { conversationId });
    }

    /**
     * Update presence status
     */
    updatePresence(status) {
        return this.send('presence:update', { status });
    }

    /**
     * Subscribe to channels
     */
    subscribe(channels) {
        return this.send('subscribe', { channels });
    }

    /**
     * Unsubscribe from channels
     */
    unsubscribe(channels) {
        return this.send('unsubscribe', { channels });
    }
}

// Export for use in Node.js or browsers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HeartlyRealtimeClient;
}

// Example usage:
if (typeof window !== 'undefined') {
    // Browser example
    window.HeartlyRealtimeClient = HeartlyRealtimeClient;

    // Example initialization
    console.log('HeartlyRealtimeClient loaded. Usage:');
    console.log(`
        const client = new HeartlyRealtimeClient('ws://localhost:8081/ws', 'your-jwt-token');

        // Register event handlers
        client.on('connected', () => console.log('Connected!'));
        client.on('message:new', (data) => console.log('New message:', data));
        client.on('typing:indicator', (data) => console.log('Typing:', data));
        client.on('presence:changed', (data) => console.log('Presence:', data));

        // Connect
        client.connect();

        // Send messages
        client.sendMessage('conv-123', 'Hello!');
        client.startTyping('conv-123');
        client.updatePresence('online');
    `);
}
