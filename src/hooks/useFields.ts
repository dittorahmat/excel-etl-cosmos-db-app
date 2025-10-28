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
      
      // For incremental filtering, we send ALL selected fields to the backend
      // The backend will now return fields from files containing ALL of these fields
      if (relatedFields && relatedFields.length > 0) {
        // Create query parameters for all related fields
        const queryParams = relatedFields.map(field => `relatedTo=${encodeURIComponent(field)}`).join('&');
        url = `/api/fields?${queryParams}`;
      }
        
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Map fields from backend format {name, type, label} to frontend format {value, label, type}
        const allFields = data.fields.map((field: any) => ({
          value: field.name,
          label: field.label,
          type: field.type
        }));
        
        // Filter out the special fields (Source, Category, Sub Category, Year)
        const resultFields = allFields.filter(field => 
          !['Source', 'Category', 'Sub Category', 'Year'].includes(field.value)
        );
        
        // If we have multiple related fields, the backend now properly handles finding
        // files that contain ALL of the selected fields and returns the intersection
        if (relatedFields && relatedFields.length > 1) {
          // The backend now correctly intersects fields from files containing all selected fields
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