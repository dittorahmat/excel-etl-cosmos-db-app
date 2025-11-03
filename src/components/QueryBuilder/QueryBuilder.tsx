import { useState, useCallback, useMemo } from "react";
import { Button } from "../ui/button";
import { Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldOption, FilterCondition, QueryBuilderProps, SpecialFilters } from "./types";
import { FileSelector } from "./FileSelector";
import { FilterControls } from "./FilterControls";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "./constants";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function QueryBuilder({
  fields = [],
  selectedFile = '',
  onFileChange,
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
  const [specialFilters, setSpecialFilters] = useState<SpecialFilters>({
    Source: '',
    Category: '',
    'Sub Category': '',
    Year: [],
    FileId: selectedFile,
  });
  const [showFilters, setShowFilters] = useState(defaultShowFilters);

  // Field options for the dropdown
  const fieldOptions = useMemo<FieldOption[]>(() => {
    if (!fields || !Array.isArray(fields)) {
      console.warn("Invalid fields prop:", fields);
      return [];
    }

    return fields.map((field) => ({
      value: field.name,
      label: field.label || field.name,
      type: field.type,
    }));
  }, [fields]);

  // Handle file change
  const handleFileChange = useCallback((fileId: string) => {
    console.log('[QueryBuilder] File changed:', fileId);
    onFileChange(fileId);
  }, [onFileChange]);

  // Handle special filters change
  const handleSpecialFiltersChange = useCallback((newSpecialFilters: SpecialFilters) => {
    setSpecialFilters(newSpecialFilters);
    // Update the file selection when special filters change
    if (newSpecialFilters.FileId !== specialFilters.FileId) {
      onFileChange(newSpecialFilters.FileId || '');
    }
  }, [onFileChange, specialFilters.FileId]);

  // Handle filter changes - using direct state setter in JSX now

  // Add a new filter
  const handleAddFilter = useCallback(() => {
    const newFilter: FilterCondition = {
      id: `filter-${Date.now()}`,
      field: "",
      operator: "",
      value: "",
    };
    setFilters((prevFilters) => [...prevFilters, newFilter]);
  }, []);

  // Remove a filter
  const handleRemoveFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((filter) => filter.id !== id));
  }, []);

  // Handle execute button click
  const handleExecuteClick = useCallback(() => {
    // For file-based queries, we get all fields from the file
    const allQueryFields = ['Source', 'Category', 'Sub Category', 'Year']; // These will be included by default in the file query

    // Only proceed if we have a selected file
    if (!specialFilters.FileId) {
      console.warn("No file selected for query");
      return;
    }

    onExecute({
      fields: allQueryFields, // This parameter is kept for compatibility but will be ignored in file-based queries
      filters: filters.filter(f => f.field && f.operator && f.value), // Only pass filters that are completely filled
      specialFilters: {
        ...specialFilters,
        FileId: specialFilters.FileId // Include the file ID in special filters
      },
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
  }, [onExecute, specialFilters, filters, page, pageSize]);

  // Handle loading state
  if (fieldsLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle></CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading fields...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main render
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle></CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              {/* File Selection */}
              <div className="flex-1 space-y-2">
                <FileSelector
                  selectedFile={selectedFile}
                  onFileChange={handleFileChange}
                  onSpecialFiltersChange={handleSpecialFiltersChange}
                  disabled={fieldsLoading}
                />
                {error && <div className="text-sm text-destructive">{error}</div>}
              </div>

              {/* Show Filters Button */}
              {!showFilters && (
                <div className="pt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(true)}
                    className="h-auto p-0 text-sm"
                  >
                    Show filters
                  </Button>
                </div>
              )}
            </div>

            {/* Filters Section - Only shown when filters are expanded */}
            {showFilters && (
              <div className="space-y-2">
                <FilterControls
                  fields={fieldOptions}
                  filters={filters}
                  onFiltersChange={(newFilters) => setFilters(newFilters)}
                  onAddFilter={handleAddFilter}
                  onRemoveFilter={handleRemoveFilter}
                  defaultShowFilters={true}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            {/* Execute Button */}
            <Button
              onClick={handleExecuteClick}
              disabled={loading || !selectedFile}
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
      </CardContent>
    </Card>
  );
}

export default QueryBuilder;
