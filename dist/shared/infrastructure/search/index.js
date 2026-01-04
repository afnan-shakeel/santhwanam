import prisma from '@/shared/infrastructure/prisma/prismaClient';
import { SearchService } from './SearchService';
import { modelConfigs } from './modelConfig';
// Export types and classes
export * from './types';
export * from './builders';
export * from './SearchService';
export * from './modelConfig';
// Export default configured instance
export const searchService = new SearchService(prisma, modelConfigs);
export default searchService;
//# sourceMappingURL=index.js.map