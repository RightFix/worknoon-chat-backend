import { Router, Response } from 'express';
import User from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate, updateUserSchema } from '../utils/validation';
import { getIO, EVENTS } from '../config/socket';
import { UserRole } from '../types';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const role = req.query.role as string;
    const search = req.query.search as string;

    const query: Record<string, unknown> = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user?._id.toString();

    if (userId !== currentUserId && req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'You can only update your own profile',
      });
      return;
    }

    const { username, avatar, pushToken, role } = req.body;

    if (role !== undefined) {
      res.status(403).json({
        success: false,
        message: 'Role cannot be changed via this endpoint. Contact an admin.',
      });
      return;
    }

    const updateData: Record<string, string> = {};
    if (username) updateData.username = username;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (pushToken !== undefined) updateData.pushToken = pushToken;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isOnline must be a boolean',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        $set: { 
          isOnline, 
          lastSeen: isOnline ? new Date() : new Date() 
        } 
      },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const io = getIO();
    io.to(`user-${user._id.toString()}`).emit(
      isOnline ? EVENTS.USER_ONLINE : EVENTS.USER_OFFLINE,
      { userId: user._id, isOnline }
    );

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.get('/stats/admin', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const onlineUsers = await User.countDocuments({ isOnline: true });

    res.json({
      success: true,
      data: {
        totalUsers,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>),
        onlineUsers,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.patch('/:id/role', authenticate, authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!role) {
      res.status(400).json({
        success: false,
        message: 'Role is required',
      });
      return;
    }

    const validRoles: UserRole[] = ['admin', 'agent', 'customer', 'designer', 'merchant'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role',
      });
      return;
    }

    if (userId === req.user?._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot change your own role',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { role } },
      { new: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: user,
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;