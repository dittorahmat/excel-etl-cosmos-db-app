import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../auth/useAuth';
import { api } from '../utils/api';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { QueryBuilder } from '../components/QueryBuilder';
import { DataChart } from '../components/DataChart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { FileListTable } from '../components/FileListTable';

// Type definitions for the component props and API responses
interface QueryResponseData {
  items: Record<string, unknown>[];
  fields: string[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('query');
  
  // State for field definitions and selections
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // State for sorting
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // State for search
  const [searchQuery] = useState('');
  
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
    if (!isAuthenticated) return;
    
    setFieldsLoading(true);
    try {
      const response = await api.get<{ fields: string[] }>('/api/fields');
      if (response && response.fields) {
        // Transform string array into FieldDefinition objects
        const fieldDefinitions = response.fields.map(fieldName => ({
          name: fieldName,
          type: 'string' as const, // Default to string type
          label: fieldName
            .split(/(?=[A-Z])/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        }));
        
        setFieldDefinitions(fieldDefinitions);
        
        // Only set default selected fields on initial load
        if (isInitialLoad) {
          setSelectedFields(fieldDefinitions.map(f => f.name));
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

  // Handle field selection changes
  const handleFieldsChange = useCallback((fields: string[]) => {
    console.log('[DashboardPage] Fields changed:', fields);
    setSelectedFields(fields);
    // Update URL or local storage if you want to persist the selection
    // For now, we'll just log it and let the user click "Run Query"
  }, []);

  // Handle query execution
  const executeQuery = useCallback(async (filter: Record<string, unknown> = {}) => {
    if (!isAuthenticated) return;
    
    console.log('[DashboardPage] Executing query with filter:', filter);
    console.log('[DashboardPage] Selected fields:', selectedFields);
    
    setLoading(true);
    setError(null);
    
    try {
      
      // Only include fields that are actually selected and exist in fieldDefinitions
      const fieldsToQuery = selectedFields.length > 0 
        ? selectedFields.filter(Boolean).filter(field => 
            fieldDefinitions.some(f => f.name === field)
          )
        : [];
      
      console.log('[DashboardPage] Fields to query:', fieldsToQuery);
      
      // We'll pass fields in the request body instead of URL params
      const requestBody = {
        fields: fieldsToQuery,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        limit: queryResult.continuationToken ? undefined : queryResult.pageSize,
        offset: queryResult.continuationToken ? undefined : (queryResult.page - 1) * queryResult.pageSize,
        sort: sortField ? `${sortField}:${sortDirection}` : undefined,
        search: searchQuery || undefined,
        continuationToken: queryResult.continuationToken
      };
      
      console.log('[DashboardPage] Request body:', requestBody);
      
      const url = '/api/v2/query/imports';
      console.log('[DashboardPage] Making request to:', url);
      
      const response = await api.post<QueryResponseData>(url, requestBody);
      console.log('[DashboardPage] Received response:', response);
      
      if (response) {
        // Ensure we have valid response data with defaults
        const { 
          items = [], 
          fields = [], 
          total = 0, 
          page = 1, 
          pageSize = 10,
          continuationToken = null,
          hasMore = false
        } = response;
        
        console.log('[DashboardPage] Setting query result:', {
          itemsCount: items.length,
          fields: fields,
          total,
          page,
          pageSize,
          continuationToken,
          hasMore,
          totalPages: Math.ceil(total / pageSize)
        });
        
        setQueryResult(prev => ({
          ...prev,
          items: continuationToken ? [...prev.items, ...items] : items,
          fields: fields.length > 0 ? fields : prev.fields,
          total,
          page: continuationToken ? prev.page : page,
          pageSize,
          continuationToken,
          hasMore,
          totalPages: Math.ceil(total / pageSize)
        }));
      }
    } catch (err) {
      console.error('Failed to execute query:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute query');
      throw err; // Re-throw to allow QueryBuilder to handle the error
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedFields, fieldDefinitions, queryResult.pageSize, queryResult.page, sortField, sortDirection, searchQuery, queryResult.continuationToken]);
  
  // Update the query when selected fields change
  useEffect(() => {
    // Only execute query if we have selected fields and it's not the initial load
    if (!isInitialLoad && selectedFields.length > 0) {
      executeQuery({});
    }
  }, [selectedFields, isInitialLoad, executeQuery]);

  // Handle sort
  const handleSort = useCallback((field: string) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    
    // Reset to first page when changing sort
    setQueryResult(prev => ({
      ...prev,
      page: 1,
      continuationToken: null,
      items: []
    }));
    executeQuery({ sort: `${field}:${newDirection}` });
  }, [sortField, sortDirection, executeQuery]);

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

  // Execute query when dependencies change
  useEffect(() => {
    if (isAuthenticated) {
      executeQuery({});
    }
  }, [isAuthenticated, executeQuery]);

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
                    onExecute={executeQuery}
                    loading={loading}
                    defaultShowFilters={false}
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
                                {typeof item[field] === 'string' && item[field].includes('T')
                                  ? formatDate(item[field])
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
