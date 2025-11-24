import { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterCondition, QueryBuilderProps, SpecialFilters } from "./types";
import { FileSelector } from "./FileSelector";
import { FilterControls } from "./FilterControls";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "./constants";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useFields } from "@/hooks/useFields";

export function QueryBuilder({
  fields: _fields = [], // Kept for backward compatibility but not used directly (dynamic fields used instead)
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
    Year: undefined as string[] | number[] | undefined,
    FileId: selectedFile,
  });
  const [showFilters, setShowFilters] = useState(defaultShowFilters);

  // Use the useFields hook with special filters to get dynamic fields based on selected file
  const { fields: dynamicFields, loading: dynamicFieldsLoading, error: fieldsError } = useFields(undefined, {
    Source: specialFilters.Source,
    Category: specialFilters.Category,
    'Sub Category': specialFilters['Sub Category'],
    Year: specialFilters.Year
  });

  // Handle file change
  const handleFileChange = useCallback((fileId: string) => {
    console.log('[QueryBuilder] File changed:', fileId);
    onFileChange(fileId);
  }, [onFileChange]);

  // Handle special filters change
  const handleSpecialFiltersChange = useCallback((newSpecialFilters: SpecialFilters) => {
    setSpecialFilters(prevSpecialFilters => {
      // Update the file selection when special filters change
      if (newSpecialFilters.FileId !== prevSpecialFilters.FileId) {
        onFileChange(newSpecialFilters.FileId || '');
      }
      return newSpecialFilters;
    });
  }, [onFileChange]);

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
    const allQueryFields = ['Source', 'Category', 'Sub Category']; // These will be included by default in the file query (Year is no longer mandatory)

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

  // Show loading state only during initial load when no fields are available yet
  // After initial load, the useFields hook maintains previous fields while loading new ones,
  // so we don't need to show a full loading state during special filter changes
  if ((fieldsLoading || dynamicFieldsLoading) && dynamicFields.length === 0) {
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
                {fieldsError && <div className="text-sm text-destructive">Fields Error: {fieldsError}</div>}
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
                  fields={dynamicFields}
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
