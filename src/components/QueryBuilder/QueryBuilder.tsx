import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "../ui/button";
import { Loader2, Play, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldDefinition, FieldOption, FilterCondition } from "./types";
import { FieldSelector } from "./FieldSelector";
import { FilterControls } from "./FilterControls";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "./constants";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";

interface QueryBuilderProps {
  fields: FieldDefinition[];
  selectedFields: string[];
  onFieldsChange: (_fields: string[]) => void;
  onExecute: (_query: { fields: string[]; filters: FilterCondition[]; limit: number; offset: number }) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
  defaultShowFilters?: boolean;
  page?: number;
  pageSize?: number;
  fieldsLoading?: boolean;
  baseUrl?: string; // Add baseUrl prop for API endpoint
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
  baseUrl = '/api/v2/query/rows', // Default baseUrl
}: QueryBuilderProps) {
  // State for filters
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [showFilters, setShowFilters] = useState(defaultShowFilters);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');

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
  
  // Handle fields change
  const handleFieldsChange = useCallback((newFields: string[]) => {
    console.log('[QueryBuilder] Fields changed:', newFields);
    onFieldsChange(newFields);
  }, [onFieldsChange]);

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
      filters,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
  }, [onExecute, selectedFields, fieldOptions, page, pageSize, filters]);

  // Generate API URL (from ApiQueryBuilder)
  const generateApiUrl = useCallback(() => {
    const body = {
      fields: selectedFields,
      filters: filters.filter(f => f.field && f.operator && f.value),
      limit: 10,
      offset: 0,
    };

    // Using the GET endpoint with query parameters
    const baseUrlGet = baseUrl.replace('/rows', '/rows-get');
    const fullUrl = `${window.location.origin}${baseUrlGet}`;

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('fields', selectedFields.join(','));

    if (body.filters.length > 0) {
      queryParams.append('filters', JSON.stringify(body.filters));
    }

    queryParams.append('limit', body.limit.toString());
    queryParams.append('offset', body.offset.toString());

    const fullUrlWithParams = `${fullUrl}?${queryParams.toString()}`;

    const pythonCode = `import requests

url = "${fullUrlWithParams}"
headers = {
    "x-api-key": "YOUR_API_KEY"
}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())`;

    setGeneratedUrl(pythonCode);
  }, [selectedFields, filters, baseUrl]);

  // Handle copy URL (from ApiQueryBuilder)
  const handleCopyUrl = useCallback(() => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      // Note: We're not implementing toast here since it's not imported
      console.log('API URL copied to clipboard.');
    }
  }, [generatedUrl]);

  // Generate URL when fields or filters change
  useEffect(() => {
    generateApiUrl();
  }, [selectedFields, filters, generateApiUrl]);

  // Handle loading state
  if (fieldsLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Build Your API Query</CardTitle>
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

  // Handle no fields case
  if (fieldOptions.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Build Your API Query</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-muted-foreground">
            No fields available to query.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main render
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Build Your API Query</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              {/* Field Selection */}
              <div className="flex-1 space-y-2">
                <FieldSelector
                  selectedFields={selectedFields}
                  onFieldsChange={handleFieldsChange}
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

          {/* Generate URL Button */}
          <div className="flex justify-end space-x-2">
            <Button
              onClick={generateApiUrl}
              variant="outline"
            >
              Generate API URL
            </Button>
            
            {/* Execute Button */}
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

          {/* Generated URL Section */}
          {generatedUrl && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="apiUrl">Generated Python Code</Label>
              <div className="flex items-center space-x-2">
                <textarea 
                  id="apiUrl" 
                  value={generatedUrl} 
                  readOnly 
                  className="flex-1 w-full h-48 p-2 border rounded-md bg-gray-100 dark:bg-gray-800" 
                />
                <Button 
                  onClick={handleCopyUrl} 
                  size="icon" 
                  variant="outline" 
                  aria-label="Copy URL"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Replace `YOUR_API_KEY` with your actual API key.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default QueryBuilder;
