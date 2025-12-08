import { io, Socket } from 'socket.io-client';

/**
 * WebSocket client helper for integration tests
 * Provides utilities for testing real-time features
 */

export interface WebSocketClientOptions {
  url: string;
  auth?: {
    token?: string;
  };
  reconnection?: boolean;
  transports?: string[];
}

export class WebSocketTestClient {
  private socket: Socket;
  private messageHandlers: Map<string, Array<(data: any) => void>> = new Map();
  private connectionPromise?: Promise<void>;
  private disconnectionPromise?: Promise<void>;

  constructor(options: WebSocketClientOptions) {
    this.socket = io(options.url, {
      auth: options.auth,
      reconnection: options.reconnection ?? false,
      transports: options.transports || ['websocket'],
    });

    // Setup default event listeners
    this.setupEventListeners();
  }

  /**
   * Setup default event listeners
   */
  private setupEventListeners(): void {
    this.socket.on('connect', () => {
      // Connection established
    });

    this.socket.on('disconnect', () => {
      // Disconnected
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.socket.connected) {
      return;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      this.socket.once('connect', () => resolve());
      this.socket.once('connect_error', (error) => reject(error));

      if (!this.socket.connected) {
        this.socket.connect();
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from the WebSocket server
   */
  async disconnect(): Promise<void> {
    if (!this.socket.connected) {
      return;
    }

    this.disconnectionPromise = new Promise((resolve) => {
      this.socket.once('disconnect', () => resolve());
      this.socket.disconnect();
    });

    return this.disconnectionPromise;
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: any): void {
    this.socket.emit(event, data);
  }

  /**
   * Emit an event and wait for acknowledgment
   */
  async emitWithAck(event: string, data?: any, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Acknowledgment timeout for event: ${event}`));
      }, timeout);

      this.socket.emit(event, data, (response: any) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  /**
   * Listen for an event
   */
  on(event: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
    this.socket.on(event, handler);
  }

  /**
   * Listen for an event once
   */
  once(event: string): Promise<any> {
    return new Promise((resolve) => {
      this.socket.once(event, (data) => {
        resolve(data);
      });
    });
  }

  /**
   * Wait for a specific event with timeout
   */
  async waitForEvent(event: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      this.socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  /**
   * Remove event listener
   */
  off(event: string, handler?: (data: any) => void): void {
    if (handler) {
      this.socket.off(event, handler);
      const handlers = this.messageHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.messageHandlers.delete(event);
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.socket.removeAllListeners();
    this.messageHandlers.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket.connected;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket.id;
  }

  /**
   * Join a room
   */
  async joinRoom(room: string): Promise<void> {
    return this.emitWithAck('join', { room });
  }

  /**
   * Leave a room
   */
  async leaveRoom(room: string): Promise<void> {
    return this.emitWithAck('leave', { room });
  }

  /**
   * Get the underlying socket instance
   */
  getSocket(): Socket {
    return this.socket;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    await this.disconnect();
  }
}

/**
 * Create WebSocket test client
 */
export const createWebSocketClient = (options: WebSocketClientOptions): WebSocketTestClient => {
  return new WebSocketTestClient(options);
};

/**
 * Create multiple WebSocket clients for testing concurrent connections
 */
export const createMultipleClients = async (
  count: number,
  options: WebSocketClientOptions
): Promise<WebSocketTestClient[]> => {
  const clients: WebSocketTestClient[] = [];

  for (let i = 0; i < count; i++) {
    const client = new WebSocketTestClient(options);
    await client.connect();
    clients.push(client);
  }

  return clients;
};

/**
 * Cleanup multiple clients
 */
export const cleanupMultipleClients = async (clients: WebSocketTestClient[]): Promise<void> => {
  await Promise.all(clients.map((client) => client.cleanup()));
};
