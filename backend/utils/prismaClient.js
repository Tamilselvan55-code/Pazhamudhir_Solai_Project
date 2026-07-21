import dotenv from 'dotenv';
dotenv.config();
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('query', (e) => {
  if (process.env.PRISMA_QUERY_LOG === 'true') {
    console.log(`[PRISMA SQL QUERY] ${e.query} | Params: ${e.params} | Execution Time: ${e.duration}ms`);
  }
});

prisma.$on('error', (e) => {
  console.error(`[PRISMA DATABASE ERROR] Target: ${e.target} | Message: ${e.message}`);
});

export default prisma;

