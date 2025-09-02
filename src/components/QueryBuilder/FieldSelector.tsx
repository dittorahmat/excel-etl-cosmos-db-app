import { useState, useMemo } from "react";
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

import { FieldOption } from "./types";

interface FieldSelectorProps {
  fields: FieldOption[];
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const FieldSelector = ({
  fields,
  selectedFields = [],
  onFieldsChange,
  loading = false,
  disabled = false,
}: FieldSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFields = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return fields;
    
    return fields.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        option.value.toLowerCase().includes(term)
    );
  }, [fields, searchTerm]);

  const selectedFieldLabels = useMemo(() => {
    return selectedFields
      .map((field) => {
        const fieldDef = fields.find((f) => f.value === field);
        return fieldDef
          ? { value: field, label: fieldDef.label, type: fieldDef.type }
          : null;
      })
      .filter(
        (field): field is { value: string; label: string; type: import("./types").FieldType } =>
          field !== null
      );
  }, [selectedFields, fields]);

  /**
   * Handles field selection from both dropdown (no event) and chip remove (with event).
   * Always updates state. Logs entry and exit for debugging.
   */
  const handleFieldSelect = (fieldValue: string) => {
    const newSelectedFields = selectedFields.includes(fieldValue)
      ? selectedFields.filter((value) => value !== fieldValue)
      : [...selectedFields, fieldValue];
    onFieldsChange(newSelectedFields);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Display Fields</Label>
        <span className="text-sm text-muted-foreground">
          {selectedFields.length} selected
        </span>
      </div>
      <div className="text-xs text-muted-foreground mb-1">
        Click on fields to select/deselect them
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="w-full">
            <PopoverTrigger asChild>
              <div>
                {selectedFieldLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-w-full mb-2">
                    {selectedFieldLabels.map((field) => (
                      <Badge
                        key={field.value}
                        variant="secondary"
                        className="flex items-center gap-1 px-2 py-1 text-sm"
                      >
                        {field.label}
                        <button
                          aria-label={`Remove ${field.label}`}
                          onClick={(e) => {
                            e.stopPropagation();
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
                  className="w-full justify-between h-auto min-h-10 py-1.5"
                  disabled={disabled || loading || fields.length === 0}
                  onClick={() => setIsOpen(!isOpen)}
                >
                  <span className={selectedFieldLabels.length === 0 ? "text-muted-foreground" : undefined}>
                    {selectedFieldLabels.length === 0 ? 'Select fields to display...' : 'Edit selection'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </div>
            </PopoverTrigger>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0 bg-white"
          align="start"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
        >
          <Command className="rounded-lg border shadow-md">
            <div className="px-3 pt-2">
              <CommandInput
                placeholder="Search fields..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="h-9"
                autoFocus={false}
              />
            </div>
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No fields found.
            </CommandEmpty>
            <CommandGroup className="overflow-y-auto max-h-[300px]">
              {filteredFields.map((option) => {
                const isSelected = selectedFields.includes(option.value);
                return (
                  <CommandItem
                                            key={option.value}
                    value={option.value}
                    onSelect={() => {
                      handleFieldSelect(option.value);
                    }}
                    disabled={false}
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
  );
};
