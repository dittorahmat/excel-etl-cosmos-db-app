import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '../ui/button';
import { FieldSelector } from '../QueryBuilder/FieldSelector';
import { FilterControls } from '../QueryBuilder/FilterControls';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from '../ui/use-toast';
import { api } from '../../utils/api';

interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  label?: string;
  description?: string;
}

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  value2?: string;
}

interface ApiQueryBuilderProps {
  baseUrl: string;
}

export const ApiQueryBuilder: React.FC<ApiQueryBuilderProps> = ({ baseUrl }) => {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available fields
  useEffect(() => {
    const fetchFields = async () => {
      setFieldsLoading(true);
      setError(null);
      try {
        const response = await api.get<{ success: boolean; fields: string[] }>('/api/fields');
        if (response.success && Array.isArray(response.fields)) {
          const fieldDefinitions = response.fields.map(fieldName => ({
            name: fieldName,
            type: 'string', // Default to string type
            label: fieldName
              .split(/(?=[A-Z])/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
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

  const handleFieldsChange = useCallback((newFields: string[]) => {
    setSelectedFields(newFields);
  }, []);

  const handleFiltersChange = useCallback((newFilters: FilterCondition[]) => {
    setFilters(newFilters);
  }, []);

  const handleAddFilter = useCallback(() => {
    setFilters((prevFilters) => [
      ...prevFilters,
      { id: `filter-${Date.now()}`, field: '', operator: '', value: '' },
    ]);
  }, []);

  const handleRemoveFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((filter) => filter.id !== id));
  }, []);

  const generateApiUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (selectedFields.length > 0) {
      params.append('fields', selectedFields.join(','));
    }

    if (filters.length > 0) {
      const validFilters = filters.filter(f => f.field && f.operator && f.value);
      if (validFilters.length > 0) {
        params.append('filters', JSON.stringify(validFilters));
      }
    }

    // Add pagination defaults or allow user to specify
    params.append('limit', '10');
    params.append('offset', '0');

    const queryString = params.toString();
    setGeneratedUrl(`${baseUrl}?${queryString}`);
  }, [selectedFields, filters, baseUrl]);

  useEffect(() => {
    generateApiUrl();
  }, [selectedFields, filters, generateApiUrl]);

  const handleCopyUrl = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      toast({
        title: "Copied!",
        description: "API URL copied to clipboard.",
      });
    }
  };

  if (fieldsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading fields...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Fields for API Response</Label>
        <FieldSelector
          fields={fields}
          selectedFields={selectedFields}
          onFieldsChange={handleFieldsChange}
        />
      </div>

      <div className="space-y-2">
        <Label>Filter API Results</Label>
        <FilterControls
          fields={fields}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onAddFilter={handleAddFilter}
          onRemoveFilter={handleRemoveFilter}
        />
      </div>

      <Button onClick={generateApiUrl} className="w-full">
        Generate API URL
      </Button>

      {generatedUrl && (
        <div className="space-y-2 mt-4">
          <Label htmlFor="apiUrl">Generated API URL</Label>
          <div className="flex items-center space-x-2">
            <Input id="apiUrl" value={generatedUrl} readOnly className="flex-1" />
            <Button onClick={handleCopyUrl} size="icon" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Use this URL with your API key in the `x-api-key` header.
          </p>
          <p className="text-sm text-muted-foreground">
            Example (Python requests):
          </p>
          <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm overflow-x-auto">
            <code className="language-python">
              import requests

              url = "{generatedUrl}"
              headers = {{'x-api-key': 'YOUR_API_KEY'}}

              response = requests.get(url, headers=headers)
              print(response.json())
            </code>
          </pre>
        </div>
      )}
    </div>
  );
};
