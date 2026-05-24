import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { IUserDocument } from '../models/User';
import { JWTPayload } from '../types';

export interface AuthRequest extends Request {
  user?: IUserDocument;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        message: 'Server configuration error.',
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as JWTPayload;
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      next();
      return;
    }

    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as JWTPayload;
    const user = await User.findById(decoded.userId);

    if (user) {
      req.user = user;
    }

    next();
  } catch {
    next();
  }
};