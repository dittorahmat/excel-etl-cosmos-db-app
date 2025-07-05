import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../utils/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Upload as UploadIcon, Database as DatabaseIcon, BarChart2 as ChartIcon, ListChecks } from 'lucide-react';
import { FileListTable } from '../components/FileListTable';
import { QueryBuilder } from '../components/QueryBuilder';
import { DataChart } from '../components/DataChart';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface QueryResponse {
  items: Record<string, unknown>[];
  hasMore: boolean;
  count: number;
  total: number;
  fields?: string[];
}

interface QueryResult {
  items: Record<string, unknown>[];
  hasMore: boolean;
  count: number;
  total: number;
  fields?: string[];
  currentPage: number;
  pageSize: number;
}

interface QueryParams {
  filter?: Record<string, unknown>;
  fields?: string[];
  limit?: number;
  offset?: number;
  sort?: string;
  q?: string;
}

export const DashboardPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>('files');
    const [queryResult, setQueryResult] = useState<QueryResult>({ 
      items: [], 
      hasMore: false, 
      count: 0, 
      total: 0, 
      currentPage: 1, 
      pageSize: 20 
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | Error | null>(null);
    const [fields, setFields] = useState<string[]>([]);
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortField, _setSortField] = useState<string>('');
    const [sortDirection, _setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Load available fields from the server
    const loadAvailableFields = useCallback(async () => {
      console.log('[DashboardPage] Starting to load available fields');
      setLoading(true);
      
      try {
        console.log('[DashboardPage] Making API request to /api/fields');
        const response = await fetch('http://localhost:3001/api/fields', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        console.log('[DashboardPage] Fields API response status:', response.status);
        
        if (!response.ok) {
          console.error('[DashboardPage] Error response from fields API:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('[DashboardPage] Error response body:', errorText);
          throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('[DashboardPage] Fields API response data:', data);
        
        if (data.success && Array.isArray(data.fields)) {
          console.log(`[DashboardPage] Setting ${data.fields.length} fields`);
          setFields(data.fields);
          setSelectedFields(data.fields);
          return data.fields;
        } else {
          console.error('[DashboardPage] Invalid fields data format:', data);
          setFields([]);
          setSelectedFields([]);
          return [];
        }
      } catch (error) {
        console.error('[DashboardPage] Error loading fields:', error);
        setError(error instanceof Error ? error : new Error('Failed to load fields'));
        setFields([]);
        setSelectedFields([]);
        return [];
      } finally {
        setLoading(false);
      }
    }, []);

    // Load available fields when component mounts
    useEffect(() => {
      console.log('[DashboardPage] Auth state changed, isAuthenticated:', isAuthenticated);
      if (isAuthenticated) {
        console.log('[DashboardPage] Loading available fields...');
        loadAvailableFields().then((loadedFields) => {
          console.log('[DashboardPage] Available fields loaded:', loadedFields);
        }).catch(error => {
          console.error('[DashboardPage] Error in loadAvailableFields:', error);
          setError(error instanceof Error ? error : new Error('Failed to load fields'));
        });
      }
    }, [isAuthenticated, loadAvailableFields]);

    // Handle query execution with pagination and filtering
    const executeQuery = useCallback(async (params: QueryParams = {}) => {
      setLoading(true);
      setError(null);
      
      try {
        // Merge default params with provided params
        const queryParams: QueryParams = {
          limit: queryResult.pageSize,
          offset: ((queryResult.currentPage - 1) * queryResult.pageSize) || 0,
          fields: selectedFields.length > 0 ? selectedFields : undefined,
          sort: sortField ? `${sortDirection === 'desc' ? '-' : ''}${sortField}` : undefined,
          q: searchQuery || undefined,
          ...params
        };

        // Serialize queryParams into the URL
        const url = '/api/v2/query' + (Object.keys(queryParams).length > 0
          ? '?' + new URLSearchParams(Object.entries(queryParams).reduce((acc, [key, value]) => {
              if (value === undefined) return acc;
              if (Array.isArray(value)) {
                acc[key] = value.join(',');
              } else {
                acc[key] = String(value);
              }
              return acc;
            }, {} as Record<string, string>)).toString()
          : '');
        const response = await api.get(url);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        
        const data: QueryResponse = await response.json();
        
        setQueryResult(current => ({
          items: data.items || [],
          hasMore: data.hasMore || false,
          count: data.count || 0,
          total: data.total || 0,
          fields: data.fields || [],
          currentPage: params.offset !== undefined 
            ? Math.floor((params.offset || 0) / (params.limit || queryResult.pageSize)) + 1 
            : current.currentPage,
          pageSize: params.limit || current.pageSize
        }));
        
        // Update available fields if we got new ones
        if (data.fields && data.fields.length > 0) {
          setFields(prev => {
            const newFields = [...prev];
            data.fields?.forEach(field => {
              if (!newFields.includes(field)) {
                newFields.push(field);
              }
            });
            return newFields;
          });
        }
        
        setActiveTab('results');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to execute query';
        setError(errorMessage);
        console.error('Query error:', error);
      } finally {
        setLoading(false);
      }
    }, [queryResult.pageSize, queryResult.currentPage, selectedFields, sortField, sortDirection, searchQuery]);

    // Handle query changes from QueryBuilder
    const handleQueryChange = useCallback((query: Record<string, unknown>) => {
      // Update query with builder filters
      executeQuery({ filter: query });
    }, [executeQuery]);

    // Handle query execution
    const handleExecuteQuery = useCallback((query: Record<string, unknown> = {}) => {
      executeQuery({ filter: query });
    }, [executeQuery]);

    // Handle page change
    const handlePageChange = useCallback((page: number) => {
      executeQuery({ 
        offset: (page - 1) * queryResult.pageSize 
      });
    }, [executeQuery, queryResult.pageSize]);

    // Handle page size change
    const handlePageSizeChange = useCallback((size: number) => {
      executeQuery({ 
        limit: size,
        offset: 0 // Reset to first page
      });
    }, [executeQuery]);

    // Handle field selection change
    const handleFieldToggle = useCallback((field: string) => {
      setSelectedFields(prev => 
        prev.includes(field)
          ? prev.filter(f => f !== field)
          : [...prev, field]
      );
    }, []);

    // Sort is handled directly in the DataTable component

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    if (!isAuthenticated) {
        return null; // Or a loading spinner
    }

    return (
        <div className="container mx-auto p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="files">
                        <DatabaseIcon className="mr-2 h-4 w-4" />
                        Files
                    </TabsTrigger>
                    <TabsTrigger value="query">
                        <ChartIcon className="mr-2 h-4 w-4" />
                        Query Builder
                    </TabsTrigger>
                    {activeTab === 'results' && (
                        <TabsTrigger value="results">
                            <ChartIcon className="mr-2 h-4 w-4" />
                            Results
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="files">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Your Files</CardTitle>
                                <Button onClick={() => navigate('/upload')}>
                                    <UploadIcon className="mr-2 h-4 w-4" />
                                    Upload File
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <FileListTable />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="query">
                    <div className="p-4 border rounded-lg bg-blue-50 mb-4">
                      <div className="text-sm text-blue-700">
                        <div>Fields count: {fields.length}</div>
                        <div>Loading: {loading ? 'yes' : 'no'}</div>
                        <div>First 3 fields: {fields.slice(0, 3).join(', ')}</div>
                      </div>
                    </div>
                    <QueryBuilder 
                        onExecute={handleExecuteQuery}
                        onQueryChange={handleQueryChange}
                        loading={false}  // Always set to false since we handle loading state internally
                        fields={fields.map(field => ({
                          name: field,
                          type: 'string' as const // Explicitly type as const
                        }))}
                    />
                </TabsContent>

                <TabsContent value="results">
                  <Card>
                    <CardHeader className="flex flex-col space-y-4">
                      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                        {/* Search input */}
                        <div className="flex-1">
                          <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleExecuteQuery();
                              }
                            }}
                          />
                        </div>
                        
                        {/* Fields selector */}
                        <Select 
                          value=""
                          onValueChange={(value) => handleFieldToggle(value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select fields" />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map((field) => (
                              <SelectItem 
                                key={field} 
                                value={field}
                                className={selectedFields.includes(field) ? 'bg-accent' : ''}
                              >
                                <div className="flex items-center space-x-2">
                                  {selectedFields.includes(field) && (
                                    <ListChecks className="h-4 w-4" />
                                  )}
                                  <span>{field}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Page size selector */}
                        <Select
                          value={queryResult.pageSize.toString()}
                          onValueChange={(value) => handlePageSizeChange(Number(value))}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50, 100].map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size} per page
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Selected fields */}
                      {selectedFields.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedFields.map((field) => (
                            <div 
                              key={field}
                              className="flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md"
                            >
                              {field}
                              <button 
                                onClick={() => handleFieldToggle(field)}
                                className="ml-1 text-blue-600 hover:text-blue-900"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardHeader>
                    
                    <CardContent>
                      {loading ? (
                        <div className="flex items-center justify-center p-8">
                          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                          <span>Loading results...</span>
                        </div>
                      ) : error ? (
                        <div className="rounded-md bg-red-50 p-4">
                          <h3 className="text-sm font-medium text-red-800">Error</h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>{error && typeof error === 'object' && 'message' in error ? error.message : String(error)}</p>
                          </div>
                        </div>
                      ) : queryResult.items.length > 0 ? (
                        <>
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
                          
                          {/* Pagination */}
                          <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Showing <span className="font-medium">
                                {((queryResult.currentPage - 1) * queryResult.pageSize) + 1}
                              </span> to{' '}
                              <span className="font-medium">
                                {Math.min(queryResult.currentPage * queryResult.pageSize, queryResult.total)}
                              </span>{' '}
                              of <span className="font-medium">{queryResult.total}</span> results
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(queryResult.currentPage - 1)}
                                disabled={queryResult.currentPage === 1 || loading}
                              >
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(queryResult.currentPage + 1)}
                                disabled={!queryResult.hasMore || loading}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        </>
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
    );
};

export default DashboardPage;
