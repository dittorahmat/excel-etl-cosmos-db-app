import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../utils/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, Upload as UploadIcon, Database as DatabaseIcon, BarChart2 as ChartIcon } from 'lucide-react';
import { FileListTable } from '../components/FileListTable';
import { QueryBuilder } from '../components/QueryBuilder';
import DataChart from '../components/DataChart';

interface QueryResponse {
  items: Record<string, unknown>[];
  hasMore: boolean;
  count?: number;
  total?: number;
}

interface QueryResult {
    items: Record<string, unknown>[];
    hasMore: boolean;
}

export const DashboardPage: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>('files');
    const [queryResult, setQueryResult] = useState<QueryResult>({ items: [], hasMore: false });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Handle query changes and execution from QueryBuilder
    const handleQueryChange = useCallback((query: Record<string, unknown>) => {
        // Update any local state if needed when query changes
        console.log('Query changed:', query);
    }, []);

    const handleExecuteQuery = useCallback(async (query: Record<string, unknown>) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post<QueryResponse>('/api/query', query);
            const data = await response.json();
            setQueryResult({
                items: data.items || [],
                hasMore: data.hasMore || false
            });
            setActiveTab('results');
        } catch (err: Error) {
            setError(err.message || 'Failed to execute query');
            console.error('Query error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

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
                    <QueryBuilder 
                        onExecute={handleExecuteQuery}
                        onQueryChange={handleQueryChange}
                        loading={loading}
                    />
                </TabsContent>

                <TabsContent value="results">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            <span>Loading results...</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-md bg-red-50 p-4">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error}</p>
                            </div>
                        </div>
                    ) : queryResult.items.length > 0 ? (
                        <DataChart data={queryResult.items} />
                    ) : (
                        <div className="rounded-md bg-blue-50 p-4">
                            <h3 className="text-sm font-medium text-blue-800">No results</h3>
                            <div className="mt-2 text-sm text-blue-700">
                                <p>Run a query to see results</p>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DashboardPage;
