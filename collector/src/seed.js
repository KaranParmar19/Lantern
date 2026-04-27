'use strict';

/**
 * Lantern APM — Database Seeder
 * 
 * Seeds MongoDB with a default user and test project
 * for easy local development and testing.
 * 
 * Creates:
 *   - Default user:    admin@lantern.dev / lantern123
 *   - Test project:    "My Test App" with a known API key
 * 
 * Usage: node src/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');
const User = require('./models/User');
const { hashPassword } = require('./services/auth');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lantern';

const DEFAULT_USER = {
  name: 'Admin',
  email: 'admin@lantern.dev',
  password: 'lantern123',
};

const TEST_PROJECT = {
  name: 'My Test App',
  apiKey: 'ltrn_live_test1234567890abcdef',
};

async function seed() {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log(`[Seed] ✅ Connected to ${MONGODB_URI}`);

    // ── Create/find default user ──
    let user = await User.findOne({ email: DEFAULT_USER.email });

    if (user) {
      console.log(`[Seed] ℹ️  Default user already exists: ${user.email}`);
    } else {
      const hashedPassword = await hashPassword(DEFAULT_USER.password);
      user = await User.create({
        name: DEFAULT_USER.name,
        email: DEFAULT_USER.email,
        password: hashedPassword,
      });
      console.log(`[Seed] ✅ Created default user: ${user.email}`);
    }

    // ── Create/find test project ──
    let project = await Project.findOne({ apiKey: TEST_PROJECT.apiKey });

    if (project) {
      console.log(`[Seed] ℹ️  Test project already exists: "${project.name}"`);
    } else {
      project = await Project.create({
        name: TEST_PROJECT.name,
        apiKey: TEST_PROJECT.apiKey,
        userId: user._id,
      });
      console.log(`[Seed] ✅ Created test project: "${project.name}"`);
    }

    // ── Summary ──
    console.log('\n' + '═'.repeat(50));
    console.log('  🏮 Lantern APM — Seed Complete');
    console.log('═'.repeat(50));
    console.log(`\n  Login Credentials:`);
    console.log(`  ──────────────────────────────`);
    console.log(`  Email:    ${DEFAULT_USER.email}`);
    console.log(`  Password: ${DEFAULT_USER.password}`);
    console.log(`\n  Test Project:`);
    console.log(`  ──────────────────────────────`);
    console.log(`  Name:     ${project.name}`);
    console.log(`  API Key:  ${project.apiKey}`);
    console.log(`  ID:       ${project._id}`);

    // List all projects
    const allProjects = await Project.find({}).populate('userId', 'email').lean();
    console.log(`\n  All Projects (${allProjects.length}):`);
    for (const p of allProjects) {
      const owner = p.userId?.email || 'no owner';
      console.log(`    • ${p.name} → ${p.apiKey} (${owner})`);
    }

    console.log('\n' + '═'.repeat(50) + '\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed] ❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
