import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate, registerSchema, loginSchema } from '../utils/validation';
import { RegisterInput, LoginInput, JWTPayload } from '../types';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input or email already exists
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized
 */

const router = Router();

const generateToken = (userId: string, role: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(
    { userId, role } as JWTPayload,
    jwtSecret,
    { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  );
};

router.post('/register', validate(registerSchema), async (req, res: Response): Promise<void> => {
  try {
    const { email, username, password, role } = req.body as RegisterInput;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
      return;
    }

    const user = await User.create({
      email,
      username,
      password,
      role,
    });

    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          avatar: user.avatar,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
});

router.post('/login', validate(loginSchema), async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginInput;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id.toString(), user.role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          avatar: user.avatar,
          isOnline: user.isOnline,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      req.user.isOnline = false;
      req.user.lastSeen = new Date();
      await req.user.save();
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user?._id,
          email: req.user?.email,
          username: req.user?.username,
          role: req.user?.role,
          avatar: req.user?.avatar,
          isOnline: req.user?.isOnline,
          lastSeen: req.user?.lastSeen,
          createdAt: req.user?.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

router.post('/refresh', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const token = generateToken(req.user!._id.toString(), req.user!.role);

    res.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;