export type UserRole = 'admin' | 'agent' | 'customer' | 'designer' | 'merchant';

export type MessageType = 'text' | 'file' | 'image' | 'system';

export type ConversationType = 'direct' | 'group';

export interface IUser {
  _id: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  pushToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  sender: string | IUser;
  content: string;
  messageType: MessageType;
  attachments: IAttachment[];
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachment {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface IConversation {
  _id: string;
  participants: (string | IUser)[];
  type: ConversationType;
  lastMessage?: string | IMessage;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest {
  user?: IUser;
  file?: Express.Multer.File;
}

export interface JWTPayload {
  userId: string;
  role: UserRole;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateUserInput {
  username?: string;
  avatar?: string;
  pushToken?: string;
}

export interface SendMessageInput {
  content: string;
  messageType?: MessageType;
  attachments?: IAttachment[];
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface NewMessagePayload {
  conversationId: string;
  message: IMessage;
}

export interface UserStatusPayload {
  userId: string;
  isOnline: boolean;
}