// Infrastructure: Prisma implementation of AgentRepository
import prisma from "@/shared/infrastructure/prisma/prismaClient";
export class PrismaAgentRepository {
    async create(data, tx) {
        const db = tx || prisma;
        const agent = await db.agent.create({
            data: {
                agentCode: data.agentCode,
                registrationStatus: data.registrationStatus,
                approvalRequestId: data.approvalRequestId,
                unitId: data.unitId,
                areaId: data.areaId,
                forumId: data.forumId,
                userId: data.userId,
                firstName: data.firstName,
                middleName: data.middleName,
                lastName: data.lastName,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                contactNumber: data.contactNumber,
                alternateContactNumber: data.alternateContactNumber,
                email: data.email,
                addressLine1: data.addressLine1,
                addressLine2: data.addressLine2,
                city: data.city,
                state: data.state,
                postalCode: data.postalCode,
                country: data.country,
                agentStatus: data.agentStatus,
                totalActiveMembers: data.totalActiveMembers,
                totalRegistrations: data.totalRegistrations,
                joinedDate: data.joinedDate,
                terminatedDate: data.terminatedDate,
                terminationReason: data.terminationReason,
                createdBy: data.createdBy,
                updatedBy: data.updatedBy,
            },
        });
        return this.toDomain(agent);
    }
    async findById(agentId, tx) {
        const db = tx || prisma;
        const agent = await db.agent.findUnique({ where: { agentId } });
        return agent ? this.toDomain(agent) : null;
    }
    async findByCode(unitId, agentCode, tx) {
        const db = tx || prisma;
        const agent = await db.agent.findUnique({
            where: { unitId_agentCode: { unitId, agentCode } },
        });
        return agent ? this.toDomain(agent) : null;
    }
    async findByEmail(email, tx) {
        const db = tx || prisma;
        const agent = await db.agent.findUnique({ where: { email } });
        return agent ? this.toDomain(agent) : null;
    }
    async findByUserId(userId, tx) {
        const db = tx || prisma;
        const agent = await db.agent.findFirst({ where: { userId } });
        return agent ? this.toDomain(agent) : null;
    }
    async update(agentId, data, tx) {
        const db = tx || prisma;
        const agent = await db.agent.update({
            where: { agentId },
            data: {
                agentCode: data.agentCode,
                registrationStatus: data.registrationStatus,
                approvalRequestId: data.approvalRequestId,
                unitId: data.unitId,
                areaId: data.areaId,
                forumId: data.forumId,
                userId: data.userId,
                firstName: data.firstName,
                middleName: data.middleName,
                lastName: data.lastName,
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                contactNumber: data.contactNumber,
                alternateContactNumber: data.alternateContactNumber,
                email: data.email,
                addressLine1: data.addressLine1,
                addressLine2: data.addressLine2,
                city: data.city,
                state: data.state,
                postalCode: data.postalCode,
                country: data.country,
                agentStatus: data.agentStatus,
                totalActiveMembers: data.totalActiveMembers,
                totalRegistrations: data.totalRegistrations,
                joinedDate: data.joinedDate,
                terminatedDate: data.terminatedDate,
                terminationReason: data.terminationReason,
                updatedBy: data.updatedBy,
                updatedAt: new Date(),
            },
        });
        return this.toDomain(agent);
    }
    async updateRegistrationStatus(agentId, status, approvalRequestId, updatedBy, tx) {
        const db = tx || prisma;
        const agent = await db.agent.update({
            where: { agentId },
            data: {
                registrationStatus: status,
                approvalRequestId: approvalRequestId ?? undefined,
                updatedBy: updatedBy ?? undefined,
                updatedAt: new Date(),
            },
        });
        return this.toDomain(agent);
    }
    async updateAgentStatus(agentId, status, updatedBy, terminatedDate, terminationReason, tx) {
        const db = tx || prisma;
        const agent = await db.agent.update({
            where: { agentId },
            data: {
                agentStatus: status,
                terminatedDate: terminatedDate ?? undefined,
                terminationReason: terminationReason ?? undefined,
                updatedBy,
                updatedAt: new Date(),
            },
        });
        return this.toDomain(agent);
    }
    async listByUnit(unitId, skip = 0, take = 20, tx) {
        const db = tx || prisma;
        const [agents, total] = await Promise.all([
            db.agent.findMany({
                where: { unitId },
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            db.agent.count({ where: { unitId } }),
        ]);
        return {
            agents: agents.map((a) => this.toDomain(a)),
            total,
        };
    }
    async listByArea(areaId, skip = 0, take = 20, tx) {
        const db = tx || prisma;
        const [agents, total] = await Promise.all([
            db.agent.findMany({
                where: { areaId },
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            db.agent.count({ where: { areaId } }),
        ]);
        return {
            agents: agents.map((a) => this.toDomain(a)),
            total,
        };
    }
    async listByForum(forumId, skip = 0, take = 20, tx) {
        const db = tx || prisma;
        const [agents, total] = await Promise.all([
            db.agent.findMany({
                where: { forumId },
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            db.agent.count({ where: { forumId } }),
        ]);
        return {
            agents: agents.map((a) => this.toDomain(a)),
            total,
        };
    }
    async existsByCode(unitId, agentCode, tx) {
        const db = tx || prisma;
        const count = await db.agent.count({
            where: { unitId, agentCode },
        });
        return count > 0;
    }
    async existsByEmail(email, tx) {
        const db = tx || prisma;
        const count = await db.agent.count({ where: { email } });
        return count > 0;
    }
    async countByStatus(unitId, status, tx) {
        const db = tx || prisma;
        return db.agent.count({
            where: { unitId, agentStatus: status },
        });
    }
    toDomain(agent) {
        return {
            agentId: agent.agentId,
            agentCode: agent.agentCode,
            registrationStatus: agent.registrationStatus,
            approvalRequestId: agent.approvalRequestId,
            unitId: agent.unitId,
            areaId: agent.areaId,
            forumId: agent.forumId,
            userId: agent.userId,
            firstName: agent.firstName,
            middleName: agent.middleName,
            lastName: agent.lastName,
            dateOfBirth: agent.dateOfBirth,
            gender: agent.gender,
            contactNumber: agent.contactNumber,
            alternateContactNumber: agent.alternateContactNumber,
            email: agent.email,
            addressLine1: agent.addressLine1,
            addressLine2: agent.addressLine2,
            city: agent.city,
            state: agent.state,
            postalCode: agent.postalCode,
            country: agent.country,
            agentStatus: agent.agentStatus,
            totalActiveMembers: agent.totalActiveMembers,
            totalRegistrations: agent.totalRegistrations,
            joinedDate: agent.joinedDate,
            terminatedDate: agent.terminatedDate,
            terminationReason: agent.terminationReason,
            createdAt: agent.createdAt,
            createdBy: agent.createdBy,
            updatedAt: agent.updatedAt,
            updatedBy: agent.updatedBy,
        };
    }
}
//# sourceMappingURL=agentRepository.js.map