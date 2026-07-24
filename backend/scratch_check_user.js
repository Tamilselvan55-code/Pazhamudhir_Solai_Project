import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { invoiceNumber: 'INV-2026-469448755' },
    include: {
      user: {
        include: { addresses: true }
      }
    }
  });
  console.log("User addresses:", JSON.stringify(order.user.addresses, null, 2));
  await prisma.$disconnect();
}
main();
