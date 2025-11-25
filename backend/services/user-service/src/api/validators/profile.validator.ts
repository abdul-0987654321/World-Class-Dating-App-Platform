import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  bio: Joi.string().max(500).optional().allow(''),
  occupation: Joi.string().max(100).optional().allow(''),
  education: Joi.string().max(100).optional().allow(''),
  height: Joi.number().min(100).max(250).optional().allow(null),
  city: Joi.string().max(100).optional().allow(''),
  state: Joi.string().max(100).optional().allow(''),
  country: Joi.string().max(100).optional().allow(''),
  latitude: Joi.number().min(-90).max(90).optional().allow(null),
  longitude: Joi.number().min(-180).max(180).optional().allow(null),
  interests: Joi.array().items(Joi.string()).max(10).optional(),
  languages: Joi.array().items(Joi.string()).max(10).optional(),
});
