import { useState, useEffect, useMemo } from "react";
import { Button } from "../ui/button";
import { Check, ChevronsUpDown, X as XIcon } from "lucide-react";
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
import { Checkbox } from "../ui/checkbox";
import { api } from "@/utils/api";

import { useFields } from "@/hooks/useFields";

interface SpecialFilters {
  Source: string;
  Category: string;
  'Sub Category': string;
  Year?: string[] | number[];
}

interface FieldSelectorProps {
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
  onSpecialFiltersChange?: (filters: SpecialFilters) => void;
  disabled?: boolean;
}

export const FieldSelector = ({
  selectedFields = [],
  onFieldsChange,
  onSpecialFiltersChange,
  disabled = false,
}: FieldSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [distinctValues, setDistinctValues] = useState<Record<string, (string | number | boolean)[]>>({});
  const [filteredValues, setFilteredValues] = useState<Record<string, (string | number | boolean)[]>>({});
  const [loadingDistinct, setLoadingDistinct] = useState(true);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [errorDistinct, setErrorDistinct] = useState<string | null>(null);
  const [selectedSpecialFields, setSelectedSpecialFields] = useState<SpecialFilters>({
    Source: '',
    Category: '',
    'Sub Category': '',
    Year: undefined,
  });

  // Initialize with special fields if they're not already selected
  useEffect(() => {
    const specialFields = ['Source', 'Category', 'Sub Category', 'Year'];
    const missingSpecialFields = specialFields.filter(field => !selectedFields.includes(field));
    
    if (missingSpecialFields.length > 0) {
      const updatedFields = [...selectedFields, ...missingSpecialFields];
      onFieldsChange(updatedFields);
    }
  }, []); // Empty dependency array to run only once when component mounts
  
  // Use the useFields hook to fetch fields dynamically based on selected fields and special filters
  const { fields, loading: fieldsLoading, error: fieldsError } = useFields(selectedFields, selectedSpecialFields);

  // Fetch distinct values for special fields (base values)
  useEffect(() => {
    const fetchDistinctValues = async () => {
      setLoadingDistinct(true);
      setErrorDistinct(null);
      try {
        const response = await api.get('/api/distinct-values?fields=Source,Category,Sub Category,Year');
        if (response && typeof response === 'object' && 'success' in response && response.success) {
          const typedResponse = response as { success: boolean; values: Record<string, (string | number | boolean)[]>; error?: string };
          setDistinctValues(typedResponse.values || {});

          // Initialize filtered values with the base values
          setFilteredValues(typedResponse.values || {});
        } else {
          const errorResponse = response as { success: boolean; error?: string };
          throw new Error(errorResponse.error || 'Failed to fetch distinct values');
        }
      } catch (error) {
        console.error('Error fetching distinct values:', error);
        setErrorDistinct(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoadingDistinct(false);
      }
    };

    fetchDistinctValues();
  }, []);

  // Fetch filtered values when special filters change
  useEffect(() => {
    const fetchFilteredValues = async () => {
      if (loadingDistinct) return; // Wait for base values to load first
      
      setLoadingFiltered(true);
      try {
        // Build the query string with current special filter selections following cascade hierarchy
        const params = new URLSearchParams();
        params.append('fields', 'Source,Category,Sub Category,Year');
        
        // Add filters in cascade order - if Source is selected, include it
        if (selectedSpecialFields.Source) {
          params.append('Source', selectedSpecialFields.Source);
        }
        
        // Only include Category filter if Source is selected
        if (selectedSpecialFields.Category && selectedSpecialFields.Source) {
          params.append('Category', selectedSpecialFields.Category);
        }
        
        // Only include Sub Category filter if both Source and Category are selected
        if (selectedSpecialFields['Sub Category'] && selectedSpecialFields.Category && selectedSpecialFields.Source) {
          params.append('Sub Category', selectedSpecialFields['Sub Category']);
        }
        
        // Only include Year filters if all previous filters are selected
        if (Array.isArray(selectedSpecialFields.Year) && selectedSpecialFields.Year.length > 0 && 
            selectedSpecialFields['Sub Category'] && selectedSpecialFields.Category && selectedSpecialFields.Source) {
          params.append('Year', selectedSpecialFields.Year.join(','));
        }

        const response = await api.get(`/api/distinct-values?${params.toString()}`);
        if (response && typeof response === 'object' && 'success' in response && response.success) {
          const typedResponse = response as { success: boolean; values: Record<string, (string | number | boolean)[]>; error?: string };

          // Update filtered values according to cascade hierarchy
          setFilteredValues(prevFiltered => {
            const newFilteredValues = { ...prevFiltered };
            
            // Update only the relevant special fields based on cascade hierarchy
            // Source is always available as base value set
            if (selectedSpecialFields.Source) {
              newFilteredValues.Source = typedResponse.values['Source'] || [];
            } else {
              newFilteredValues.Source = distinctValues.Source || [];
            }
            
            // Category is filtered if Source is selected
            if (selectedSpecialFields.Source && typedResponse.values['Category']) {
              newFilteredValues.Category = typedResponse.values['Category'] || [];
            } else {
              newFilteredValues.Category = distinctValues.Category || [];
            }
            
            // Sub Category is filtered if both Source and Category are selected
            if (selectedSpecialFields.Category && typedResponse.values['Sub Category']) {
              newFilteredValues['Sub Category'] = typedResponse.values['Sub Category'] || [];
            } else {
              newFilteredValues['Sub Category'] = distinctValues['Sub Category'] || [];
            }
            
            // Year is filtered if all previous filters are selected
            if (selectedSpecialFields['Sub Category'] && typedResponse.values['Year']) {
              newFilteredValues.Year = typedResponse.values['Year'] || [];
            } else {
              newFilteredValues.Year = distinctValues.Year || [];
            }
            
            return newFilteredValues;
          });
        } else {
          const errorResponse = response as { success: boolean; error?: string };
          throw new Error(errorResponse.error || 'Failed to fetch filtered distinct values');
        }
      } catch (error) {
        console.error('Error fetching filtered distinct values:', error);
      } finally {
        setLoadingFiltered(false);
      }
    };

    fetchFilteredValues();
  }, [selectedSpecialFields, loadingDistinct]);

  // Filter out the special fields from the regular fields
  const regularFields = useMemo(() => {
    return fields.filter(field => !['Source', 'Category', 'Sub Category', 'Year'].includes(field.value));
  }, [fields]);

  const filteredFields = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return regularFields;
    
    return regularFields.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        option.value.toLowerCase().includes(term)
    );
  }, [regularFields, searchTerm]);

  const selectedFieldLabels = useMemo(() => {
    return selectedFields
      .filter(field => !['Source', 'Category', 'Sub Category', 'Year'].includes(field)) // Only show regular fields in the tags
      .map((field) => {
        const fieldDef = regularFields.find((f) => f.value === field);
        return fieldDef
          ? { value: field, label: fieldDef.label, type: fieldDef.type }
          : null;
      })
      .filter(
        (field): field is { value: string; label: string; type: import("./types").FieldType } =>
          field !== null
      );
  }, [selectedFields, regularFields]);

  /**
   * Handles field selection from both dropdown (no event) and chip remove (with event).
   * Always updates state. Logs entry and exit for debugging.
   */
  const handleFieldSelect = (fieldValue: string) => {
    // Don't allow special fields to be deselected
    if (['Source', 'Category', 'Sub Category', 'Year'].includes(fieldValue)) {
      return;
    }
    
    const newSelectedFields = selectedFields.includes(fieldValue)
      ? selectedFields.filter((value) => value !== fieldValue)
      : [...selectedFields, fieldValue];
    onFieldsChange(newSelectedFields);
  };

  /**
   * Handles changes to special fields
   */
  const handleSpecialFieldChange = (fieldName: keyof SpecialFilters, value: string | string[] | number[] | number | undefined) => {
    const updatedSpecialFields = { ...selectedSpecialFields };
    
    // Set the new value
    updatedSpecialFields[fieldName] = value;
    
    // Reset dependent fields based on the hierarchy: Source -> Category -> Sub Category -> Year
    if (fieldName === 'Source') {
      if (!value) {
        // If Source is being cleared, clear all dependent fields
        updatedSpecialFields.Category = '';
        updatedSpecialFields['Sub Category'] = '';
        updatedSpecialFields.Year = undefined;
      } else {
        // When Source changes to a new value, reset Category, Sub Category, and Year
        updatedSpecialFields.Category = '';
        updatedSpecialFields['Sub Category'] = '';
        updatedSpecialFields.Year = undefined;
      }
    } else if (fieldName === 'Category') {
      if (!value) {
        // If Category is being cleared, clear all dependent fields (Sub Category and Year)
        updatedSpecialFields['Sub Category'] = '';
        updatedSpecialFields.Year = undefined;
      } else {
        // When Category changes to a new value, reset Sub Category and Year (only if Source is set)
        if (updatedSpecialFields.Source) {
          updatedSpecialFields['Sub Category'] = '';
          updatedSpecialFields.Year = undefined;
        }
      }
    } else if (fieldName === 'Sub Category') {
      if (!value) {
        // If Sub Category is being cleared, clear Year
        updatedSpecialFields.Year = undefined;
      } else {
        // When Sub Category changes to a new value, reset Year (only if Source and Category are set)
        if (updatedSpecialFields.Source && updatedSpecialFields.Category) {
          updatedSpecialFields.Year = undefined;
        }
      }
    }
    // Note: When Year changes, we don't reset anything since it's the last in the hierarchy
    
    setSelectedSpecialFields(updatedSpecialFields);
    
    if (onSpecialFiltersChange) {
      onSpecialFiltersChange(updatedSpecialFields);
    }
  };

  /**
   * Handles checkbox changes for multi-select fields like Year
   */
  const handleYearCheckboxChange = (year: number | string) => {
    const currentYears = Array.isArray(selectedSpecialFields.Year) ? selectedSpecialFields.Year as (string | number)[] : [];
    const newYears = currentYears.some(y => y === year)
      ? currentYears.filter(y => y !== year)
      : [...currentYears, year];

    // Determine the type of the array and return appropriate type
    if (newYears.length === 0) {
      handleSpecialFieldChange('Year', undefined);
    } else if (typeof year === 'number') {
      // If the year is a number, ensure we have only numbers in the array
      const numberYears = newYears.filter((y): y is number => typeof y === 'number');
      handleSpecialFieldChange('Year', numberYears.length > 0 ? numberYears : undefined);
    } else {
      // If the year is a string, ensure we have only strings in the array
      const stringYears = newYears.filter((y): y is string => typeof y === 'string');
      handleSpecialFieldChange('Year', stringYears.length > 0 ? stringYears : undefined);
    }
  };

  // Combined loading state
  const loading = fieldsLoading || loadingDistinct || loadingFiltered;
  const error = fieldsError || errorDistinct;

  return (
    <div className="space-y-4 bg-background p-3 rounded-lg border border-border">
      {/* Special Filters Section */}
      <div className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <Label>Special Filters</Label>
        </div>
        {errorDistinct && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            Error loading special filters: {errorDistinct}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Source Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Source</Label>
            <select
              value={selectedSpecialFields.Source}
              onChange={(e) => handleSpecialFieldChange('Source', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-9"
              disabled={loadingDistinct || loadingFiltered || disabled}
            >
              <option value="">All Sources</option>
              {(filteredValues.Source || distinctValues.Source || []).map((source, idx) => (
                <option key={idx} value={source}>{source}</option>
              ))}
            </select>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Category</Label>
            <select
              value={selectedSpecialFields.Category}
              onChange={(e) => handleSpecialFieldChange('Category', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-9"
              disabled={loadingDistinct || loadingFiltered || disabled}
            >
              <option value="">All Categories</option>
              {(filteredValues.Category || distinctValues.Category || []).map((category, idx) => (
                <option key={idx} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Sub Category Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Sub Category</Label>
            <select
              value={selectedSpecialFields['Sub Category']}
              onChange={(e) => handleSpecialFieldChange('Sub Category', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-9"
              disabled={loadingDistinct || loadingFiltered || disabled}
            >
              <option value="">All Sub Categories</option>
              {(filteredValues['Sub Category'] || distinctValues['Sub Category'] || []).map((subCategory, idx) => (
                <option key={idx} value={subCategory}>{subCategory}</option>
              ))}
            </select>
          </div>

          {/* Year Multi-Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Year</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto min-h-9 py-1.5 bg-background hover:bg-accent/50 text-sm text-muted-foreground"
                  disabled={loadingDistinct || loadingFiltered || disabled}
                >
                  <span className="truncate">{(!selectedSpecialFields.Year || selectedSpecialFields.Year.length === 0) ? 'All Years' : `${selectedSpecialFields.Year.length} selected`}</span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 bg-popover border-border" align="start">
                <div className="p-2 max-h-60 overflow-y-auto">
                  {(filteredValues.Year || distinctValues.Year || []).map((year: string | number, idx: number) => (
                    <div key={idx} className="flex items-center py-1 space-x-2 hover:bg-accent rounded px-2">
                      <Checkbox
                        id={`year-${year}`}
                        checked={Array.isArray(selectedSpecialFields.Year) && (selectedSpecialFields.Year as (string | number)[]).some(y => y === year)}
                        onCheckedChange={() => handleYearCheckboxChange(year)}
                      />
                      <label
                        htmlFor={`year-${year}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {year}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Regular Field Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Display Fields</Label>
          <span className="text-sm text-muted-foreground">
            {selectedFields.length} selected
          </span>
        </div>
        <div className="text-xs text-muted-foreground mb-1">
          Select special filters to narrow field options. Fields will filter based on selected values.
        </div>
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            Error loading fields: {error}
          </div>
        )}
        {(fieldsLoading || loadingFiltered) && (
          <div className="text-sm text-muted-foreground">
            {loadingFiltered ? "Updating options based on selected filters..." : "Updating field list based on selections..."}
          </div>
        )}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="w-full">
              <div>
                {selectedFieldLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-w-full mb-2">
                    {selectedFieldLabels.map((field) => (
                      <Badge
                        key={field.value}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1 text-sm text-foreground"
                      >
                        {field.label}
                        <button
                          aria-label={`Remove ${field.label}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            // Don't allow removal of special fields
                            if (['Source', 'Category', 'Sub Category', 'Year'].includes(field.value)) {
                              return;
                            }
                            handleFieldSelect(field.value);
                          }}
                          className="rounded-full hover:bg-accent/50 p-0.5"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isOpen}
                  className="w-full justify-between h-auto min-h-10 py-1.5 bg-background hover:bg-accent/50"
                  disabled={disabled || loading || regularFields.length === 0}
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <span className={selectedFieldLabels.length === 0 ? "text-muted-foreground" : "text-foreground"}>
                    {selectedFieldLabels.length === 0 ? 'Select fields to display...' : 'Edit selection'}
                  </span>
                  {fieldsLoading ? (
                    <div className="ml-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  )}
                </Button>
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-[400px] p-0 bg-popover border-border"
            align="start"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsOpen(false);
            }}
          >
            <Command className="rounded-lg border border-border shadow-md bg-popover">
              <div className="px-3 pt-2">
                  <CommandInput
                    placeholder="Search fields..."
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    className="h-9 text-foreground"
                    autoFocus={false}
                  />
              </div>
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  {fieldsLoading ? "Loading fields based on your selections..." : "No fields found."}
                </CommandEmpty>
              <CommandGroup className="overflow-y-auto max-h-[300px]">
                {filteredFields.map((option) => {
                  const isSelected = selectedFields.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        // Don't allow selecting special fields since they're already automatically selected
                        if (['Source', 'Category', 'Sub Category', 'Year'].includes(option.value)) {
                          return;
                        }
                        handleFieldSelect(option.value);
                        // Keep the popover open to allow multiple selections
                        // setIsOpen(false); // Commented out to keep popover open
                      }}
                      disabled={false}
                      data-disabled="false"
                      className={cn(
                        "cursor-pointer px-3 py-2 text-sm flex items-center gap-2 bg-background/95 hover:bg-accent hover:text-accent-foreground",
                        "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto",
                        "dark:data-[selected]:bg-accent dark:data-[selected]:text-accent-foreground",
                        "transition-colors duration-200"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 dark:border-muted-foreground/50"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="font-medium text-foreground">{option.label}</span>
                      <Badge
                        variant="outline"
                        className="ml-auto text-xs font-normal text-muted-foreground border-border/50"
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
    </div>
  );
};
