import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

interface FieldOption {
  value: string;
  label: string;
  type?: string;
}

interface FieldSelectorProps {
  options: FieldOption[];
  selected: string[];
  onSelect: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Helper function to normalize field names for comparison
const normalizeFieldName = (field: string): string => {
  return field.trim().toLowerCase().replace(/\s+/g, ' ');
};

export function FieldSelector({
  options,
  selected = [],
  onSelect,
  onRemove,
  placeholder = "Select fields...",
  className,
}: FieldSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Normalize selected values for comparison
  const normalizedSelected = React.useMemo(() => 
    selected.map(normalizeFieldName), 
    [selected]
  );

  // Filter options based on search and remove already selected ones
  const filteredOptions = React.useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return options.filter(option => {
      const matchesSearch = !searchTerm || 
        option.label.toLowerCase().includes(searchTerm) || 
        option.value.toLowerCase().includes(searchTerm);
      
      // Only include if not already selected (case-insensitive check)
      const isAlreadySelected = normalizedSelected.includes(
        normalizeFieldName(option.value)
      );
      
      return matchesSearch && !isAlreadySelected;
    });
  }, [options, search, normalizedSelected]);

  // Get selected options in the order they were selected
  const selectedOptions = React.useMemo(() => {
    return selected
      .map(value => options.find(opt => 
        normalizeFieldName(opt.value) === normalizeFieldName(value)
      ))
      .filter(Boolean) as FieldOption[];
  }, [selected, options]);

  const handleSelect = (value: string) => {
    onSelect?.(value);
    setSearch('');
  };

  const handleRemove = (value: string) => {
    onRemove?.(value);
  };

  return (
    <div className="space-y-2">
      {/* Selected fields */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedOptions.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground"
            >
              <span>{option.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(option.value);
                }}
                className="opacity-50 hover:opacity-100"
                aria-label={`Remove ${option.label}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Field selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
          >
            <span className="truncate">
              {selectedOptions.length > 0 
                ? `Add another field...` 
                : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search fields..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filteredOptions.length === 0 ? (
                <CommandEmpty>No fields match your search</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleSelect(option.value)}
                      className="flex items-center gap-2"
                    >
                      <span className="truncate">{option.label}</span>
                      {option.type && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {option.type}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
