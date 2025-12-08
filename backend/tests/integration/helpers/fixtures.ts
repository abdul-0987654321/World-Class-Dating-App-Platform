import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

/**
 * Test data fixtures for integration tests
 * Provides factory functions to generate realistic test data
 */

export interface UserFixture {
  id?: string;
  email: string;
  password: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  bio?: string;
  location?: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  preferences?: {
    minAge: number;
    maxAge: number;
    distance: number;
    genders: string[];
  };
  verified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProfileFixture {
  userId: string;
  photos: string[];
  interests: string[];
  occupation?: string;
  education?: string;
  height?: number;
  religion?: string;
  smoking?: string;
  drinking?: string;
}

export interface MatchFixture {
  id?: string;
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'matched' | 'rejected';
  matchedAt?: Date;
  createdAt?: Date;
}

export interface MessageFixture {
  id?: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  sentAt?: Date;
  readAt?: Date;
}

/**
 * Generate a random user fixture
 */
export const createUserFixture = async (
  overrides: Partial<UserFixture> = {}
): Promise<UserFixture> => {
  const password = overrides.password || 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const gender = overrides.gender || faker.helpers.arrayElement(['male', 'female', 'other']);

  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    password,
    passwordHash,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
    gender,
    bio: faker.lorem.paragraph(),
    location: {
      city: faker.location.city(),
      country: faker.location.country(),
      latitude: parseFloat(faker.location.latitude()),
      longitude: parseFloat(faker.location.longitude()),
    },
    preferences: {
      minAge: 18,
      maxAge: 50,
      distance: 50,
      genders: gender === 'male' ? ['female'] : ['male'],
    },
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Generate multiple user fixtures
 */
export const createUserFixtures = async (count: number): Promise<UserFixture[]> => {
  const users: UserFixture[] = [];
  for (let i = 0; i < count; i++) {
    users.push(await createUserFixture());
  }
  return users;
};

/**
 * Generate a profile fixture
 */
export const createProfileFixture = (overrides: Partial<ProfileFixture> = {}): ProfileFixture => {
  return {
    userId: faker.string.uuid(),
    photos: [
      faker.image.avatar(),
      faker.image.avatar(),
      faker.image.avatar(),
    ],
    interests: faker.helpers.arrayElements(
      ['travel', 'music', 'sports', 'cooking', 'reading', 'movies', 'art', 'fitness'],
      { min: 3, max: 6 }
    ),
    occupation: faker.person.jobTitle(),
    education: faker.helpers.arrayElement(['High School', 'Bachelor', 'Master', 'PhD']),
    height: faker.number.int({ min: 150, max: 200 }),
    religion: faker.helpers.arrayElement(['Christian', 'Muslim', 'Buddhist', 'Hindu', 'Other', 'None']),
    smoking: faker.helpers.arrayElement(['Never', 'Occasionally', 'Regularly']),
    drinking: faker.helpers.arrayElement(['Never', 'Socially', 'Regularly']),
    ...overrides,
  };
};

/**
 * Generate a match fixture
 */
export const createMatchFixture = (overrides: Partial<MatchFixture> = {}): MatchFixture => {
  const status = overrides.status || 'matched';

  return {
    id: faker.string.uuid(),
    user1Id: faker.string.uuid(),
    user2Id: faker.string.uuid(),
    status,
    matchedAt: status === 'matched' ? new Date() : undefined,
    createdAt: new Date(),
    ...overrides,
  };
};

/**
 * Generate multiple match fixtures
 */
export const createMatchFixtures = (count: number): MatchFixture[] => {
  const matches: MatchFixture[] = [];
  for (let i = 0; i < count; i++) {
    matches.push(createMatchFixture());
  }
  return matches;
};

/**
 * Generate a message fixture
 */
export const createMessageFixture = (overrides: Partial<MessageFixture> = {}): MessageFixture => {
  return {
    id: faker.string.uuid(),
    conversationId: faker.string.uuid(),
    senderId: faker.string.uuid(),
    receiverId: faker.string.uuid(),
    content: faker.lorem.sentence(),
    type: 'text',
    sentAt: new Date(),
    ...overrides,
  };
};

/**
 * Generate multiple message fixtures
 */
export const createMessageFixtures = (count: number): MessageFixture[] => {
  const messages: MessageFixture[] = [];
  for (let i = 0; i < count; i++) {
    messages.push(createMessageFixture());
  }
  return messages;
};

/**
 * Generate a conversation with messages
 */
export const createConversationFixture = async (messageCount: number = 10) => {
  const user1 = await createUserFixture();
  const user2 = await createUserFixture();
  const conversationId = faker.string.uuid();

  const messages = Array.from({ length: messageCount }).map((_, index) => {
    const isUser1Sender = index % 2 === 0;
    return createMessageFixture({
      conversationId,
      senderId: isUser1Sender ? user1.id : user2.id,
      receiverId: isUser1Sender ? user2.id : user1.id,
      sentAt: new Date(Date.now() - (messageCount - index) * 60000), // Messages 1 minute apart
    });
  });

  return {
    conversationId,
    user1,
    user2,
    messages,
  };
};

/**
 * Create a complete test scenario with users, profiles, and matches
 */
export const createMatchingScenario = async (userCount: number = 5) => {
  const users = await createUserFixtures(userCount);
  const profiles = users.map((user) =>
    createProfileFixture({ userId: user.id! })
  );

  const matches: MatchFixture[] = [];
  for (let i = 0; i < users.length - 1; i++) {
    for (let j = i + 1; j < users.length; j++) {
      if (Math.random() > 0.5) {
        matches.push(
          createMatchFixture({
            user1Id: users[i].id!,
            user2Id: users[j].id!,
          })
        );
      }
    }
  }

  return {
    users,
    profiles,
    matches,
  };
};

/**
 * Clean fixture data for database insertion
 */
export const cleanFixtureForDb = <T extends Record<string, any>>(
  fixture: T,
  excludeFields: string[] = []
): Partial<T> => {
  const cleaned = { ...fixture };
  const defaultExclude = ['password', 'createdAt', 'updatedAt'];
  [...defaultExclude, ...excludeFields].forEach((field) => {
    delete cleaned[field];
  });
  return cleaned;
};
