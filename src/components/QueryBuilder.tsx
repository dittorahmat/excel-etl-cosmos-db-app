import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Loader2, Play, X, AlertCircle, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { MultiSelect } from './ui/multi-select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

interface FieldDefinition {
  name: string;
  type: FieldType;
  path?: string;
  description?: string;
  example?: unknown;
  label?: string;
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
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
  onExecute: (filter: Record<string, unknown>) => void;
  loading?: boolean;
  error?: string;
  className?: string;
  defaultShowFilters?: boolean;
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
  fields,
  selectedFields,
  onFieldsChange,
  onExecute,
  loading = false,
  error,
  className,
  defaultShowFilters = false,
}: QueryBuilderProps) {
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [showFilters, setShowFilters] = useState(defaultShowFilters);

  const fieldOptions = useMemo(() => {
    return fields.map(field => ({
      value: field.name,
      label: field.label || field.name,
    }));
  }, [fields]);

  const handleFieldsChange = (selected: string[]) => {
    onFieldsChange(selected);
  };

  useEffect(() => {
    if (showFilters && fields.length > 0 && filters.length === 0) {
      setFilters([{ 
        id: Date.now().toString(),
        field: fields[0].name, 
        operator: '=', 
        value: '' 
      }]);
    }
  }, [showFilters, fields, filters.length]);

  const getFieldType = useCallback((fieldName: string): FieldType => {
    const field = fields.find(f => f.name === fieldName);
    return field?.type || 'string';
  }, [fields]);

  const buildQuery = useCallback((): Record<string, unknown> => {
    if (!showFilters || !filters || filters.length === 0) return {};
    
    const validFilters = filters.filter(filter => {
      const operator = OPERATORS_BY_TYPE[getFieldType(filter.field)]?.find(op => op.value === filter.operator);
      const needsValue = operator?.inputType !== undefined && !['empty', '!empty', 'exists', '!exists'].includes(filter.operator);
      
      return filter.field && (!needsValue || (filter.value !== undefined && filter.value !== ''));
    });
    
    if (validFilters.length === 0) return {};
    
    if (validFilters.length === 1) {
      const filter = validFilters[0];
      const operator = OPERATORS_BY_TYPE[getFieldType(filter.field)]?.find(op => op.value === filter.operator);
      const needsValue = operator?.inputType !== undefined && !['empty', '!empty', 'exists', '!exists'].includes(filter.operator);
      
      if (!needsValue) {
        return { [filter.field]: { [filter.operator]: true } };
      }
      
      return {
        [filter.field]: {
          [filter.operator]: filter.value
        }
      };
    }
    
    return {
      $and: validFilters.map(filter => {
        const operator = OPERATORS_BY_TYPE[getFieldType(filter.field)]?.find(op => op.value === filter.operator);
        const needsValue = operator?.inputType !== undefined && !['empty', '!empty', 'exists', '!exists'].includes(filter.operator);
        
        if (!needsValue) {
          return { [filter.field]: { [filter.operator]: true } };
        }
        
        return {
          [filter.field]: {
            [filter.operator]: filter.value
          }
        };
      })
    };
  }, [filters, showFilters, getFieldType]);

  useEffect(() => {
    if (filters.length > 0) {
      const query = buildQuery();
      onExecute(query);
    }
  }, [filters, buildQuery, onExecute]);

  const handleExecute = useCallback(() => {
    if (loading || selectedFields.length === 0) return;
    
    const query = buildQuery();
    console.log('[QueryBuilder] Executing query:', query);
    onExecute(query);
  }, [buildQuery, loading, onExecute, selectedFields]);

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

  return (
    <div className={cn("space-y-4", className)}>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Query Builder</CardTitle>
            <div className="flex items-center space-x-2">
              {fields.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-sm text-muted-foreground"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {showFilters ? 'Hide Filters' : 'Add Filters'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="field-selector" className="block text-sm font-medium mb-2">
                Select fields to display
              </Label>
              <MultiSelect
                options={fieldOptions}
                selected={selectedFields}
                onChange={handleFieldsChange}
                placeholder="Select fields to display..."
                searchPlaceholder="Search fields..."
                emptyText="No fields available"
                className="w-full"
              />
            </div>

            {showFilters && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Filters</h3>
                  {filters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters([])}
                      className="h-8 text-xs text-muted-foreground"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Clear All
                    </Button>
                  )}
                </div>
                {/* Filter rows rendering here */}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleExecute}
                disabled={loading || selectedFields.length === 0}
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
                    Run Query
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}