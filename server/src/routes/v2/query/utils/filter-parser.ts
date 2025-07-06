import { SqlParameter } from '@azure/cosmos';

export type JSONValue = | string | number | boolean | { [x: string]: JSONValue } | Array<JSONValue>;

/**
 * Parses and validates filter parameters
 */
export function parseFilterParams(
  filter: Record<string, unknown> | undefined,
  fieldPrefix = ''
): { whereClauses: string[]; filterParams: SqlParameter[] } {
  const whereClauses: string[] = [];
  const filterParams: SqlParameter[] = [];
  let paramIndex = 0;

  if (!filter) {
    return { whereClauses, filterParams };
  }

  Object.entries(filter).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    const paramName = `@${fieldPrefix}param${paramIndex++}`;
    const safeKey = `c["${key}"]`;
    const lowerSafeKey = `LOWER(TOSTRING(${safeKey}))`;

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle operator-based filters like { "contains": "value" }
      Object.entries(value as Record<string, unknown>).forEach(([op, opValue], opIndex) => {
        const opParamName = `${paramName}_${opIndex}`;
        
        switch (op) {
          case 'contains':
            whereClauses.push(`CONTAINS(${lowerSafeKey}, LOWER(${opParamName}))`);
            filterParams.push({ name: opParamName, value: String(opValue) });
            break;
          case '!contains':
            whereClauses.push(`NOT CONTAINS(${lowerSafeKey}, LOWER(${opParamName}))`);
            filterParams.push({ name: opParamName, value: String(opValue) });
            break;
          case 'startsWith':
            whereClauses.push(`STARTSWITH(${lowerSafeKey}, LOWER(${opParamName}))`);
            filterParams.push({ name: opParamName, value: String(opValue) });
            break;
          case '=':
          case '!=':
          case '>':
          case '>=':
          case '<':
          case '<=':
            // Handle standard comparison operators
            whereClauses.push(`${safeKey} ${op} ${opParamName}`);
            filterParams.push({ name: opParamName, value: opValue as JSONValue });
            break;
        }
      });
    } else {
      // Default to equality comparison
      whereClauses.push(`${safeKey} = ${paramName}`);
      filterParams.push({ name: paramName, value: value as JSONValue });
    }
  });

  return { whereClauses, filterParams };
}

/**
 * Builds a WHERE clause from filter conditions
 */
export function buildWhereClause(conditions: string[]): string {
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

/**
 * Builds an ORDER BY clause from sort parameters
 */
export function buildOrderByClause(sort?: string): string {
  if (!sort) return '';
  const sortField = sort.replace(/^-/, '');
  const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';
  return ` ORDER BY c["${sortField}"] ${sortOrder}`;
}

/**
 * Builds a pagination clause
 */
export function buildPaginationClause(offset: number, limit: number): string {
  return ` OFFSET ${offset} LIMIT ${limit}`;
}
