import { useEffect, useState, useCallback } from 'react';
import { FieldOption } from '@/components/QueryBuilder/types';

interface UseFieldsResult {
  fields: FieldOption[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Custom hook for fetching fields with caching and relationship support
 * @param relatedTo - Optional array of field names to filter related fields
 */
export const useFields = (relatedTo?: string[]): UseFieldsResult => {
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, FieldOption[]>>({});

  const fetchFields = useCallback(async (relatedFields?: string[]) => {
    // Create cache key
    const cacheKey = relatedFields?.join(',') || 'all';
    
    // Check cache first
    if (cache[cacheKey]) {
      setFields(cache[cacheKey]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let url = '/api/fields';
      
      // For incremental filtering, we use the first field as the base for filtering
      // The backend will now return fields from ALL files containing this field
      if (relatedFields && relatedFields.length > 0) {
        url = `/api/fields?relatedTo=${encodeURIComponent(relatedFields[0])}`;
      }
        
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Map fields from backend format {name, type, label} to frontend format {value, label, type}
        let resultFields = data.fields.map((field: any) => ({
          value: field.name,
          label: field.label,
          type: field.type
        }));
        
        // If we have multiple related fields, we need to filter the results
        // to only include fields that are related to ALL selected fields
        // The backend now returns fields from ALL files containing the first selected field
        if (relatedFields && relatedFields.length > 1) {
          // For now, we'll just use the first field's related fields as a base
          // A more sophisticated approach would intersect all related fields
          // but that would require backend changes to support multiple field relationships
        }
        
        // Update cache
        setCache(prev => ({ ...prev, [cacheKey]: resultFields }));
        setFields(resultFields);
      } else {
        throw new Error(data.error || 'Failed to fetch fields');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching fields:', errorMessage);
      
      // Return cached data if available, otherwise empty array
      setFields(cache[cacheKey] || []);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  const refresh = useCallback(() => {
    fetchFields(relatedTo);
  }, [fetchFields, relatedTo]);

  useEffect(() => {
    fetchFields(relatedTo);
  }, [fetchFields, relatedTo]);

  return { fields, loading, error, refresh };
};