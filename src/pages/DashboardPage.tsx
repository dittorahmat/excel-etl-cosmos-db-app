import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent } from '../components/ui/tabs';
import { QueryBuilder } from '../components/QueryBuilder/QueryBuilder';
import { Button } from '../components/ui/button';
import { ApiGenerationModal } from '../components/ApiGeneration';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useDashboardData } from '../hooks/useDashboardData';
import { formatDateAlt as formatDate, isValidDateString } from '../utils/formatters';
import { api } from '../utils/api';

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
    error: queryError,
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
  
  // Local state for export errors
  const [exportError, setExportError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('query');
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // Export to CSV function with fresh API call
  const exportToCSV = async () => {
    try {
      // Build query parameters for export - get all records without pagination
      const queryParams = new URLSearchParams();
      
      // Add the file ID and special filters to query parameters
      if (selectedFile) {
        queryParams.append('fileId', selectedFile);
      }
      
      if (specialFilters?.Source) {
        queryParams.append('Source', specialFilters.Source);
      }
      
      if (specialFilters?.Category) {
        queryParams.append('Category', specialFilters.Category);
      }
      
      if (specialFilters?.['Sub Category']) {
        queryParams.append('Sub Category', specialFilters['Sub Category']);
      }
      
      if (specialFilters?.Year && Array.isArray(specialFilters.Year) && specialFilters.Year.length > 0) {
        queryParams.append('Year', specialFilters.Year.join(','));
      }

      // Add current filters to query parameters
      if (currentFilters && currentFilters.length > 0) {
        queryParams.append('filters', JSON.stringify(currentFilters));
      }

      // Use the file-based endpoint to get all data for export
      const url = `/api/query/file?${queryParams.toString()}`;

      // The API might return either a direct array or an object with data and pagination
      const response = await api.get<Record<string, unknown>[] | { data: Record<string, unknown>[]; pagination: any }>(url);

      // Check if response has data and pagination properties (for paginated responses)
      let allData: Record<string, unknown>[];
      if (response && typeof response === 'object' && 'data' in response && 'pagination' in response) {
        allData = response.data as Record<string, unknown>[];
      } else {
        // Otherwise, response is a direct array
        allData = response as Record<string, unknown>[];
      }

      if (!Array.isArray(allData) || allData.length === 0) {
        console.warn('No data received from export API call');
        return;
      }

      // Extract fields from the first record if available
      const fields = allData.length > 0 ? Object.keys(allData[0]) : [];

      // Create header row
      const headers = fields.join(',');

      // Create data rows
      const rows = allData.map(item => {
        return fields.map(field => {
          const value = item[field];
          // Handle special formatting for dates
          const formattedValue = typeof value === 'string' && isValidDateString(value)
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
      const urlBlob = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', urlBlob);
      link.setAttribute('download', `query-results-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Revoke the object URL to free up memory
      URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error('Error during CSV export:', error);
      setExportError('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Export to Excel function with fresh API call
  const exportToExcel = async () => {
    try {
      // Build query parameters for export - get all records without pagination
      const queryParams = new URLSearchParams();
      
      // Add the file ID and special filters to query parameters
      if (selectedFile) {
        queryParams.append('fileId', selectedFile);
      }
      
      if (specialFilters?.Source) {
        queryParams.append('Source', specialFilters.Source);
      }
      
      if (specialFilters?.Category) {
        queryParams.append('Category', specialFilters.Category);
      }
      
      if (specialFilters?.['Sub Category']) {
        queryParams.append('Sub Category', specialFilters['Sub Category']);
      }
      
      if (specialFilters?.Year && Array.isArray(specialFilters.Year) && specialFilters.Year.length > 0) {
        queryParams.append('Year', specialFilters.Year.join(','));
      }

      // Add current filters to query parameters
      if (currentFilters && currentFilters.length > 0) {
        queryParams.append('filters', JSON.stringify(currentFilters));
      }

      // Use the file-based endpoint to get all data for export
      const url = `/api/query/file?${queryParams.toString()}`;

      // The API might return either a direct array or an object with data and pagination
      const response = await api.get<Record<string, unknown>[] | { data: Record<string, unknown>[]; pagination: any }>(url);

      // Check if response has data and pagination properties (for paginated responses)
      let allData: Record<string, unknown>[];
      if (response && typeof response === 'object' && 'data' in response && 'pagination' in response) {
        allData = response.data as Record<string, unknown>[];
      } else {
        // Otherwise, response is a direct array
        allData = response as Record<string, unknown>[];
      }

      if (!Array.isArray(allData) || allData.length === 0) {
        console.warn('No data received from export API call');
        return;
      }

      // Extract fields from the first record if available
      const fields = allData.length > 0 ? Object.keys(allData[0]) : [];

      // Format data for Excel
      const formattedData = allData.map(item => {
        const formattedItem: Record<string, unknown> = {};
        fields.forEach(field => {
          const value = item[field];
          formattedItem[field] = typeof value === 'string' && isValidDateString(value)
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
    } catch (error) {
      console.error('Error during Excel export:', error);
      setExportError('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (!isAuthenticated) {
    navigate('/login');
    return null; // Will redirect to login
  }

  return (
    <div className="container mx-auto p-4">


      <div className="grid gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>

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
                {(queryError || exportError) && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{queryError || exportError}</span>
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
                        onClick={exportToCSV}
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                      <Button
                        onClick={exportToExcel}
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
                                  {typeof item[field] === 'string' && isValidDateString(String(item[field]))
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
