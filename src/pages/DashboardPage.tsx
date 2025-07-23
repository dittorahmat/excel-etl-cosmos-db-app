import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../auth/useAuth';
import { api } from '../utils/api';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { QueryBuilder } from '../components/QueryBuilder/QueryBuilder';
import { DataChart } from '../components/DataChart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { FileListTable } from '../components/FileListTable';

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
}

interface DashboardPageProps {
  children?: React.ReactNode;
}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  // Authentication and navigation
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Initialize state
  const [isMounted, setIsMounted] = useState(false);
  
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
  
  // Ref to store the latest executeQuery function
  const executeQueryRef = useRef<typeof executeQuery>();
  const [activeTab, setActiveTab] = useState('query');
  
  // State for field definitions and selections
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Debug: Log fields and selectedFields before rendering QueryBuilder
  useEffect(() => {
    console.log('[DashboardPage] Passing to QueryBuilder - fieldDefinitions:', fieldDefinitions);
    console.log('[DashboardPage] Passing to QueryBuilder - selectedFields:', selectedFields);
    console.log('[DashboardPage] Passing to QueryBuilder - fieldsLoading:', fieldsLoading);
  }, [fieldDefinitions, selectedFields, fieldsLoading]);
  
  // State for sorting
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp');
    } catch (_e) {
      return dateString;
    }
  };
  
  // Load available fields from the server
  const loadAvailableFields = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[loadAvailableFields] Not authenticated, skipping');
      return;
    }
    
    console.log('[loadAvailableFields] Loading fields from API...');
    setFieldsLoading(true);
    
    try {
      const response = await api.get<{ success: boolean; fields: FieldDefinition[] }>('/api/fields');
      console.log('[loadAvailableFields] API response:', response);
      
      if (response?.success && Array.isArray(response.fields)) {
        console.log(`[loadAvailableFields] Received ${response.fields.length} fields from API`);
        
        // Transform string array into FieldDefinition objects
        const fieldDefinitions = response.fields.map(field => {
          const fieldDef: FieldDefinition = {
            name: field.name,
            type: field.type || 'string', // Use field.type, default to string
            label: field.label || field.name
          };
          console.log(`[loadAvailableFields] Processed field:`, fieldDef);
          return fieldDef;
        });
        
        console.log('[loadAvailableFields] Setting field definitions:', fieldDefinitions);
        setFieldDefinitions(fieldDefinitions);
        
        // Only set default selected fields on initial load
        if (isInitialLoad) {
          const defaultFields = fieldDefinitions.length > 0 
            ? fieldDefinitions.slice(0, Math.min(5, fieldDefinitions.length)).map(f => f.name)
            : [];
          
          console.log('[loadAvailableFields] Setting default selected fields:', defaultFields);
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

  // Load fields when component mounts and when authentication state changes
  useEffect(() => {
    if (isAuthenticated && fieldDefinitions.length === 0) {
      loadAvailableFields();
    }
  }, [isAuthenticated, loadAvailableFields, fieldDefinitions.length]);

  // Define executeQuery first
  const executeQuery = useCallback(async (query: { fields: string[]; filters: FilterCondition[]; limit: number; offset: number; }) => {
    if (!isAuthenticated) return;
    
    console.log('[DashboardPage] Executing query with selectedFields:', selectedFields);
    
    // If no field definitions are loaded yet, don't execute the query
    if (fieldDefinitions.length === 0) {
      console.log('[DashboardPage] Field definitions not loaded yet, skipping query');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Only include fields that are actually selected and exist in fieldDefinitions
      const fieldsToQuery = selectedFields.length > 0 
        ? selectedFields.filter(Boolean).filter(field => 
            fieldDefinitions.some(f => f.name === field)
          )
        : [];
      
      // If no fields are selected, use all available fields
      const fields = fieldsToQuery.length > 0 ? fieldsToQuery : fieldDefinitions.map(f => f.name);
      
      // If we still don't have any fields, don't execute the query
      if (fields.length === 0) {
        console.log('[DashboardPage] No valid fields to query');
        setLoading(false);
        return;
      }
      
      console.log('[DashboardPage] Fields to query:', fields);
      
      // Prepare request for the new /api/v2/query/rows endpoint
      const requestBody = {
        fields: [...fields], // Ensure we're working with a new array
        filters: query.filters,
        limit: query.limit,
        offset: query.offset,
      };
      
      console.log('[DashboardPage] Request details:', {
        url: '/api/v2/query/rows',
        method: 'POST',
        body: requestBody,
        fieldsType: Array.isArray(fields) ? 'array' : typeof fields,
        fieldsLength: Array.isArray(fields) ? fields.length : 'not an array',
        fieldsContent: [...fields],
        bodyStringified: JSON.stringify(requestBody),
        bodyType: typeof requestBody,
        bodyKeys: Object.keys(requestBody)
      });
      
      const url = '/api/v2/query/rows';
      
      const response = await api.post<{
        success: boolean;
        items: Record<string, unknown>[];
        total: number;
        hasMore: boolean;
      }>(url, requestBody);
      
      console.log('[DashboardPage] Received response:', response);
      
      if (response && response.success) {
        const { items = [], total = 0, hasMore = false } = response;
        const pageSize = requestBody.limit || 10;
        const page = Math.floor((requestBody.offset || 0) / pageSize) + 1;
        const totalPages = Math.ceil(total / pageSize);
        
        console.log('[DashboardPage] Setting query result:', {
          itemsCount: items.length,
          fields,
          total,
          page,
          pageSize,
          hasMore,
          totalPages
        });
        
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
      throw err; // Re-throw to allow QueryBuilder to handle the error
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedFields, fieldDefinitions]);

  // Update the ref when executeQuery changes
  useEffect(() => {
    executeQueryRef.current = executeQuery;
  }, [executeQuery]);

  // Load available fields when authenticated
  useEffect(() => {
    if (isAuthenticated && fieldDefinitions.length === 0) {
      console.log('[DashboardPage] Loading available fields...');
      loadAvailableFields();
    }
  }, [isAuthenticated, loadAvailableFields, fieldDefinitions.length]);

  // Reset pagination and clear results when selected fields change
  const handleFieldsChange = useCallback((newFields: string[]) => {
    console.log('[DashboardPage] Fields changed:', newFields);
    
    // Only update if the fields have actually changed
    setSelectedFields(prevFields => {
      if (JSON.stringify(prevFields) === JSON.stringify(newFields)) {
        console.log('[DashboardPage] Fields unchanged, skipping update');
        return prevFields;
      }
      return newFields;
    });
    
    // Reset pagination and clear results
    setQueryResult(prev => {
      console.log('[DashboardPage] Resetting query result state');
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

  // Handle manual query execution
  const handleExecuteQuery = useCallback((query: { fields: string[]; filters: FilterCondition[]; limit: number; offset: number; }) => {
    if (executeQueryRef.current) {
      return executeQueryRef.current(query);
    }
    return Promise.resolve();
  }, []);

  // Handle sort
  const handleSort = useCallback((field: string) => {
    // Get current field and direction
    setSortField((currentField: string) => {
      const newDirection = currentField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      
      // Update sort direction state
      setSortDirection(newDirection);
      
      // Reset to first page when changing sort
      setQueryResult(prev => ({
        ...prev,
        page: 1,
        continuationToken: undefined,
        items: []
      }));
      
      // Execute query with new sort
      // Note: We are not passing filters here, as sorting should re-fetch without filters.
      executeQuery({ ...queryResult, fields: selectedFields, filters: [], sort: `${field}:${newDirection}` });
      
      return field;
    });
  }, [sortDirection, executeQuery, queryResult, selectedFields]);

  // Load available fields on component mount
  useEffect(() => {
    if (!isMounted) {
      setIsMounted(true);
      loadAvailableFields();
    }
  }, [isMounted, loadAvailableFields]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (isMounted) {
      loadAvailableFields();
    }
  }, [isAuthenticated, navigate, isMounted, loadAvailableFields]);

  // Removed automatic query execution on authentication change
  // Queries will now only be executed when explicitly triggered by the user

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="grid gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="query">Query Builder</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Files</CardTitle>
              </CardHeader>
              <CardContent>
                <FileListTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="query" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Build Your Query</CardTitle>
              </CardHeader>
              <CardContent>
                {fieldsLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading fields...</span>
                  </div>
                ) : fieldDefinitions.length > 0 ? (
                  <QueryBuilder 
                    fields={fieldDefinitions}
                    selectedFields={selectedFields}
                    onFieldsChange={handleFieldsChange}
                    onExecute={handleExecuteQuery}
                    loading={loading}
                    defaultShowFilters={false}
                    page={queryResult.page}
                    pageSize={queryResult.pageSize}
                  />
                ) : (
                  <div className="text-center p-4 text-muted-foreground">
                    No fields available. Please check your data source.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Query Results</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                  </div>
                )}
                
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : queryResult.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {queryResult.fields.map((field) => (
                            <TableHead key={field}>
                              <div className="flex items-center">
                                <span>{field}</span>
                                <button
                                  onClick={() => handleSort(field)}
                                  className="ml-2 text-gray-400 hover:text-gray-600"
                                >
                                  {sortField === field ? (
                                    sortDirection === 'asc' ? '↑' : '↓'
                                  ) : '↕'}
                                </button>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queryResult.items.map((item, index) => (
                          <TableRow key={index}>
                            {queryResult.fields.map((field) => (
                              <TableCell key={`${index}-${field}`}>
                                {typeof item[field] === 'string' && String(item[field]).includes('T')
                                  ? formatDate(String(item[field]))
                                  : String(item[field] || '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-md bg-blue-50 p-4">
                    <h3 className="text-sm font-medium text-blue-800">No results found</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Try adjusting your search or filter criteria</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts">
            <Card>
              <CardHeader>
                <CardTitle>Charts</CardTitle>
              </CardHeader>
              <CardContent>
                {queryResult.items.length > 0 ? (
                  <DataChart 
                    data={queryResult.items.map(item => {
                      // Ensure all values are string | number | null | undefined
                      const mapped: Record<string, string | number | null | undefined> = {};
                      for (const key in item) {
                        const val = item[key];
                        mapped[key] = (typeof val === 'string' || typeof val === 'number' || val == null) ? val : String(val);
                      }
                      return mapped;
                    })}
                    onExport={(format) => {
                      // Implement export functionality
                      console.log(`Exporting data as ${format}`, queryResult.items);
                    }}
                  />
                ) : (
                  <div className="rounded-md bg-blue-50 p-4">
                    <h3 className="text-sm font-medium text-blue-800">No results found</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Try adjusting your search or filter criteria</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;
