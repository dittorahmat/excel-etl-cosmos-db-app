import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/utils/api';
import { Loader2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';

interface QueryBuilderProps {
  onQueryChange: (query: any) => void;
  onExecute: (query: any) => void;
  loading?: boolean;
}

export function QueryBuilder({ onQueryChange, onExecute, loading = false }: QueryBuilderProps) {
  const [availableFields, setAvailableFields] = useState<Array<{name: string, type: string}>>([]);
  const [filters, setFilters] = useState<Array<{
    id: string;
    field: string;
    operator: string;
    value: string;
  }>>([{ id: '1', field: '', operator: '=', value: '' }]);

  const operators = [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: '>', label: 'greater than' },
    { value: '>=', label: 'greater than or equal' },
    { value: '<', label: 'less than' },
    { value: '<=', label: 'less than or equal' },
    { value: 'contains', label: 'contains' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
  ];

  useEffect(() => {
    // Load available fields from the server
    const loadFields = async () => {
      try {
        const response = await api.get('/api/fields');
        if (response.ok) {
          const data = await response.json();
          setAvailableFields(data.fields || []);
        }
      } catch (error) {
        console.error('Error loading fields:', error);
      }
    };

    loadFields();
  }, []);

  useEffect(() => {
    // Notify parent component about query changes
    onQueryChange(buildQuery());
  }, [filters]);

  const buildQuery = () => {
    const whereClauses = filters
      .filter(f => f.field && f.operator && f.value !== '')
      .map(f => {
        const field = `c.${f.field}`;
        let value: any = f.value;
        
        // Handle different value types
        if (!isNaN(Number(value)) && value !== '') {
          value = Number(value);
        } else if (['true', 'false'].includes(value.toLowerCase())) {
          value = value.toLowerCase() === 'true';
        } else if (Date.parse(value)) {
          value = new Date(value).toISOString();
        } else {
          value = `'${value.replace(/'/g, "''")}'`;
        }

        // Build the condition based on operator
        switch (f.operator) {
          case 'contains':
            return `CONTAINS(${field}, ${typeof value === 'string' ? value : `'${value}'`})`;
          case 'startsWith':
            return `STARTSWITH(${field}, ${typeof value === 'string' ? value : `'${value}'`})`;
          case 'endsWith':
            return `ENDSWITH(${field}, ${typeof value === 'string' ? value : `'${value}'`})`;
          default:
            return `${field} ${f.operator} ${value}`;
        }
      });

    return {
      where: whereClauses.length > 0 ? whereClauses.join(' AND ') : undefined,
      parameters: []
    };
  };

  const addFilter = () => {
    setFilters([...filters, { id: Date.now().toString(), field: '', operator: '=', value: '' }]);
  };

  const removeFilter = (id: string) => {
    if (filters.length > 1) {
      setFilters(filters.filter(f => f.id !== id));
    }
  };

  const updateFilter = (id: string, field: string, value: string) => {
    setFilters(filters.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const handleExecute = () => {
    onExecute(buildQuery());
  };

  const getFieldType = (fieldName: string) => {
    const field = availableFields.find(f => f.name === fieldName);
    return field ? field.type : 'string';
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Query Builder</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addFilter}
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Filter
        </Button>
      </div>
      
      <div className="space-y-3">
        {filters.map((filter) => (
          <div key={filter.id} className="flex items-center space-x-2">
            <Select
              value={filter.field}
              onValueChange={(value) => updateFilter(filter.id, 'field', value)}
              disabled={loading}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.name} ({field.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.operator}
              onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
              disabled={!filter.field || loading}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Operator" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filter.field && (
              <Input
                type={getInputType(getFieldType(filter.field))}
                value={filter.value}
                onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                placeholder="Value"
                disabled={loading}
                className="flex-1"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFilter(filter.id)}
              disabled={filters.length <= 1 || loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleExecute}
          disabled={!filters.some(f => f.field && f.operator && f.value !== '') || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            'Execute Query'
          )}
        </Button>
      </div>
    </div>
  );
}

function getInputType(fieldType: string): string {
  switch (fieldType.toLowerCase()) {
    case 'number':
      return 'number';
    case 'date':
    case 'datetime':
      return 'date';
    case 'boolean':
      return 'checkbox';
    default:
      return 'text';
  }
}
