import Joi from 'joi';

export const createOpeningMoveSchema = Joi.object({
  type: Joi.string().valid('text', 'image', 'system').required().messages({
    'any.only': 'Type must be one of: text, image, system',
    'any.required': 'Type is required',
  }),
  content: Joi.string()
    .max(200)
    .when('type', {
      is: 'text',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.max': 'Content cannot exceed 200 characters',
      'any.required': 'Content is required for text-based opening moves',
    }),
  image_url: Joi.string()
    .uri()
    .max(500)
    .when('type', {
      is: 'image',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.uri': 'Image URL must be a valid URL',
      'string.max': 'Image URL cannot exceed 500 characters',
      'any.required': 'Image URL is required for image-based opening moves',
    }),
  template_id: Joi.string()
    .uuid()
    .when('type', {
      is: 'system',
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.uuid': 'Template ID must be a valid UUID',
      'any.required': 'Template ID is required for system opening moves',
    }),
  order: Joi.number().integer().min(0).max(2).optional().messages({
    'number.min': 'Order must be at least 0',
    'number.max': 'Order cannot exceed 2',
  }),
});

export const updateOpeningMoveSchema = Joi.object({
  content: Joi.string().max(200).optional().messages({
    'string.max': 'Content cannot exceed 200 characters',
  }),
  image_url: Joi.string().uri().max(500).optional().messages({
    'string.uri': 'Image URL must be a valid URL',
    'string.max': 'Image URL cannot exceed 500 characters',
  }),
  order: Joi.number().integer().min(0).max(2).optional().messages({
    'number.min': 'Order must be at least 0',
    'number.max': 'Order cannot exceed 2',
  }),
  active: Joi.boolean().optional(),
});

export const reorderOpeningMovesSchema = Joi.object({
  orderedIds: Joi.array().items(Joi.string().uuid()).min(1).max(3).required().messages({
    'array.min': 'At least one opening move ID is required',
    'array.max': 'Cannot exceed 3 opening moves',
    'any.required': 'orderedIds is required',
  }),
});

export const createOpeningResponseSchema = Joi.object({
  opening_move_id: Joi.string().uuid().required().messages({
    'string.uuid': 'Opening move ID must be a valid UUID',
    'any.required': 'Opening move ID is required',
  }),
  response_text: Joi.string().min(1).max(500).required().messages({
    'string.min': 'Response text cannot be empty',
    'string.max': 'Response text cannot exceed 500 characters',
    'any.required': 'Response text is required',
  }),
});

export const categoryParamSchema = Joi.object({
  category: Joi.string()
    .valid('interests', 'date_ideas', 'travel', 'fun', 'conversation', 'food', 'entertainment')
    .required()
    .messages({
      'any.only':
        'Category must be one of: interests, date_ideas, travel, fun, conversation, food, entertainment',
      'any.required': 'Category is required',
    }),
});
