import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../utils/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Upload as UploadIcon, Database as DatabaseIcon, BarChart2 as ChartIcon } from 'lucide-react';
import { FileListTable } from '@/components/FileListTable';
import { QueryBuilder } from '@/components/QueryBuilder';
import { DataChart } from '@/components/DataChart';

interface QueryResult {
  items: any[];
  hasMore: boolean;
  requestCharge?: number;
}

export const DashboardPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('files');
  const [queryResult, setQueryResult] = useState<QueryResult>({ items: [], hasMore: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle query execution from QueryBuilder
  const handleExecuteQuery = useCallback(async (query: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/query', query);
      if (!response.ok) {
        throw new Error('Failed to execute query');
      }
      
      const result = await response.json();
      setQueryResult(result);
      setActiveTab('results');
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle data export
  const handleExportData = useCallback(async (format: 'csv' | 'json') => {
    try {
      const response = await api.get(`/api/export?format=${format}`);
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Error exporting data:', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Data Explorer</h1>
        <Button onClick={() => navigate('/upload')}>
          <UploadIcon className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="files">
            <DatabaseIcon className="h-4 w-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger value="query">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="m12 20 7-19-7 4-7-4 7 19Z" />
              <path d="M12 20v-8" />
            </svg>
            Query
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!queryResult.items.length}>
            <ChartIcon className="h-4 w-4 mr-2" />
            Results
          </TabsTrigger>
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
              <CardTitle>Query Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <QueryBuilder 
                onQueryChange={() => {}} 
                onExecute={handleExecuteQuery} 
                loading={loading} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Query Results</CardTitle>
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExportData('csv')}
                  disabled={!queryResult.items.length}
                >
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExportData('json')}
                  disabled={!queryResult.items.length}
                >
                  Export JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-md">
                  {error}
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading results...</span>
                </div>
              ) : queryResult.items.length > 0 ? (
                <DataChart 
                  data={queryResult.items} 
                  loading={loading} 
                  onExport={handleExportData} 
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No results to display. Run a query to see results.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="fixed bottom-4 right-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md shadow-lg">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-4 text-red-700 hover:text-red-900"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
