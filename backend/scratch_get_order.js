import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { invoiceNumber: 'INV-2026-850936975' }
  });
  console.log(JSON.stringify(order.shippingAddress, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
