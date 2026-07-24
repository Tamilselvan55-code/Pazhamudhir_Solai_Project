import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { invoiceNumber: 'INV-2026-469448755' }
  });
  console.log("Notes:", order.notes);
  await prisma.$disconnect();
}
main();
