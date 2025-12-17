import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Redis adapter for Socket.IO to enable horizontal scaling
 * This allows multiple instances of the API Gateway to share WebSocket connections
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisTLS = this.configService.get<boolean>('REDIS_TLS') || false;
    const redisDB = this.configService.get<number>('REDIS_DB') || 0;

    const redisUrl = redisPassword
      ? `redis://:${redisPassword}@${redisHost}:${redisPort}/${redisDB}`
      : `redis://${redisHost}:${redisPort}/${redisDB}`;

    console.log(`🔄 Connecting to Redis for Socket.IO adapter: ${redisHost}:${redisPort}`);

    const pubClient = createClient({
      url: redisUrl,
      socket: {
        tls: redisTLS,
        rejectUnauthorized: false, // For Azure Redis
        connectTimeout: 10000, // 10 second timeout
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis connection failed after 10 retries');
            return new Error('Too many retries');
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(`🔄 Redis reconnect attempt ${retries}, waiting ${delay}ms`);
          return delay;
        },
      },
    });

    const subClient = pubClient.duplicate();

    // Enhanced error handling
    pubClient.on('error', (err) => {
      console.error('❌ Redis Pub Client Error:', {
        message: err.message,
        code: err.code,
        syscall: err.syscall,
      });
    });

    subClient.on('error', (err) => {
      console.error('❌ Redis Sub Client Error:', {
        message: err.message,
        code: err.code,
        syscall: err.syscall,
      });
    });

    pubClient.on('connect', () => {
      console.log('✅ Redis Pub Client connected');
    });

    subClient.on('connect', () => {
      console.log('✅ Redis Sub Client connected');
    });

    pubClient.on('reconnecting', () => {
      console.log('🔄 Redis Pub Client reconnecting...');
    });

    subClient.on('reconnecting', () => {
      console.log('🔄 Redis Sub Client reconnecting...');
    });

    pubClient.on('ready', () => {
      console.log('✅ Redis Pub Client ready');
    });

    subClient.on('ready', () => {
      console.log('✅ Redis Sub Client ready');
    });

    try {
      await Promise.all([
        pubClient.connect(),
        subClient.connect(),
      ]);

      this.adapterConstructor = createAdapter(pubClient, subClient);

      console.log('✅ Redis adapter for Socket.IO connected successfully');
      console.log('✅ Socket.IO horizontal scaling enabled via Redis');
    } catch (error) {
      console.error('❌ Failed to connect Redis clients:', error.message);
      throw error;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      // Enhanced WebSocket configuration
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6, // 1MB
      allowUpgrades: true,
      perMessageDeflate: {
        threshold: 1024,
      },
      httpCompression: {
        threshold: 1024,
      },
      // Cookie-based session support
      cookie: {
        name: 'io',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    });

    // Apply Redis adapter if available
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      console.log('✅ Socket.IO using Redis adapter for horizontal scaling');
    } else {
      console.warn('⚠️ Socket.IO Redis adapter not initialized, running in standalone mode');
    }

    return server;
  }
}
