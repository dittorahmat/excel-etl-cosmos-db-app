import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Loader2, Plus, X } from 'lucide-react';

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

interface FieldDefinition {
  name: string;
  type: FieldType;
  path?: string;
  description?: string;
  example?: unknown;
}

interface Operator {
  value: string;
  label: string;
  inputType?: 'text' | 'number' | 'date' | 'select';
  needsSecondValue?: boolean;
}

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  value2?: string;
}

interface QueryBuilderProps {
  fields: FieldDefinition[];
  onQueryChange?: (query: Record<string, unknown>) => void;
  onExecute: (query: Record<string, unknown>) => void;
  loading?: boolean;
}

const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  string: [
    { value: '=', label: 'equals', inputType: 'text' },
    { value: '!=', label: 'not equals', inputType: 'text' },
    { value: 'contains', label: 'contains', inputType: 'text' },
    { value: '!contains', label: 'not contains', inputType: 'text' },
    { value: 'startsWith', label: 'starts with', inputType: 'text' },
    { value: 'empty', label: 'is empty' },
  ],
  number: [
    { value: '=', label: 'equals', inputType: 'number' },
    { value: '!=', label: 'not equals', inputType: 'number' },
    { value: '>', label: 'greater than', inputType: 'number' },
    { value: '>=', label: 'greater or equal', inputType: 'number' },
    { value: '<', label: 'less than', inputType: 'number' },
    { value: '<=', label: 'less or equal', inputType: 'number' },
  ],
  boolean: [
    { value: '=', label: 'is', inputType: 'select' },
  ],
  date: [
    { value: '=', label: 'is', inputType: 'date' },
    { value: '>', label: 'after', inputType: 'date' },
    { value: '<', label: 'before', inputType: 'date' },
  ],
  array: [
    { value: 'includes', label: 'includes', inputType: 'text' },
    { value: '!includes', label: 'excludes', inputType: 'text' },
  ],
  object: [
    { value: 'exists', label: 'exists' },
  ],
};

export function QueryBuilder({
  fields = [],
  onQueryChange = () => {},
  onExecute,
  loading = false,
}: QueryBuilderProps) {
  const [filters, setFilters] = useState<FilterCondition[]>(() => {
    return fields.length > 0 
      ? [{ id: '1', field: fields[0].name, operator: '=', value: '' }] 
      : [];
  });

  // Update filters when fields change
  useEffect(() => {
    if (fields.length > 0 && (!filters[0]?.field || !fields.some(f => f.name === filters[0].field))) {
      setFilters([{ 
        id: '1', 
        field: fields[0].name, 
        operator: '=', 
        value: '' 
      }]);
    }
  }, [fields, filters]);
  
  // Build query from filters
  const buildQuery = useCallback((): Record<string, unknown> => {
    if (!filters.length || !filters[0]?.field) return {};
    
    return filters.reduce((query, filter) => {
      if (!filter.field) return query;
      
      return {
        ...query,
        [filter.field]: {
          [filter.operator]: filter.value
        }
      };
    }, {});
  }, [filters]);
  
  // Notify parent of query changes
  useEffect(() => {
    onQueryChange(buildQuery());
  }, [buildQuery, onQueryChange]);
  
  const addFilter = () => {
    setFilters(prev => [
      ...prev, 
      { 
        id: Date.now().toString(), 
        field: fields[0]?.name || '', 
        operator: '=', 
        value: '' 
      }
    ]);
  };
  
  const removeFilter = (id: string) => {
    if (filters.length <= 1) return;
    setFilters(prev => prev.filter(f => f.id !== id));
  };
  
  const updateFilter = (id: string, field: keyof FilterCondition, value: string) => {
    setFilters(prev => 
      prev.map(f => f.id === id ? { ...f, [field]: value } : f)
    );
  };
  
  const handleExecute = () => {
    onExecute(buildQuery());
  };
  
  const getFieldType = (fieldName: string): FieldType => {
    const field = fields.find(f => f.name === fieldName);
    return field?.type || 'string';
  };
  
  const getInputType = (fieldName: string): 'text' | 'number' | 'date' => {
    const type = getFieldType(fieldName);
    return type === 'number' ? 'number' : type === 'date' ? 'date' : 'text';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        <span>Loading query builder...</span>
      </div>
    );
  }
  
  if (!fields.length) {
    return (
      <div className="p-4 border rounded-lg bg-yellow-50">
        <p className="text-yellow-800">No fields available for filtering.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {filters.map((filter) => {
          const fieldType = getFieldType(filter.field);
          const operators = OPERATORS_BY_TYPE[fieldType] || [];
          const showValueInput = !['empty', '!empty', 'exists', '!exists'].includes(filter.operator);
          const isBoolean = fieldType === 'boolean';
          const inputType = getInputType(filter.field);
          
          return (
            <div key={filter.id} className="flex items-center gap-2 flex-wrap">
              <div className="w-48">
                <Select 
                  value={filter.field} 
                  onValueChange={(val) => updateFilter(filter.id, 'field', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-36">
                <Select 
                  value={filter.operator} 
                  onValueChange={(val) => updateFilter(filter.id, 'operator', val)}
                  disabled={!filter.field}
                >
                  <SelectTrigger>
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
              </div>
              
              {showValueInput && (
                <div className="flex-1 min-w-[200px]">
                  {isBoolean ? (
                    <Select
                      value={filter.value}
                      onValueChange={(val) => updateFilter(filter.id, 'value', val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={inputType}
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                      placeholder="Enter value"
                    />
                  )}
                </div>
              )}
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeFilter(filter.id)}
                disabled={filters.length <= 1}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addFilter}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Filter
        </Button>
        
        <Button 
          onClick={handleExecute}
          disabled={loading}
          className="gap-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : 'Execute Query'}
        </Button>
      </div>
    </div>
  );
}
