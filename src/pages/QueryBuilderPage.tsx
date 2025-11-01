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
      Year: string[] | number[]; 
      FileId?: string;
    }; 
    limit: number; 
    offset: number 
  }) => {
    try {
      // This is where you would actually execute the query
      console.log('Executing query:', query);
      
      // For now, we'll just show an alert
      alert(`Query executed with special filters:\nSource: ${query.specialFilters?.Source || 'All'}\nCategory: ${query.specialFilters?.Category || 'All'}\nSub Category: ${query.specialFilters?.['Sub Category'] || 'All'}\nYear: ${query.specialFilters?.Year?.join(', ') || 'All'}\nFileId: ${query.specialFilters?.FileId || 'None'}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute query');
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