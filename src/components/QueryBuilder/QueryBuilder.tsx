import { useState, useCallback, useMemo } from "react";
import { Button } from "../ui/button";
import { Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldDefinition, FieldOption, FilterCondition } from "./types";
import { FieldSelector } from "./FieldSelector";
import { FilterControls } from "./FilterControls";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "./constants";

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

export function QueryBuilder({
  fields = [],
  selectedFields = [],
  onFieldsChange,
  onExecute,
  loading = false,
  error,
  className,
  defaultShowFilters = false,
  page = DEFAULT_PAGE,
  pageSize = DEFAULT_PAGE_SIZE,
  fieldsLoading = false,
}: QueryBuilderProps) {
  // State for filters
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [showFilters, setShowFilters] = useState(defaultShowFilters);

  // Field options for the dropdown
  const fieldOptions = useMemo<FieldOption[]>(() => {
    console.log('[QueryBuilder] Processing fields:', fields);
    if (!fields || !Array.isArray(fields)) {
      console.warn("Invalid fields prop:", fields);
      return [];
    }

    const options = fields.map((field) => ({
      value: field.name,
      label: field.label || field.name,
      type: field.type,
      ...field,
    }));
    
    console.log('[QueryBuilder] Generated field options:', options);
    return options;
  }, [fields]);
  
  // Handle fields change
  const handleFieldsChange = useCallback((newFields: string[]) => {
    console.log('[QueryBuilder] Fields changed:', newFields);
    onFieldsChange(newFields);
  }, [onFieldsChange]);

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
    // Ensure we have valid fields to query
    const validFields = selectedFields.filter((field) =>
      fieldOptions.some((f) => f.value === field)
    );

    if (validFields.length === 0) {
      console.warn("No valid fields selected for query");
      return;
    }

    onExecute({
      fields: validFields,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
  }, [onExecute, selectedFields, fieldOptions, page, pageSize]);

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
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-4">
        {/* Field Selection */}
        <div className="space-y-2">
          <FieldSelector
            fields={fieldOptions}
            selectedFields={selectedFields}
            onFieldsChange={handleFieldsChange}
            loading={fieldsLoading}
            disabled={fieldsLoading}
          />
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        {/* Filters Section */}
        <div className="space-y-2">
          <FilterControls
            fields={fieldOptions}
            filters={filters}
            onFiltersChange={handleFilterChange}
            onAddFilter={handleAddFilter}
            onRemoveFilter={handleRemoveFilter}
            defaultShowFilters={showFilters}
          />
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

export default QueryBuilder;
