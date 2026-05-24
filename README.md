# WorkNoon Chat Backend

Real-time chat system backend for eCommerce platforms. Enables communication between buyers, merchants, designers, and customer support agents.

## Features

- JWT Authentication (Sign Up/Login)
- User Roles: admin, agent, customer, designer, merchant
- Real-time messaging via Pusher
- CRUD for conversations/messages
- Read/unread status with timestamps
- Typing indicators
- Online/offline status tracking
- File uploads
- RESTful API

## Tech Stack

- **Runtime**: Node.js (TypeScript)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket IO (WebSocket)
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Multer (local, extensible to S3)
- **Validation**: Joi

## Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Pusher account (free tier)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/RightFix/worknoon-chat-backend.git
cd worknoon-chat-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/worknoon-chat?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## Deployment (Vercel)

This backend is designed to deploy to Vercel as serverless functions:

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/refresh` | Refresh JWT token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (paginated) |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id` | Update user |
| PUT | `/api/users/:id/status` | Update online status |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List user's conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id` | Get conversation by ID |
| DELETE | `/api/conversations/:id` | Delete conversation |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages/:conversationId` | Get messages (paginated) |
| POST | `/api/messages/:conversationId` | Send message |
| PUT | `/api/messages/:messageId/read` | Mark as read |
| PUT | `/api/messages/:conversationId/read-all` | Mark all as read |
| DELETE | `/api/messages/:messageId` | Delete message |

### File Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file/image |

## User Roles

| Role | Description |
|------|-------------|
| `admin` | System administrators with full access |
| `agent` | Customer support agents |
| `customer` | Buyers/purchasers |
| `designer` | Design professionals |
| `merchant` | Product sellers/vendors |

## Challenges & Solutions

### Cold Start Performance
**Challenge**: MongoDB Atlas cold starts can be slow.

**Solution**: Implemented connection pooling and keep-alive. For production, consider using connection pooling services or Atlas Data API.

## Project Structure

```
src/
├── config/
│   ├── db.ts          # MongoDB connection
│   |── socket.ts      # Socket IO configuration
|       
├── models/
│   ├── User.ts        # User model
│   ├── Conversation.ts # Conversation model
│   └── Message.ts     # Message model
├── routes/
│   ├── auth.ts        # Authentication routes
│   ├── users.ts       # User routes
│   ├── conversations.ts # Conversation routes
│   ├── messages.ts    # Message routes
│   └── upload.ts      # File upload routes
├── middleware/
│   └── auth.ts        # JWT authentication
├── utils/
│   └── validation.ts  # Joi validation schemas
├── types/
│   └── index.ts       # TypeScript types
└── index.ts           # Express app
```

## License

MIT

## Author

RightFix - https://github.com/RightFix