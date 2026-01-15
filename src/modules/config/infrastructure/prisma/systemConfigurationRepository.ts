// Infrastructure: Prisma System Configuration Repository

import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { SystemConfigurationRepository } from '../../domain/repositories';
import { SystemConfiguration } from '../../domain/entities';

export class PrismaSystemConfigurationRepository implements SystemConfigurationRepository {
  async findByKey(key: string, tx?: any): Promise<SystemConfiguration | null> {
    const client = tx ?? prisma;
    const config = await client.systemConfiguration.findUnique({
      where: { key },
    });
    return config as SystemConfiguration | null;
  }

  async findAll(tx?: any): Promise<SystemConfiguration[]> {
    const client = tx ?? prisma;
    const configs = await client.systemConfiguration.findMany({
      orderBy: { key: 'asc' },
    });
    return configs as SystemConfiguration[];
  }

  async upsert(
    data: {
      key: string;
      value: string;
      description?: string | null;
      dataType?: string;
      updatedBy?: string | null;
    },
    tx?: any
  ): Promise<SystemConfiguration> {
    const client = tx ?? prisma;
    const config = await client.systemConfiguration.upsert({
      where: { key: data.key },
      update: {
        value: data.value,
        description: data.description,
        dataType: data.dataType ?? 'string',
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      },
      create: {
        key: data.key,
        value: data.value,
        description: data.description ?? null,
        dataType: data.dataType ?? 'string',
        updatedBy: data.updatedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return config as SystemConfiguration;
  }

  async update(
    key: string,
    data: {
      value: string;
      updatedBy?: string | null;
    },
    tx?: any
  ): Promise<SystemConfiguration> {
    const client = tx ?? prisma;
    const config = await client.systemConfiguration.update({
      where: { key },
      data: {
        value: data.value,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      },
    });
    return config as SystemConfiguration;
  }
}
