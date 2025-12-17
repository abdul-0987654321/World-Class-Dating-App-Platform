import * as fs from 'fs';
import * as path from 'path';
import knex, { Knex } from 'knex';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

interface SeedConfig {
  clearExisting: boolean;
  verbose: boolean;
  environment: string;
}

const defaultConfig: SeedConfig = {
  clearExisting: false,
  verbose: true,
  environment: process.env.NODE_ENV || 'development',
};

interface UserFixture {
  email: string;
  password: string;
  role?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

interface ProfileFixture {
  user_email: string;
  bio?: string;
  occupation?: string;
  city?: string;
}

// Database connection configuration
function getDatabaseConfig(): Knex.Config {
  return {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'flamoral_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    pool: {
      min: 2,
      max: 10,
    },
  };
}

async function loadFixtures(filename: string): Promise<any[]> {
  const fixturesDir = path.join(__dirname, '../fixtures');
  const filePath = path.join(fixturesDir, filename);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Fixture file not found: ${filename}, skipping...`);
    return [];
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

async function clearDatabase(db: Knex, config: SeedConfig): Promise<void> {
  if (!config.clearExisting) {
    return;
  }

  console.log('🗑️  Clearing existing data...');

  // Order matters - delete in reverse order of dependencies
  const tables = [
    'messages',
    'conversations',
    'matches',
    'swipes',
    'photos',
    'user_prompts',
    'preferences',
    'profiles',
    'refresh_tokens',
    'verification_tokens',
    'users',
  ];

  for (const table of tables) {
    const exists = await db.schema.hasTable(table);
    if (exists) {
      await db(table).del();
      if (config.verbose) {
        console.log(`  ✓ Cleared ${table}`);
      }
    }
  }

  console.log('');
}

async function seedUsers(
  db: Knex,
  users: UserFixture[],
  config: SeedConfig
): Promise<Map<string, string>> {
  console.log('👤 Seeding users...');

  const userIdMap = new Map<string, string>();

  for (const userData of users) {
    // Check if user already exists
    const existingUser = await db('users').where({ email: userData.email }).first();

    if (existingUser) {
      if (config.verbose) {
        console.log(`  ⚠️  User ${userData.email} already exists, skipping...`);
      }
      userIdMap.set(userData.email, existingUser.id);
      continue;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Insert user
    const [user] = await db('users')
      .insert({
        email: userData.email,
        password_hash: hashedPassword,
        is_email_verified: true,
        is_active: true,
      })
      .returning('*');

    userIdMap.set(userData.email, user.id);

    if (config.verbose) {
      console.log(`  ✓ Created user: ${userData.email}`);
    }
  }

  console.log('');
  return userIdMap;
}

async function seedProfiles(
  db: Knex,
  profiles: ProfileFixture[],
  userIdMap: Map<string, string>,
  config: SeedConfig
): Promise<void> {
  console.log('📝 Seeding profiles...');

  for (const profileData of profiles) {
    const userId = userIdMap.get(profileData.user_email);

    if (!userId) {
      console.warn(`  ⚠️  User not found for email: ${profileData.user_email}, skipping profile...`);
      continue;
    }

    // Check if profile already exists
    const existingProfile = await db('profiles').where({ user_id: userId }).first();

    if (existingProfile) {
      if (config.verbose) {
        console.log(`  ⚠️  Profile for ${profileData.user_email} already exists, skipping...`);
      }
      continue;
    }

    // Insert profile
    await db('profiles').insert({
      user_id: userId,
      bio: profileData.bio,
      occupation: profileData.occupation,
      city: profileData.city,
      profile_completion_percentage: 50,
    });

    if (config.verbose) {
      console.log(`  ✓ Created profile for: ${profileData.user_email}`);
    }
  }

  console.log('');
}

async function seedDatabase(config: SeedConfig = defaultConfig): Promise<void> {
  console.log('🌱 Starting database seed...\n');
  console.log(`Environment: ${config.environment}`);
  console.log(`Clear existing: ${config.clearExisting}`);
  console.log('');

  let db: Knex | null = null;

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    db = knex(getDatabaseConfig());

    // Test connection
    await db.raw('SELECT 1');
    console.log('✓ Database connection successful\n');

    // Load fixtures
    console.log('📂 Loading fixtures...');
    const users = await loadFixtures('users.json');
    const profiles = await loadFixtures('profiles.json');

    if (config.verbose) {
      console.log(`  ✓ Loaded ${users.length} users`);
      console.log(`  ✓ Loaded ${profiles.length} profiles\n`);
    }

    // Clear existing data if requested
    if (config.clearExisting) {
      await clearDatabase(db, config);
    }

    // Seed data
    const userIdMap = await seedUsers(db, users, config);
    await seedProfiles(db, profiles, userIdMap, config);

    console.log('✅ Seed script completed successfully!\n');

    if (users.length > 0) {
      console.log('Test Accounts:');
      console.log('─────────────────────────────────────────');
      users.slice(0, 5).forEach((user) => {
        console.log(`  👤 ${user.email} / password: ${user.password}`);
      });
      console.log('─────────────────────────────────────────\n');
    }
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    // Close database connection
    if (db) {
      await db.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default seedDatabase;
