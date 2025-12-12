/**
 * Data generator utilities for k6 performance tests
 */

/**
 * Generate random user profile data
 * @returns {Object} User profile data
 */
export function generateUserProfile() {
  const firstNames = ['Alex', 'Jordan', 'Casey', 'Riley', 'Morgan', 'Taylor', 'Avery', 'Quinn'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const bios = [
    'Love hiking and outdoor adventures',
    'Coffee enthusiast and bookworm',
    'Passionate about travel and photography',
    'Fitness lover and foodie',
    'Music fanatic and concert goer',
  ];

  return {
    name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
    bio: bios[Math.floor(Math.random() * bios.length)],
    age: Math.floor(Math.random() * 20) + 22, // 22-42
    gender: Math.random() > 0.5 ? 'male' : 'female',
    interests: generateInterests(),
    location: {
      latitude: (Math.random() * 180 - 90).toFixed(6),
      longitude: (Math.random() * 360 - 180).toFixed(6),
    },
  };
}

/**
 * Generate random interests
 * @returns {Array<string>} Array of interests
 */
export function generateInterests() {
  const allInterests = [
    'Travel', 'Photography', 'Music', 'Art', 'Sports', 'Fitness',
    'Cooking', 'Reading', 'Movies', 'Gaming', 'Dancing', 'Yoga',
    'Hiking', 'Camping', 'Technology', 'Fashion', 'Food', 'Wine'
  ];

  const count = Math.floor(Math.random() * 5) + 3; // 3-7 interests
  const shuffled = allInterests.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Generate random message content
 * @returns {string} Message content
 */
export function generateMessage() {
  const messages = [
    'Hey! How are you?',
    'I saw you like hiking too!',
    'Your profile is really interesting!',
    'What are you up to this weekend?',
    'That photo is amazing!',
    'I love that restaurant too!',
    'Have you been to that place?',
    'Nice to match with you!',
    'Tell me more about your interests',
    'What kind of music do you like?',
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Generate random search filters
 * @returns {Object} Search filter parameters
 */
export function generateSearchFilters() {
  return {
    ageRange: {
      min: Math.floor(Math.random() * 10) + 22, // 22-32
      max: Math.floor(Math.random() * 10) + 35, // 35-45
    },
    distance: [10, 25, 50, 100][Math.floor(Math.random() * 4)],
    gender: Math.random() > 0.5 ? ['female'] : ['male'],
    interests: generateInterests().slice(0, 3),
  };
}

/**
 * Generate random coordinates within a radius
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} Coordinates
 */
export function generateCoordinatesWithinRadius(centerLat, centerLon, radiusKm) {
  const radiusInDegrees = radiusKm / 111; // Rough conversion

  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  return {
    latitude: (centerLat + y).toFixed(6),
    longitude: (centerLon + x).toFixed(6),
  };
}

/**
 * Generate random payment data
 * @returns {Object} Payment data
 */
export function generatePaymentData() {
  return {
    amount: [4.99, 9.99, 19.99, 29.99][Math.floor(Math.random() * 4)],
    currency: 'USD',
    productType: ['subscription', 'coins', 'boost'][Math.floor(Math.random() * 3)],
    paymentMethod: ['card', 'paypal', 'apple_pay', 'google_pay'][Math.floor(Math.random() * 4)],
  };
}

/**
 * Generate weighted random choice based on real user behavior
 * @param {Array<Object>} choices - Array of {value, weight} objects
 * @returns {*} Selected value
 */
export function weightedRandom(choices) {
  const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let random = Math.random() * totalWeight;

  for (const choice of choices) {
    random -= choice.weight;
    if (random <= 0) {
      return choice.value;
    }
  }

  return choices[choices.length - 1].value;
}

/**
 * Generate realistic user behavior pattern
 * @returns {Object} Behavior pattern
 */
export function generateUserBehavior() {
  return {
    action: weightedRandom([
      { value: 'browse_profiles', weight: 50 },
      { value: 'send_message', weight: 20 },
      { value: 'view_matches', weight: 15 },
      { value: 'edit_profile', weight: 5 },
      { value: 'purchase', weight: 3 },
      { value: 'settings', weight: 7 },
    ]),
    thinkTime: Math.random() * 3 + 1, // 1-4 seconds
  };
}

/**
 * Generate random user agent
 * @returns {string} User agent string
 */
export function generateUserAgent() {
  const agents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  ];

  return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * Generate random photo metadata
 * @returns {Object} Photo metadata
 */
export function generatePhotoMetadata() {
  return {
    width: [1080, 1920, 2048, 3840][Math.floor(Math.random() * 4)],
    height: [1920, 1080, 2048, 2160][Math.floor(Math.random() * 4)],
    format: ['jpg', 'png', 'webp'][Math.floor(Math.random() * 3)],
    size: Math.floor(Math.random() * 5000000) + 500000, // 500KB - 5.5MB
  };
}
