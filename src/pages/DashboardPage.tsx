import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { QueryBuilder } from '../components/QueryBuilder/QueryBuilder';
import { Button } from '../components/ui/button';
import { ApiGenerationModal } from '../components/ApiGeneration';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatDateAlt as formatDate } from '../utils/formatters';

// Import libraries for export functionality
import * as XLSX from 'xlsx';

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
    selectedFile, // Changed from selectedFields to selectedFile
    fieldsLoading,
    sortField,
    sortDirection,
    currentFilters, // Get current filters from the hook
    specialFilters, // Get special filters from the hook
    handleExecuteQuery,
    handleFileChange, // Changed from handleFieldsChange to handleFileChange
    handleSort,
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState('query');
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // Export to CSV function
  const exportToCSV = (data: any[], fields: string[]) => {
    // Create header row
    const headers = fields.join(',');

    // Create data rows
    const rows = data.map(item => {
      return fields.map(field => {
        const value = item[field];
        // Handle special formatting for dates
        const formattedValue = typeof value === 'string' && value.includes('T')
          ? formatDate(value)
          : String(value || '');

        // Escape quotes and wrap in quotes if needed
        if (typeof formattedValue === 'string' && (formattedValue.includes(',') || formattedValue.includes('"') || formattedValue.includes('\n'))) {
          return `"${formattedValue.replace(/"/g, '""')}"`;
        }
        return formattedValue;
      }).join(',');
    });

    // Combine headers and rows
    const csvContent = [headers, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query-results-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel function
  const exportToExcel = (data: any[], fields: string[]) => {
    // Format data for Excel
    const formattedData = data.map(item => {
      const formattedItem: Record<string, any> = {};
      fields.forEach(field => {
        const value = item[field];
        formattedItem[field] = typeof value === 'string' && value.includes('T')
          ? formatDate(value)
          : value;
      });
      return formattedItem;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(formattedData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Query Results');

    // Export to file
    XLSX.writeFile(workbook, `query-results-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (!isAuthenticated) {
    navigate('/login');
    return null; // Will redirect to login
  }

  return (
    <div className="container mx-auto p-4">


      <div className="grid gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="query"></TabsTrigger>
          </TabsList>

          <TabsContent value="query" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Search Database</CardTitle>
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
                    selectedFile={selectedFile} // Changed prop name
                    onFileChange={handleFileChange} // Changed prop name
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
                  <>
                    {/* Export and API Buttons */}
                    <div className="flex justify-end mb-4 space-x-2">
                      <ApiGenerationModal
                        selectedFields={queryResult.fields || []} // Use the fields from the query result
                        filters={currentFilters || []} // Using current filters from the hook
                        specialFilters={specialFilters} // Pass special filters
                        baseUrl="/api/query/file-get" // Changed to use file-based API
                        isOpen={isApiModalOpen}
                        onOpenChange={setIsApiModalOpen}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center"
                          >
                            Create API
                          </Button>
                        }
                      />
                      <Button
                        onClick={() => exportToCSV(queryResult.items, queryResult.fields)}
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                      <Button
                        onClick={() => exportToExcel(queryResult.items, queryResult.fields)}
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export Excel
                      </Button>
                    </div>

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
                            <TableRow key={item.id && typeof item.id === 'string' ? item.id : index}>
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
    </div>
  );
};

export default DashboardPage;
