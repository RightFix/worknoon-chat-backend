import Pusher from 'pusher';
import PusherClient from 'pusher-js';

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'ap2',
  useTLS: true,
});

export const pusherClient = new PusherClient(
  process.env.VITE_PUSHER_KEY || process.env.PUSHER_KEY || '',
  {
    cluster: process.env.VITE_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || 'ap2',
  }
);

export const triggerEvent = async (
  channel: string,
  event: string,
  data: unknown
): Promise<void> => {
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (error) {
    console.error('Pusher trigger error:', error);
  }
};

export const CHANNELS = {
  USER: (userId: string) => `user-${userId}`,
  CONVERSATION: (conversationId: string) => `conversation-${conversationId}`,
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