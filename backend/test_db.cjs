const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 1 }).then(orders => {
    console.log(JSON.stringify(orders[0], null, 2));
}).finally(() => prisma.$disconnect());
