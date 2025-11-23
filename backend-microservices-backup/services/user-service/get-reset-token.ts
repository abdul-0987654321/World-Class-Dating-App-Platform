import knex from 'knex';
import config from './src/infrastructure/database/knexfile';

const db = knex(config.development);

(async () => {
  try {
    const users = await db('users')
      .where('email', 'test.user@example.com')
      .first();

    if (!users) {
      console.log('User not found');
      await db.destroy();
      return;
    }

    const tokens = await db('verification_tokens')
      .where({
        user_id: users.id,
        type: 'password_reset',
        is_used: false
      })
      .orderBy('created_at', 'desc')
      .limit(1);

    if (tokens.length > 0) {
      console.log('Reset Token:', tokens[0].token);
      console.log('Expires At:', tokens[0].expires_at);
      console.log('\nReset URL: http://localhost:3000/reset-password?token=' + tokens[0].token);
    } else {
      console.log('No unused password reset token found for this user');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
})();
