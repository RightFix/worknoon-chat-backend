import { Router, Response } from 'express';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getIO, EVENTS } from '../config/socket';
import { SendMessageInput } from '../types';

/**
 * @swagger
 * /api/messages/{conversationId}:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 *       403:
 *         description: Not a participant
 */

const router = Router();

router.get('/:conversationId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId);
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

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        message: 'You are not a participant of this conversation',
      });
      return;
    }

    const messages = await Message.find({ conversationId })
      .populate('sender', 'username email role avatar')
      .populate('readBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ conversationId });

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.post('/:conversationId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { content, messageType = 'text', attachments } = req.body as SendMessageInput;
    const senderId = req.user?._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === senderId?.toString()
    );

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        message: 'You are not a participant of this conversation',
      });
      return;
    }

    const message = await Message.create({
      conversationId,
      sender: senderId,
      content,
      messageType,
      attachments: attachments || [],
      readBy: [senderId],
    });

    await message.populate('sender', 'username email role avatar');

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username email role avatar')
      .populate('readBy', 'username');

    const io = getIO();
    io.to(`conversation-${conversationId}`).emit(EVENTS.NEW_MESSAGE, { message: populatedMessage });

    for (const participantId of conversation.participants) {
      if (participantId.toString() !== senderId?.toString()) {
        io.to(`user-${participantId.toString()}`).emit(EVENTS.NOTIFICATION, {
          type: 'new_message',
          conversationId,
          message: populatedMessage,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: populatedMessage,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.put('/:messageId/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user?._id;

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
      });
      return;
    }

    const hasRead = message.readBy.some((id) => id.toString() === userId?.toString());
    if (!hasRead) {
      message.readBy.push(userId!);
      await message.save();
    }

    const io = getIO();
    io.to(`conversation-${message.conversationId.toString()}`).emit(EVENTS.MESSAGE_READ, { messageId, userId });

    res.json({
      success: true,
      message: 'Message marked as read',
    });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.put('/:conversationId/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
      return;
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId?.toString()
    );

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        message: 'You are not a participant',
      });
      return;
    }

    await Message.updateMany(
      {
        conversationId,
        readBy: { $ne: userId },
        sender: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({
      success: true,
      message: 'All messages marked as read',
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.delete('/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user?._id;

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({
        success: false,
        message: 'Message not found',
      });
      return;
    }

    if (message.sender.toString() !== userId?.toString() && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
      return;
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;