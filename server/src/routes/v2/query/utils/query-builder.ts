import { SqlParameter } from '@azure/cosmos';
import { QueryParams } from '../types/query.types.js';
import { JSONValue } from './filter-parser.js';

/**
 * Builds a Cosmos DB query from request parameters
 */
export function buildCosmosQuery(params: QueryParams, importId?: string) {
  const { filter = {} } = params;
  const whereClauses: string[] = [];
  const parameters: SqlParameter[] = [];

  // Add import ID filter if provided
  if (importId) {
    // Handle both single and double 'import_' prefixes
    const possibleImportIds = [importId];
    if (!importId.startsWith('import_import_')) {
      possibleImportIds.push(`import_${importId}`);
    }

    const importIdClauses = possibleImportIds.map((id, i) => {
      const paramName = `@importId${i}`;
      parameters.push({ name: paramName, value: id });
      return `c._importId = ${paramName}`;
    });

    whereClauses.push(`(${importIdClauses.join(' OR ')})`);
  }

  // Add document type filter for import rows
  if (!importId) {
    whereClauses.push('c.documentType = @documentType');
    parameters.push({ name: '@documentType', value: 'excel-import' });
  } else {
    whereClauses.push('c.documentType = @documentType');
    parameters.push({ name: '@documentType', value: 'excel-row' });
  }

  // Add filter conditions
  Object.entries(filter).forEach(([key, value], index) => {
    if (value === undefined || value === null) return;

    const paramName = `@param${index}`;
    const safeKey = `c["${key}"]`;
    const lowerSafeKey = `LOWER(TOSTRING(${safeKey}))`;

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Handle operator-based filters like { "contains": "value" }
      Object.entries(value as Record<string, unknown>).forEach(([op, opValue], opIndex) => {
        const opParamName = `${paramName}_${opIndex}`;
        
        switch (op) {
          case 'contains':
            whereClauses.push(`CONTAINS(${lowerSafeKey}, LOWER(${opParamName}))`);
            parameters.push({ name: opParamName, value: String(opValue) });
            break;
          case '!contains':
            whereClauses.push(`NOT CONTAINS(${lowerSafeKey}, LOWER(${opParamName}))`);
            parameters.push({ name: opParamName, value: String(opValue) });
            break;
          case 'startsWith':
            whereClauses.push(`STARTSWITH(${lowerSafeKey}, LOWER(${opParamName}))`);
            parameters.push({ name: opParamName, value: String(opValue) });
            break;
          case '=':
          case '!=':
          case '>':
          case '>=':
          case '<':
          case '<=':
            // Handle standard comparison operators
            whereClauses.push(`${safeKey} ${op} ${opParamName}`);
            parameters.push({ name: opParamName, value: opValue as JSONValue });
            break;
        }
      });
    } else {
      // Default to equality comparison
      whereClauses.push(`${safeKey} = ${paramName}`);
      parameters.push({ name: paramName, value: value as JSONValue });
    }
  });

  // Build the WHERE clause
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Build the ORDER BY clause
  let orderByClause = '';
  if (params.sort) {
    const sortField = params.sort.replace(/^-/, '');
    const sortOrder = params.sort.startsWith('-') ? 'DESC' : 'ASC';
    orderByClause = ` ORDER BY c["${sortField}"] ${sortOrder}`;
  }

  // For Cosmos DB, we'll use TOP for the limit and handle offset with continuation tokens
  // The actual pagination will be handled by the query executor
  const limitClause = params.limit ? ` TOP ${params.limit}` : '';

  // Build the SELECT clause based on requested fields
  let selectClause: string;
  if (params.fields && params.fields.length > 0) {
    // If specific fields are requested, select only those fields
    const fieldList = params.fields.split(',').map(field => `c["${field}"]`).join(', ');
    selectClause = `SELECT${limitClause} ${fieldList} FROM c`;
  } else {
    // If no fields are specified, select all fields
    selectClause = `SELECT${limitClause} * FROM c`;
  }

  // Build the final query
  const query = `${selectClause} ${whereClause}${orderByClause}`;

  return {
    query,
    whereClauses,
    parameters,
  };
}
