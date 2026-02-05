import prisma from '@/shared/infrastructure/prisma/prismaClient';
export class PrismaUserRepository {
    async create(data, tx) {
        const client = tx ?? prisma;
        const u = await client.user.create({ data });
        return u;
    }
    async findById(id, tx) {
        const client = tx ?? prisma;
        const u = await client.user.findUnique({ where: { userId: id } });
        return u ?? null;
    }
    async findByIdWithRoles(id, tx) {
        const client = tx ?? prisma;
        const u = await client.user.findUnique({
            where: { userId: id },
            include: {
                userRoles: {
                    where: { isActive: true },
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: true
                                    }
                                }
                            }
                        },
                        // assignedByUser: {
                        //   select: {
                        //     userId: true,
                        //     firstName: true,
                        //     lastName: true,
                        //     email: true
                        //   }
                        // }
                    },
                    orderBy: { assignedAt: 'desc' }
                }
            }
        });
        return u ?? null;
    }
    async updateById(id, updates, tx) {
        const client = tx ?? prisma;
        const u = await client.user.update({ where: { userId: id }, data: updates });
        return u;
    }
    async listAll() {
        const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
        return rows;
    }
}
export default PrismaUserRepository;
//# sourceMappingURL=userRepository.js.map