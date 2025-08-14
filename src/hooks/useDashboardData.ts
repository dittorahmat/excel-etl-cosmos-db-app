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
}

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  value2?: string;
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
  
  // State for field definitions and selections
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // State for sorting
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Load available fields from the server
  const loadAvailableFields = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[useDashboardData] Not authenticated, skipping field load');
      return;
    }
    
    console.log('[useDashboardData] Loading fields from API...');
    setFieldsLoading(true);
    
    try {
      // Simple debugging that should not be stripped out
      console.log('[DEBUG] About to call api.get with endpoint: /api/fields');
      
      const response = await api.get<{ success: boolean; fields: FieldDefinition[] }>('/api/fields');
      
      // Simple debugging that should not be stripped out
      console.log('[DEBUG] api.get response:', response);
      
      if (response?.success && Array.isArray(response.fields)) {
        console.log(`[useDashboardData] Received ${response.fields.length} fields from API`);
        
        const uniqueFieldNames = new Set<string>();
        const fieldDefs: FieldDefinition[] = [];

        response.fields.forEach(field => {
          if (!uniqueFieldNames.has(field.name)) {
            uniqueFieldNames.add(field.name);
            const fieldDef: FieldDefinition = {
              name: field.name,
              type: field.type || 'string', // Use field.type, default to string
              label: field.label || field.name
            };
            console.log(`[useDashboardData] Processed field:`, fieldDef);
            fieldDefs.push(fieldDef);
          }
        });
        
        console.log('[useDashboardData] Setting field definitions:', fieldDefs);
        setFieldDefinitions(fieldDefs);
        
        // Only set default selected fields on initial load
        if (isInitialLoad) {
          const defaultFields = fieldDefs.length > 0 
            ? fieldDefs.slice(0, Math.min(5, fieldDefs.length)).map(f => f.name)
            : [];
          
          console.log('[useDashboardData] Setting default selected fields:', defaultFields);
          setSelectedFields(defaultFields);
          setIsInitialLoad(false);
        }
      }
    } catch (err) {
      console.error('Failed to load fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setFieldsLoading(false);
    }
  }, [isAuthenticated, isInitialLoad]);

  // Define executeQuery
  const executeQuery = useCallback(async (query: { fields: string[]; filters: FilterCondition[]; limit: number; offset: number; }) => {
    if (!isAuthenticated) return;
    
    console.log('[useDashboardData] Executing query with selectedFields:', selectedFields);
    
    if (fieldDefinitions.length === 0) {
      console.log('[useDashboardData] Field definitions not loaded yet, skipping query');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const fieldsToQuery = selectedFields.length > 0 
        ? selectedFields.filter(Boolean).filter(field => 
            fieldDefinitions.some(f => f.name === field)
          )
        : [];
      
      const fields = fieldsToQuery.length > 0 ? fieldsToQuery : fieldDefinitions.map(f => f.name);
      
      if (fields.length === 0) {
        console.log('[useDashboardData] No valid fields to query');
        setLoading(false);
        return;
      }
      
      console.log('[useDashboardData] Fields to query:', fields);
      
      const requestBody = {
        fields: [...fields],
        filters: query.filters,
        limit: query.limit,
        offset: query.offset,
      };
      
      console.log('[useDashboardData] Request details:', {
        url: '/api/v2/query/rows',
        method: 'POST',
        body: requestBody,
      });
      
      const url = '/api/v2/query/rows';
      
      const response = await api.post<{
        success: boolean;
        items: Record<string, unknown>[];
        total: number;
        hasMore: boolean;
      }>(url, requestBody);
      
      console.log('[useDashboardData] Received response:', response);
      
      if (response && response.success) {
        const { items = [], total = 0, hasMore = false } = response;
        const pageSize = requestBody.limit || 10;
        const page = Math.floor((requestBody.offset || 0) / pageSize) + 1;
        const totalPages = Math.ceil(total / pageSize);
        
        setQueryResult(prev => ({
          ...prev,
          items,
          fields,
          total,
          page,
          pageSize,
          hasMore,
          totalPages
        }));
      }
    } catch (err) {
      console.error('Failed to execute query:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute query');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedFields, fieldDefinitions]);

  // Handle manual query execution (using a ref to avoid stale closures)
  const executeQueryRef = useRef<typeof executeQuery>();
  useEffect(() => {
    executeQueryRef.current = executeQuery;
  }, [executeQuery]);

  const handleExecuteQuery = useCallback((query: { fields: string[]; filters: FilterCondition[]; limit: number; offset: number; }) => {
    if (executeQueryRef.current) {
      return executeQueryRef.current(query);
    }
    return Promise.resolve();
  }, []);

  // Handle field changes from QueryBuilder
  const handleFieldsChange = useCallback((newFields: string[]) => {
    console.log('[useDashboardData] Fields changed:', newFields);
    
    setSelectedFields(prevFields => {
      if (JSON.stringify(prevFields) === JSON.stringify(newFields)) {
        console.log('[useDashboardData] Fields unchanged, skipping update');
        return prevFields;
      }
      return newFields;
    });
    
    // Reset pagination and clear results
    setQueryResult(prev => {
      console.log('[useDashboardData] Resetting query result state');
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
      // The executeQuery function will use the current selectedFields and filters from its closure.
      executeQuery({ ...queryResult, fields: selectedFields, filters: [], sort: `${field}:${newDirection}` });
      
      return field;
    });
  }, [sortDirection, executeQuery, queryResult, selectedFields]);

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
    selectedFields,
    fieldsLoading,
    sortField,
    sortDirection,
    setQueryResult,
    setSelectedFields,
    handleExecuteQuery,
    handleFieldsChange,
    handleSort,
  };
};
