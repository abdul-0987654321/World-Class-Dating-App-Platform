/**
 * Demo Server
 * Standalone server with mock data for frontend testing
 * No database dependencies required
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'demo-secret-key-for-testing';

// Middleware
app.use(cors());
app.use(express.json());

// ==================== Mock Data ====================

const testUsers = [
  {
    id: 'user_001',
    email: 'test1@flamoral.com',
    password: 'TestUser1!',
    firstName: 'Alex',
    lastName: 'Demo',
    name: 'Alex Demo',
    dateOfBirth: '1995-06-15',
    gender: 'male',
    bio: 'Software engineer who loves hiking and photography. Always up for an adventure!',
    occupation: 'Software Engineer',
    city: 'San Francisco',
    photos: [
      'https://randomuser.me/api/portraits/men/32.jpg',
      'https://randomuser.me/api/portraits/men/33.jpg',
    ],
    subscription: { tier: 'PLATINUM', status: 'active' },
    wallet: { coins: 500, gems: 25, bonusCoins: 100 },
    isVerified: true,
  },
  {
    id: 'user_002',
    email: 'test2@flamoral.com',
    password: 'TestUser2!',
    firstName: 'Jordan',
    lastName: 'Demo',
    name: 'Jordan Demo',
    dateOfBirth: '1993-01-30',
    gender: 'female',
    bio: 'Marketing professional. Coffee enthusiast. Love trying new restaurants.',
    occupation: 'Marketing Manager',
    city: 'Los Angeles',
    photos: [
      'https://randomuser.me/api/portraits/women/44.jpg',
      'https://randomuser.me/api/portraits/women/45.jpg',
    ],
    subscription: { tier: 'GOLD', status: 'active' },
    wallet: { coins: 250, gems: 10, bonusCoins: 50 },
    isVerified: true,
  },
  {
    id: 'user_003',
    email: 'admin@flamoral.com',
    password: 'AdminUser1!',
    firstName: 'Admin',
    lastName: 'User',
    name: 'Admin User',
    dateOfBirth: '1990-05-20',
    gender: 'other',
    bio: 'Platform administrator',
    occupation: 'Administrator',
    city: 'New York',
    photos: ['https://randomuser.me/api/portraits/lego/1.jpg'],
    subscription: { tier: 'DIAMOND', status: 'active' },
    wallet: { coins: 9999, gems: 999, bonusCoins: 500 },
    isVerified: true,
    isAdmin: true,
  },
];

const mockProfiles = [
  {
    id: 'profile_001',
    userId: 'match_001',
    name: 'Sarah',
    age: 28,
    bio: 'Yoga instructor and travel enthusiast. Looking for someone to explore the world with.',
    occupation: 'Yoga Instructor',
    city: 'San Francisco',
    distance: 3,
    photos: ['https://randomuser.me/api/portraits/women/65.jpg', 'https://randomuser.me/api/portraits/women/66.jpg'],
    interests: ['Yoga', 'Travel', 'Photography', 'Hiking'],
    isVerified: true,
  },
  {
    id: 'profile_002',
    userId: 'match_002',
    name: 'Michael',
    age: 32,
    bio: 'Chef by passion, foodie by nature. Let me cook you dinner!',
    occupation: 'Executive Chef',
    city: 'Oakland',
    distance: 8,
    photos: ['https://randomuser.me/api/portraits/men/22.jpg', 'https://randomuser.me/api/portraits/men/23.jpg'],
    interests: ['Cooking', 'Wine', 'Travel', 'Music'],
    isVerified: true,
  },
  {
    id: 'profile_003',
    userId: 'match_003',
    name: 'Emily',
    age: 26,
    bio: 'Artist and dog mom. Always looking for new inspiration and great conversations.',
    occupation: 'Graphic Designer',
    city: 'Berkeley',
    distance: 12,
    photos: ['https://randomuser.me/api/portraits/women/32.jpg', 'https://randomuser.me/api/portraits/women/33.jpg'],
    interests: ['Art', 'Dogs', 'Coffee', 'Reading'],
    isVerified: false,
  },
  {
    id: 'profile_004',
    userId: 'match_004',
    name: 'David',
    age: 30,
    bio: 'Startup founder. Love building things and meeting interesting people.',
    occupation: 'Entrepreneur',
    city: 'San Jose',
    distance: 25,
    photos: ['https://randomuser.me/api/portraits/men/44.jpg', 'https://randomuser.me/api/portraits/men/45.jpg'],
    interests: ['Tech', 'Startups', 'Basketball', 'Gaming'],
    isVerified: true,
  },
  {
    id: 'profile_005',
    userId: 'match_005',
    name: 'Olivia',
    age: 27,
    bio: 'Doctor by day, salsa dancer by night. Looking for my dance partner!',
    occupation: 'Physician',
    city: 'Palo Alto',
    distance: 15,
    photos: ['https://randomuser.me/api/portraits/women/55.jpg', 'https://randomuser.me/api/portraits/women/56.jpg'],
    interests: ['Dancing', 'Medicine', 'Fitness', 'Travel'],
    isVerified: true,
  },
];

const mockMatches = [
  {
    id: 'match_001',
    matchedUserId: 'match_001',
    name: 'Sarah',
    photo: 'https://randomuser.me/api/portraits/women/65.jpg',
    matchedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'Hey! How was your weekend?',
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 2,
  },
  {
    id: 'match_002',
    matchedUserId: 'match_002',
    name: 'Michael',
    photo: 'https://randomuser.me/api/portraits/men/22.jpg',
    matchedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastMessage: 'That restaurant looks amazing!',
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    unreadCount: 0,
  },
];

const mockMessages: Record<string, any[]> = {
  match_001: [
    { id: 'm1', senderId: 'match_001', content: 'Hi there!', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: 'm2', senderId: 'user_001', content: 'Hey! How are you?', timestamp: new Date(Date.now() - 7000000).toISOString() },
    { id: 'm3', senderId: 'match_001', content: 'Great! How was your weekend?', timestamp: new Date(Date.now() - 3600000).toISOString() },
  ],
  match_002: [
    { id: 'm4', senderId: 'user_001', content: 'Love your photos!', timestamp: new Date(Date.now() - 172800000).toISOString() },
    { id: 'm5', senderId: 'match_002', content: 'Thanks! That restaurant looks amazing!', timestamp: new Date(Date.now() - 86400000).toISOString() },
  ],
};

const mockSubscriptionPlans = [
  {
    id: 'free',
    slug: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ['10 daily likes', 'Basic matching', 'Send messages'],
    dailyLikes: 10,
    dailySuperLikes: 0,
    seeWhoLikesYou: false,
  },
  {
    id: 'gold',
    slug: 'gold',
    name: 'Gold',
    monthlyPrice: 1499,
    yearlyPrice: 9999,
    features: ['Unlimited likes', 'See who likes you', '5 Super Likes/day', '1 Boost/week'],
    dailyLikes: -1,
    dailySuperLikes: 5,
    seeWhoLikesYou: true,
  },
  {
    id: 'platinum',
    slug: 'platinum',
    name: 'Platinum',
    monthlyPrice: 2499,
    yearlyPrice: 14999,
    features: ['Everything in Gold', 'Priority likes', 'Read receipts', 'Incognito mode'],
    dailyLikes: -1,
    dailySuperLikes: 10,
    seeWhoLikesYou: true,
    readReceipts: true,
  },
  {
    id: 'diamond',
    slug: 'diamond',
    name: 'Diamond',
    monthlyPrice: 3999,
    yearlyPrice: 23999,
    features: ['Everything in Platinum', 'Unlimited Boosts', 'Exclusive events', 'Personal concierge'],
    dailyLikes: -1,
    dailySuperLikes: -1,
    seeWhoLikesYou: true,
    readReceipts: true,
    spotlight: true,
  },
  {
    id: 'elite',
    slug: 'elite',
    name: 'Elite',
    monthlyPrice: 9999,
    yearlyPrice: 59999,
    features: ['Everything in Diamond', 'VIP matchmaking', 'Profile written by experts', 'Dedicated relationship coach', 'Exclusive VIP events', 'Priority customer support'],
    dailyLikes: -1,
    dailySuperLikes: -1,
    seeWhoLikesYou: true,
    readReceipts: true,
    spotlight: true,
    vipMatchmaking: true,
    dedicatedCoach: true,
  },
];

const mockProducts = [
  { id: 'coins_100', sku: 'coins_100', name: '100 Coins', type: 'coins', price: 499, currency: 'USD', coinAmount: 100 },
  { id: 'coins_500', sku: 'coins_500', name: '500 Coins', type: 'coins', price: 1999, currency: 'USD', coinAmount: 500, isFeatured: true },
  { id: 'coins_1000', sku: 'coins_1000', name: '1000 Coins', type: 'coins', price: 3499, currency: 'USD', coinAmount: 1000 },
  { id: 'boost_1', sku: 'boost_1', name: '1 Boost', type: 'boost', price: 599, currency: 'USD', boostCount: 1, boostDurationMinutes: 30 },
  { id: 'boost_5', sku: 'boost_5', name: '5 Boosts', type: 'boost', price: 2499, currency: 'USD', boostCount: 5, boostDurationMinutes: 30, isFeatured: true },
];

// Session store (in-memory for demo)
const sessions: Map<string, any> = new Map();

// ==================== Auth Middleware ====================

interface AuthRequest extends Request {
  user?: any;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = testUsers.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ==================== Auth Routes ====================

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = testUsers.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        photo: user.photos[0],
        subscription: user.subscription,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin || false,
      },
    },
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (testUsers.find(u => u.email === email)) {
    return res.status(400).json({ success: false, error: 'Email already exists' });
  }

  // Demo: Just return success, don't actually create user
  res.json({ success: true, message: 'Registration successful. Please login.' });
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      photo: user.photos[0],
      subscription: user.subscription,
      wallet: user.wallet,
      isVerified: user.isVerified,
    },
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  res.json({ success: true });
});

// ==================== Profile Routes ====================

app.get('/api/profiles/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      occupation: user.occupation,
      city: user.city,
      photos: user.photos,
      isVerified: user.isVerified,
      profileCompletion: 85,
    },
  });
});

app.put('/api/profiles/me', authMiddleware, (req: AuthRequest, res: Response) => {
  // Demo: Just return success
  res.json({ success: true, message: 'Profile updated' });
});

// ==================== Discovery Routes ====================

app.get('/api/discovery/recommendations', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      profiles: mockProfiles,
      hasMore: false,
    },
  });
});

app.post('/api/discovery/swipe', authMiddleware, (req: AuthRequest, res: Response) => {
  const { profileId, action } = req.body;

  // 30% chance of match on like
  const isMatch = action === 'like' && Math.random() < 0.3;

  res.json({
    success: true,
    data: {
      action,
      isMatch,
      matchedProfile: isMatch ? mockProfiles.find(p => p.id === profileId) : null,
    },
  });
});

// ==================== Matches Routes ====================

app.get('/api/matches', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      matches: mockMatches,
      newMatches: mockMatches.filter(m => m.unreadCount > 0),
    },
  });
});

app.get('/api/matches/:matchId/messages', authMiddleware, (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const messages = mockMessages[matchId] || [];

  res.json({
    success: true,
    data: { messages },
  });
});

app.post('/api/matches/:matchId/messages', authMiddleware, (req: AuthRequest, res: Response) => {
  const { matchId } = req.params;
  const { content } = req.body;
  const user = req.user;

  const newMessage = {
    id: `m_${Date.now()}`,
    senderId: user.id,
    content,
    timestamp: new Date().toISOString(),
  };

  if (!mockMessages[matchId]) {
    mockMessages[matchId] = [];
  }
  mockMessages[matchId].push(newMessage);

  res.json({
    success: true,
    data: { message: newMessage },
  });
});

// ==================== Subscription Routes ====================

app.get('/api/subscriptions/status', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  res.json({
    success: true,
    data: user.subscription,
  });
});

app.get('/api/subscriptions/plans', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { plans: mockSubscriptionPlans },
  });
});

app.post('/api/subscriptions/subscribe', authMiddleware, (req: AuthRequest, res: Response) => {
  const { planId } = req.body;

  // Demo: Simulate checkout URL
  res.json({
    success: true,
    data: {
      checkoutUrl: `https://checkout.stripe.com/demo/${planId}`,
      sessionId: `sess_${Date.now()}`,
    },
  });
});

app.post('/api/subscriptions/cancel', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Subscription will be cancelled at period end' });
});

// ==================== Payment Routes ====================

app.get('/api/payments/providers', (req: Request, res: Response) => {
  const { country, platform } = req.query;

  const providers = [
    { id: 'stripe', name: 'Credit Card', supportedMethods: ['card'], enabled: true },
    { id: 'paypal', name: 'PayPal', supportedMethods: ['paypal_wallet'], enabled: true },
  ];

  // Add African providers for African countries
  if (['NG', 'GH', 'KE'].includes(country as string)) {
    providers.push(
      { id: 'flutterwave', name: 'Flutterwave', supportedMethods: ['card', 'mobile_money', 'bank_transfer'], enabled: true },
      { id: 'paystack', name: 'Paystack', supportedMethods: ['card', 'mobile_money'], enabled: true }
    );
  }

  res.json({ success: true, providers });
});

app.get('/api/payments/products', (req: Request, res: Response) => {
  const { type } = req.query;
  let products = mockProducts;

  if (type) {
    products = products.filter(p => p.type === type);
  }

  res.json({ success: true, products });
});

app.get('/api/payments/plans', (req: Request, res: Response) => {
  res.json({ success: true, plans: mockSubscriptionPlans });
});

app.get('/api/payments/subscription', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  res.json({
    success: true,
    hasSubscription: user.subscription.tier !== 'FREE',
    subscription: {
      plan: user.subscription.tier.toLowerCase(),
      planName: user.subscription.tier,
      status: user.subscription.status,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    },
  });
});

app.get('/api/payments/wallet', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  res.json({
    success: true,
    wallet: user.wallet,
  });
});

app.post('/api/payments/checkout', authMiddleware, (req: AuthRequest, res: Response) => {
  const { provider, productId } = req.body;

  res.json({
    success: true,
    sessionId: `sess_${Date.now()}`,
    url: `https://checkout.${provider}.com/demo/${productId}`,
  });
});

app.post('/api/payments/intent', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    clientSecret: `pi_demo_${Date.now()}_secret`,
    paymentIntentId: `pi_demo_${Date.now()}`,
  });
});

// ==================== Admin Routes ====================

app.get('/api/admin/revenue/summary', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  res.json({
    success: true,
    data: {
      totalRevenue: 12547800,
      subscriptionRevenue: 9823400,
      consumableRevenue: 2724400,
      refunds: 263500,
      netRevenue: 12284300,
      currency: 'USD',
    },
  });
});

app.get('/api/admin/revenue/by-provider', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  res.json({
    success: true,
    data: [
      { provider: 'stripe', revenue: 5234500, transactions: 8234, percentage: 41.7 },
      { provider: 'apple_iap', revenue: 3456700, transactions: 5432, percentage: 27.5 },
      { provider: 'google_play', revenue: 2345600, transactions: 4123, percentage: 18.7 },
      { provider: 'paypal', revenue: 987600, transactions: 1234, percentage: 7.9 },
    ],
  });
});

// ==================== Health Check ====================

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'demo',
  });
});

// ==================== Test Accounts Info ====================

app.get('/api/test-accounts', (req: Request, res: Response) => {
  res.json({
    message: 'Test accounts for demo',
    accounts: testUsers.map(u => ({
      email: u.email,
      password: u.password,
      role: u.isAdmin ? 'admin' : 'user',
      subscription: u.subscription.tier,
    })),
  });
});

// ==================== Safety Routes ====================

app.get('/api/safety/verification-status', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    emailVerified: true,
    phoneVerified: true,
    governmentIdVerified: false,
    selfieVerified: true,
    livenessVerified: false,
    videoVerified: false,
    biometricVerified: false,
    socialMediaVerified: ['instagram', 'linkedin'],
    verificationScore: 65,
    overallVerificationLevel: 'standard',
  });
});

app.get('/api/safety/security-settings', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    two_factor_enabled: false,
    two_factor_method: null,
    login_alerts_enabled: true,
    new_device_alerts_enabled: true,
    suspicious_activity_alerts_enabled: true,
    trusted_devices: ['Chrome on Windows', 'iPhone 14 Pro'],
  });
});

app.put('/api/safety/security-settings', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ ...req.body, success: true });
});

app.get('/api/safety/privacy-settings', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    profile_visibility: 'public',
    show_online_status: true,
    show_last_active: true,
    show_distance: true,
    show_age: true,
    incognito_mode: false,
    hide_from_search: false,
    block_contacts: false,
    allow_screenshots: true,
  });
});

app.put('/api/safety/privacy-settings', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ ...req.body, success: true });
});

app.get('/api/safety/emergency-contacts', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json([
    {
      id: 'contact_1',
      name: 'Mom',
      phone: '+1 555-123-4567',
      email: 'mom@example.com',
      relationship: 'family',
      is_primary: true,
      notify_on_sos: true,
      notify_on_checkin_miss: true,
    },
  ]);
});

app.post('/api/safety/emergency-contacts', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    id: `contact_${Date.now()}`,
    ...req.body,
  });
});

app.delete('/api/safety/emergency-contacts/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true });
});

app.get('/api/safety/tips', (req: Request, res: Response) => {
  res.json([
    { id: 1, category: 'before', tip: 'Video chat before meeting in person', priority: 'high' },
    { id: 2, category: 'before', tip: 'Research your date on social media', priority: 'medium' },
    { id: 3, category: 'before', tip: 'Tell a friend where you are going', priority: 'high' },
    { id: 4, category: 'during', tip: 'Meet in a public place', priority: 'high' },
    { id: 5, category: 'during', tip: 'Keep your phone charged and accessible', priority: 'medium' },
    { id: 6, category: 'during', tip: 'Trust your instincts', priority: 'high' },
    { id: 7, category: 'after', tip: 'Check in with your friend when you get home', priority: 'high' },
    { id: 8, category: 'after', tip: 'Report any concerning behavior', priority: 'medium' },
  ]);
});

app.get('/api/safety/crisis-resources', (req: Request, res: Response) => {
  res.json([
    { name: 'National Domestic Violence Hotline', contact: '1-800-799-7233', description: '24/7 confidential support', hours: '24/7', website: 'https://thehotline.org' },
    { name: 'RAINN', contact: '1-800-656-4673', description: 'Sexual assault hotline', hours: '24/7', website: 'https://rainn.org' },
    { name: 'Crisis Text Line', contact: 'Text HOME to 741741', description: 'Free 24/7 support via text', hours: '24/7' },
  ]);
});

app.post('/api/safety/sos', authMiddleware, (req: AuthRequest, res: Response) => {
  console.log(`SOS triggered by user ${req.user.id}`);
  res.json({ success: true, message: 'Emergency contacts have been notified' });
});

// ==================== User Settings Routes ====================

app.get('/api/users/settings', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      notifications: {
        matches: true,
        messages: true,
        likes: true,
        superLikes: true,
        promotions: false,
        emailDigest: true,
      },
      privacy: {
        showOnlineStatus: true,
        showDistance: true,
        showAge: true,
        readReceipts: true,
        incognitoMode: false,
        hideFromSearch: false,
      },
      discovery: {
        showMe: true,
        discoveryPaused: false,
        globalMode: false,
      },
    },
  });
});

app.put('/api/users/settings', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Settings updated' });
});

// ==================== Discovery Stats ====================

app.get('/api/discovery/stats', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  const isPremium = ['GOLD', 'PLATINUM', 'DIAMOND'].includes(user.subscription?.tier);
  res.json({
    success: true,
    data: {
      remainingLikes: isPremium ? 999 : 25,
      remainingSuperLikes: isPremium ? 10 : 1,
      remainingBoosts: isPremium ? 5 : 0,
      likesResetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isPremium,
    },
  });
});

// ==================== Matching Service ====================

app.get('/api/matching/matches', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      matches: mockMatches.map(m => ({
        id: m.id,
        matchedUser: {
          id: m.matchedUserId,
          name: m.name,
          photoUrl: m.photo,
          isOnline: Math.random() > 0.5,
        },
        matchedAt: m.matchedAt,
        lastMessage: m.lastMessage ? { content: m.lastMessage, sentAt: m.lastMessageAt } : null,
        lastMessageAt: m.lastMessageAt,
        hasUnread: m.unreadCount > 0,
      })),
      nextCursor: null,
      totalCount: mockMatches.length,
    },
  });
});

app.get('/api/matching/likes', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  const canSeeLikes = ['GOLD', 'PLATINUM', 'DIAMOND'].includes(user.subscription?.tier);
  res.json({
    success: true,
    data: {
      likes: [
        { id: 'like_1', user: { id: 'liker_1', name: canSeeLikes ? 'Jessica' : null, age: canSeeLikes ? 25 : null, photoUrl: 'https://randomuser.me/api/portraits/women/71.jpg' }, isSuperLike: true, isBlurred: !canSeeLikes, likedAt: new Date().toISOString() },
        { id: 'like_2', user: { id: 'liker_2', name: canSeeLikes ? 'Amanda' : null, age: canSeeLikes ? 28 : null, photoUrl: 'https://randomuser.me/api/portraits/women/72.jpg' }, isSuperLike: false, isBlurred: !canSeeLikes, likedAt: new Date().toISOString() },
        { id: 'like_3', user: { id: 'liker_3', name: canSeeLikes ? 'Rachel' : null, age: canSeeLikes ? 24 : null, photoUrl: 'https://randomuser.me/api/portraits/women/73.jpg' }, isSuperLike: false, isBlurred: !canSeeLikes, likedAt: new Date().toISOString() },
      ],
      nextCursor: null,
      totalCount: 3,
      canSeeLikes,
    },
  });
});

// ==================== Conversations ====================

app.get('/api/conversations', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      conversations: mockMatches.filter(m => m.lastMessage).map(m => ({
        id: `conv_${m.matchedUserId}`,
        participant: {
          id: m.matchedUserId,
          name: m.name,
          photoUrl: m.photo,
          isOnline: Math.random() > 0.5,
        },
        lastMessage: { id: 'lm1', content: m.lastMessage, sentAt: m.lastMessageAt, status: 'delivered' },
        unreadCount: m.unreadCount,
        createdAt: m.matchedAt,
      })),
      nextCursor: null,
      totalUnread: mockMatches.reduce((sum, m) => sum + m.unreadCount, 0),
    },
  });
});

app.get('/api/conversations/:conversationId/messages', authMiddleware, (req: AuthRequest, res: Response) => {
  const { conversationId } = req.params;
  const matchId = conversationId.replace('conv_', '');
  const messages = mockMessages[matchId] || [];
  res.json({
    success: true,
    data: {
      messages: messages.map(m => ({ ...m, sentAt: m.timestamp, status: 'delivered' })),
      hasMore: false,
    },
  });
});

app.post('/api/conversations/:conversationId/messages', authMiddleware, (req: AuthRequest, res: Response) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const user = req.user;
  const matchId = conversationId.replace('conv_', '');

  const newMessage = {
    id: `m_${Date.now()}`,
    senderId: user.id,
    content,
    sentAt: new Date().toISOString(),
    status: 'sent',
  };

  if (!mockMessages[matchId]) mockMessages[matchId] = [];
  mockMessages[matchId].push({ ...newMessage, timestamp: newMessage.sentAt });

  res.json({ success: true, data: newMessage });
});

// ==================== Gamification Routes ====================

app.get('/api/gamification/streak', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      currentStreak: 5,
      longestStreak: 12,
      lastCheckIn: new Date().toISOString(),
      nextRewardAt: 7,
    },
  });
});

app.get('/api/gamification/achievements', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      achievements: [
        { id: '1', name: 'First Match', description: 'Get your first match', icon: '💕', progress: 1, maxProgress: 1, unlocked: true, reward: { coins: 50 } },
        { id: '2', name: 'Conversation Starter', description: 'Send 10 messages', icon: '💬', progress: 7, maxProgress: 10, unlocked: false, reward: { coins: 100 } },
        { id: '3', name: 'Social Butterfly', description: 'Match with 25 people', icon: '🦋', progress: 12, maxProgress: 25, unlocked: false, reward: { coins: 200, gems: 5 } },
        { id: '4', name: 'Profile Pro', description: 'Complete your profile 100%', icon: '⭐', progress: 85, maxProgress: 100, unlocked: false, reward: { coins: 150 } },
        { id: '5', name: 'Week Warrior', description: 'Login 7 days in a row', icon: '🔥', progress: 5, maxProgress: 7, unlocked: false, reward: { gems: 10 } },
        { id: '6', name: 'Super Liker', description: 'Use 50 super likes', icon: '💎', progress: 23, maxProgress: 50, unlocked: false, reward: { gems: 20 } },
      ],
    },
  });
});

app.get('/api/gamification/quests', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      quests: [
        { id: '1', title: 'Daily Swiper', description: 'Swipe on 20 profiles today', type: 'daily', progress: 12, maxProgress: 20, reward: { coins: 25 }, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() },
        { id: '2', title: 'Chat Champion', description: 'Send 5 messages today', type: 'daily', progress: 3, maxProgress: 5, reward: { coins: 15 }, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() },
        { id: '3', title: 'Profile Viewer', description: 'View 10 full profiles', type: 'daily', progress: 10, maxProgress: 10, reward: { coins: 20 }, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() },
        { id: '4', title: 'Weekly Matcher', description: 'Get 5 new matches this week', type: 'weekly', progress: 2, maxProgress: 5, reward: { gems: 5 }, expiresAt: new Date(Date.now() + 5 * 24 * 3600000).toISOString() },
      ],
    },
  });
});

app.get('/api/gamification/balance', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  res.json({
    success: true,
    data: user.wallet || { coins: 250, gems: 15 },
  });
});

app.post('/api/gamification/daily-reward', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      reward: { coins: 10, streak: 6 },
      message: 'Daily reward claimed!',
    },
  });
});

app.post('/api/gamification/spin', authMiddleware, (req: AuthRequest, res: Response) => {
  const rewards = [
    { type: 'coins', amount: 10 },
    { type: 'coins', amount: 25 },
    { type: 'coins', amount: 50 },
    { type: 'gems', amount: 5 },
    { type: 'superlike', amount: 1 },
    { type: 'boost', amount: 1 },
  ];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  res.json({
    success: true,
    data: {
      reward,
      message: `You won ${reward.amount} ${reward.type}!`,
    },
  });
});

// ==================== Communities Routes ====================

app.get('/api/communities', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      communities: [
        { id: 'c1', name: 'Fitness Enthusiasts', description: 'For people who love working out', memberCount: 1234, category: 'fitness', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', joined: true },
        { id: 'c2', name: 'Foodies United', description: 'Share your favorite restaurants', memberCount: 2567, category: 'food', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', joined: false },
        { id: 'c3', name: 'Travel Lovers', description: 'Adventure seekers and explorers', memberCount: 3421, category: 'travel', image: 'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400', joined: true },
        { id: 'c4', name: 'Book Club', description: 'For avid readers and literary fans', memberCount: 876, category: 'books', image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400', joined: false },
        { id: 'c5', name: 'Pet Parents', description: 'Share photos of your furry friends', memberCount: 4532, category: 'pets', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400', joined: true },
        { id: 'c6', name: 'Movie Buffs', description: 'Discuss the latest films', memberCount: 1876, category: 'entertainment', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400', joined: false },
      ],
    },
  });
});

app.get('/api/communities/:communityId', authMiddleware, (req: AuthRequest, res: Response) => {
  const { communityId } = req.params;
  res.json({
    success: true,
    data: {
      id: communityId,
      name: 'Fitness Enthusiasts',
      description: 'For people who love working out and staying healthy',
      memberCount: 1234,
      category: 'fitness',
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400',
      joined: true,
      posts: [
        { id: 'p1', author: { name: 'Sarah', photo: 'https://randomuser.me/api/portraits/women/65.jpg' }, content: 'Just hit a new PR on my deadlift! 💪', likes: 45, comments: 12, createdAt: new Date().toISOString() },
        { id: 'p2', author: { name: 'Mike', photo: 'https://randomuser.me/api/portraits/men/32.jpg' }, content: 'Anyone want to join for a morning run tomorrow?', likes: 23, comments: 8, createdAt: new Date().toISOString() },
      ],
      events: [
        { id: 'e1', title: 'Group Hike', date: new Date(Date.now() + 7 * 24 * 3600000).toISOString(), attendees: 15 },
      ],
    },
  });
});

app.post('/api/communities/:communityId/join', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Joined community' });
});

app.post('/api/communities/:communityId/leave', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Left community' });
});

// ==================== Speed Dating Routes ====================

app.get('/api/speed-dating/events', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      events: [
        { id: 'sd1', title: 'Friday Night Speed Dating', description: 'Meet 10 new people in 30 minutes!', startsAt: new Date(Date.now() + 2 * 24 * 3600000).toISOString(), duration: 30, maxParticipants: 20, currentParticipants: 14, price: 0, status: 'upcoming' },
        { id: 'sd2', title: 'Weekend Mixer', description: 'Casual speed dating for professionals', startsAt: new Date(Date.now() + 4 * 24 * 3600000).toISOString(), duration: 45, maxParticipants: 30, currentParticipants: 22, price: 500, status: 'upcoming' },
        { id: 'sd3', title: 'Singles Night', description: 'Premium speed dating experience', startsAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString(), duration: 60, maxParticipants: 16, currentParticipants: 8, price: 1000, status: 'upcoming' },
      ],
    },
  });
});

app.post('/api/speed-dating/events/:eventId/register', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Registered for event' });
});

// ==================== Referral Routes ====================

app.get('/api/referrals/stats', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      referralCode: 'ALEX2024',
      totalReferrals: 5,
      pendingReferrals: 2,
      completedReferrals: 3,
      totalEarnings: { coins: 750, gems: 15 },
      currentTier: 'silver',
      nextTierAt: 10,
      referralLink: 'https://flamoral.com/join/ALEX2024',
    },
  });
});

app.get('/api/referrals/history', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      referrals: [
        { id: 'r1', referredUser: 'John D.', status: 'completed', reward: { coins: 250 }, createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString() },
        { id: 'r2', referredUser: 'Sarah M.', status: 'completed', reward: { coins: 250 }, createdAt: new Date(Date.now() - 14 * 24 * 3600000).toISOString() },
        { id: 'r3', referredUser: 'Mike R.', status: 'pending', reward: null, createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString() },
      ],
    },
  });
});

// ==================== Profile Service ====================

app.get('/api/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      bio: user.bio,
      occupation: user.occupation,
      city: user.city,
      photos: user.photos.map((url: string, i: number) => ({ id: `photo_${i}`, url, isPrimary: i === 0, order: i })),
      interests: ['Travel', 'Photography', 'Hiking', 'Music'],
      prompts: [
        { question: 'My ideal weekend', answer: 'Exploring new hiking trails and taking photos' },
        { question: 'Looking for', answer: 'Someone adventurous who loves to laugh' },
      ],
      settings: {
        showOnlineStatus: true,
        showDistance: true,
        maxDistance: 50,
        ageRange: { min: 25, max: 35 },
        genderPreference: 'all',
      },
      isVerified: user.isVerified,
      premiumTier: user.subscription?.tier,
      profileCompletion: 85,
    },
  });
});

app.put('/api/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Profile updated' });
});

// ==================== 404 Handler ====================

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// ==================== Error Handler ====================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==================== Start Server ====================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                   Flamoral Demo Server                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                     ║
║                                                               ║
║  Test Accounts:                                               ║
║  ─────────────────────────────────────────────────────────────║
║  Email: test1@flamoral.com  Password: TestUser1!              ║
║  Email: test2@flamoral.com  Password: TestUser2!              ║
║  Email: admin@flamoral.com  Password: AdminUser1!             ║
║                                                               ║
║  API Endpoints:                                               ║
║  ─────────────────────────────────────────────────────────────║
║  GET  /api/health           - Health check                    ║
║  GET  /api/test-accounts    - List test accounts              ║
║  POST /api/auth/login       - Login                           ║
║  GET  /api/auth/me          - Get current user                ║
║  GET  /api/discovery/recommendations - Get profiles           ║
║  GET  /api/matches          - Get matches                     ║
║  GET  /api/payments/plans   - Get subscription plans          ║
║  GET  /api/payments/products - Get coin packages              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
