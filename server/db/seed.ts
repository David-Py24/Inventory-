import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './client.js';
import { users, workspaceSettings } from './schema.js';
import { eq } from 'drizzle-orm';

async function seed() {
  const [existing] = await db.select().from(users).limit(1);
  if (!existing) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await db.insert(users).values({
      name: 'Demo Admin',
      email: 'admin@hearthledger.local',
      passwordHash,
      role: 'Admin',
      department: 'Finance',
      status: 'Active',
    });
    console.log('Seeded demo user: admin@hearthledger.local / password123');
  }
  const [settings] = await db.select().from(workspaceSettings).limit(1);
  if (!settings) {
    await db.insert(workspaceSettings).values({});
    console.log('Seeded default workspace settings');
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
