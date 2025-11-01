import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/utils/api';

interface RequestOptions {
  source?: string;
  category?: string;
  subCategory?: string;
  fileId?: string;
  searchTerm?: string;
}

interface DistinctValuesResult {
  success: boolean;
  values: Record<string, any[]>;
  error?: string;
}

interface FileImportsResult {
  success: boolean;
  data: {
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  error?: string;
}

/**
 * Custom hook for managing API requests with debouncing and cancellation
 */
export const useDebouncedApi = () => {
  const [distinctValues, setDistinctValues] = useState<Record<string, any[]>>({});
  const [filteredValues, setFilteredValues] = useState<Record<string, any[]>>({});
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cancellation tokens and timeouts
  const distinctValuesAbortControllerRef = useRef<AbortController | null>(null);
  const filteredValuesAbortControllerRef = useRef<AbortController | null>(null);
  const filesAbortControllerRef = useRef<AbortController | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch distinct values for special fields (base values) - Source, Category, Sub Category
  const fetchDistinctValues = useCallback(async () => {
    // Cancel any ongoing request
    if (distinctValuesAbortControllerRef.current) {
      distinctValuesAbortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    distinctValuesAbortControllerRef.current = abortController;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/distinct-values?fields=Source,Category,Sub Category', {
        signal: abortController.signal
      });
      
      if (response && typeof response === 'object' && 'success' in response) {
        const data = response as DistinctValuesResult;
        
        if (data.success) {
          setDistinctValues(prev => ({
            ...prev,
            ...data.values
          }));
          
          // Initialize filtered values with the base values
          setFilteredValues(prev => ({
            ...prev,
            ...data.values
          }));
        } else {
          throw new Error(data.error || 'Failed to fetch distinct values');
        }
      } else {
        throw new Error('Invalid response format from distinct-values endpoint');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error fetching distinct values:', err);
        setError(err.message);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch cascading distinct values based on previous selections
  const fetchCascadingDistinctValues = useCallback(async (options: RequestOptions) => {
    // Cancel any ongoing request
    if (distinctValuesAbortControllerRef.current) {
      distinctValuesAbortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    distinctValuesAbortControllerRef.current = abortController;
    
    setLoading(true);
    setError(null);
    
    try {
      // Update filtered values based on the cascading hierarchy
      const newFilteredValues = { ...distinctValues }; // Start with base values
      
      // Update Category values based on selected Source
      if (options.source) {
        const params = new URLSearchParams();
        params.append('fields', 'Category');
        params.append('Source', options.source);
        
        const response = await api.get(`/api/distinct-values?${params.toString()}`, {
          signal: abortController.signal
        });
        
        if (response && typeof response === 'object' && 'success' in response) {
          const data = response as DistinctValuesResult;
          
          if (data.success) {
            newFilteredValues.Category = data.values['Category'] || [];
          }
        }
      }
      
      // Update Sub Category values based on selected Source and Category
      if (options.source && options.category) {
        const params = new URLSearchParams();
        params.append('fields', 'Sub Category');
        params.append('Source', options.source);
        params.append('Category', options.category);
        
        const response = await api.get(`/api/distinct-values?${params.toString()}`, {
          signal: abortController.signal
        });
        
        if (response && typeof response === 'object' && 'success' in response) {
          const data = response as DistinctValuesResult;
          
          if (data.success) {
            newFilteredValues['Sub Category'] = data.values['Sub Category'] || [];
          }
        }
      } else if (options.source) {
        // If only source is selected, filter Sub Category by source
        const params = new URLSearchParams();
        params.append('fields', 'Sub Category');
        params.append('Source', options.source);
        
        const response = await api.get(`/api/distinct-values?${params.toString()}`, {
          signal: abortController.signal
        });
        
        if (response && typeof response === 'object' && 'success' in response) {
          const data = response as DistinctValuesResult;
          
          if (data.success) {
            newFilteredValues['Sub Category'] = data.values['Sub Category'] || [];
          }
        }
      }
      
      // Update the filtered values state
      setFilteredValues(newFilteredValues);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error fetching cascading distinct values:', err);
        setError(err.message);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [distinctValues]);

  // Fetch filtered values when special filters change (for Year)
  const fetchFilteredValues = useCallback(async (options: RequestOptions) => {
    // Cancel any ongoing request
    if (filteredValuesAbortControllerRef.current) {
      filteredValuesAbortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    filteredValuesAbortControllerRef.current = abortController;
    
    setLoading(true);
    setError(null);
    
    try {
      // Build the query string with current special filter selections following cascade hierarchy
      const params = new URLSearchParams();
      params.append('fields', 'Year');
      
      // Add filters in cascade order - if Source is selected, include it
      if (options.source) {
        params.append('Source', options.source);
      }
      
      // Only include Category filter if Source is selected
      if (options.category && options.source) {
        params.append('Category', options.category);
      }
      
      // Only include Sub Category filter if both Source and Category are selected
      if (options.subCategory && options.category && options.source) {
        params.append('Sub Category', options.subCategory);
      }
      
      // Only include FileId filter if all previous filters are selected
      if (options.fileId && options.subCategory && options.category && options.source) {
        params.append('fileId', options.fileId);
      }
      
      const response = await api.get(`/api/query/distinct-file-values?${params.toString()}`, {
        signal: abortController.signal
      });
      
      console.log('[useDebouncedApi] distinct-file-values response:', response);
      
      if (response && typeof response === 'object' && 'success' in response) {
        const data = response as DistinctValuesResult;
        
        if (data.success) {
          console.log('[useDebouncedApi] distinct-file-values data.values:', data.values);
          // Update filtered values according to cascade hierarchy
          setFilteredValues(prevFiltered => {
            const newFilteredValues = {
              ...prevFiltered,
              Year: data.values['Year'] || []
            };
            console.log('[useDebouncedApi] Setting filteredValues.Year to:', newFilteredValues.Year);
            return newFilteredValues;
          });
        } else {
          throw new Error(data.error || 'Failed to fetch filtered distinct values');
        }
      } else {
        throw new Error('Invalid response format from distinct-file-values endpoint');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error fetching filtered distinct values:', err);
        setError(err.message);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch files with debouncing and cancellation
  const fetchFilesWithDebounce = useCallback((options: RequestOptions, delay: number = 300) => {
    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set new debounce timeout
    debounceTimeoutRef.current = setTimeout(() => {
      fetchFiles(options);
    }, delay);
  }, []);

  // Fetch files based on special filters - now uses the new files-by-filters endpoint
  const fetchFiles = useCallback(async (options: RequestOptions) => {
    // Cancel any ongoing request
    if (filesAbortControllerRef.current) {
      filesAbortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    filesAbortControllerRef.current = abortController;
    
    // Skip request if Sub Category is not selected (no point in fetching files without it)
    if (!options.subCategory) {
      setFiles([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let url = '/api/query/files-by-filters';
      const queryParams: string[] = [];
      
      // Add pagination
      queryParams.push('page=1');
      queryParams.push('pageSize=1000');
      
      // Add special filter parameters if provided
      if (options.source) {
        queryParams.push(`Source=${encodeURIComponent(options.source)}`);
      }
      if (options.category) {
        queryParams.push(`Category=${encodeURIComponent(options.category)}`);
      }
      if (options.subCategory) {
        queryParams.push(`Sub Category=${encodeURIComponent(options.subCategory)}`);
      }
      
      // Add search term if provided (though search might not apply in this context)
      if (options.searchTerm && options.searchTerm.trim()) {
        // Note: the files-by-filters endpoint doesn't handle search, so we'll ignore it for now
        console.warn('Search term is not supported for files-by-filters endpoint');
      }
      
      // Combine all query parameters
      if (queryParams.length > 0) {
        url = `${url}?${queryParams.join('&')}`;
      }
      
      const response = await api.get(url, {
        signal: abortController.signal
      });

      if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
        const result = response as FileImportsResult;
        
        if (result.success && Array.isArray(result.data.items)) {
          setFiles(result.data.items);
        } else {
          throw new Error(result.error || 'Failed to fetch files');
        }
      } else {
        throw new Error('Invalid response format from files-by-filters endpoint');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error fetching files by filters:', err);
        setError(err.message);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Cleanup function
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Abort any ongoing requests
      if (distinctValuesAbortControllerRef.current) {
        distinctValuesAbortControllerRef.current.abort();
      }
      if (filteredValuesAbortControllerRef.current) {
        filteredValuesAbortControllerRef.current.abort();
      }
      if (filesAbortControllerRef.current) {
        filesAbortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    distinctValues,
    filteredValues,
    files,
    loading,
    error,
    fetchDistinctValues,
    fetchFilteredValues,
    fetchCascadingDistinctValues, // Add the new function for cascading values
    fetchFiles,
    fetchFilesWithDebounce
  };
};