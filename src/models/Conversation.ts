import mongoose, { Document, Schema, Model } from 'mongoose';
import { ConversationType } from '../types';

export interface IConversationDocument extends Document {
  participants: mongoose.Types.ObjectId[];
  type: ConversationType;
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt: Date;
}

const conversationSchema = new Schema<IConversationDocument>(
  {
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: [true, 'Participants are required'],
      validate: {
        validator: function (arr: mongoose.Types.ObjectId[]) {
          return arr.length >= 2;
        },
        message: 'Conversation must have at least 2 participants',
      },
    },
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation: Model<IConversationDocument> = mongoose.model(
  'Conversation',
  conversationSchema
);

export default Conversation;