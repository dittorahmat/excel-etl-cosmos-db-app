import { useState, memo, useEffect, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Plus, X, Check } from "lucide-react";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { ChevronsUpDown } from "lucide-react";
import { FieldOption, FilterCondition, FieldType, SpecialFilters } from "./types";
import { OPERATORS_BY_TYPE } from "./constants";
import { api } from "@/utils/api";

interface FilterControlsProps {
  fields: FieldOption[];
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  onAddFilter: () => void;
  onRemoveFilter: (id: string) => void;
  defaultShowFilters?: boolean;
  selectedFile?: string;
  specialFilters?: SpecialFilters;
}

const FilterControlsComponent = ({
  fields = [],
  filters = [],
  onFiltersChange,
  onAddFilter,
  onRemoveFilter,
  defaultShowFilters = false,
  selectedFile,
  specialFilters,
}: FilterControlsProps) => {
  const [showFilters, setShowFilters] = useState(defaultShowFilters);
  const [filterSearchTerm, setFilterSearchTerm] = useState<Record<string, string>>({});
  const [openFilterPopovers, setOpenFilterPopovers] = useState<Record<string, boolean>>({});
  const [fieldUniqueValues, setFieldUniqueValues] = useState<Record<string, string[]>>({});
  const [loadingUniqueValues, setLoadingUniqueValues] = useState<Record<string, boolean>>({});
  const [multiSelectValues, setMultiSelectValues] = useState<Record<string, string[]>>({});

  // Create refs to hold the latest props values
  const selectedFileRef = useRef(selectedFile);
  const specialFiltersRef = useRef(specialFilters);

  // Update refs whenever the props change
  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  useEffect(() => {
    specialFiltersRef.current = specialFilters;
  }, [specialFilters]);

  const getFieldType = (fieldName: string): FieldType => {
    const field = fields.find((f) => f.value === fieldName);
    return field?.type || "string";
  };

  const convertValueByType = (value: string, fieldType: FieldType): string | number | boolean => {
    if (!value) return value;

    switch (fieldType) {
      case 'number': {
        const numValue = Number(value);
        return isNaN(numValue) ? value : numValue;
      }
      case 'boolean': {
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        return value;
      }
      default:
        return value;
    }
  };

  const handleFilterChange = (id: string, updates: Partial<FilterCondition>) => {
    // Get the current filter to check its field and operator
    const currentFilter = filters.find(f => f.id === id);
    const field = updates.field || currentFilter?.field;
    const operator = updates.operator || currentFilter?.operator;

    // If switching to 'in' or 'notIn' operator for a string field, we need to handle the value differently
    const fieldType = field ? getFieldType(field) : 'string';
    const isMultiSelect = fieldType === 'string' && operator && (operator === 'in' || operator === 'notIn');

    // Handle multiple select values for string fields with 'in'/'notIn' operators
    if (isMultiSelect && updates.value !== undefined) {
      let selectedValues: string[];

      if (typeof updates.value === 'string' && !Array.isArray(updates.value)) {
        // If value is a comma-separated string, split it
        selectedValues = updates.value ? updates.value.split(',') : [];
      } else if (Array.isArray(updates.value)) {
        // If value is an array, use it directly
        selectedValues = updates.value as string[];
      } else {
        // Default to empty array
        selectedValues = [];
      }

      // Store the selected values in the multiSelectValues state
      setMultiSelectValues(prev => ({
        ...prev,
        [id]: selectedValues
      }));
    }

    // Convert value types when necessary (but not for multi-select operations)
    if (updates.value !== undefined && typeof updates.value === 'string' && field) {
      // Don't convert to other types if it's a string field that should use multi-select
      if (isMultiSelect) {
        // Keep as string for multi-select operations - value is handled above
      } else {
        updates.value = convertValueByType(updates.value, getFieldType(field));
      }
    } else if (updates.value !== undefined && typeof updates.value === 'string' && currentFilter?.field) {
      const fieldType = getFieldType(currentFilter.field);

      // Don't convert to other types if it's a string field that should use multi-select
      if (isMultiSelect) {
        // Keep as string for multi-select operations - value is handled above
      } else {
        updates.value = convertValueByType(updates.value, fieldType);
      }
    }

    if (updates.value2 !== undefined && typeof updates.value2 === 'string' && field) {
      updates.value2 = convertValueByType(updates.value2, getFieldType(field));
    } else if (updates.value2 !== undefined && typeof updates.value2 === 'string' && currentFilter?.field) {
      updates.value2 = convertValueByType(updates.value2, getFieldType(currentFilter.field));
    }

    onFiltersChange(
      filters.map((filter) =>
        filter.id === id ? { ...filter, ...updates } : filter
      )
    );
  };

  const handleFilterSearchChange = (filterId: string, value: string) => {
    setFilterSearchTerm((prev) => ({
      ...prev,
      [filterId]: value,
    }));
  };

  const toggleFilterPopover = (filterId: string, open: boolean) => {
    setOpenFilterPopovers((prev) => ({
      ...prev,
      [filterId]: open,
    }));
  };

  const handleMultiSelectChange = (filterId: string, field: string, selectedValues: string[]) => {
    setMultiSelectValues(prev => ({
      ...prev,
      [filterId]: selectedValues
    }));

    // Update the filter with the new selected values
    const updatedFilter = {
      value: selectedValues.join(','),
      // Keep other properties the same
    };

    handleFilterChange(filterId, updatedFilter);
  };

  // Memoized callback to fetch unique values for a field
  // Using useCallback with proper dependencies to ensure it updates when props change
  const fetchUniqueValues = useCallback(async (field: string) => {
    // Avoid refetching if already loading
    if (loadingUniqueValues[field]) return;

    setLoadingUniqueValues(prev => ({ ...prev, [field]: true }));

    try {
      // Build query parameters based on selected file and special filters
      const queryParams = new URLSearchParams();
      queryParams.append('fields', field);

      // Add selected file if available - getting the current value from the ref
      const currentSelectedFile = selectedFileRef.current;
      if (currentSelectedFile) {
        queryParams.append('fileId', currentSelectedFile);
      }

      // Add special filters if available - getting the current value from the ref
      const currentSpecialFilters = specialFiltersRef.current;
      if (currentSpecialFilters) {
        Object.entries(currentSpecialFilters).forEach(([key, value]) => {
          if (value && key !== 'FileId') { // Exclude FileId since we already added it separately
            queryParams.append(key, String(value));
          }
        });
      }

      const url = `/api/query/distinct-file-values?${queryParams.toString()}`;

      // Define the response type for the distinct file values API
      type DistinctValuesResponse = {
        success: boolean;
        values: Record<string, (string | number | boolean)[]>;
        error?: string;
      };

      const response: DistinctValuesResponse = await api.get(url);

      if (response && typeof response === 'object' && response.success && response.values) {
        // Handle response based on the API structure
        // The API might return an array of values or an object with field names as keys
        let uniqueValues: string[] = [];

        if (Array.isArray(response.values)) {
          uniqueValues = response.values.filter((v: string | number | boolean) => v !== null && v !== undefined).map(String);
        } else if (typeof response.values === 'object' && response.values[field]) {
          uniqueValues = response.values[field].filter((v: string | number | boolean) => v !== null && v !== undefined).map(String);
        }

        setFieldUniqueValues(prev => ({
          ...prev,
          [field]: uniqueValues
        }));
      } else {
        // If the API call was successful but no values were returned, set an empty array
        setFieldUniqueValues(prev => ({
          ...prev,
          [field]: []
        }));
      }
    } catch (error) {
      console.error(`Error fetching unique values for field ${field}:`, error);
      // Set an empty array in case of error so the component doesn't keep trying to fetch
      setFieldUniqueValues(prev => ({
        ...prev,
        [field]: []
      }));
    } finally {
      setLoadingUniqueValues(prev => ({
        ...prev,
        [field]: false
      }));
    }
  }, [loadingUniqueValues]); // Removed selectedFile and specialFilters from deps since we use refs

  const getFilteredFieldOptions = (filterId: string) => {
    const searchTerm = (filterSearchTerm[filterId] || "").toLowerCase();
    if (!searchTerm) return fields;

    return fields.filter(
      (option) =>
        option.label.toLowerCase().includes(searchTerm) ||
        option.value.toLowerCase().includes(searchTerm)
    );
  };

  // Effect to fetch unique values when a string field with 'in'/'notIn' operator is selected
  useEffect(() => {
    filters.forEach(filter => {
      const fieldType = getFieldType(filter.field);
      if (fieldType === 'string' &&
          (filter.operator === 'in' || filter.operator === 'notIn') &&
          filter.field &&
          (!fieldUniqueValues[filter.field] || fieldUniqueValues[filter.field].length === 0)) {
        fetchUniqueValues(filter.field);
      }
    });
  }, [filters, fieldUniqueValues, fetchUniqueValues, getFieldType]);

  // Effect to initialize multi-select values when a filter value is a comma-separated string
  useEffect(() => {
    filters.forEach(filter => {
      if (filter.value && typeof filter.value === 'string' &&
          filter.operator && (filter.operator === 'in' || filter.operator === 'notIn')) {
        const values = filter.value.split(',');
        setMultiSelectValues(prev => ({
          ...prev,
          [filter.id]: values
        }));
      }
    });
  }, [filters]);

  if (!showFilters) {
    return (
      <div className="flex items-center justify-between">
        <Label>Filters</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(true)}
          className="h-auto p-0 text-sm"
        >
          Show filters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Filters</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(false)}
          className="h-auto p-0 text-sm"
        >
          Hide filters
        </Button>
      </div>

      <div className="space-y-4 rounded-md border p-4">
        {filters.length === 0 ? (
          <div className="flex flex-col items-center space-y-2 py-4">
            <p className="text-sm text-muted-foreground">
              No filters added. Click "Add Filter" to get started.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddFilter}
              className="mt-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Filter
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filters.map((filter) => {
              const fieldType = filter.field ? getFieldType(filter.field) : "string";
              const operators = OPERATORS_BY_TYPE[fieldType] || [];
              const selectedField = fields.find((f) => f.value === filter.field);
              const currentOperator = operators.find((op) => op.value === filter.operator);
              const needsSecondValue = currentOperator?.needsSecondValue;
              const inputType = currentOperator?.inputType || "text";

              return (
                <div key={filter.id} className="flex items-start gap-2">
                  <div className="grid flex-1 grid-cols-12 gap-2">
                    {/* Field Selector */}
                    <div className="col-span-4">
                      <Label
                        id={`field-label-${filter.id}`}
                        className="text-xs font-medium text-muted-foreground mb-1 block"
                      >
                        Field
                      </Label>
                      <Popover
                        open={openFilterPopovers[`${filter.id}-field`] || false}
                        onOpenChange={(open) =>
                          toggleFilterPopover(`${filter.id}-field`, open)
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openFilterPopovers[`${filter.id}-field`]}
                            aria-labelledby={`field-label-${filter.id}`}
                            className="w-full justify-between h-9"
                          >
                            {selectedField ? (
                              <span className="truncate">{selectedField.label}</span>
                            ) : (
                              <span className="text-muted-foreground">
                                Select field...
                              </span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <div className="px-3 pt-2">
                              <CommandInput
                                placeholder="Search fields..."
                                value={filterSearchTerm[filter.id] || ""}
                                onValueChange={(value) =>
                                  handleFilterSearchChange(filter.id, value)
                                }
                                className="h-9"
                                aria-label="Search fields"
                              />
                            </div>
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                              No fields found.
                            </CommandEmpty>
                            <CommandGroup className="overflow-y-auto max-h-[300px]">
                              {getFilteredFieldOptions(filter.id).map((option) => {
                                const isSelected = selectedField?.value === option.value;
                                return (
                                  <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => {
                                      handleFilterChange(filter.id, { 
                                        field: option.value,
                                        operator: "",
                                        value: "",
                                      });
                                      toggleFilterPopover(`${filter.id}-field`, false);
                                    }}
                                    data-disabled="false"
                                    className={cn(
                                      "cursor-pointer px-3 py-2 text-sm flex items-center gap-2 aria-selected:bg-accent aria-selected:text-accent-foreground",
                                      "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                                        isSelected
                                          ? "bg-primary border-primary text-primary-foreground"
                                          : "border-muted-foreground/30"
                                      )}
                                    >
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

                    {/* Operator Selector */}
                    <div className="col-span-3">
                      <Label htmlFor={`operator-select-${filter.id}`} className="text-xs font-medium text-muted-foreground mb-1 block">
                        Operator
                      </Label>
                      <Select
                        value={filter.operator}
                        onValueChange={(value) =>
                          handleFilterChange(filter.id, {
                            operator: value,
                            value: value === 'in' || value === 'notIn' ? "" : "", // Reset value when switching to multi-select
                            value2: undefined,
                          })
                        }
                        disabled={!filter.field}
                      >
                        <SelectTrigger id={`operator-select-${filter.id}`} className="h-9">
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
                    <div className={cn(needsSecondValue ? "col-span-2" : "col-span-4")}>
                      {filter.operator && (
                        <>
                          <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                            {needsSecondValue ? "First value" : "Value"}
                          </Label>
                          {fieldType === 'string' &&
                           (filter.operator === 'in' || filter.operator === 'notIn') &&
                           fieldUniqueValues[filter.field || ''] ? (
                            // Multi-select dropdown for string fields with 'in'/'notIn' operators
                            <Popover
                              open={openFilterPopovers[`${filter.id}-value`] || false}
                              onOpenChange={(open) => toggleFilterPopover(`${filter.id}-value`, open)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-9"
                                >
                                  <div className="truncate">
                                    {multiSelectValues[filter.id]?.length
                                      ? `${multiSelectValues[filter.id].length} selected`
                                      : "Select values..."}
                                  </div>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search values..." />
                                  <CommandEmpty>No values found.</CommandEmpty>
                                  <CommandGroup className="max-h-60 overflow-y-auto">
                                    {(fieldUniqueValues[filter.field || ''] || []).map((value) => {
                                      const isSelected = multiSelectValues[filter.id]?.includes(value) || false;
                                      return (
                                        <div
                                          key={value}
                                          className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent rounded-sm"
                                        >
                                          <Checkbox
                                            id={`filter-${filter.id}-value-${value}`}
                                            checked={isSelected}
                                            onCheckedChange={() => {
                                              const currentValues = multiSelectValues[filter.id] || [];
                                              let newValues: string[];

                                              if (isSelected) {
                                                newValues = currentValues.filter(v => v !== value);
                                              } else {
                                                newValues = [...currentValues, value];
                                              }

                                              handleMultiSelectChange(filter.id, filter.field!, newValues);
                                            }}
                                          />
                                          <label
                                            htmlFor={`filter-${filter.id}-value-${value}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                          >
                                            {value}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            // Standard input for other field types or operators
                            <input
                              type={inputType}
                              placeholder={
                                needsSecondValue ? "First value" : "Value"
                              }
                              value={filter.value !== undefined ? String(filter.value) : ""}
                              onChange={(e) =>
                                handleFilterChange(filter.id, {
                                  value: e.target.value,
                                })
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
                          value={filter.value2 !== undefined ? String(filter.value2) : ""}
                          onChange={(e) =>
                            handleFilterChange(filter.id, {
                              value2: e.target.value,
                            })
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
                    onClick={() => onRemoveFilter(filter.id)}
                    className="text-destructive hover:text-destructive/80 h-9 w-9"
                    data-testid={`remove-filter-${filter.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={onAddFilter}
              className="w-full mt-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Filter
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export { FilterControlsComponent as FilterControls };
export default memo(FilterControlsComponent);
