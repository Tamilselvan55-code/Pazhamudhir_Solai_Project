import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const order = await prisma.order.findFirst({
      where: { invoiceNumber: 'INV-2026-252600934' },
      include: {
        user: { include: { addresses: true } }
      }
    });

    if (order) {
      console.log("=== ORDER DB RECORD ===");
      console.log(JSON.stringify(order.shippingAddress, null, 2));
    } else {
      console.log("Order not found.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
