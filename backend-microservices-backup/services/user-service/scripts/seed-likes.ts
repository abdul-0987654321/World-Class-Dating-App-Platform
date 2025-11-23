import db from '../src/infrastructure/database/connection';

/**
 * Script to create likes between test users
 * This will allow testing the "Who Liked You" premium feature
 */

async function seedLikes() {
  try {
    console.log('Starting to seed likes...');

    // Get all test users
    const users = await db('users')
      .select('id', 'email', 'first_name')
      .whereIn('email', [
        'david.kim@example.com',
        'jessica.taylor@example.com',
        'ryan.martinez@example.com',
        'ashley.brown@example.com',
        'kevin.wilson@example.com',
        'lauren.davis@example.com',
        'chris.anderson@example.com',
      ]);

    if (users.length === 0) {
      console.error('No test users found! Run seed-test-users.ts first.');
      process.exit(1);
    }

    console.log(`Found ${users.length} test users`);

    // Create likes scenarios:
    // 1. David receives likes from Jessica, Ashley, and Lauren
    // 2. Jessica receives likes from Ryan and Kevin
    // 3. Ryan receives a super like from Chris
    // 4. Ashley receives likes from David and Kevin

    const david = users.find(u => u.email === 'david.kim@example.com');
    const jessica = users.find(u => u.email === 'jessica.taylor@example.com');
    const ryan = users.find(u => u.email === 'ryan.martinez@example.com');
    const ashley = users.find(u => u.email === 'ashley.brown@example.com');
    const kevin = users.find(u => u.email === 'kevin.wilson@example.com');
    const lauren = users.find(u => u.email === 'lauren.davis@example.com');
    const chris = users.find(u => u.email === 'chris.anderson@example.com');

    if (!david || !jessica || !ryan || !ashley || !kevin || !lauren || !chris) {
      console.error('One or more test users not found!');
      process.exit(1);
    }

    // Clear existing swipes first
    await db('swipes').delete();
    console.log('Cleared existing swipes');

    // Create likes for David (he will receive 3 likes)
    const likes = [
      // Jessica likes David
      {
        swiper_id: jessica.id,
        swiped_id: david.id,
        action: 'like',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      // Ashley likes David
      {
        swiper_id: ashley.id,
        swiped_id: david.id,
        action: 'like',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      // Lauren super likes David
      {
        swiper_id: lauren.id,
        swiped_id: david.id,
        action: 'super_like',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      },

      // Ryan likes Jessica
      {
        swiper_id: ryan.id,
        swiped_id: jessica.id,
        action: 'like',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      // Kevin likes Jessica
      {
        swiper_id: kevin.id,
        swiped_id: jessica.id,
        action: 'like',
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },

      // Chris super likes Ryan
      {
        swiper_id: chris.id,
        swiped_id: ryan.id,
        action: 'super_like',
        created_at: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      },

      // David likes Ashley (mutual like scenario)
      {
        swiper_id: david.id,
        swiped_id: ashley.id,
        action: 'like',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      // Kevin likes Ashley
      {
        swiper_id: kevin.id,
        swiped_id: ashley.id,
        action: 'like',
        created_at: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
      },
    ];

    await db('swipes').insert(likes);
    console.log(`✅ Created ${likes.length} likes`);

    // Upgrade David to Premium so he can see "Who Liked You"
    const davidSub = await db('subscriptions').where('user_id', david.id).first();
    if (davidSub) {
      await db('subscriptions')
        .where('user_id', david.id)
        .update({
          tier: 'ultra',
          status: 'active',
          updated_at: new Date(),
        });
    } else {
      await db('subscriptions').insert({
        user_id: david.id,
        tier: 'ultra',
        status: 'active',
      });
    }
    console.log('✅ Upgraded David to Ultra (Premium) subscription');

    // Also upgrade Jessica to test the feature
    const jessicaSub = await db('subscriptions').where('user_id', jessica.id).first();
    if (jessicaSub) {
      await db('subscriptions')
        .where('user_id', jessica.id)
        .update({
          tier: 'ultra',
          status: 'active',
          updated_at: new Date(),
        });
    } else {
      await db('subscriptions').insert({
        user_id: jessica.id,
        tier: 'ultra',
        status: 'active',
      });
    }
    console.log('✅ Upgraded Jessica to Ultra (Premium) subscription');

    // Summary
    console.log('\n📊 Likes Summary:');
    console.log(`- David will see 3 likes (2 regular, 1 super like)`);
    console.log(`- Jessica will see 2 likes`);
    console.log(`- Ryan will see 1 super like`);
    console.log(`- Ashley will see 2 likes (including mutual with David)`);

    console.log('\n✅ Successfully seeded likes!');
    console.log('\n📝 To test:');
    console.log('1. Login as david.kim@example.com (password: Test@123)');
    console.log('2. Navigate to /who-liked-you');
    console.log('3. You should see likes from Jessica, Ashley, and Lauren');
    console.log('4. Lauren\'s like should show as a SUPER LIKE');

  } catch (error) {
    console.error('Error seeding likes:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

seedLikes();
