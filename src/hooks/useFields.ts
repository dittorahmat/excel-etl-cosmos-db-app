import { useEffect, useState, useCallback, useRef } from 'react';
import { FieldOption } from '@/components/QueryBuilder/types';

interface SpecialFilters {
  Source?: string;
  Category?: string;
  'Sub Category'?: string;
  Year?: (string | number)[];
}

interface UseFieldsResult {
  fields: FieldOption[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Custom hook for fetching fields with caching and relationship support
 * @param relatedTo - Optional array of field names to filter related fields
 * @param specialFilters - Optional special filter values to filter fields by
 */
export const useFields = (relatedTo?: string[], specialFilters?: SpecialFilters): UseFieldsResult => {
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, FieldOption[]>>({});
  const previousFieldsRef = useRef<FieldOption[]>([]);

  const fetchFields = useCallback(async (relatedFields?: string[], filters?: SpecialFilters) => {
    // Create cache key that includes both related fields and special filters
    const cacheKeyParts = [];
    if (relatedFields && relatedFields.length > 0) {
      cacheKeyParts.push(relatedFields.join(','));
    }
    if (filters) {
      cacheKeyParts.push(JSON.stringify(filters));
    }
    const cacheKey = cacheKeyParts.length > 0 ? cacheKeyParts.join('|') : 'all';

    // Check cache first
    if (cache[cacheKey]) {
      setFields(cache[cacheKey]);
      previousFieldsRef.current = cache[cacheKey];
      return;
    }

    // Start loading, but keep showing the previous fields while loading new ones
    setLoading(true);
    setError(null);

    try {
      let url = '/api/fields';
      const queryParams: string[] = [];

      // Add relatedTo parameters if provided
      if (relatedFields && relatedFields.length > 0) {
        queryParams.push(...relatedFields.map(field => `relatedTo=${encodeURIComponent(field)}`));
      }

      // Add special filter parameters if provided
      if (filters) {
        if (filters.Source) {
          queryParams.push(`Source=${encodeURIComponent(filters.Source)}`);
        }
        if (filters.Category) {
          queryParams.push(`Category=${encodeURIComponent(filters.Category)}`);
        }
        if (filters['Sub Category']) {
          queryParams.push(`Sub Category=${encodeURIComponent(filters['Sub Category'])}`);
        }
        if (filters.Year && Array.isArray(filters.Year) && filters.Year.length > 0) {
          queryParams.push(`Year=${encodeURIComponent(filters.Year.join(','))}`);
        }
      }

      // Combine all query parameters
      if (queryParams.length > 0) {
        url = `${url}?${queryParams.join('&')}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        interface BackendField {
          name: string;
          type: string;
          label?: string;
        }

        // Map fields from backend format {name, type, label} to frontend format {value, label, type}
        const allFields = data.fields.map((field: BackendField) => ({
          value: field.name,
          label: field.label,
          type: field.type
        }));

        // Filter out the special fields (Source, Category, Sub Category, Year)
        const resultFields = allFields.filter((field: FieldOption) =>
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
        previousFieldsRef.current = resultFields;
      } else {
        throw new Error(data.error || 'Failed to fetch fields');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching fields:', errorMessage);

      // Return cached data if available, otherwise keep previous fields, otherwise empty array
      const cachedOrPrevious = cache[cacheKey] || previousFieldsRef.current || [];
      setFields(cachedOrPrevious);
    } finally {
      // Only set loading to false after we've updated the fields
      setLoading(false);
    }
  }, [cache]);

  const refresh = useCallback(() => {
    fetchFields(relatedTo, specialFilters);
  }, [fetchFields, relatedTo, specialFilters]);

  useEffect(() => {
    fetchFields(relatedTo, specialFilters);
  }, [fetchFields, relatedTo, specialFilters]);

  return { fields, loading, error, refresh };
};