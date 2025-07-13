import { useState } from "react";
import { Button } from "../ui/button";
import { Plus, X } from "lucide-react";
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
import { ChevronsUpDown } from "lucide-react";
import { FieldOption, FilterCondition, FieldType } from "./types";
import { OPERATORS_BY_TYPE } from "./constants";

interface FilterControlsProps {
  fields: FieldOption[];
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  onAddFilter: () => void;
  onRemoveFilter: (id: string) => void;
  defaultShowFilters?: boolean;
}

export function FilterControls({
  fields = [],
  filters = [],
  onFiltersChange,
  onAddFilter,
  onRemoveFilter,
  defaultShowFilters = false,
}: FilterControlsProps) {
  const [showFilters, setShowFilters] = useState(defaultShowFilters);
  const [filterSearchTerm, setFilterSearchTerm] = useState<Record<string, string>>({});
  const [openFilterPopovers, setOpenFilterPopovers] = useState<Record<string, boolean>>({});

  const getFieldType = (fieldName: string): FieldType => {
    const field = fields.find((f) => f.value === fieldName);
    return field?.type || "string";
  };

  const handleFilterChange = (id: string, updates: Partial<FilterCondition>) => {
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

  const getFilteredFieldOptions = (filterId: string) => {
    const searchTerm = (filterSearchTerm[filterId] || "").toLowerCase();
    if (!searchTerm) return fields;

    return fields.filter(
      (option) =>
        option.label.toLowerCase().includes(searchTerm) ||
        option.value.toLowerCase().includes(searchTerm)
    );
  };

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
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
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
                                      operator: "",
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
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Operator
                      </Label>
                      <Select
                        value={filter.operator}
                        onValueChange={(value) =>
                          handleFilterChange(filter.id, {
                            operator: value,
                            value: "",
                            value2: undefined,
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
                    <div className={cn(needsSecondValue ? "col-span-2" : "col-span-4")}>
                      {filter.operator && (
                        <>
                          <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                            {needsSecondValue ? "First value" : "Value"}
                          </Label>
                          <input
                            type={inputType}
                            placeholder={
                              needsSecondValue ? "First value" : "Value"
                            }
                            value={filter.value || ""}
                            onChange={(e) =>
                              handleFilterChange(filter.id, {
                                value: e.target.value,
                              })
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
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
                          value={filter.value2 || ""}
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

export default FilterControls;
