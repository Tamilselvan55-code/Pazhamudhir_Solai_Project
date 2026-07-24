import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { notes: { contains: '13.00529' } },
        { invoiceNumber: { contains: '2526' } }, // partial match on the user's invoice
      ]
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  if (orders.length > 0) {
    for (const order of orders) {
      console.log(`Invoice: ${order.invoiceNumber}`);
      console.log(`Notes: ${order.notes}`);
      console.log(`Shipping Address: ${JSON.stringify(order.shippingAddress)}`);
      console.log('---');
    }
  } else {
    console.log("No orders found matching the criteria.");
  }
  await prisma.$disconnect();
}
main();
