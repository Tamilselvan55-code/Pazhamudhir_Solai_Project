const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findUnique({ where: { id: 'c1899e7e-7fc8-4c5d-b1c4-5c70b565b2ff' }, include: { addresses: true } })
.then(u => console.log(JSON.stringify(u.addresses, null, 2)))
.finally(() => prisma.$disconnect());
