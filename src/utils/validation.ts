import Joi from 'joi';
import { Request, Response } from 'express';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().min(5).max(10).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(30).optional(),
  avatar: Joi.string().uri().optional().allow(''),
  pushToken: Joi.string().optional().allow(''),
});

export const createConversationSchema = Joi.object({
  participantId: Joi.string().required(),
  type: Joi.string().valid('direct', 'group').optional(),
  name: Joi.string().optional(),
});

export const sendMessageSchema = Joi.object({
  content: Joi.string().required(),
  messageType: Joi.string().valid('text', 'file', 'image', 'system').optional(),
  attachments: Joi.array().items(
    Joi.object({
      url: Joi.string().required(),
      filename: Joi.string().required(),
      mimeType: Joi.string().required(),
      size: Joi.number().required(),
    })
  ).optional(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const validate = (schema: Joi.Schema) => {
  return (req: Request, res: Response, next: () => void) => {
    const { error } = schema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
      return;
    }
    next();
  };
};