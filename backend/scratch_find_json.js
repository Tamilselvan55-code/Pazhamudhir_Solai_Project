import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  
  let found = null;
  for (const order of orders) {
    const str = JSON.stringify(order.shippingAddress);
    if (str.includes('13.00529') || str.includes('79.99458')) {
      found = order;
      break;
    }
  }

  if (found) {
    console.log("Order Found: ", found.invoiceNumber);
    console.log(JSON.stringify(found.shippingAddress, null, 2));
  } else {
    console.log("Not found in last 200 orders.");
  }
  await prisma.$disconnect();
}
main();
