import Joi from 'joi';

// Valid enum values for profile fields
const SMOKING_STATUS = ['never', 'sometimes', 'regularly'];
const DRINKING_STATUS = ['never', 'socially', 'regularly'];
const EXERCISE_FREQUENCY = ['never', 'sometimes', 'regularly', 'daily'];
const DIET_TYPE = ['anything', 'vegetarian', 'vegan', 'halal', 'kosher', 'other'];
const PETS_TYPE = ['none', 'dog', 'cat', 'both', 'other'];
const RELATIONSHIP_TYPE = ['casual', 'serious', 'friendship', 'unsure'];
const GROUP_SIZE_PREFERENCE = ['one-on-one', 'small-group', 'large-group', 'any'];

export const updateProfileSchema = Joi.object({
  // Basic profile fields
  bio: Joi.string().min(10).max(500).optional().allow(''),
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

  // Lifestyle fields
  smoking: Joi.string().valid(...SMOKING_STATUS).optional().allow(null),
  drinking: Joi.string().valid(...DRINKING_STATUS).optional().allow(null),
  exercise: Joi.string().valid(...EXERCISE_FREQUENCY).optional().allow(null),
  diet: Joi.string().valid(...DIET_TYPE).optional().allow(null),
  pets: Joi.string().valid(...PETS_TYPE).optional().allow(null),

  // Additional profile fields
  relationship_type: Joi.string().valid(...RELATIONSHIP_TYPE).optional().allow(null),
  has_children: Joi.boolean().optional(),
  wants_children: Joi.boolean().optional().allow(null),
  zodiac_sign: Joi.string().max(50).optional().allow(''),
  religion: Joi.string().max(100).optional().allow(''),
  politics: Joi.string().max(100).optional().allow(''),

  // Friends Mode fields
  friend_looking_for: Joi.array().items(Joi.string()).max(10).optional(),
  friend_activities: Joi.array().items(Joi.string()).max(20).optional(),
  friend_availability: Joi.string().max(200).optional().allow(''),
  friend_group_size_preference: Joi.string().valid(...GROUP_SIZE_PREFERENCE).optional().allow(null),

  // Network Mode fields
  network_industry: Joi.string().max(100).optional().allow(''),
  network_profession: Joi.string().max(100).optional().allow(''),
  network_company: Joi.string().max(100).optional().allow(''),
  network_job_title: Joi.string().max(100).optional().allow(''),
  network_years_experience: Joi.number().min(0).max(100).optional().allow(null),
  network_skills: Joi.array().items(Joi.string()).max(20).optional(),
  network_looking_for: Joi.array().items(Joi.string()).max(10).optional(),
  network_linkedin_url: Joi.string().uri().max(200).optional().allow(''),
  network_portfolio_url: Joi.string().uri().max(200).optional().allow(''),
  network_career_goals: Joi.string().max(500).optional().allow(''),
  network_open_to_opportunities: Joi.boolean().optional(),
});
