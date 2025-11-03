import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "../ui/button";
import { ChevronsUpDown, X as XIcon, Search } from "lucide-react";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { useDebouncedApi } from "@/hooks/useDebouncedApi";

interface SpecialFilters {
  Source: string;
  Category: string;
  'Sub Category': string;
  Year: string[] | number[];
  FileId?: string;
}

interface FileSelectorProps {
  selectedFile: string;
  onFileChange: (fileId: string) => void;
  onSpecialFiltersChange?: (filters: SpecialFilters) => void;
  disabled?: boolean;
}

export const FileSelector = ({
  selectedFile = '',
  onFileChange,
  onSpecialFiltersChange,
  disabled = false,
}: FileSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fileSearchTerm, setFileSearchTerm] = useState("");
  
  const { 
    distinctValues, 
    filteredValues, 
    files, 
    loading, 
    error,
    fetchDistinctValues,
    fetchFilteredValues,
    fetchCascadingDistinctValues,
    fetchFilesWithDebounce
  } = useDebouncedApi();
  
  const [selectedSpecialFields, setSelectedSpecialFields] = useState<SpecialFilters>({
    Source: '',
    Category: '',
    'Sub Category': '',
    Year: [],
    FileId: selectedFile,
  });

  // Initialize with special fields if they're not already selected
  useEffect(() => {
    setSelectedSpecialFields(prev => ({
      ...prev,
      FileId: selectedFile
    }));
  }, [selectedFile]);

  // Load initial distinct values when component mounts
  useEffect(() => {
    fetchDistinctValues();
  }, [fetchDistinctValues]);

  // Update cascading distinct values when special filters change
  useEffect(() => {
    fetchCascadingDistinctValues({
      source: selectedSpecialFields.Source,
      category: selectedSpecialFields.Category,
    });
  }, [selectedSpecialFields.Source, selectedSpecialFields.Category, fetchCascadingDistinctValues]);

  // Update files when special filters change (with debouncing to avoid rate limits)
  useEffect(() => {
    fetchFilesWithDebounce({
      source: selectedSpecialFields.Source,
      category: selectedSpecialFields.Category,
      subCategory: selectedSpecialFields['Sub Category'],
      searchTerm: fileSearchTerm
    });
  }, [selectedSpecialFields.Source, selectedSpecialFields.Category, selectedSpecialFields['Sub Category'], fileSearchTerm, fetchFilesWithDebounce]);

  // Fetch filtered values when FileId changes (for Year)
  useEffect(() => {
    if (selectedSpecialFields.FileId && 
        selectedSpecialFields.Source && 
        selectedSpecialFields.Category && 
        selectedSpecialFields['Sub Category']) {
      fetchFilteredValues({
        source: selectedSpecialFields.Source,
        category: selectedSpecialFields.Category,
        subCategory: selectedSpecialFields['Sub Category'],
        fileId: selectedSpecialFields.FileId
      });
    }
  }, [selectedSpecialFields, fetchFilteredValues]);

  /**
   * Handles changes to special fields
   */
  const handleSpecialFieldChange = useCallback((fieldName: keyof SpecialFilters, value: string | string[] | number[] | number) => {
    const updatedSpecialFields = { ...selectedSpecialFields };
    
    // Set the new value
    updatedSpecialFields[fieldName] = value as any;
    
    // Reset dependent fields based on the hierarchy: Source -> Category -> Sub Category -> File -> Year
    if (fieldName === 'Source') {
      if (!value) {
        // If Source is being cleared, clear all dependent fields
        updatedSpecialFields.Category = '';
        updatedSpecialFields['Sub Category'] = '';
        updatedSpecialFields.FileId = '';
        updatedSpecialFields.Year = [];
      } else {
        // When Source changes to a new value, reset Category, Sub Category, File and Year
        updatedSpecialFields.Category = '';
        updatedSpecialFields['Sub Category'] = '';
        updatedSpecialFields.FileId = '';
        updatedSpecialFields.Year = [];
      }
    } else if (fieldName === 'Category') {
      if (!value) {
        // If Category is being cleared, clear all dependent fields (Sub Category, File and Year)
        updatedSpecialFields['Sub Category'] = '';
        updatedSpecialFields.FileId = '';
        updatedSpecialFields.Year = [];
      } else {
        // When Category changes to a new value, reset Sub Category, File and Year (only if Source is set)
        if (updatedSpecialFields.Source) {
          updatedSpecialFields['Sub Category'] = '';
          updatedSpecialFields.FileId = '';
          updatedSpecialFields.Year = [];
        }
      }
    } else if (fieldName === 'Sub Category') {
      if (!value) {
        // If Sub Category is being cleared, clear File and Year
        updatedSpecialFields.FileId = '';
        updatedSpecialFields.Year = [];
      } else {
        // When Sub Category changes to a new value, reset File and Year (only if Source and Category are set)
        if (updatedSpecialFields.Source && updatedSpecialFields.Category) {
          updatedSpecialFields.FileId = '';
          updatedSpecialFields.Year = [];
        }
      }
    } else if (fieldName === 'FileId') {
      // When FileId changes, reset Year (only if all previous filters are set)
      if (updatedSpecialFields.Source && updatedSpecialFields.Category && updatedSpecialFields['Sub Category']) {
        updatedSpecialFields.Year = [];
      }
      // Update the file selection in the parent component
      onFileChange(value as string);
    } else if (fieldName === 'Year') {
      // When Year changes, we don't reset anything since it's the last in the hierarchy
      // Just update the Year values
      updatedSpecialFields.Year = value as string[] | number[];
    }
    // Note: When Year changes, we don't reset anything since it's the last in the hierarchy
    
    setSelectedSpecialFields(updatedSpecialFields);
    
    if (onSpecialFiltersChange) {
      onSpecialFiltersChange(updatedSpecialFields);
    }
  }, [selectedSpecialFields, onFileChange, onSpecialFiltersChange]);

  /**
   * Handles checkbox changes for multi-select fields like Year
   */
  const handleYearCheckboxChange = (year: number | string) => {
    const currentYears = Array.isArray(selectedSpecialFields.Year) ? selectedSpecialFields.Year : [];
    const newYears = currentYears.some(y => y === year)
      ? currentYears.filter(y => y !== year)
      : [...currentYears, year];
    // Ensure array contains only numbers if year is a number, or only strings if year is a string
    const typedNewYears: string[] | number[] = typeof year === 'number' 
      ? newYears.filter((y): y is number => typeof y === 'number')
      : newYears.filter((y): y is string => typeof y === 'string');
    handleSpecialFieldChange('Year', typedNewYears);
  };

  // Get selected file label
  const selectedFileLabel = useMemo(() => {
    const file = files.find(f => {
      const fileId = f.id || f._importId;
      return fileId === selectedSpecialFields.FileId;
    });
    return file?.fileName || 'Select a file';
  }, [files, selectedSpecialFields.FileId]);

  // Convert files to FileOption format
  const fileOptions = useMemo(() => {
    console.log('[FileSelector] fileOptions useMemo, files:', files);
    return files.map((item: any) => ({
      value: item.id || item._importId || '',
      label: item.fileName || 'Untitled',
      fileName: item.fileName || 'Untitled',
      metadata: item
    }));
  }, [files]);

  return (
    <div className="space-y-4 bg-background p-3 rounded-lg border border-border">
      {/* Special Filters Section */}
      <div className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <Label>Special Filters</Label>
        </div>
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
            Error: {error}
          </div>
        )}
        <div className="space-y-3">
          {/* Row 1: Source, Category, Sub Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Source Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Source</Label>
              <select
                value={selectedSpecialFields.Source}
                onChange={(e) => handleSpecialFieldChange('Source', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-9"
                disabled={loading || disabled}
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-9"
                disabled={loading || disabled}
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-9"
                disabled={loading || disabled}
              >
                <option value="">All Sub Categories</option>
                {(filteredValues['Sub Category'] || distinctValues['Sub Category'] || []).map((subCategory, idx) => (
                  <option key={idx} value={subCategory}>{subCategory}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: File */}
          <div className="grid grid-cols-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">File</Label>
              <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className="w-full justify-between h-auto min-h-9 py-1.5 bg-background hover:bg-accent/50 text-left"
                    disabled={loading || disabled || !selectedSpecialFields['Sub Category']}
                  >
                    <span className={selectedFile ? "text-foreground" : "text-muted-foreground"}>
                      {selectedFile ? selectedFileLabel : 'Select file...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-popover border-border" align="start">
                  <div className="relative">
                    <Command className="rounded-lg border border-border shadow-md bg-popover">
                      <div className="px-3 pt-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <CommandInput
                            placeholder="Search files..."
                            value={fileSearchTerm}
                            onValueChange={setFileSearchTerm}
                            className="h-9 text-foreground pl-9"
                            autoFocus={false}
                          />
                        </div>
                      </div>
                      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                        {loading ? "Loading files..." : "No files found."}
                      </CommandEmpty>
                      <CommandGroup className="overflow-y-auto max-h-[300px]">
                        {fileOptions.map((file) => {
                          const isSelected = selectedSpecialFields.FileId === file.value;
                          return (
                            <div
                              key={file.value}
                              onClick={() => {
                                console.log(`[FileSelector] File clicked: ${file.value}`);
                                handleSpecialFieldChange('FileId', file.value);
                                setIsOpen(false);
                              }}
                              className="cursor-pointer px-3 py-2 text-sm flex items-center gap-2 bg-background/95 hover:bg-accent hover:text-accent-foreground"
                            >
                              <div className="flex items-center">
                                <div
                                  className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-full border mr-2",
                                    isSelected
                                      ? "bg-primary border-primary"
                                      : "border-muted-foreground/30 dark:border-muted-foreground/50"
                                  )}
                                >
                                  {isSelected && <div className="h-2 w-2 bg-primary-foreground rounded-full" />}
                                </div>
                                <span className="font-medium text-foreground">{file.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Row 3: Year */}
          <div className="grid grid-cols-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Year</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto min-h-9 py-1.5 bg-background hover:bg-accent/50 text-sm text-muted-foreground"
                    disabled={loading || disabled || !selectedSpecialFields.FileId}
                  >
                    <span className="truncate">{selectedSpecialFields.Year.length === 0 ? 'All Years' : `${selectedSpecialFields.Year.length} selected`}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 bg-popover border-border" align="start">
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {(filteredValues.Year || []).map((year: string | number, idx: number) => (
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
      </div>

      {/* Selected File Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Selected File</Label>
          <span className="text-sm text-muted-foreground">
            {selectedFile ? 'File selected' : 'No file selected'}
          </span>
        </div>
        {selectedFile && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 text-sm">
              {selectedFileLabel}
              <button
                aria-label={`Remove ${selectedFileLabel}`}
                onClick={() => {
                  handleSpecialFieldChange('FileId', '');
                }}
                className="rounded-full hover:bg-accent/50 p-0.5"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};