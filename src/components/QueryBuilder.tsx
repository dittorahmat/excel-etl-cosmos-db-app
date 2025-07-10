import { useState, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import {
  Loader2,
  Play,
  X,
  Check,
  ChevronsUpDown,
  Plus,
  X as XIcon,
} from "lucide-react";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";

type FieldType = "string" | "number" | "boolean" | "date" | "array" | "object";

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
  inputType?: "text" | "number" | "date" | "select";
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
  onExecute: (query: { fields: string[]; limit: number; offset: number }) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
  defaultShowFilters?: boolean;
  page?: number;
  pageSize?: number;
  fieldsLoading?: boolean;
}

const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  string: [
    { value: "=", label: "equals", inputType: "text" },
    { value: "!=", label: "not equals", inputType: "text" },
    { value: "contains", label: "contains", inputType: "text" },
    { value: "!contains", label: "not contains", inputType: "text" },
    { value: "startsWith", label: "starts with", inputType: "text" },
    { value: "endsWith", label: "ends with", inputType: "text" },
    { value: "empty", label: "is empty" },
    { value: "!empty", label: "is not empty" },
  ],
  number: [
    { value: "=", label: "equals", inputType: "number" },
    { value: "!=", label: "not equals", inputType: "number" },
    { value: ">", label: "greater than", inputType: "number" },
    { value: ">=", label: "greater than or equal", inputType: "number" },
    { value: "<", label: "less than", inputType: "number" },
    { value: "<=", label: "less than or equal", inputType: "number" },
    {
      value: "between",
      label: "between",
      inputType: "number",
      needsSecondValue: true,
    },
  ],
  boolean: [{ value: "=", label: "is", inputType: "select" }],
  date: [
    { value: "=", label: "on", inputType: "date" },
    { value: ">", label: "after", inputType: "date" },
    { value: "<", label: "before", inputType: "date" },
    {
      value: "between",
      label: "between",
      inputType: "date",
      needsSecondValue: true,
    },
  ],
  array: [
    { value: "contains", label: "contains", inputType: "text" },
    { value: "!contains", label: "does not contain", inputType: "text" },
    { value: "empty", label: "is empty" },
    { value: "!empty", label: "is not empty" },
  ],
  object: [
    { value: "exists", label: "exists" },
    { value: "!exists", label: "does not exist" },
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
  page = 1,
  pageSize = 10,
  fieldsLoading = false,
}: QueryBuilderProps): JSX.Element {
  // State
  const [isFieldSelectorOpen, setIsFieldSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(defaultShowFilters);
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  // Field options for the dropdown
  const fieldOptions = useMemo(() => {
    if (!fields || !Array.isArray(fields)) {
      console.warn("Invalid fields prop:", fields);
      return [];
    }

    console.log("Raw fields prop:", fields);

    // First, create a map of all available fields by value
    const fieldMap = new Map<
      string,
      {
        value: string;
        label: string;
        type: FieldType;
        [key: string]: unknown;
      }
    >();

    fields.forEach((field) => {
      if (typeof field === "string") {
        fieldMap.set(field, {
          value: field,
          label: field,
          type: "string" as FieldType,
        });
      } else if (field && "name" in field) {
        fieldMap.set(field.name, {
          value: field.name,
          label: field.label || field.name,
          type: field.type || "string",
          ...field,
        });
      }
    });

    // Then create the options array, ensuring we don't have duplicates
    const options = Array.from(fieldMap.values());
    console.log("Generated field options:", options);
    return options;
  }, [fields]);

  // Get field type by name
  const getFieldType = useCallback(
    (fieldName: string): FieldType => {
      const field = fields.find((f) => f.name === fieldName);
      return field?.type || "string";
    },
    [fields]
  );

  // Get operators for a field type
  const getOperatorsForFieldType = useCallback((type: FieldType): Operator[] => {
    return OPERATORS_BY_TYPE[type] || [];
  }, []);

  // Filter field options based on search term
  const filteredFieldOptions = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return fieldOptions;
    
    return fieldOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        option.value.toLowerCase().includes(term)
    );
  }, [fieldOptions, searchTerm]);

  // Handle field selection
  const handleFieldSelect = useCallback(
    (field: string) => {
      console.log("Field selected:", field);
      console.log("Current selected fields:", selectedFields);

      // Check if the field is already selected
      const isSelected = selectedFields.includes(field);
      let newFields: string[];

      if (isSelected) {
        // Remove the field if already selected
        newFields = selectedFields.filter(f => f !== field);
      } else {
        // Add the field if not selected
        newFields = [...selectedFields, field];
      }

      console.log("New selected fields:", newFields);

      // Call the parent's onFieldsChange with the new array
      onFieldsChange(newFields);

      // Clear the search term but keep the dropdown open for multiple selections
      setSearchTerm("");
    },
    [selectedFields, onFieldsChange]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    (id: string, updates: Partial<FilterCondition>) => {
      setFilters((prev) =>
        prev.map((filter) =>
          filter.id === id ? { ...filter, ...updates } : filter
        )
      );
    },
    []
  );

  // Add a new filter
  const handleAddFilter = useCallback(() => {
    const newFilter: FilterCondition = {
      id: `filter-${Date.now()}`,
      field: "",
      operator: "",
      value: "",
    };
    setFilters((prev) => [...prev, newFilter]);
  }, []);

  // Remove a filter
  const handleRemoveFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((filter) => filter.id !== id));
  }, []);

  // Handle execute button click
  const handleExecuteClick = useCallback(() => {
    console.log("Execute button clicked with fields:", selectedFields);

    // Ensure we have valid fields to query
    const validFields = selectedFields.filter((field) =>
      fieldOptions.some((f) => f.value === field)
    );

    if (validFields.length === 0) {
      console.warn("No valid fields selected for query");
      return;
    }

    console.log("Executing query with fields:", validFields);

    onExecute({
      fields: validFields,
      limit: pageSize || 100,
      offset: ((page || 1) - 1) * (pageSize || 100),
    });
  }, [onExecute, selectedFields, fieldOptions, page, pageSize]);

  // Render field selector with typeahead
  const renderFieldSelector = (): JSX.Element => {
    console.log("Rendering field selector with selectedFields:", selectedFields);
    console.log("Field options:", fieldOptions);

    const selectedFieldLabels = selectedFields
      .map((field) => {
        const fieldDef = fieldOptions.find((f) => f.value === field);
        return fieldDef ? { value: field, label: fieldDef.label, type: fieldDef.type } : null;
      })
      .filter((field): field is { value: string; label: string; type: FieldType } => field !== null);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Display Fields</Label>
          <span className="text-sm text-muted-foreground">
            {selectedFields.length} selected
          </span>
        </div>
        
        <Popover open={isFieldSelectorOpen} onOpenChange={setIsFieldSelectorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isFieldSelectorOpen}
              className="w-full justify-between h-auto min-h-10 py-1.5"
              disabled={fieldsLoading || fieldOptions.length === 0}
              onClick={() => setIsFieldSelectorOpen(!isFieldSelectorOpen)}
            >
              {selectedFieldLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-w-full">
                  {selectedFieldLabels.map((field) => (
                    <span 
                      key={field.value}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-secondary rounded-md text-secondary-foreground"
                    >
                      {field.label}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldSelect(field.value);
                        }}
                        className="rounded-full hover:bg-accent/50 ml-1 -mr-1 p-0.5"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Select fields to display...</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command className="rounded-lg border shadow-md">
              <div className="px-3 pt-2">
                <CommandInput
                  placeholder="Search fields..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  className="h-9"
                />
              </div>
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No fields found.
              </CommandEmpty>
              <CommandGroup className="overflow-y-auto max-h-[300px]">
                {filteredFieldOptions.map((option) => {
                  const isSelected = selectedFields.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        console.log('CommandItem selected:', option.value);
                        handleFieldSelect(option.value);
                      }}
                      className="cursor-pointer px-3 py-2 text-sm flex items-center gap-2 aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <div className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                        isSelected 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-muted-foreground/30"
                      )}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="font-medium">{option.label}</span>
                      <Badge 
                        variant="outline" 
                        className="ml-auto text-xs font-normal text-muted-foreground"
                      >
                        {option.type}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  // Render filter toggle
  const renderFilterToggle = (): JSX.Element => (
    <div className="flex items-center justify-between">
      <Label>Filters</Label>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className="h-auto p-0 text-sm"
      >
        {showFilters ? "Hide" : "Show"} filters
      </Button>
    </div>
  );

  // State for filter field search
  const [filterSearchTerm, setFilterSearchTerm] = useState<Record<string, string>>({});
  const [openFilterPopovers, setOpenFilterPopovers] = useState<Record<string, boolean>>({});

  // Handle filter field search term change
  const handleFilterSearchChange = (filterId: string, value: string) => {
    setFilterSearchTerm(prev => ({
      ...prev,
      [filterId]: value
    }));
  };

  // Toggle filter popover
  const toggleFilterPopover = (filterId: string, open: boolean) => {
    setOpenFilterPopovers(prev => ({
      ...prev,
      [filterId]: open
    }));
  };

  // Filter field options based on search term
  const getFilteredFieldOptions = (filterId: string) => {
    const searchTerm = (filterSearchTerm[filterId] || '').toLowerCase();
    if (!searchTerm) return fieldOptions;
    
    return fieldOptions.filter(option => 
      option.label.toLowerCase().includes(searchTerm) || 
      option.value.toLowerCase().includes(searchTerm)
    );
  };

  // Render filter controls with typeahead
  const renderFilterControls = (): JSX.Element | null => {
    if (!showFilters) return null;

    return (
      <div className="space-y-4 rounded-md border p-4">
        {filters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No filters added. Click "Add Filter" to get started.
          </p>
        ) : (
          filters.map((filter) => {
            const fieldType = filter.field ? getFieldType(filter.field) : 'string';
            const operators = getOperatorsForFieldType(fieldType);
            const selectedField = fieldOptions.find(f => f.value === filter.field);
            const currentOperator = operators.find(op => op.value === filter.operator);
            const needsSecondValue = currentOperator?.needsSecondValue;
            const inputType = currentOperator?.inputType || 'text';
            const searchTerm = filterSearchTerm[filter.id] || '';

            return (
              <div key={filter.id} className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-12 gap-2">
                  {/* Field Selector */}
                  <div className="col-span-4">
                    <Label className="text-xs font-medium text-muted-foreground mb-1 block">Field</Label>
                    <Popover 
                      open={openFilterPopovers[`${filter.id}-field`] || false} 
                      onOpenChange={(open) => toggleFilterPopover(`${filter.id}-field`, open)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openFilterPopovers[`${filter.id}-field`]}
                          className="w-full justify-between h-9"
                        >
                          {selectedField ? (
                            <span className="truncate">{selectedField.label}</span>
                          ) : (
                            <span className="text-muted-foreground">Select field...</span>
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <div className="px-3 pt-2">
                            <CommandInput
                              placeholder="Search fields..."
                              value={searchTerm}
                              onValueChange={(value) => handleFilterSearchChange(filter.id, value)}
                              className="h-9"
                            />
                          </div>
                          <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                            No fields found.
                          </CommandEmpty>
                          <CommandGroup className="overflow-y-auto max-h-[300px]">
                            {getFilteredFieldOptions(filter.id).map((option) => (
                              <CommandItem
                                key={option.value}
                                value={option.value}
                                onSelect={() => {
                                  handleFilterChange(filter.id, { 
                                    field: option.value,
                                    // Reset operator when field changes
                                    operator: ''
                                  });
                                  toggleFilterPopover(`${filter.id}-field`, false);
                                }}
                                className="cursor-pointer px-3 py-2 text-sm flex items-center gap-2 aria-selected:bg-accent aria-selected:text-accent-foreground"
                              >
                                <span className="font-medium">{option.label}</span>
                                <Badge 
                                  variant="outline" 
                                  className="ml-auto text-xs font-normal text-muted-foreground"
                                >
                                  {option.type}
                                </Badge>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Operator Selector */}
                  <div className="col-span-3">
                    <Label className="text-xs font-medium text-muted-foreground mb-1 block">Operator</Label>
                    <Select
                      value={filter.operator}
                      onValueChange={(value) =>
                        handleFilterChange(filter.id, { 
                          operator: value,
                          // Reset values when operator changes
                          value: '',
                          value2: undefined
                        })
                      }
                      disabled={!filter.field}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select operator..." />
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

                  {/* Value Input */}
                  <div className={cn("col-span-4", needsSecondValue ? 'col-span-2' : 'col-span-4')}>
                    {filter.operator && (
                      <>
                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                          {needsSecondValue ? 'First value' : 'Value'}
                        </Label>
                        {inputType === 'select' ? (
                          <Select
                            value={filter.value}
                            onValueChange={(value) =>
                              handleFilterChange(filter.id, { value })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select value..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <input
                            type={inputType}
                            placeholder={needsSecondValue ? 'First value' : 'Value'}
                            value={filter.value}
                            onChange={(e) =>
                              handleFilterChange(filter.id, { value: e.target.value })
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        )}
                      </>
                    )}
                  </div>

                  {/* Second Value Input (for between operator) */}
                  {needsSecondValue && (
                    <div className="col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        And
                      </Label>
                      <input
                        type={inputType}
                        placeholder="Second value"
                        value={filter.value2 || ''}
                        onChange={(e) =>
                          handleFilterChange(filter.id, { value2: e.target.value })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFilter(filter.id)}
                  className="text-destructive hover:text-destructive/80 h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddFilter}
          className="mt-2 h-9"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Filter
        </Button>
      </div>
    );
  };

  // Handle loading state
  if (fieldsLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading fields...</span>
      </div>
    );
  }

  // Handle no fields case
  if (fieldOptions.length === 0) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        No fields available to query.
      </div>
    );
  }

  // Main render
  try {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="space-y-4">
          {/* Field Selection */}
          <div className="space-y-2">
            {renderFieldSelector()}
            {error && <div className="text-sm text-destructive">{error}</div>}
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
  } catch (error) {
    console.error("Error in QueryBuilder render:", error);
    return (
      <div className={cn("p-4 text-center text-destructive", className)}>
        An error occurred while rendering the query builder.
      </div>
    );
  }
}

export default QueryBuilder;
