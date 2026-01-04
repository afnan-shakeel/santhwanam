import { BadRequestError } from '@/shared/utils/error-handling/httpErrors';
function buildNestedObject(path, value) {
    if (path.length === 0)
        return value;
    const [head, ...rest] = path;
    return { [head]: buildNestedObject(rest, value) };
}
export function buildPagination(page = 1, pageSize = 10) {
    const take = Math.min(pageSize, 100); // enforce max page size
    const skip = (Math.max(page, 1) - 1) * take;
    return { skip, take };
}
export function buildSearchWhere(searchTerm, fields = []) {
    if (!searchTerm || !fields.length)
        return undefined;
    const ors = fields.map((field) => {
        const clause = { contains: searchTerm, mode: 'insensitive' };
        if (field.includes('.')) {
            const parts = field.split('.');
            return buildNestedObject(parts, clause);
        }
        return { [field]: clause };
    });
    return { OR: ors };
}
export function buildFiltersWhere(filters = []) {
    if (!filters.length)
        return undefined;
    const clauses = filters.map((f) => {
        let clause;
        switch (f.operator) {
            case 'equals':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), f.value) : { [f.field]: f.value };
                break;
            case 'notEquals':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { not: f.value }) : { [f.field]: { not: f.value } };
                break;
            case 'contains':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { contains: f.value, mode: 'insensitive' }) : { [f.field]: { contains: f.value, mode: 'insensitive' } };
                break;
            case 'in':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { in: Array.isArray(f.value) ? f.value : [f.value] }) : { [f.field]: { in: Array.isArray(f.value) ? f.value : [f.value] } };
                break;
            case 'notIn':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { notIn: Array.isArray(f.value) ? f.value : [f.value] }) : { [f.field]: { notIn: Array.isArray(f.value) ? f.value : [f.value] } };
                break;
            case 'gte':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { gte: f.value }) : { [f.field]: { gte: f.value } };
                break;
            case 'lte':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { lte: f.value }) : { [f.field]: { lte: f.value } };
                break;
            case 'gt':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { gt: f.value }) : { [f.field]: { gt: f.value } };
                break;
            case 'lt':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { lt: f.value }) : { [f.field]: { lt: f.value } };
                break;
            case 'between':
                if (typeof f.value === 'object' && f.value && 'from' in f.value && 'to' in f.value) {
                    clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { gte: f.value.from, lte: f.value.to }) : { [f.field]: { gte: f.value.from, lte: f.value.to } };
                }
                else {
                    throw new BadRequestError(`Invalid between value for field ${f.field}`);
                }
                break;
            case 'isNull':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), null) : { [f.field]: null };
                break;
            case 'isNotNull':
                clause = f.field.includes('.') ? buildNestedObject(f.field.split('.'), { not: null }) : { [f.field]: { not: null } };
                break;
            default:
                throw new BadRequestError(`Unsupported operator ${f.operator}`);
        }
        return f.negate ? { NOT: clause } : clause;
    });
    return clauses.length === 1 ? clauses[0] : { AND: clauses };
}
export function buildSort(sortBy, sortOrder, modelConfig) {
    if (!sortBy)
        return undefined;
    if (Array.isArray(sortBy)) {
        return sortBy.map((field) => {
            if (modelConfig && !modelConfig.sortable.includes(field)) {
                throw new BadRequestError(`Field ${field} is not sortable`);
            }
            const order = typeof sortOrder === 'object' ? sortOrder[field] || 'asc' : sortOrder || 'asc';
            if (field.includes('.')) {
                return buildNestedObject(field.split('.'), order);
            }
            return { [field]: order };
        });
    }
    else {
        if (modelConfig && !modelConfig.sortable.includes(sortBy)) {
            throw new BadRequestError(`Field ${sortBy} is not sortable`);
        }
        const order = typeof sortOrder === 'string' ? sortOrder : 'asc';
        if (sortBy.includes('.')) {
            return buildNestedObject(sortBy.split('.'), order);
        }
        return { [sortBy]: order };
    }
}
export function buildEagerLoad(eagerLoad = [], modelConfig) {
    if (!eagerLoad.length)
        return undefined;
    const include = {};
    eagerLoad.forEach((rel) => {
        if (modelConfig && !modelConfig.relations.includes(rel)) {
            throw new BadRequestError(`Relation ${rel} is not allowed for eager loading`);
        }
        include[rel] = true;
    });
    return include;
}
export function validateFilters(filters = [], modelConfig) {
    console.log('Validating filters:', filters, 'against modelConfig:', modelConfig);
    filters.forEach((filter) => {
        if (!modelConfig.filters.includes(filter.field)) {
            throw new BadRequestError(`Field ${filter.field} is not allowed for filtering`);
        }
    });
}
export function validateSearchFields(searchFields = [], modelConfig) {
    searchFields.forEach((field) => {
        if (!modelConfig.searchable.includes(field)) {
            throw new BadRequestError(`Field ${field} is not searchable`);
        }
    });
}
//# sourceMappingURL=builders.js.map