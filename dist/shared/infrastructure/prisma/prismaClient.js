import dotenv from 'dotenv';
dotenv.config();
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client';
const connectionString = `${process.env.DATABASE_URL}`;
console.log('Database connection string:', connectionString);
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
export default prisma;
//# sourceMappingURL=prismaClient.js.map