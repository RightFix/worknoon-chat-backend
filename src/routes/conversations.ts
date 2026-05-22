import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'username email role avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username' },
      })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Conversation.countDocuments({ participants: userId });

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          readBy: { $ne: userId },
          sender: { $ne: userId },
        });
        return { ...conv.toObject(), unreadCount };
      })
    );

    res.json({
      success: true,
      data: conversationsWithUnread,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { participantId, type = 'direct', name } = req.body;
    const currentUserId = req.user?._id;

    if (!participantId) {
      res.status(400).json({
        success: false,
        message: 'Participant ID is required',
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(participantId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid participant ID',
      });
      return;
    }

    const participant = await User.findById(participantId);
    if (!participant) {
      res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
      return;
    }

    if (type === 'direct') {
      const existingConversation = await Conversation.findOne({
        participants: { $all: [currentUserId, participantId], $size: 2 },
        type: 'direct',
      });

      if (existingConversation) {
        res.json({
          success: true,
          data: existingConversation,
          message: 'Conversation already exists',
        });
        return;
      }
    }

    const conversation = await Conversation.create({
      participants: [currentUserId, participantId],
      type,
      lastMessageAt: new Date(),
    });

    await conversation.populate('participants', 'username email role avatar isOnline lastSeen');

    res.status(201).json({
      success: true,
      data: conversation,
      message: 'Conversation created successfully',
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'username email role avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username' },
      });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === req.user?._id.toString()
    );

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        message: 'You are not a participant of this conversation',
      });
      return;
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user?._id.toString()
    );

    if (!isParticipant && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own conversations',
      });
      return;
    }

    await Message.deleteMany({ conversationId: conversation._id });
    await Conversation.findByIdAndDelete(conversation._id);

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;