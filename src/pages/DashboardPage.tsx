import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../auth/useAuth';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { QueryBuilder } from '../components/QueryBuilder/QueryBuilder';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { FileListTable } from '../components/FileListTable';
import { useDashboardData } from '../hooks/useDashboardData';

// Type definitions for the component props and API responses

interface DashboardPageProps {
  children?: React.ReactNode;
}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  // Authentication and navigation
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Use the custom hook for dashboard data and logic
  const {
    queryResult,
    loading,
    error,
    fieldDefinitions,
    selectedFields,
    fieldsLoading,
    sortField,
    sortDirection,
    handleExecuteQuery,
    handleFieldsChange,
    handleSort,
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState('query');

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp');
    } catch (_e) {
      return dateString;
    }
  };

  if (!isAuthenticated) {
    navigate('/login');
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
                          <TableRow key={item.id || index}>
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

          
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;
