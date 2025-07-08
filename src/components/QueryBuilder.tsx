import { useState, useCallback, useMemo } from 'react';
import { Button } from './ui/button';

import { Loader2, Play, X, Check, ChevronsUpDown, Plus, X as XIcon } from 'lucide-react';
import { Label } from "./ui/label";
import { cn } from "../lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";

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
  onExecute: (query: { fields: string[]; filters: Record<string, string> }) => void;
  loading?: boolean;
  error?: string | null;
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
    { value: 'between', label: 'between', inputType: 'number', needsSecondValue: true },
  ],
  boolean: [
    { value: '=', label: 'is', inputType: 'select' },
  ],
  date: [
    { value: '=', label: 'on', inputType: 'date' },
    { value: '>', label: 'after', inputType: 'date' },
    { value: '<', label: 'before', inputType: 'date' },
    { value: 'between', label: 'between', inputType: 'date', needsSecondValue: true },
  ],
  array: [
    { value: 'contains', label: 'contains', inputType: 'text' },
    { value: '!contains', label: 'does not contain', inputType: 'text' },
    { value: 'empty', label: 'is empty' },
    { value: '!empty', label: 'is not empty' },
  ],
  object: [
    { value: 'exists', label: 'exists' },
    { value: '!exists', label: 'does not exist' },
  ],
};

export function QueryBuilder({
  fields = [],
  selectedFields = [],
  onFieldsChange,
  onExecute,
  loading = false,
  error,
  className,
  defaultShowFilters = false,
}: QueryBuilderProps) {
  // State
  const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(defaultShowFilters);
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  // Field options for the dropdown
  const fieldOptions = useMemo(() => 
    fields.map(field => ({
      value: field.name,
      label: field.label || field.name,
      type: field.type
    })), 
    [fields]
  );

  // Get field type by name
  const getFieldType = useCallback((fieldName: string): FieldType => {
    const field = fields.find(f => f.name === fieldName);
    return field?.type || 'string';
  }, [fields]);

  // Get operators for a field type
  const getOperatorsForFieldType = useCallback((type: FieldType): Operator[] => {
    return OPERATORS_BY_TYPE[type] || [];
  }, []);

  // Filter field options based on search term
  const filteredFieldOptions = useMemo(() => {
    if (!searchTerm) return fieldOptions;
    const term = searchTerm.toLowerCase();
    return fieldOptions.filter(
      field => field.label.toLowerCase().includes(term) || 
              field.value.toLowerCase().includes(term)
    );
  }, [fieldOptions, searchTerm]);

  // Normalize field names for comparison
  const normalizeFieldName = (field: string): string => {
    return field?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  };

  // Handle field selection/deselection
  const handleFieldSelect = (fieldName: string) => {
    const normalizedField = normalizeFieldName(fieldName);
    const isSelected = selectedFields.some(f => 
      normalizeFieldName(f) === normalizedField
    );

    const newFields = isSelected
      ? selectedFields.filter(f => normalizeFieldName(f) !== normalizedField)
      : [...selectedFields, fieldName];

    onFieldsChange(newFields);
  };

  // Handle filter changes
  const updateFilter = (id: string, field: keyof FilterCondition, value: string) => {
    setFilters(prev => 
      prev.map(filter => 
        filter.id === id ? { ...filter, [field]: value } : filter
      )
    );
  };

  // Add new filter
  const handleAddFilter = () => {
    setFilters(prev => [
      ...prev,
      { id: Date.now().toString(), field: '', operator: '', value: '' }
    ]);
  };

  // Remove filter
  const handleRemoveFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  // Build query object
  const buildQuery = () => {
    const filterObj: Record<string, string> = {};
    filters.forEach(filter => {
      if (filter.field && filter.operator) {
        filterObj[`${filter.field}_${filter.operator}`] = filter.value;
      }
    });
    
    return {
      fields: selectedFields,
      filters: filterObj
    };
  };

  // Handle execute button click
  const handleExecuteClick = () => {
    const query = buildQuery();
    onExecute(query);
  };

  // Render selected fields as badges
  const renderSelectedFields = () => {
    if (selectedFields.length === 0) {
      return (
        <div className="text-sm text-muted-foreground mb-2">
          No fields selected. Click to select fields.
        </div>
      );
    }

    return (
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedFields.map((fieldName) => {
          const field = fieldOptions.find(f => 
            f && fieldName && normalizeFieldName(f.value) === normalizeFieldName(fieldName)
          );
          if (!field) return null;
          
          return (
            <Badge 
              key={fieldName}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1 text-xs"
            >
              {field.label || fieldName}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFieldSelect(fieldName);
                }}
                className="ml-1 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${fieldName}`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
    );
  };

  // Render field selector with Command component
  const renderFieldSelector = () => (
    <div className="space-y-2">
      <Label htmlFor="field-selector">Display Fields</Label>
      {renderSelectedFields()}
      <Popover open={isFieldSelectorOpen} onOpenChange={setIsFieldSelectorOpen}>
        <PopoverTrigger asChild>
          <Button
            id="field-selector"
            variant="outline"
            role="combobox"
            aria-expanded={isFieldSelectorOpen}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selectedFields.length > 0 
                ? `Add or remove fields (${selectedFields.length} selected)`
                : 'Select fields to display...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search fields..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandEmpty>No fields found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {filteredFieldOptions.map((field) => {
                const isSelected = selectedFields.some(f => 
                  field && f && normalizeFieldName(f) === normalizeFieldName(field.value)
                );
                
                return (
                  <CommandItem
                    key={field.value}
                    value={field.value}
                    onSelect={() => handleFieldSelect(field.value)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center w-full">
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                      <span className="flex-1">{field.label}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {field.type}
                      </Badge>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );

  // Toggle filters button
  const renderFilterToggle = () => (
    <div className="flex justify-end">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="text-xs"
      >
        {showFilters ? 'Hide Filters' : 'Add Filters'}
      </Button>
    </div>
  );

  // Render filter controls
  const renderFilterControls = () => {
    if (!showFilters) return null;

    return (
      <div className="space-y-4 p-4 border rounded-lg">
        {filters.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm">
            No filters added yet. Click "Add Filter" to get started.
          </div>
        ) : (
          filters.map((filter) => (
            <div key={filter.id} className="flex gap-2 items-center">
              <Select
                value={filter.field}
                onValueChange={(value) => updateFilter(filter.id, 'field', value)}
              >
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {fieldOptions.map((field) => (
                    <SelectItem key={field.value} value={field.value}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.operator}
                onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
                disabled={!filter.field}
              >
                <SelectTrigger className="min-w-[120px]">
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {getOperatorsForFieldType(getFieldType(filter.field)).map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input
                type="text"
                value={filter.value}
                onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Value"
                disabled={!filter.operator}
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveFilter(filter.id)}
                className="text-destructive hover:text-destructive/80"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddFilter}
          className="mt-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Filter
        </Button>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-4">
        {/* Field Selection */}
        <div className="space-y-2">
          {renderFieldSelector()}
          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="space-y-2">
          {renderFilterToggle()}
          {renderFilterControls()}
        </div>
      </div>

      {/* Execute Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleExecuteClick}
          disabled={loading || selectedFields.length === 0}
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
  );
}
