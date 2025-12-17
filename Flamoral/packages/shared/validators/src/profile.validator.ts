import Joi from 'joi';

// Constants for validation
const MIN_BIO_LENGTH = 10;
const MAX_BIO_LENGTH = 500;
const MAX_INTERESTS = 10;
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 250;

export const updateProfileSchema = Joi.object({
  // Basic profile information
  bio: Joi.string().min(MIN_BIO_LENGTH).max(MAX_BIO_LENGTH).optional(),
  occupation: Joi.string().max(100).optional().allow(''),
  education: Joi.string().max(100).optional().allow(''),
  height: Joi.number().min(MIN_HEIGHT).max(MAX_HEIGHT).optional(),

  // Location information
  city: Joi.string().max(100).optional().allow(''),
  state: Joi.string().max(100).optional().allow(''),
  country: Joi.string().max(100).optional().allow(''),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),

  // Arrays
  interests: Joi.array().items(Joi.string().max(50)).max(MAX_INTERESTS).optional(),
  languages: Joi.array().items(Joi.string().max(50)).max(MAX_INTERESTS).optional(),

  // Lifestyle preferences
  smoking: Joi.string().valid('never', 'sometimes', 'regularly').optional(),
  drinking: Joi.string().valid('never', 'socially', 'regularly').optional(),
  exercise: Joi.string().valid('never', 'sometimes', 'regularly', 'daily').optional(),
  diet: Joi.string().valid('anything', 'vegetarian', 'vegan', 'halal', 'kosher', 'other').optional(),
  pets: Joi.string().valid('none', 'dog', 'cat', 'both', 'other').optional(),

  // Relationship preferences
  relationship_type: Joi.string().valid('casual', 'serious', 'friendship', 'unsure').optional(),
  has_children: Joi.boolean().optional(),
  wants_children: Joi.boolean().optional(),

  // Personal information
  zodiac_sign: Joi.string().max(50).optional().allow(''),
  religion: Joi.string().max(100).optional().allow(''),
  politics: Joi.string().max(100).optional().allow(''),

  // Friends Mode fields
  friend_looking_for: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  friend_activities: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  friend_availability: Joi.string().max(200).optional().allow(''),
  friend_group_size_preference: Joi.string().valid('one-on-one', 'small-group', 'large-group', 'any').optional(),

  // Network Mode fields
  network_industry: Joi.string().max(100).optional().allow(''),
  network_profession: Joi.string().max(100).optional().allow(''),
  network_company: Joi.string().max(100).optional().allow(''),
  network_job_title: Joi.string().max(100).optional().allow(''),
  network_years_experience: Joi.number().min(0).max(100).optional(),
  network_skills: Joi.array().items(Joi.string().max(100)).max(20).optional(),
  network_looking_for: Joi.array().items(Joi.string().max(100)).max(10).optional(),
  network_linkedin_url: Joi.string().uri().max(500).optional().allow(''),
  network_portfolio_url: Joi.string().uri().max(500).optional().allow(''),
  network_career_goals: Joi.string().max(500).optional().allow(''),
  network_open_to_opportunities: Joi.boolean().optional(),
});

export const createProfileSchema = Joi.object({
  // Same as update schema but with required fields
  bio: Joi.string().min(MIN_BIO_LENGTH).max(MAX_BIO_LENGTH).optional(),
  occupation: Joi.string().max(100).optional().allow(''),
  education: Joi.string().max(100).optional().allow(''),
  height: Joi.number().min(MIN_HEIGHT).max(MAX_HEIGHT).optional(),
  city: Joi.string().max(100).optional().allow(''),
  state: Joi.string().max(100).optional().allow(''),
  country: Joi.string().max(100).optional().allow(''),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  interests: Joi.array().items(Joi.string().max(50)).max(MAX_INTERESTS).optional(),
  languages: Joi.array().items(Joi.string().max(50)).max(MAX_INTERESTS).optional(),
});
