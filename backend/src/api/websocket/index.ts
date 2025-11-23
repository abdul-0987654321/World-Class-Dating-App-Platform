import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export function createWebSocketServer(): Server {
  const http = require('http');
  const server = http.createServer();
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('WebSocket client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('WebSocket client disconnected:', socket.id);
    });

    socket.on('message', (data) => {
      console.log('Received message:', data);
      socket.emit('message', { received: true, data });
    });
  });

  return server;
}
