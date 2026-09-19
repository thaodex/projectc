import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const db = new PrismaClient();

async function seed() {
  const passwordHash = await argon2.hash('ChangeMe123!', { type: argon2.argon2id });
  await db.user.upsert({ where: { email: 'admin@licensevault.local' }, update: {}, create: { email: 'admin@licensevault.local', passwordHash, role: 'owner' } });
  const product = await db.product.upsert({ where: { slug: 'prosuite' }, update: {}, create: { name: 'ProSuite', slug: 'prosuite', currentVersion: '1.0.0' } });
  await db.licenseKey.upsert({ where: { keyCode: 'PSU-DEMO-2026-0001' }, update: {}, create: { keyCode: 'PSU-DEMO-2026-0001', productId: product.id, ownerName: 'Demo Customer', ownerEmail: 'demo@example.com', maxDevices: 1, plan: 'Professional', expiresAt: new Date('2027-01-01T00:00:00Z') } });
}

seed().finally(() => db.$disconnect());
