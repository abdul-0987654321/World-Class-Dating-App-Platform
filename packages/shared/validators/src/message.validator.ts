import Joi from 'joi';
import { MAX_MESSAGE_LENGTH } from '@flamoral/constants';

export const sendMessageSchema = Joi.object({
  content: Joi.string().max(MAX_MESSAGE_LENGTH).required(),
  type: Joi.string().valid('text', 'image', 'gif').optional().default('text'),
  mediaUrl: Joi.string().uri().optional()
});
