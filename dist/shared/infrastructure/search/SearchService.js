import { buildPagination, buildSearchWhere, buildFiltersWhere, buildSort, buildEagerLoad, validateFilters, validateSearchFields, } from './builders';
import { BadRequestError } from '@/shared/utils/error-handling/httpErrors';
export class SearchService {
    prisma;
    modelConfigs;
    constructor(prisma, modelConfigs) {
        this.prisma = prisma;
        this.modelConfigs = modelConfigs;
    }
    async execute(request) {
        const { model } = request;
        // Validate model exists in config
        const modelConfig = this.modelConfigs[model];
        if (!modelConfig) {
            throw new BadRequestError(`Model ${model} is not supported`);
        }
        console.log('Model Config:', modelConfig);
        // Validate request fields against model config
        if (request.filters) {
            validateFilters(request.filters, modelConfig);
        }
        const searchFields = request.searchFields || modelConfig.searchable;
        if (request.searchTerm && searchFields.length > 0) {
            validateSearchFields(searchFields, modelConfig);
        }
        // Build query components
        const { skip, take } = buildPagination(request.page, request.pageSize);
        const searchWhere = buildSearchWhere(request.searchTerm, searchFields);
        const filtersWhere = buildFiltersWhere(request.filters || []);
        const orderBy = buildSort(request.sortBy, request.sortOrder, modelConfig);
        const include = buildEagerLoad(request.eagerLoad || [], modelConfig);
        // Merge where clauses
        const whereConditions = [filtersWhere, searchWhere].filter(Boolean);
        const where = whereConditions.length === 0 ? undefined :
            whereConditions.length === 1 ? whereConditions[0] :
                { AND: whereConditions };
        // Get the Prisma model delegate. Prisma client exposes delegates in camelCase
        // camelCase : form (model name with the first letter lower-cased), e.g. ApprovalWorkflow -> approvalWorkflow
        const delegateName = model.charAt(0).toLowerCase() + model.slice(1);
        const modelDelegate = this.prisma[delegateName];
        if (!modelDelegate) {
            throw new BadRequestError(`Prisma model ${delegateName} not found`);
        }
        try {
            // Execute query with transaction for consistency
            const [items, total] = await this.prisma.$transaction([
                modelDelegate.findMany({
                    where,
                    orderBy,
                    include,
                    skip,
                    take,
                }),
                modelDelegate.count({ where }),
            ]);
            const page = request.page || 1;
            const pageSize = take;
            return {
                items,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            };
        }
        catch (error) {
            throw new BadRequestError(`Search query failed: ${error.message}`);
        }
    }
}
//# sourceMappingURL=SearchService.js.map