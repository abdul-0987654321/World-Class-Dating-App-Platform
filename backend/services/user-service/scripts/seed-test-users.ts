import db from '../src/infrastructure/database/connection';
import bcrypt from 'bcrypt';

interface TestUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  bio?: string;
  occupation?: string;
  city?: string;
  photos: string[];
}

const testUsers: TestUser[] = [
  {
    email: 'david.kim@example.com',
    password: 'Test@123',
    first_name: 'David',
    last_name: 'Kim',
    date_of_birth: '1995-06-18',
    gender: 'male',
    bio: 'Software engineer who loves hiking and photography. Always up for an adventure!',
    occupation: 'Software Engineer',
    city: 'San Francisco',
    photos: [
      'https://randomuser.me/api/portraits/men/32.jpg',
      'https://randomuser.me/api/portraits/men/33.jpg'
    ]
  },
  {
    email: 'jessica.taylor@example.com',
    password: 'Test@123',
    first_name: 'Jessica',
    last_name: 'Taylor',
    date_of_birth: '1993-01-30',
    gender: 'female',
    bio: 'Marketing professional. Coffee enthusiast. Love trying new restaurants and traveling.',
    occupation: 'Marketing Manager',
    city: 'Los Angeles',
    photos: [
      'https://randomuser.me/api/portraits/women/44.jpg',
      'https://randomuser.me/api/portraits/women/45.jpg'
    ]
  },
  {
    email: 'ryan.martinez@example.com',
    password: 'Test@123',
    first_name: 'Ryan',
    last_name: 'Martinez',
    date_of_birth: '1997-09-12',
    gender: 'male',
    bio: 'Fitness coach and nutrition expert. Passionate about helping others achieve their goals.',
    occupation: 'Fitness Coach',
    city: 'Miami',
    photos: [
      'https://randomuser.me/api/portraits/men/22.jpg',
      'https://randomuser.me/api/portraits/men/23.jpg'
    ]
  },
  {
    email: 'ashley.brown@example.com',
    password: 'Test@123',
    first_name: 'Ashley',
    last_name: 'Brown',
    date_of_birth: '1994-04-25',
    gender: 'female',
    bio: 'Teacher by day, artist by night. Love music, painting, and good conversation.',
    occupation: 'Elementary Teacher',
    city: 'Chicago',
    photos: [
      'https://randomuser.me/api/portraits/women/65.jpg',
      'https://randomuser.me/api/portraits/women/66.jpg'
    ]
  },
  {
    email: 'kevin.wilson@example.com',
    password: 'Test@123',
    first_name: 'Kevin',
    last_name: 'Wilson',
    date_of_birth: '1991-12-08',
    gender: 'male',
    bio: 'Architect with a passion for sustainable design. Weekend warrior and food lover.',
    occupation: 'Architect',
    city: 'Seattle',
    photos: [
      'https://randomuser.me/api/portraits/men/52.jpg',
      'https://randomuser.me/api/portraits/men/53.jpg'
    ]
  },
  {
    email: 'lauren.davis@example.com',
    password: 'Test@123',
    first_name: 'Lauren',
    last_name: 'Davis',
    date_of_birth: '1999-07-14',
    gender: 'female',
    bio: 'Graphic designer who loves yoga, reading, and exploring new cities.',
    occupation: 'Graphic Designer',
    city: 'Austin',
    photos: [
      'https://randomuser.me/api/portraits/women/32.jpg',
      'https://randomuser.me/api/portraits/women/33.jpg'
    ]
  },
  {
    email: 'chris.anderson@example.com',
    password: 'Test@123',
    first_name: 'Chris',
    last_name: 'Anderson',
    date_of_birth: '1996-10-20',
    gender: 'male',
    bio: 'Data scientist and tech enthusiast. Enjoy gaming, cooking, and live music.',
    occupation: 'Data Scientist',
    city: 'Boston',
    photos: [
      'https://randomuser.me/api/portraits/men/44.jpg',
      'https://randomuser.me/api/portraits/men/45.jpg'
    ]
  }
];

async function seedTestUsers() {
  try {
    console.log('Starting to seed test users...\n');

    for (const userData of testUsers) {
      console.log(`Creating user: ${userData.first_name} ${userData.last_name}...`);

      // Check if user already exists
      const existingUser = await db('users').where({ email: userData.email }).first();
      if (existingUser) {
        console.log(`  ⚠️  User ${userData.email} already exists, skipping...\n`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const [user] = await db('users')
        .insert({
          email: userData.email,
          password_hash: hashedPassword,
          first_name: userData.first_name,
          last_name: userData.last_name,
          date_of_birth: userData.date_of_birth,
          gender: userData.gender,
          is_verified: true,
          is_email_verified: true,
          is_active: true,
        })
        .returning('*');

      console.log(`  ✅ User created with ID: ${user.id}`);

      // Create profile
      await db('profiles').insert({
        user_id: user.id,
        bio: userData.bio,
        occupation: userData.occupation,
        city: userData.city,
        profile_completion_percentage: 75,
        profile_completed: true,
      });

      console.log(`  ✅ Profile created`);

      // Add photos
      for (let i = 0; i < userData.photos.length; i++) {
        await db('photos').insert({
          user_id: user.id,
          url: userData.photos[i],
          position: i,
          is_primary: i === 0,
          is_verified: true,
        });
      }

      console.log(`  ✅ Added ${userData.photos.length} photos`);
      console.log('');
    }

    console.log('✅ All test users seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test users:', error);
    process.exit(1);
  }
}

seedTestUsers();
