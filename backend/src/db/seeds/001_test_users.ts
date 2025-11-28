/**
 * Seed: Test User Accounts
 * Creates test accounts for frontend verification
 */

import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;

interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: Date;
  tier: string;
  coins: number;
  verified: boolean;
  bio: string;
  occupation: string;
  photos: string[];
  interests: string[];
  location: { city: string; country: string; lat: number; lng: number };
}

const TEST_USERS: TestUser[] = [
  {
    email: 'test1@flamoral.com',
    password: 'TestUser1!',
    firstName: 'Alex',
    lastName: 'Demo',
    gender: 'male',
    birthDate: new Date('1995-05-15'),
    tier: 'PLATINUM',
    coins: 100,
    verified: true,
    bio: 'Software engineer who loves hiking and photography. Looking for someone to explore new trails with! 🏔️📸',
    occupation: 'Software Engineer',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=400',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
    ],
    interests: ['hiking', 'photography', 'technology', 'coffee', 'travel'],
    location: { city: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194 },
  },
  {
    email: 'test2@flamoral.com',
    password: 'TestUser2!',
    firstName: 'Jordan',
    lastName: 'Demo',
    gender: 'female',
    birthDate: new Date('1997-08-22'),
    tier: 'GOLD',
    coins: 100,
    verified: true,
    bio: 'Creative designer by day, foodie by night. Obsessed with trying new restaurants and making art. Let\'s grab coffee! ☕🎨',
    occupation: 'UX Designer',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    ],
    interests: ['art', 'food', 'design', 'yoga', 'music'],
    location: { city: 'San Francisco', country: 'USA', lat: 37.7849, lng: -122.4094 },
  },
  {
    email: 'test3@flamoral.com',
    password: 'TestUser3!',
    firstName: 'Sam',
    lastName: 'Developer',
    gender: 'male',
    birthDate: new Date('1993-03-10'),
    tier: 'FREE',
    coins: 50,
    verified: true,
    bio: 'Basketball enthusiast and pizza connoisseur. Looking for my partner in crime to binge-watch shows and try new pizza places 🏀🍕',
    occupation: 'Product Manager',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
    ],
    interests: ['basketball', 'movies', 'food', 'gaming', 'fitness'],
    location: { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
  },
  {
    email: 'test4@flamoral.com',
    password: 'TestUser4!',
    firstName: 'Riley',
    lastName: 'Tester',
    gender: 'female',
    birthDate: new Date('1996-11-28'),
    tier: 'DIAMOND',
    coins: 500,
    verified: true,
    bio: 'Veterinarian with a heart for animals 🐶. Weekend warrior for outdoor adventures. Looking for someone who doesn\'t take life too seriously!',
    occupation: 'Veterinarian',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400',
    ],
    interests: ['animals', 'hiking', 'yoga', 'travel', 'wine'],
    location: { city: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
  },
  {
    email: 'test5@flamoral.com',
    password: 'TestUser5!',
    firstName: 'Morgan',
    lastName: 'Sample',
    gender: 'non-binary',
    birthDate: new Date('1994-07-04'),
    tier: 'GOLD',
    coins: 200,
    verified: true,
    bio: 'Musician and coffee shop hopper. I spend my weekends at live shows and exploring local cafes. Let\'s find the best latte in the city! 🎸☕',
    occupation: 'Musician',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
    ],
    interests: ['music', 'coffee', 'concerts', 'art', 'reading'],
    location: { city: 'Austin', country: 'USA', lat: 30.2672, lng: -97.7431 },
  },
];

export async function seed(knex: Knex): Promise<void> {
  // Clean up existing test users (be careful not to delete real users!)
  await knex('users').where('email', 'like', '%@flamoral.com').del();

  // Create test users
  for (const testUser of TEST_USERS) {
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(testUser.password, SALT_ROUNDS);

    // Insert user
    await knex('users').insert({
      id: userId,
      email: testUser.email,
      password_hash: hashedPassword,
      first_name: testUser.firstName,
      last_name: testUser.lastName,
      date_of_birth: testUser.birthDate,
      gender: testUser.gender === 'non-binary' ? 'other' : testUser.gender,
      phone: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
      phone_verified: true,
      email_verified: true,
      is_active: true,
      is_verified: testUser.verified,
      subscription_tier: testUser.tier === 'FREE' ? 'free' : testUser.tier === 'GOLD' ? 'premium' : 'premium_plus',
      coin_balance: testUser.coins,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Insert profile
    await knex('profiles').insert({
      id: uuidv4(),
      user_id: userId,
      bio: testUser.bio,
      occupation: testUser.occupation,
      interests: JSON.stringify(testUser.interests),
      current_city: testUser.location.city,
      profile_completion_percentage: 100,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Insert profile photos
    for (let i = 0; i < testUser.photos.length; i++) {
      await knex('profile_photos').insert({
        id: uuidv4(),
        user_id: userId,
        url: testUser.photos[i],
        order_index: i,
        is_verified: true,
        moderation_status: 'approved',
        uploaded_at: new Date(),
        created_at: new Date(),
      });
    }

    // Insert user settings
    await knex('user_settings').insert({
      user_id: userId,
      notifications_push: true,
      notifications_email: true,
      privacy_show_online: true,
      privacy_show_distance: true,
      privacy_show_age: true,
      discovery_age_min: 21,
      discovery_age_max: 45,
      discovery_distance_max: 50,
      discovery_show_me: JSON.stringify(['all']),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Insert user location
    await knex('user_locations').insert({
      user_id: userId,
      latitude: testUser.location.lat,
      longitude: testUser.location.lng,
      city: testUser.location.city,
      country: testUser.location.country,
      updated_at: new Date(),
    });

    console.log(`Created test user: ${testUser.email}`);
  }

  console.log('\n===========================================');
  console.log('TEST USER ACCOUNTS CREATED SUCCESSFULLY');
  console.log('===========================================');
  console.log('\nCredentials for testing:');
  console.log('-------------------------------------------');
  TEST_USERS.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Tier: ${user.tier}`);
    console.log('-------------------------------------------');
  });
}
