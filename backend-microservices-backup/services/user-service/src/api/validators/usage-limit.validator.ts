import Joi from 'joi';

export const resourceTypeParamsSchema = Joi.object({
  resourceType: Joi.string()
    .valid('swipes', 'likes', 'super_likes', 'rewinds', 'boosts')
    .required()
    .messages({
      'any.only': 'Invalid resource type',
      'any.required': 'Resource type is required',
    }),
});
