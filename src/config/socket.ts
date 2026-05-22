import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join-user', (userId: string) => {
      socket.join(`user-${userId}`);
      socket.broadcast.emit('user-online', { userId });
    });

    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conversation-${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation-${conversationId}`);
    });

    socket.on('typing-start', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      socket.to(`conversation-${conversationId}`).emit('typing-start', { userId });
    });

    socket.on('typing-stop', ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      socket.to(`conversation-${conversationId}`).emit('typing-stop', { userId });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const EVENTS = {
  NEW_MESSAGE: 'new-message',
  MESSAGE_READ: 'message-read',
  TYPING_START: 'typing-start',
  TYPING_STOP: 'typing-stop',
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',
  NOTIFICATION: 'notification',
};