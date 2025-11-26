import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { api } from '@/utils/api';

// Add debugging to see what file is being imported
console.log('[DEBUG] Imported api object:', api);

// Type definitions for the component props and API responses
type FieldType = 'string' | 'number' | 'date' | 'boolean';

interface FieldDefinition {
  name: string;
  type: FieldType;
  label?: string;
  description?: string;
}

interface QueryResult {
  items: Record<string, unknown>[];
  fields: string[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  continuationToken?: string;
  filters?: FilterCondition[]; // Add filters to QueryResult
}

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number | boolean;
  value2?: string | number | boolean;
}

interface SpecialFilters {
  Source: string;
  Category: string;
  'Sub Category': string;
  Year?: string[] | number[];
  FileId?: string;
}

export const useDashboardData = () => {
  const { isAuthenticated } = useAuth();

  // State for query results and UI
  const [queryResult, setQueryResult] = useState<QueryResult>({
    items: [],
    fields: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    hasMore: false,
    continuationToken: undefined
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for field definitions and selections - now using selectedFile instead of selectedFields
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>(''); // Changed from selectedFields to selectedFile
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // State for sorting
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // State for filters
  const [currentFilters, setCurrentFilters] = useState<FilterCondition[]>([]);
  const [specialFilters, setSpecialFilters] = useState<SpecialFilters>({
    Source: '',
    Category: '',
    'Sub Category': '',
    Year: undefined,
    FileId: selectedFile,
  });

  // For file-based queries, we still need the special filter fields (Source, Category, Sub Category, Year)
  // to support the filter controls functionality
  const loadAvailableFields = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[useDashboardData] Not authenticated, skipping field load');
      return;
    }
    
    console.log('[useDashboardData] Loading special filter fields from API...');
    setFieldsLoading(true);
    
    try {
      // Load only the special filter fields that are needed for the cascading filters and filter controls
      const response = await api.get<{ success: boolean; fields: FieldDefinition[] }>('/api/fields');
      
      if (response?.success && Array.isArray(response.fields)) {
        console.log(`[useDashboardData] Received ${response.fields.length} fields from API`);
        
        // Filter to only include the special filter fields (Source, Category, Sub Category, Year) 
        // and a few other common fields that might be used in filtering
        const specialFieldNames = ['Source', 'Category', 'Sub Category', 'Year', 'Date', 'Timestamp', 'ID'];
        
        const uniqueFieldNames = new Set<string>();
        const fieldDefs: FieldDefinition[] = [];

        response.fields.forEach(field => {
          if (!uniqueFieldNames.has(field.name) && specialFieldNames.some(special => 
            field.name.toLowerCase().includes(special.toLowerCase()) || 
            special.toLowerCase().includes(field.name.toLowerCase())
          )) {
            uniqueFieldNames.add(field.name);
            const fieldDef: FieldDefinition = {
              name: field.name,
              type: field.type || 'string', // Use field.type, default to string
              label: field.label || field.name
            };
            console.log(`[useDashboardData] Processed special filter field:`, fieldDef);
            fieldDefs.push(fieldDef);
          }
        });
        
        // Also add the exact special filter fields if they weren't already included
        const existingFieldNames = new Set(fieldDefs.map(f => f.name));
        for (const specialFieldName of ['Source', 'Category', 'Sub Category', 'Year']) {
          if (!existingFieldNames.has(specialFieldName)) {
            fieldDefs.push({
              name: specialFieldName,
              type: specialFieldName === 'Year' ? 'number' : 'string',
              label: specialFieldName
            });
            existingFieldNames.add(specialFieldName);
          }
        }
        
        console.log('[useDashboardData] Setting field definitions for special filters:', fieldDefs);
        setFieldDefinitions(fieldDefs);
        
        // Initialize with no file selected by default
        if (isInitialLoad) {
          console.log('[useDashboardData] Initializing with no file selected by default');
          setSelectedFile('');
          setIsInitialLoad(false);
        }
      } else {
        // If the API doesn't return special fields properly, set defaults
        const defaultFields: FieldDefinition[] = [
          { name: 'Source', type: 'string', label: 'Source' },
          { name: 'Category', type: 'string', label: 'Category' },
          { name: 'Sub Category', type: 'string', label: 'Sub Category' },
          { name: 'Year', type: 'number', label: 'Year' }
        ];
        setFieldDefinitions(defaultFields);
        
        if (isInitialLoad) {
          setSelectedFile('');
          setIsInitialLoad(false);
        }
      }
    } catch (err) {
      console.error('Failed to load fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fields');
      
      // Set default special filter fields as fallback
      const defaultFields: FieldDefinition[] = [
        { name: 'Source', type: 'string', label: 'Source' },
        { name: 'Category', type: 'string', label: 'Category' },
        { name: 'Sub Category', type: 'string', label: 'Sub Category' },
        { name: 'Year', type: 'number', label: 'Year' }
      ];
      setFieldDefinitions(defaultFields);
      
      if (isInitialLoad) {
        setSelectedFile('');
        setIsInitialLoad(false);
      }
    } finally {
      setFieldsLoading(false);
    }
  }, [isAuthenticated, isInitialLoad]);

  // Define executeQuery for file-based queries
  const executeQuery = useCallback(async (query: { 
    fields: string[]; 
    filters: FilterCondition[]; 
    specialFilters?: SpecialFilters;
    limit: number; 
    offset: number; 
  }) => {
    if (!isAuthenticated) return;
    
    console.log('[useDashboardData] Executing file-based query with selectedFile:', selectedFile);
    
    if (!selectedFile) {
      console.log('[useDashboardData] No file selected, skipping query');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Update current filters and special filters to the ones used in this query
    setCurrentFilters(query.filters);
    if (query.specialFilters) {
      setSpecialFilters(query.specialFilters);
    }
    
    try {
      // Build query parameters for file-based query
      const queryParams = new URLSearchParams();
      
      // Add the file ID and special filters to query parameters
      if (selectedFile) {
        queryParams.append('fileId', selectedFile);
      }
      
      if (query.specialFilters?.Source) {
        queryParams.append('Source', query.specialFilters.Source);
      }
      
      if (query.specialFilters?.Category) {
        queryParams.append('Category', query.specialFilters.Category);
      }
      
      if (query.specialFilters?.['Sub Category']) {
        queryParams.append('Sub Category', query.specialFilters['Sub Category']);
      }
      
      if (query.specialFilters?.Year && Array.isArray(query.specialFilters.Year) && query.specialFilters.Year.length > 0) {
        queryParams.append('Year', query.specialFilters.Year.join(','));
      }
      
      // Add filters to query parameters
      if (query.filters && query.filters.length > 0) {
        queryParams.append('filters', JSON.stringify(query.filters));
      }
      
      // Add pagination
      queryParams.append('limit', query.limit.toString());
      queryParams.append('offset', query.offset.toString());
      
      console.log('[useDashboardData] File query parameters:', queryParams.toString());
      
      // Use the new file-based endpoint
      const url = `/api/query/file?${queryParams.toString()}`;
      
      // The API might return either a direct array or an object with data and pagination
      const response = await api.get<Record<string, unknown>[] | { data: Record<string, unknown>[]; pagination: any }>(url);

      let responseData: Record<string, unknown>[];
      let responsePagination: any;

      // Check if response has data and pagination properties (for paginated responses)
      if (response && typeof response === 'object' && 'data' in response && 'pagination' in response) {
        responseData = response.data as Record<string, unknown>[];
        responsePagination = response.pagination;
        console.log('[useDashboardData] File query response received (paginated):', responseData.length);
      } else {
        // Otherwise, response is a direct array
        responseData = response as Record<string, unknown>[];
        responsePagination = null;
        console.log('[useDashboardData] File query response received (direct):', responseData.length);
      }

      if (Array.isArray(responseData)) {
        // Extract field names from the first item if response is not empty
        const fields = responseData.length > 0
          ? Object.keys(responseData[0])
          : [];

        const pageSize = query.limit;
        const page = Math.floor(query.offset / pageSize) + 1;
        const total = responseData.length; // Note: this is the total count from the response
        const totalPages = Math.ceil(total / pageSize);

        setQueryResult(prev => ({
          ...prev,
          items: responseData,
          fields,
          total,
          page,
          pageSize,
          hasMore: false, // For now, assume no more if using file-based query
          totalPages
        }));
      } else {
        console.error('[useDashboardData] Unexpected response format:', response);
        throw new Error('Unexpected response format from file query API');
      }
    } catch (err) {
      console.error('Failed to execute file-based query:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute file-based query');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedFile]);

  // Handle manual query execution (using a ref to avoid stale closures)
  const executeQueryRef = useRef<typeof executeQuery>();
  useEffect(() => {
    executeQueryRef.current = executeQuery;
  }, [executeQuery]);

  const handleExecuteQuery = useCallback((query: { 
    fields: string[]; 
    filters: FilterCondition[]; 
    specialFilters?: SpecialFilters;
    limit: number; 
    offset: number; 
  }) => {
    if (executeQueryRef.current) {
      return executeQueryRef.current(query);
    }
    return Promise.resolve();
  }, []);

  // Handle file changes from QueryBuilder - changed from handleFieldsChange to handleFileChange
  const handleFileChange = useCallback((fileId: string) => {
    console.log('[useDashboardData] File changed:', fileId);
    
    setSelectedFile(prevFile => {
      if (prevFile === fileId) {
        console.log('[useDashboardData] File unchanged, skipping update');
        return prevFile;
      }
      return fileId;
    });
    
    // Reset pagination and clear results when file changes
    setQueryResult(prev => {
      console.log('[useDashboardData] Resetting query result state due to file change');
      return {
        ...prev,
        page: 1,
        items: [],
        hasMore: false,
        continuationToken: undefined,
        total: 0,
        totalPages: 0
      };
    });
  }, []);

  // Handle sorting
  const handleSort = useCallback((field: string) => {
    setSortField((currentField: string) => {
      const newDirection = currentField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      
      setSortDirection(newDirection);
      
      setQueryResult(prev => ({
        ...prev,
        page: 1,
        continuationToken: undefined,
        items: []
      }));
      
      // Note: We are not passing filters here, as sorting should re-fetch without filters.
      // The executeQuery function will use the current selectedFile and filters from its closure.
      executeQuery({
        fields: [], // Not used in file-based queries
        filters: [],
        specialFilters: { Source: '', Category: '', 'Sub Category': '', Year: undefined, FileId: selectedFile } as SpecialFilters,
        limit: queryResult.pageSize,
        offset: (queryResult.page - 1) * queryResult.pageSize
      });
      
      return field;
    });
  }, [sortDirection, executeQuery, queryResult, selectedFile]);

  // Load available fields when authenticated
  useEffect(() => {
    if (isAuthenticated && fieldDefinitions.length === 0) {
      console.log('[useDashboardData] Loading available fields...');
      loadAvailableFields();
    }
  }, [isAuthenticated, loadAvailableFields, fieldDefinitions.length]);

  return {
    queryResult,
    loading,
    error,
    fieldDefinitions,
    selectedFile, // Changed from selectedFields to selectedFile
    fieldsLoading,
    sortField,
    sortDirection,
    currentFilters, // Add currentFilters to the return value
    specialFilters, // Add specialFilters to the return value
    setQueryResult,
    setSelectedFile, // Changed from setSelectedFields to setSelectedFile
    setSpecialFilters,
    handleExecuteQuery,
    handleFileChange, // Changed from handleFieldsChange to handleFileChange
    handleSort,
  };
};
