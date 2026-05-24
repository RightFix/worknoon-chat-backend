import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config()

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WorkNoon Chat API',
      version: '1.0.0',
      description: 'Real-time chat system backend API',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000/api',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'agent', 'customer', 'designer', 'merchant'] },
            avatar: { type: 'string' },
            isOnline: { type: 'boolean' },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['email', 'username', 'password', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            username: { type: 'string', minLength: 3, maxLength: 30 },
            password: { type: 'string', minLength: 6 },
            role: {type: 'string', enum: ['admin', 'agent', 'customer', 'designer', 'merchant']}
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            conversationId: { type: 'string' },
            sender: { type: 'object' },
            content: { type: 'string' },
            messageType: { type: 'string', enum: ['text', 'file', 'image', 'system'] },
            attachments: { type: 'array' },
            readBy: { type: 'array' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            participants: { type: 'array' },
            type: { type: 'string', enum: ['direct', 'group'] },
            lastMessage: { type: 'object' },
            lastMessageAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const specs = swaggerJsdoc(options);