import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { api } from '../utils/api';
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
  inputType?: 'text' | 'number' | 'date' | 'checkbox' | 'select';
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
  fields?: FieldDefinition[];
  onQueryChange?: (query: Record<string, unknown>) => void;
  onExecute: (query: Record<string, unknown>) => void;
  loading?: boolean;
  autoLoadFields?: boolean;
  fieldsEndpoint?: string;
}

const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  string: [
    { value: '=', label: 'equals', inputType: 'text' },
    { value: '!=', label: 'not equals', inputType: 'text' },
    { value: 'contains', label: 'contains', inputType: 'text' },
    { value: '!contains', label: 'not contains', inputType: 'text' },
    { value: 'startsWith', label: 'starts with', inputType: 'text' },
    { value: 'endsWith', label: 'ends with', inputType: 'text' },
    { value: 'empty', label: 'is empty' },
    { value: '!empty', label: 'is not empty' },
  ],
  number: [
    { value: '=', label: 'equals', inputType: 'number' },
    { value: '!=', label: 'not equals', inputType: 'number' },
    { value: '>', label: 'greater than', inputType: 'number' },
    { value: '>=', label: 'greater than or equal', inputType: 'number' },
    { value: '<', label: 'less than', inputType: 'number' },
    { value: '<=', label: 'less than or equal', inputType: 'number' },
    { value: 'between', label: 'is between', inputType: 'number', needsSecondValue: true },
    { value: 'empty', label: 'is empty' },
  ],
  boolean: [
    { value: '=', label: 'is', inputType: 'select' },
  ],
  date: [
    { value: '=', label: 'is', inputType: 'date' },
    { value: '!=', label: 'is not', inputType: 'date' },
    { value: '>', label: 'after', inputType: 'date' },
    { value: '<', label: 'before', inputType: 'date' },
    { value: 'between', label: 'is between', inputType: 'date', needsSecondValue: true },
  ],
  array: [
    { value: 'includes', label: 'includes', inputType: 'text' },
    { value: '!includes', label: 'excludes', inputType: 'text' },
    { value: 'empty', label: 'is empty' },
    { value: '!empty', label: 'is not empty' },
  ],
  object: [
    { value: 'exists', label: 'exists' },
    { value: '!exists', label: 'does not exist' },
  ],
};



