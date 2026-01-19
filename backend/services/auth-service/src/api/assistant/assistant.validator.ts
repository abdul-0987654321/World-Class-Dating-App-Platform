/**
 * FLAMORAL AI Assistant - Input Validation
 * Joi schemas for request validation
 */

import Joi from 'joi';
import { AssistantContext } from './assistant.types';

/**
 * Valid context values
 */
const validContexts = Object.values(AssistantContext);

/**
 * Message request validation schema
 */
export const messageSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.min': 'Message must be at least 1 character',
      'string.max': 'Message cannot exceed 2000 characters',
      'any.required': 'Message is required',
    }),

  sessionId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Session ID must be a valid UUID',
    }),

  context: Joi.string()
    .valid(...validContexts)
    .optional()
    .default(AssistantContext.GENERAL)
    .messages({
      'any.only': `Context must be one of: ${validContexts.join(', ')}`,
    }),

  includeHistory: Joi.boolean()
    .optional()
    .default(true),
});

/**
 * Stream message request validation schema
 */
export const streamMessageSchema = Joi.object({
  message: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.min': 'Message must be at least 1 character',
      'string.max': 'Message cannot exceed 2000 characters',
      'any.required': 'Message is required',
    }),

  sessionId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'Session ID must be a valid UUID',
    }),

  context: Joi.string()
    .valid(...validContexts)
    .optional()
    .default(AssistantContext.GENERAL)
    .messages({
      'any.only': `Context must be one of: ${validContexts.join(', ')}`,
    }),
});

/**
 * Get history request validation schema
 */
export const getHistorySchema = Joi.object({
  sessionId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Session ID must be a valid UUID',
      'any.required': 'Session ID is required',
    }),
});

/**
 * Clear history request validation schema
 */
export const clearHistorySchema = Joi.object({
  sessionId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Session ID must be a valid UUID',
      'any.required': 'Session ID is required',
    }),
});

/**
 * Feedback request validation schema
 */
export const feedbackSchema = Joi.object({
  sessionId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Session ID must be a valid UUID',
      'any.required': 'Session ID is required',
    }),

  messageId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Message ID must be a valid UUID',
      'any.required': 'Message ID is required',
    }),

  rating: Joi.string()
    .valid('helpful', 'not_helpful')
    .required()
    .messages({
      'any.only': 'Rating must be either "helpful" or "not_helpful"',
      'any.required': 'Rating is required',
    }),

  feedback: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Feedback cannot exceed 500 characters',
    }),
});

export default {
  messageSchema,
  streamMessageSchema,
  getHistorySchema,
  clearHistorySchema,
  feedbackSchema,
};
