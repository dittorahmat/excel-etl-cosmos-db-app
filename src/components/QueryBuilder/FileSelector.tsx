import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "../ui/button";
import { Check, ChevronsUpDown, X as XIcon, Search } from "lucide-react";
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
import { useDebouncedApi } from "@/hooks/useDebouncedApi";

interface SpecialFilters {
  Source: string;
  Category: string;
  'Sub Category': string;
  Year?: string[] | number[];
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
    Year: undefined,
    FileId: selectedFile,
  });

  // Helper function to remove file extension from filename
  const removeFileExtension = (filename: string | undefined | null): string => {
    if (!filename) return filename || 'Untitled';
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) return filename; // No extension found
    return filename.substring(0, lastDotIndex);
  };

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
      searchTerm: '' // Don't pass search term to backend - handle search on frontend
    });
  }, [selectedSpecialFields.Source, selectedSpecialFields.Category, selectedSpecialFields['Sub Category'], fetchFilesWithDebounce]);

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
  const handleSpecialFieldChange = useCallback((fieldName: keyof SpecialFilters, value: string | string[] | number[] | number | undefined) => {
    const updatedSpecialFields = { ...selectedSpecialFields };

    // Set the new value - properly typed assignment
    if (fieldName === 'Source') {
      updatedSpecialFields.Source = value as string;
    } else if (fieldName === 'Category') {
      updatedSpecialFields.Category = value as string;
    } else if (fieldName === 'Sub Category') {
      updatedSpecialFields['Sub Category'] = value as string;
    } else if (fieldName === 'FileId') {
      updatedSpecialFields.FileId = value as string;
    } else if (fieldName === 'Year') {
      updatedSpecialFields.Year = value as string[] | number[] | undefined;
    }
    
    // Reset dependent fields based on the hierarchy: Source -> Category -> Sub Category -> File -> Year
    if (fieldName === 'Source') {
      if (!value) {
        // If Source is being cleared, clear all dependent fields
        updatedSpecialFields.Category = '';
        updatedSpecialFields['Sub Category'] = '';
        updatedSpecialFields.FileId = '';
        updatedSpecialFields.Year = undefined;
      } else {
        // When Source changes to a new value, reset Category, Sub Category, File and Year
        updatedSpecialFields.Category = '';
        updatedSpecialFields['Sub Category'] = '';
        updatedSpecialFields.FileId = '';
        updatedSpecialFields.Year = undefined;
      }
    } else if (fieldName === 'Category') {
      if (!value) {
        // If Category is being cleared, clear all dependent fields (Sub Category, File and Year)
        updatedSpecialFields['Sub Category'] = '';
        updatedSpecialFields.FileId = '';
        updatedSpecialFields.Year = undefined;
      } else {
        // When Category changes to a new value, reset Sub Category, File and Year (only if Source is set)
        if (updatedSpecialFields.Source) {
          updatedSpecialFields['Sub Category'] = '';
          updatedSpecialFields.FileId = '';
          updatedSpecialFields.Year = undefined;
        }
      }
    } else if (fieldName === 'Sub Category') {
      if (!value) {
        // If Sub Category is being cleared, clear File and Year
        updatedSpecialFields.FileId = '';
        updatedSpecialFields.Year = undefined;
      } else {
        // When Sub Category changes to a new value, reset File and Year (only if Source and Category are set)
        if (updatedSpecialFields.Source && updatedSpecialFields.Category) {
          updatedSpecialFields.FileId = '';
          updatedSpecialFields.Year = undefined;
        }
      }
    } else if (fieldName === 'FileId') {
      // When FileId changes, reset Year (only if all previous filters are set)
      if (updatedSpecialFields.Source && updatedSpecialFields.Category && updatedSpecialFields['Sub Category']) {
        updatedSpecialFields.Year = undefined;
      }
      // Update the file selection in the parent component
      onFileChange(value as string);
    } else if (fieldName === 'Year') {
      // When Year changes, we don't reset anything since it's the last in the hierarchy
      // Just update the Year values
      updatedSpecialFields.Year = value as string[] | number[] | undefined;
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

  // Get selected file label
  const selectedFileLabel = useMemo((): string => {
    const file = files.find(f => {
      const fileId = f.id || f._importId;
      return fileId === selectedSpecialFields.FileId;
    });
    const fileName = file && typeof file === 'object' && 'fileName' in file ? (file as {fileName?: string}).fileName : undefined;
    return removeFileExtension(fileName || 'Select a file');
  }, [files, selectedSpecialFields.FileId, removeFileExtension]);

  // Convert files to FileOption format
  const fileOptions = useMemo(() => {
    console.log('[FileSelector] fileOptions useMemo, files:', files);
    interface FileItem {
      id?: string;
      _importId?: string;
      fileName?: string;
      [key: string]: unknown;
    }

    return files.map((item: FileItem) => ({
      value: item.id || item._importId || '',
      label: removeFileExtension(item.fileName || 'Untitled'),
      fileName: item.fileName || 'Untitled',
      metadata: item
    }));
  }, [files, removeFileExtension]);

  // Filter file options based on search term (frontend search)
  const filteredFileOptions = useMemo(() => {
    if (!fileSearchTerm) {
      return fileOptions;
    }
    
    const term = fileSearchTerm.toLowerCase();
    return fileOptions.filter(option =>
      option.label.toLowerCase().includes(term) ||
      option.fileName.toLowerCase().includes(term)
    );
  }, [fileOptions, fileSearchTerm]);

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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-9 bg-background hover:bg-accent/50 text-left"
                    disabled={loading || disabled}
                  >
                    <span className={`${selectedSpecialFields.Source ? "text-foreground truncate" : "text-muted-foreground truncate"} min-w-0`}>
                      {selectedSpecialFields.Source || "Select source..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-popover border-border" align="start">
                  <div className="relative">
                    <Command className="rounded-lg border border-border shadow-md bg-popover">
                      <div className="px-3 pt-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <CommandInput
                            placeholder="Search sources..."
                            className="h-9 text-foreground pl-9"
                            autoFocus={false}
                          />
                        </div>
                      </div>
                      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                        No sources found.
                      </CommandEmpty>
                      <CommandGroup className="overflow-y-auto max-h-[300px]">
                        <CommandItem
                          value=""
                          onSelect={() => {
                            handleSpecialFieldChange('Source', '');
                          }}
                          className={cn(
                            "cursor-pointer px-3 py-2 text-sm flex items-start gap-2 bg-background/95 hover:bg-accent hover:text-accent-foreground justify-start",
                            "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto",
                            "dark:data-[selected]:bg-accent dark:data-[selected]:text-accent-foreground",
                            "transition-colors duration-200"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border",
                              !selectedSpecialFields.Source
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 dark:border-muted-foreground/50"
                            )}
                          >
                            {!selectedSpecialFields.Source && <Check className="h-3 w-3" />}
                          </div>
                          <span className="font-medium text-left" title="All Sources">All Sources</span>
                        </CommandItem>
                        {((filteredValues.Source || distinctValues.Source || []) as (string | number)[]).filter(val => typeof val !== 'boolean').map((source, idx) => (
                          <CommandItem
                            key={idx}
                            value={String(source)}
                            onSelect={() => {
                              handleSpecialFieldChange('Source', String(source));
                            }}
                            className={cn(
                              "cursor-pointer px-3 py-2 text-sm flex items-start gap-2 bg-background/95 hover:bg-accent hover:text-accent-foreground justify-start",
                              "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto",
                              "dark:data-[selected]:bg-accent dark:data-[selected]:text-accent-foreground",
                              "transition-colors duration-200"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-sm border",
                                selectedSpecialFields.Source === String(source)
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/30 dark:border-muted-foreground/50"
                              )}
                            >
                              {selectedSpecialFields.Source === String(source) && <Check className="h-3 w-3" />}
                            </div>
                            <span className="font-medium text-left" title={String(source)}>{String(source)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-9 bg-background hover:bg-accent/50 text-left"
                    disabled={loading || disabled || !selectedSpecialFields.Source}
                  >
                    <span className={`${selectedSpecialFields.Category ? "text-foreground truncate" : "text-muted-foreground truncate"} min-w-0`}>
                      {selectedSpecialFields.Category || "Select category..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-popover border-border" align="start">
                  <div className="relative">
                    <Command className="rounded-lg border border-border shadow-md bg-popover">
                      <div className="px-3 pt-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <CommandInput
                            placeholder="Search categories..."
                            className="h-9 text-foreground pl-9"
                            autoFocus={false}
                          />
                        </div>
                      </div>
                      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                        No categories found.
                      </CommandEmpty>
                      <CommandGroup className="overflow-y-auto max-h-[300px]">
                        <CommandItem
                          value=""
                          onSelect={() => {
                            handleSpecialFieldChange('Category', '');
                          }}
                          className={cn(
                            "cursor-pointer px-3 py-2 text-sm flex items-start gap-2 bg-background/95 hover:bg-accent hover:text-accent-foreground justify-start",
                            "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto",
                            "dark:data-[selected]:bg-accent dark:data-[selected]:text-accent-foreground",
                            "transition-colors duration-200"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border",
                              !selectedSpecialFields.Category
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 dark:border-muted-foreground/50"
                            )}
                          >
                            {!selectedSpecialFields.Category && <Check className="h-3 w-3" />}
                          </div>
                          <span className="font-medium text-left" title="All Categories">All Categories</span>
                        </CommandItem>
                        {((filteredValues.Category || distinctValues.Category || []) as (string | number)[]).filter(val => typeof val !== 'boolean').map((category, idx) => (
                          <CommandItem
                            key={idx}
                            value={String(category)}
                            onSelect={() => {
                              handleSpecialFieldChange('Category', String(category));
                            }}
                            className={cn(
                              "cursor-pointer px-3 py-2 text-sm flex items-start gap-2 bg-background/95 hover:bg-accent hover:text-accent-foreground justify-start",
                              "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto",
                              "dark:data-[selected]:bg-accent dark:data-[selected]:text-accent-foreground",
                              "transition-colors duration-200"
                            )}
                            disabled={!selectedSpecialFields.Source}
                          >
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-sm border",
                                selectedSpecialFields.Category === String(category)
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/30 dark:border-muted-foreground/50"
                              )}
                            >
                              {selectedSpecialFields.Category === String(category) && <Check className="h-3 w-3" />}
                            </div>
                            <span className="font-medium text-left" title={String(category)}>{String(category)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Sub Category Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Sub Category</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-9 bg-background hover:bg-accent/50 text-left"
                    disabled={loading || disabled || !selectedSpecialFields.Category}
                  >
                    <span className={`${selectedSpecialFields['Sub Category'] ? "text-foreground truncate" : "text-muted-foreground truncate"} min-w-0`}>
                      {selectedSpecialFields['Sub Category'] || "Select sub category..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-popover border-border" align="start">
                  <div className="relative">
                    <Command className="rounded-lg border border-border shadow-md bg-popover">
                      <div className="px-3 pt-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <CommandInput
                            placeholder="Search sub categories..."
                            className="h-9 text-foreground pl-9"
                            autoFocus={false}
                          />
                        </div>
                      </div>
                      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                        No sub categories found.
                      </CommandEmpty>
                      <CommandGroup className="overflow-y-auto max-h-[300px]">
                        <CommandItem
                          value=""
                          onSelect={() => {
                            handleSpecialFieldChange('Sub Category', '');
                          }}
                          className={cn(
                            "cursor-pointer px-3 py-2 text-sm flex items-start gap-2 bg-background/95 hover:bg-accent hover:text-accent-foreground justify-start",
                            "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto",
                            "dark:data-[selected]:bg-accent dark:data-[selected]:text-accent-foreground",
                            "transition-colors duration-200"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border",
                              !selectedSpecialFields['Sub Category']
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 dark:border-muted-foreground/50"
                            )}
                          >
                            {!selectedSpecialFields['Sub Category'] && <Check className="h-3 w-3" />}
                          </div>
                          <span className="font-medium text-left" title="All Sub Categories">All Sub Categories</span>
                        </CommandItem>
                        {((filteredValues['Sub Category'] || distinctValues['Sub Category'] || []) as (string | number)[]).filter(val => typeof val !== 'boolean').map((subCategory, idx) => (
                          <CommandItem
                            key={idx}
                            value={String(subCategory)}
                            onSelect={() => {
                              handleSpecialFieldChange('Sub Category', String(subCategory));
                            }}
                            className={cn(
                              "cursor-pointer px-3 py-2 text-sm flex items-start gap-2 bg-background/95 hover:bg-accent hover:text-accent-foreground justify-start",
                              "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto",
                              "dark:data-[selected]:bg-accent dark:data-[selected]:text-accent-foreground",
                              "transition-colors duration-200"
                            )}
                            disabled={!selectedSpecialFields.Category}
                          >
                            <div
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded-sm border",
                                selectedSpecialFields['Sub Category'] === String(subCategory)
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-muted-foreground/30 dark:border-muted-foreground/50"
                              )}
                            >
                              {selectedSpecialFields['Sub Category'] === String(subCategory) && <Check className="h-3 w-3" />}
                            </div>
                            <span className="font-medium text-left" title={String(subCategory)}>{String(subCategory)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </div>
                </PopoverContent>
              </Popover>
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
                    <span className={`${selectedFile ? "text-foreground truncate" : "text-muted-foreground truncate"} min-w-0`}>
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
                        {loading ? "Loading files..." : filteredFileOptions.length === 0 ? "No files found." : "No matching files found."}
                      </CommandEmpty>
                      <CommandGroup className="overflow-y-auto max-h-[300px]">
                        {filteredFileOptions.map((file) => {
                          const isSelected = selectedSpecialFields.FileId === file.value;
                          return (
                            <CommandItem
                              key={file.value}
                              value={file.value}
                              onSelect={() => {
                                console.log(`[FileSelector] File clicked: ${file.value}`);
                                handleSpecialFieldChange('FileId', file.value);
                                setIsOpen(false);
                              }}
                              className={cn(
                                "cursor-pointer px-3 py-2 text-sm flex items-start gap-2 bg-background/95 hover:bg-accent hover:text-accent-foreground justify-start",
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
                              <span className="font-medium text-foreground text-left" title={file.label}>{file.label}</span>
                            </CommandItem>
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
                    <span className="truncate">
                      {(!selectedSpecialFields.Year || selectedSpecialFields.Year.length === 0) ? 'All Years' : `${selectedSpecialFields.Year.length} selected`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 bg-popover border-border" align="start">
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {((filteredValues.Year || []) as (string | number)[]).filter((year): year is string | number => typeof year !== 'boolean').map((year, idx) => (
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