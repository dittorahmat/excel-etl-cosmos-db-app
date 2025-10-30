import { logger } from '../../../../utils/logger.js';

/**
 * Groups records by special filter values and joins them by combining fields from different import IDs
 */
export class JoinProcessor {
  /**
   * Combines records that have matching special filter values across different import IDs
   * @param records The records to process
   * @param specialFilterFields The field names used for joining (e.g., Source, Category, etc.)
   * @returns Merged records with combined fields from different import IDs
   */
  public static joinRecords(
    records: Record<string, any>[],
    specialFilterFields: string[] = ['Source', 'Category', 'Sub Category', 'Year']
  ): Record<string, any>[] {
    if (!Array.isArray(records) || records.length === 0) {
      return [];
    }

    logger.debug('JoinProcessor - Starting to join records', {
      recordCount: records.length,
      specialFilterFields
    });

    // Group records by special filter values (this will group records from different import IDs that have matching special filter values)
    const groupedRecords = this.groupBySpecialFilters(records, specialFilterFields);

    logger.debug('JoinProcessor - Records grouped by special filters', {
      groupCount: Object.keys(groupedRecords).length
    });

    // Process each group to combine records from different import IDs
    const joinedRecords: Record<string, any>[] = [];
    
    for (const [groupKey, groupRecords] of Object.entries(groupedRecords)) {
      if (!groupRecords || groupRecords.length === 0) continue; // Skip empty groups
      
      logger.debug('JoinProcessor - Processing group', {
        groupKey,
        recordCount: groupRecords.length
      });

      if (groupRecords.length === 1) {
        // If only one record in the group, just add it as-is
        if (groupRecords[0]) {
          joinedRecords.push(groupRecords[0]);
        }
      } else {
        // If multiple records in the group (from different import IDs), join them
        const joinedRecord = this.joinGroupRecords(groupRecords, specialFilterFields);
        joinedRecords.push(joinedRecord);
      }
    }

    logger.debug('JoinProcessor - Finished joining records', {
      originalCount: records.length,
      joinedCount: joinedRecords.length
    });

    return joinedRecords;
  }

  /**
   * Groups records by their special filter values (which spans across different import IDs)
   */
  private static groupBySpecialFilters(
    records: Record<string, any>[],
    specialFilterFields: string[]
  ): Record<string, Record<string, any>[]> {
    const groups: Record<string, Record<string, any>[]> = {};

    for (const record of records) {
      // Create a key based on special filter values (not import ID)
      const groupKey = this.createGroupKey(record, specialFilterFields);
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      groups[groupKey].push(record);
    }

    return groups;
  }

  /**
   * Creates a unique key from special filter values only (ignoring import ID differences)
   */
  private static createGroupKey(record: Record<string, any>, specialFilterFields: string[]): string {
    // Create a consistent key based only on special filter values
    const values: string[] = [];
    
    if (!record) {
      return '';
    }
    
    for (const field of specialFilterFields) {
      const value = record[field];
      // Handle different data types consistently
      if (value === undefined || value === null) {
        values.push('null');
      } else if (typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(String(value));
      }
    }
    
    return values.join('|');
  }

  /**
   * Joins multiple records in a group (from different import IDs) into a single record with all fields
   */
  private static joinGroupRecords(
    records: Record<string, any>[],
    specialFilterFields: string[]
  ): Record<string, any> {
    if (records.length === 0) {
      return {};
    }

    // Start with an empty result object
    const result: Record<string, any> = {};

    // Collect all unique field names across all records in the group
    const allFieldNames = new Set<string>();
    for (const record of records) {
      for (const fieldName of Object.keys(record)) {
        allFieldNames.add(fieldName);
      }
    }

    // Process each unique field name
    for (const fieldName of allFieldNames) {
      if (specialFilterFields.includes(fieldName)) {
        // For special filter fields, all records in the group should have the same value
        // So we can take it from the first record (they should all be identical)
        const firstRecord = records[0];
        result[fieldName] = firstRecord ? firstRecord[fieldName] : null;
      } else if (fieldName === '_importId' || fieldName === '_rid' || fieldName === '_self' || 
                 fieldName === '_etag' || fieldName === '_attachments' || fieldName === '_ts' ||
                 fieldName === 'id' || fieldName === '_partitionKey' || fieldName === 'documentType') {
        // For system/metadata fields, use values from the first record or set to null
        // to avoid conflicts, but we'll handle _importId specially if needed
        const firstRecord = records[0];
        result[fieldName] = firstRecord ? firstRecord[fieldName] : null;
      } else {
        // For regular fields, combine values from different import IDs
        // If multiple records have a value for the same field, take the first non-null one
        let combinedValue: any = null;
        let hasValue = false;

        for (const record of records) {
          if (record && record[fieldName] !== undefined && record[fieldName] !== null && record[fieldName] !== '') {
            combinedValue = record[fieldName];
            hasValue = true;
            break; // Take first non-null value found
          }
        }

        result[fieldName] = hasValue ? combinedValue : null;
      }
    }

    return result;
  }
}