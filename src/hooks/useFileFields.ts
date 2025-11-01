import { useEffect, useState, useCallback } from 'react';

interface SpecialFilters {
  Source?: string;
  Category?: string;
  'Sub Category'?: string;
  Year?: (string | number)[];
}

interface FileOption {
  value: string;
  label: string;
  fileName: string;
  metadata?: Record<string, any>;
}

interface UseFileFieldsResult {
  files: FileOption[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Custom hook for fetching files based on special filters
 * @param specialFilters - Optional special filter values to filter files by
 * @param searchTerm - Optional search term to filter files by name
 */
export const useFileFields = (specialFilters?: SpecialFilters, searchTerm?: string): UseFileFieldsResult => {
  const [files, setFiles] = useState<FileOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, FileOption[]>>({});

  const fetchFiles = useCallback(async (filters?: SpecialFilters, search?: string) => {
    // Create cache key that includes special filters and search term
    const cacheKeyParts = [];
    if (filters) {
      cacheKeyParts.push(JSON.stringify(filters));
    }
    if (search) {
      cacheKeyParts.push(`search:${search}`);
    }
    const cacheKey = cacheKeyParts.length > 0 ? cacheKeyParts.join('|') : 'all';
    
    // Check cache first
    if (cache[cacheKey]) {
      setFiles(cache[cacheKey]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let url = '/api/query/imports';
      const queryParams: string[] = [];
      
      // Add pagination to get all imports
      queryParams.push('page=1');
      queryParams.push('pageSize=1000'); // Get all records
      
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
      
      // Add search term if provided
      if (search && search.trim()) {
        queryParams.push(`search=${encodeURIComponent(search.trim())}`);
      }
      
      // Combine all query parameters
      if (queryParams.length > 0) {
        url = `${url}?${queryParams.join('&')}`;
      }
        
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data && Array.isArray(data.data.items)) {
        // Map imports from backend format to frontend format {value, label, fileName}
        const fileOptions: FileOption[] = data.data.items.map((item: any) => ({
          value: item.id || item._importId || '',
          label: item.fileName || 'Untitled',
          fileName: item.fileName || 'Untitled',
          metadata: item
        }));
        
        // Update cache
        setCache(prev => ({ ...prev, [cacheKey]: fileOptions }));
        setFiles(fileOptions);
      } else {
        throw new Error(data.error || 'Failed to fetch files');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching files:', errorMessage);
      
      // Return cached data if available, otherwise empty array
      setFiles(cache[cacheKey] || []);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  const refresh = useCallback(() => {
    fetchFiles(specialFilters, searchTerm);
  }, [fetchFiles, specialFilters, searchTerm]);

  useEffect(() => {
    fetchFiles(specialFilters, searchTerm);
  }, [fetchFiles, specialFilters, searchTerm]);

  return { files, loading, error, refresh };
};