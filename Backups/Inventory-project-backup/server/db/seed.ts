import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './client.js';
import { products, users, utangCustomers, workspaceSettings } from './schema.js';
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

  const [product] = await db.select().from(products).limit(1);
  if (!product) {
    await db.insert(products).values([
      {
        skuCode: 'ST-KOPIKO-BLACK',
        name: 'Kopiko Black 3-in-1',
        category: 'Sachets',
        costPrice: '5.00',
        retailPrice: '7.00',
        currentQty: 10,
        reorderLevel: 10,
      },
      {
        skuCode: 'ST-COKE-330',
        name: 'Coca-Cola 330ml',
        category: 'Drinks',
        costPrice: '18.00',
        retailPrice: '25.00',
        currentQty: 4,
        reorderLevel: 12,
      },
      {
        skuCode: 'ST-SARDINES-155',
        name: 'Sardines 155g',
        category: 'Canned',
        costPrice: '21.00',
        retailPrice: '28.00',
        currentQty: 0,
        reorderLevel: 6,
        isPinnedRestock: true,
      },
    ]);
    console.log('Seeded starter product catalog');
  }

  const [customer] = await db.select().from(utangCustomers).limit(1);
  if (!customer) {
    await db.insert(utangCustomers).values([
      {
        fullName: 'Juan Dela Cruz',
        alias: 'Kuya Juan',
        contactNumber: '09171234567',
        creditLimit: '500.00',
        currentBalance: '120.00',
      },
      {
        fullName: 'Maria Santos',
        alias: 'Ate Maria',
        contactNumber: '09181234567',
        creditLimit: '300.00',
        currentBalance: '0.00',
      },
    ]);
    console.log('Seeded starter utang customers');
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
