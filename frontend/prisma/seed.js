const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasourceUrl: "file:./dev.db" });

async function main() {
  console.log('Start seeding...')

  // Seed only role + address. Names/emails are filled via the Profile Setup modal on first login.
  // Roles are UPPERCASE to match the standard used across the entire codebase.
  const users = [
    {
      walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.toLowerCase(),
      role: 'ADMIN',
      name: '',
      email: '',
    },
    {
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'.toLowerCase(),
      role: 'COMPANY',
      name: '',
      email: '',
    },
    {
      walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'.toLowerCase(),
      role: 'SUPERVISOR',
      name: '',
      email: '',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { walletAddress: user.walletAddress },
      update: { role: user.role },   // Also fix existing rows with old casing
      create: user,
    });
  }

  console.log('Seeding finished.')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
