import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Play, Plus, X, AlertCircle } from 'lucide-react';

import { cn } from '../lib/utils';

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

interface FieldDefinition {
  name: string;
  type: FieldType;
  path?: string;
  description?: string;
  example?: unknown;
  label?: string; // Add optional label property
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
  error?: string | null;
  className?: string;
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

export const QueryBuilder = ({
  fields = [],
  onQueryChange = () => {},
  onExecute,
  loading = false,
  error = null,
  className,
}: QueryBuilderProps) => {
  const [filters, setFilters] = useState<FilterCondition[]>(() => {
    return fields.length > 0 
      ? [{ id: '1', field: fields[0].name, operator: '=', value: '' }] 
      : [];
  });

  // Update filters when fields change (only on mount or when fields change)
  useEffect(() => {
    if (fields.length > 0 && filters.length === 0) {
      setFilters([{ 
        id: Date.now().toString(),
        field: fields[0].name, 
        operator: '=', 
        value: '' 
      }]);
    }
  }, [fields, filters.length]); // Removed filters from dependencies
  
  // Build query from filters
  const buildQuery = useCallback((): Record<string, unknown> => {
    if (!filters || filters.length === 0) return {};
    
    // Get valid filters (with both field and value)
    const validFilters = filters.filter(filter => 
      filter.field && 
      (filter.value !== undefined && filter.value !== '')
    );
    
    if (validFilters.length === 0) return {};
    if (!filters.length || !filters[0]?.field) return {};
    
    // If there's only one filter, return it directly
    if (filters.length === 1) {
      const filter = filters[0];
      if (!filter.field) return {};
      
      return {
        [filter.field]: {
          [filter.operator]: filter.value
        }
      };
    }
    
    // For multiple filters, combine them with $and
    return {
      $and: filters
        .filter(filter => filter.field && filter.value !== undefined)
        .map(filter => ({
          [filter.field as string]: {
            [filter.operator]: filter.value
          }
        }))
    };
  }, [filters]);
  
  // Notify parent of query changes
  useEffect(() => {
    const query = buildQuery();
    onQueryChange(query);
  }, [filters, buildQuery, onQueryChange]);
  
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
    setFilters(prev => {
      const newFilters = prev.map(f => {
        if (f.id === id) {
          // When changing field, reset operator to default
          if (field === 'field') {
            return { 
              ...f, 
              field: value, 
              operator: '=',
              value: ''
            };
          }
          return { ...f, [field]: value };
        }
        return f;
      });
      return newFilters;
    });
  };
  
  const handleExecute = () => {
    console.log('[QueryBuilder] Execute button clicked');
    const query = buildQuery();
    console.log('[QueryBuilder] Built query:', JSON.stringify(query, null, 2));
    onExecute(query);
  };
  
  const getFieldType = (fieldName: string): FieldType => {
    const field = fields.find(f => f.name === fieldName);
    return field?.type || 'string';
  };
  
  const getInputType = (fieldName: string): 'text' | 'number' | 'date' => {
    const type = getFieldType(fieldName);
    return type === 'number' ? 'number' : type === 'date' ? 'date' : 'text';
  };

  const canExecute = filters.every(filter => {
    const fieldDef = fields.find(f => f.name === filter.field);
    const operator = fieldDef ? 
      OPERATORS_BY_TYPE[fieldDef.type as keyof typeof OPERATORS_BY_TYPE]?.find(op => op.value === filter.operator) : 
      null;
    
    // Check if required values are present
    const hasRequiredValues = operator?.inputType ? 
      (operator.needsSecondValue ? filter.value && filter.value2 : filter.value) : 
      true;
      
    return fieldDef && operator && hasRequiredValues;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading query builder...</span>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No fields available for querying.
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        {filters.map((filter) => {
          const fieldType = getFieldType(filter.field);
          const operators = OPERATORS_BY_TYPE[fieldType] || [];
          const showValueInput = !['empty', '!empty', 'exists', '!exists'].includes(filter.operator);
          const inputType = getInputType(filter.field);
          
          return (
            <div key={filter.id} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
              <Select
                value={filter.field}
                onValueChange={(value) => updateFilter(filter.id, 'field', value)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((field, index) => {
                    const fieldKey = field?.name || `field-${index}`;
                    const filterId = filter?.id || 'no-filter';
                    return (
                      <SelectItem 
                        key={`${filterId}-${fieldKey}`}
                        value={field.name} // Use field.name as the value
                      >
                        {field.label || field.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="w-32 flex-shrink-0">
                <Select
                  value={filter.operator}
                  onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
                  disabled={!filter.field || loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op, index) => {
                      const opValue = op?.value || `op-${index}`;
                      const filterId = filter?.id || 'no-filter';
                      return (
                        <SelectItem 
                          key={`${filterId}-${opValue}`}
                          value={opValue}
                        >
                          {op?.label || opValue}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {showValueInput && (
                <div className="flex-1 min-w-[200px]">
                  <Input
                    type={inputType}
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                    placeholder="Enter value"
                  />
                </div>
              )}
              
              {filters.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFilter(filter.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={loading}
                  title="Remove condition"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <div className="flex-1">
          <Button
            variant="outline"
            size="sm"
            onClick={addFilter}
            className="w-full sm:w-auto"
            disabled={loading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Condition
          </Button>
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters([])}
            disabled={filters.length === 0 || loading}
          >
            <X className="mr-2 h-4 w-4" />
            Clear All
          </Button>
          <Button
            onClick={handleExecute}
            disabled={!canExecute || loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute Query
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
