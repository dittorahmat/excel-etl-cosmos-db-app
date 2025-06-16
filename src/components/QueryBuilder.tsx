import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/utils/api';
import { Loader2, Plus, X } from 'lucide-react';
// Format is not used, so we can remove this import

interface QueryBuilderProps {
  onQueryChange: (query: Record<string, unknown>) => void;
  onExecute: (query: Record<string, unknown>) => void;
  loading?: boolean;
}

export function QueryBuilder({ onQueryChange, onExecute, loading = false }: QueryBuilderProps) {
  type Filter = {
    id: string;
    field: string;
    operator: string;
    value: string;
  };

  type FieldType = {
    name: string;
    type: string;
  };

  const [availableFields, setAvailableFields] = useState<FieldType[]>([]);
  const [filters, setFilters] = useState<Filter[]>([{ 
    id: '1', 
    field: '', 
    operator: '=', 
    value: '' 
  }]);

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

  const buildQuery = (): Record<string, unknown> => {
    const whereClauses = filters
      .filter((f): f is Required<Filter> => 
        Boolean(f.field) && Boolean(f.operator) && f.value !== ''
      )
      .map(f => {
        const fieldType = availableFields.find(af => af.name === f.field)?.type || 'string';
        const value = fieldType === 'number' ? parseFloat(f.value) : f.value;
        
        return {
          [f.field]: {
            [f.operator]: value
          }
        };
      });

    if (whereClauses.length === 0) {
      return {};
    }

    if (whereClauses.length === 1) {
      return whereClauses[0];
    }

    return {
      and: whereClauses
    };
  };

  const addFilter = (): void => {
    setFilters(prevFilters => [
      ...prevFilters, 
      { 
        id: Date.now().toString(), 
        field: '', 
        operator: '=', 
        value: '' 
      }
    ]);
  };

  const removeFilter = (id: string): void => {
    if (filters.length <= 1) return;
    const newFilters = filters.filter(filter => filter.id !== id);
    setFilters(newFilters);
  };

  const updateFilter = (id: string, field: keyof Filter, value: string): void => {
    setFilters(prevFilters => 
      prevFilters.map(filter => 
        filter.id === id 
          ? { ...filter, [field]: value }
          : filter
      )
    );
  };

  const handleExecute = (): void => {
    onExecute(buildQuery());
  };

  const getFieldType = (fieldName: string) => {
    const field = availableFields.find(f => f.name === fieldName);
    return field ? field.type : 'string';
  };

  const getInputType = (fieldType: string): React.HTMLInputTypeAttribute => {
    const typeMap: Record<string, React.HTMLInputTypeAttribute> = {
      'number': 'number',
      'date': 'date',
      'datetime': 'datetime-local',
      'time': 'time',
      'email': 'email',
      'url': 'url',
      'tel': 'tel',
      'password': 'password',
      'search': 'search',
      'color': 'color',
      'range': 'range'
    };
    
    return typeMap[fieldType] || 'text';
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
