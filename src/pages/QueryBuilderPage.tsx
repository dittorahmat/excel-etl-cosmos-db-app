import React, { useState, useEffect } from 'react';
import { QueryBuilder } from '../components/QueryBuilder/QueryBuilder';
import { api } from '../utils/api';
import { FieldDefinition, FilterCondition } from '../components/QueryBuilder/types';

const QueryBuilderPage: React.FC = () => {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available fields
  useEffect(() => {
    const fetchFields = async () => {
      setFieldsLoading(true);
      setError(null);
      try {
        const response = await api.get<{ success: boolean; fields: FieldDefinition[], message?: string }>('/api/fields');
        if (response.success && Array.isArray(response.fields)) {
          const fieldDefinitions = response.fields.map(field => ({
            ...field,
            value: field.name,
            label: field.label || field.name
          }));
          setFields(fieldDefinitions);
        } else {
          setError(response.message || 'Failed to load fields');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load fields');
      } finally {
        setFieldsLoading(false);
      }
    };
    fetchFields();
  }, []);

  const handleFileChange = (fileId: string) => {
    setSelectedFile(fileId);
  };

  const handleExecute = async (query: {
    fields: string[];
    filters: FilterCondition[];
    specialFilters?: {
      Source: string;
      Category: string;
      'Sub Category': string;
      Year?: string[] | number[];
      FileId?: string;
    };
    limit: number;
    offset: number
  }) => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      // Add file ID if available
      if (query.specialFilters?.FileId) {
        queryParams.append('fileId', query.specialFilters.FileId);
      }

      // Add special filters
      if (query.specialFilters?.Source) {
        queryParams.append('Source', query.specialFilters.Source);
      }
      if (query.specialFilters?.Category) {
        queryParams.append('Category', query.specialFilters.Category);
      }
      if (query.specialFilters?.['Sub Category']) {
        queryParams.append('Sub Category', query.specialFilters['Sub Category']);
      }
      if (query.specialFilters?.Year && Array.isArray(query.specialFilters.Year) && query.specialFilters.Year.length > 0) {
        queryParams.append('Year', query.specialFilters.Year.join(','));
      }

      // Add filters as JSON string if there are any
      if (query.filters && query.filters.length > 0) {
        queryParams.append('filters', JSON.stringify(query.filters));
      }

      // Add pagination
      queryParams.append('limit', query.limit.toString());
      queryParams.append('offset', query.offset.toString());

      // Use the file-based endpoint to execute the query
      const url = `/api/query/file?${queryParams.toString()}`;
      const result = await api.get<Record<string, unknown>[]>(url);

      console.log('Query results:', result);

      // For now, we'll show the count of records in an alert
      alert(`Query executed successfully! Found ${result.length} records.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query');
      alert(`Error executing query: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Query Builder</h1>
      <QueryBuilder
        fields={fields}
        selectedFile={selectedFile}
        onFileChange={handleFileChange}
        onExecute={handleExecute}
        fieldsLoading={fieldsLoading}
        error={error}
      />
    </div>
  );
};

export default QueryBuilderPage;