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
      const response = await api.get<{ fields: FieldDefinition[] }>('/api/fields');
      if (response && response.fields) {
        setFieldDefinitions(response.fields);
        // Select all fields by default
        setSelectedFields(response.fields.map(f => f.name));
      }
    } catch (err) {
      console.error('Failed to load fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setFieldsLoading(false);
    }
  }, [isAuthenticated]);

  // Handle query execution
  const executeQuery = useCallback(async (filter: Record<string, unknown> = {}) => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      // Only add fields if we have selected fields
      if (selectedFields.length > 0) {
        selectedFields.forEach(field => {
          if (field) {  // Ensure field is not undefined
            params.append('fields', field);
          }
        });
      } else if (fieldDefinitions.length > 0) {
        // If no fields selected but we have field definitions, use them all
        fieldDefinitions.forEach(field => {
          if (field?.name) {
            params.append('fields', field.name);
          }
        });
      }
      
      params.append('limit', queryResult.pageSize.toString());
      params.append('offset', ((queryResult.page - 1) * queryResult.pageSize).toString());
      
      if (sortField) {
        params.append('sort', `${sortField}:${sortDirection}`);
      }
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      // Add any additional filters
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      
      const response = await api.get<QueryResponseData>(`/api/v2/query?${params.toString()}`);
      
      if (response) {
        // Ensure we have valid response data with defaults
        const { 
          items = [], 
          fields = [], 
          total = 0, 
          page = 1, 
          pageSize = 10 
        } = response || {};
        setQueryResult(prev => ({
          ...prev,
          items,
          fields,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        }));
      }
    } catch (err) {
      console.error('Failed to execute query:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedFields, fieldDefinitions, queryResult.pageSize, queryResult.page, sortField, sortDirection, searchQuery]);

  // Handle sort
  const handleSort = useCallback((field: string) => {
    const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(direction);
    executeQuery({ sort: `${field}:${direction}` });
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
            <TabsTrigger value="query">Query Builder</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

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
                    onExecute={executeQuery}
                    loading={loading}
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
