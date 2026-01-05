import db from '../src/infrastructure/database/connection';

interface UserUpdate {
  email: string;
  bio: string;
  occupation: string;
  city: string;
  photos: string[];
}

const userUpdates: UserUpdate[] = [
  {
    email: 'sarah.johnson@example.com',
    bio: 'Nurse who loves animals and outdoor adventures. Looking for someone genuine and fun!',
    occupation: 'Registered Nurse',
    city: 'Denver',
    photos: [
      'https://randomuser.me/api/portraits/women/1.jpg',
      'https://randomuser.me/api/portraits/women/2.jpg',
      'https://randomuser.me/api/portraits/women/3.jpg',
    ],
  },
  {
    email: 'michael.chen@example.com',
    bio: 'Product manager at a tech startup. Foodie, runner, and amateur photographer.',
    occupation: 'Product Manager',
    city: 'San Jose',
    photos: [
      'https://randomuser.me/api/portraits/men/1.jpg',
      'https://randomuser.me/api/portraits/men/2.jpg',
    ],
  },
  {
    email: 'emily.rodriguez@example.com',
    bio: 'Journalist who enjoys writing, traveling, and trying new cuisines. Lets explore together!',
    occupation: 'Journalist',
    city: 'New York',
    photos: [
      'https://randomuser.me/api/portraits/women/11.jpg',
      'https://randomuser.me/api/portraits/women/12.jpg',
      'https://randomuser.me/api/portraits/women/13.jpg',
    ],
  },
];

async function updateExistingUsers() {
  try {
    console.log('Updating existing test users with profiles and photos...\n');

    for (const update of userUpdates) {
      console.log(`Processing user: ${update.email}...`);

      const user = await db('users').where({ email: update.email }).first();
      if (!user) {
        console.log(`  ⚠️  User not found, skipping...\n`);
        continue;
      }

      // Update user to be verified
      await db('users').where({ id: user.id }).update({
        is_verified: true,
        is_email_verified: true,
      });

      // Check if profile exists
      const existingProfile = await db('profiles').where({ user_id: user.id }).first();

      if (existingProfile) {
        // Update existing profile
        await db('profiles').where({ user_id: user.id }).update({
          bio: update.bio,
          occupation: update.occupation,
          city: update.city,
          profile_completion_percentage: 80,
          profile_completed: true,
        });
        console.log(`  ✅ Profile updated`);
      } else {
        // Create new profile
        await db('profiles').insert({
          user_id: user.id,
          bio: update.bio,
          occupation: update.occupation,
          city: update.city,
          profile_completion_percentage: 80,
          profile_completed: true,
        });
        console.log(`  ✅ Profile created`);
      }

      // Delete existing photos if any
      await db('photos').where({ user_id: user.id }).delete();

      // Add new photos
      for (let i = 0; i < update.photos.length; i++) {
        await db('photos').insert({
          user_id: user.id,
          url: update.photos[i],
          position: i,
          is_primary: i === 0,
          is_verified: true,
        });
      }

      console.log(`  ✅ Added ${update.photos.length} photos`);
      console.log('');
    }

    console.log('✅ All existing users updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating users:', error);
    process.exit(1);
  }
}

updateExistingUsers();
