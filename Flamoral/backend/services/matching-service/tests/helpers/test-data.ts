import { v4 as uuidv4 } from 'uuid';

export const createMockUser = (overrides?: any) => ({
  id: uuidv4(),
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  age: 28,
  gender: 'male',
  latitude: 37.7749,
  longitude: -122.4194,
  city: 'San Francisco',
  ...overrides,
});

export const createMockProfile = (userId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  bio: 'Test bio',
  photos: ['photo1.jpg', 'photo2.jpg'],
  interests: ['coding', 'hiking'],
  occupation: 'Software Engineer',
  education: 'B.S. Computer Science',
  height: 175,
  ...overrides,
});

export const createMockSwipe = (swiperId: string, swipedId: string, overrides?: any) => ({
  id: uuidv4(),
  swiper_id: swiperId,
  swiped_id: swipedId,
  direction: 'right',
  created_at: new Date(),
  ...overrides,
});

export const createMockMatch = (user1Id: string, user2Id: string, overrides?: any) => ({
  id: uuidv4(),
  user1_id: user1Id < user2Id ? user1Id : user2Id,
  user2_id: user1Id < user2Id ? user2Id : user1Id,
  matched_at: new Date(),
  is_active: true,
  ...overrides,
});

export const createMockPreferences = (userId: string, overrides?: any) => ({
  id: uuidv4(),
  user_id: userId,
  age_min: 21,
  age_max: 35,
  max_distance: 50,
  gender_preference: ['female'],
  show_me: true,
  ...overrides,
});

export const createMultipleMockUsers = (count: number) => {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      email: `user${i + 1}@example.com`,
      first_name: `User${i + 1}`,
    })
  );
};