export function QueryBuilder({
  fields: initialFields = [],
  onQueryChange,
  onExecute,
  loading = false,
}: QueryBuilderProps) {
  const [availableFields, setAvailableFields] = useState<FieldDefinition[]>(initialFields);
  const [filters, setFilters] = useState<FilterCondition[]>([{ id: '1', field: '', operator: '=', value: '' }]);
  const [, setLoadingFields] = useState(false);
  

  useEffect(() => {
    const loadFields = async () => {
      if (initialFields.length > 0) {
        setAvailableFields(initialFields);
        return;
      }

      setLoadingFields(true);
      try {
        const response = await api.get('/api/fields');
        if (response.ok) {
          const data = await response.json();
          const fields = (data.fields || []).map((field: string) => ({
            name: field,
            type: 'string' as FieldType, // Default type, will be refined based on data
          }));
          setAvailableFields(fields);
        }
      } catch (error) {
        console.error('Error loading fields:', error);
      } finally {
        setLoadingFields(false);
      }
    };

    loadFields();
  }, [initialFields]);

  const buildQuery = useCallback((): Record<string, unknown> => {
    const conditions = filters
      .filter((f): f is Required<FilterCondition> => Boolean(f.field) && Boolean(f.operator) && f.value !== '')
      .map(f => {
        const fieldType = availableFields.find(af => af.name === f.field)?.type || 'string';
        let value: unknown = f.value;
        
        // Convert value based on field type
        switch (fieldType) {
          case 'number':
            value = parseFloat(f.value);
            if (f.operator === 'between' && f.value2) {
              return {
                [f.field]: {
                  $gte: value,
                  $lte: parseFloat(f.value2)
                }
              };
            }
            break;
          case 'date':
            value = new Date(f.value).toISOString();
            if (f.operator === 'between' && f.value2) {
              return {
                [f.field]: {
                  $gte: value,
                  $lte: new Date(f.value2).toISOString()
                }
              };
            }
            break;
          case 'boolean':
            value = f.value === 'true';
            break;
          default:
            // For string and other types
            if (f.operator === 'contains') {
              return { [f.field]: { $regex: f.value, $options: 'i' } };
            } else if (f.operator === '!contains') {
              return { [f.field]: { $not: { $regex: f.value, $options: 'i' } } };
            } else if (f.operator === 'startsWith') {
              return { [f.field]: { $regex: `^${f.value}`, $options: 'i' } };
            } else if (f.operator === 'endsWith') {
              return { [f.field]: { $regex: `${f.value}$`, $options: 'i' } };
            } else if (f.operator === 'empty') {
              return { [f.field]: { $in: [null, ''] } };
            } else if (f.operator === '!empty') {
              return { [f.field]: { $nin: [null, ''] } };
            }
        }

        // Default operator mapping
        const operatorMap: Record<string, string> = {
          '=': '$eq',
          '!=': '$ne',
          '>': '$gt',
          '>=': '$gte',
          '<': '$lt',
          '<=': '$lte',
          'between': '$between'
        };

        const mongoOperator = operatorMap[f.operator] || f.operator;
        return { [f.field]: { [mongoOperator]: value } };
      });

    if (conditions.length === 0) {
      return {};
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { $and: conditions };
  }, [filters, availableFields]);

  useEffect(() => {
    if (onQueryChange) {
      onQueryChange(buildQuery());
    }
  }, [buildQuery, onQueryChange]);

  const addFilter = useCallback((): void => {
    setFilters(prevFilters => [
      ...prevFilters,
      {
        id: Date.now().toString(),
        field: '',
        operator: '=',
        value: ''
      }
    ]);
  }, []);

  const removeFilter = useCallback((id: string): void => {
    if (filters.length <= 1) return;
    setFilters(prevFilters => prevFilters.filter(filter => filter.id !== id));
  }, [filters.length]);

  const updateFilter = useCallback((id: string, field: keyof FilterCondition, value: string) => {
    setFilters(prevFilters => prevFilters.map(f =>
      f.id === id ? { ...f, [field]: value } : f
    ));
  }, []);

  // Remove value2 handler (inline in JSX instead)


  const handleExecute = useCallback(() => {
    onExecute(buildQuery());
  }, [onExecute, buildQuery]);

  const getFieldType = (fieldName: string): FieldType => {
    // Try to determine field type from available fields first
    const field = availableFields.find(f => f.name === fieldName);
    if (field?.type) return field.type;
    
    // Fallback to type inference from field name
    const lowerName = fieldName.toLowerCase();
    if (['id', 'count', 'total', 'amount', 'price', 'quantity'].some(k => lowerName.includes(k))) {
      return 'number';
    }
    if (['date', 'time', 'created', 'updated', 'timestamp'].some(k => lowerName.includes(k))) {
      return 'date';
    }
    if (['is_', 'has_', 'can_', 'should_'].some(prefix => lowerName.startsWith(prefix))) {
      return 'boolean';
    }
    return 'string';
  };

  const getInputType = (fieldName: string): 'text' | 'number' | 'date' => {
    const fieldType = getFieldType(fieldName);
    switch (fieldType) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'boolean':
        return 'text'; // Handled by select input
      default:
        return 'text';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {filters.map((filter: FilterCondition) => {
          const fieldType = getFieldType(filter.field);
          const showValue2 = filter.operator === 'between';
          const inputType = getInputType(filter.field);
          const operators = OPERATORS_BY_TYPE[fieldType] || [];

          return (
            <div key={filter.id} className="flex items-center gap-2">
              {/* Field selector */}
              <Select value={filter.field} onValueChange={(val: string) => updateFilter(filter.id, 'field', val)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((f: FieldDefinition) => (
                    <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Operator selector */}
              <Select value={filter.operator} onValueChange={(val: string) => updateFilter(filter.id, 'operator', val)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op: Operator) => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Value input(s) */}
              {['empty', '!empty', 'exists', '!exists'].includes(filter.operator) ? null : (
                <>
                  {fieldType === 'boolean' ? (
                    <Select value={filter.value} onValueChange={(val: string) => updateFilter(filter.id, 'value', val)}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Value" />
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
                      placeholder="Value"
                      className="flex-1"
                    />
                  )}
                  {showValue2 && (
                    <Input
                      type={inputType}
                      value={filter.value2 || ''}
                      onChange={(e) => updateFilter(filter.id, 'value2', e.target.value)}
                      placeholder="and..."
                      className="flex-1"
                    />
                  )}
                </>
              )}
              {/* Remove button */}
              <Button variant="ghost" size="icon" onClick={() => removeFilter(filter.id)} disabled={filters.length <= 1}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={addFilter} disabled={loading}>
          <Plus className="w-4 h-4 mr-1" /> Add Filter
        </Button>
        <Button type="button" onClick={handleExecute} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          Execute
        </Button>
      </div>
    </div>
  );
}
