import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "../ui/button";
import { Plus, X, Check } from "lucide-react";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "../ui/select";
import { ChevronsUpDown } from "lucide-react";
import { OPERATORS_BY_TYPE } from "./constants";
export function FilterControls({ fields = [], filters = [], onFiltersChange, onAddFilter, onRemoveFilter, defaultShowFilters = false, }) {
    const [showFilters, setShowFilters] = useState(defaultShowFilters);
    const [filterSearchTerm, setFilterSearchTerm] = useState({});
    const [openFilterPopovers, setOpenFilterPopovers] = useState({});
    const getFieldType = (fieldName) => {
        const field = fields.find((f) => f.value === fieldName);
        return field?.type || "string";
    };
    const handleFilterChange = (id, updates) => {
        onFiltersChange(filters.map((filter) => filter.id === id ? { ...filter, ...updates } : filter));
    };
    const handleFilterSearchChange = (filterId, value) => {
        setFilterSearchTerm((prev) => ({
            ...prev,
            [filterId]: value,
        }));
    };
    const toggleFilterPopover = (filterId, open) => {
        setOpenFilterPopovers((prev) => ({
            ...prev,
            [filterId]: open,
        }));
    };
    const getFilteredFieldOptions = (filterId) => {
        const searchTerm = (filterSearchTerm[filterId] || "").toLowerCase();
        if (!searchTerm)
            return fields;
        return fields.filter((option) => option.label.toLowerCase().includes(searchTerm) ||
            option.value.toLowerCase().includes(searchTerm));
    };
    if (!showFilters) {
        return (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { children: "Filters" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setShowFilters(true), className: "h-auto p-0 text-sm", children: "Show filters" })] }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { children: "Filters" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setShowFilters(false), className: "h-auto p-0 text-sm", children: "Hide filters" })] }), _jsx("div", { className: "space-y-4 rounded-md border p-4", children: filters.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center space-y-2 py-4", children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "No filters added. Click \"Add Filter\" to get started." }), _jsxs(Button, { variant: "outline", size: "sm", onClick: onAddFilter, className: "mt-2", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "Add Filter"] })] })) : (_jsxs("div", { className: "space-y-4", children: [filters.map((filter) => {
                            const fieldType = filter.field ? getFieldType(filter.field) : "string";
                            const operators = OPERATORS_BY_TYPE[fieldType] || [];
                            const selectedField = fields.find((f) => f.value === filter.field);
                            const currentOperator = operators.find((op) => op.value === filter.operator);
                            const needsSecondValue = currentOperator?.needsSecondValue;
                            const inputType = currentOperator?.inputType || "text";
                            return (_jsxs("div", { className: "flex items-start gap-2", children: [_jsxs("div", { className: "grid flex-1 grid-cols-12 gap-2", children: [_jsxs("div", { className: "col-span-4", children: [_jsx(Label, { id: `field-label-${filter.id}`, className: "text-xs font-medium text-muted-foreground mb-1 block", children: "Field" }), _jsxs(Popover, { open: openFilterPopovers[`${filter.id}-field`] || false, onOpenChange: (open) => toggleFilterPopover(`${filter.id}-field`, open), children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", role: "combobox", "aria-expanded": openFilterPopovers[`${filter.id}-field`], "aria-labelledby": `field-label-${filter.id}`, className: "w-full justify-between h-9", children: [selectedField ? (_jsx("span", { className: "truncate", children: selectedField.label })) : (_jsx("span", { className: "text-muted-foreground", children: "Select field..." })), _jsx(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })] }) }), _jsx(PopoverContent, { className: "w-[300px] p-0", align: "start", children: _jsxs(Command, { children: [_jsx("div", { className: "px-3 pt-2", children: _jsx(CommandInput, { placeholder: "Search fields...", value: filterSearchTerm[filter.id] || "", onValueChange: (value) => handleFilterSearchChange(filter.id, value), className: "h-9", "aria-label": "Search fields" }) }), _jsx(CommandEmpty, { className: "py-6 text-center text-sm text-muted-foreground", children: "No fields found." }), _jsx(CommandGroup, { className: "overflow-y-auto max-h-[300px]", children: getFilteredFieldOptions(filter.id).map((option) => {
                                                                                const isSelected = selectedField?.value === option.value;
                                                                                return (_jsxs(CommandItem, { value: option.value, onSelect: () => {
                                                                                        handleFilterChange(filter.id, {
                                                                                            field: option.value,
                                                                                            operator: "",
                                                                                            value: "",
                                                                                        });
                                                                                        toggleFilterPopover(`${filter.id}-field`, false);
                                                                                    }, "data-disabled": "false", className: cn("cursor-pointer px-3 py-2 text-sm flex items-center gap-2 aria-selected:bg-accent aria-selected:text-accent-foreground", "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"), children: [_jsx("div", { className: cn("flex h-4 w-4 items-center justify-center rounded-sm border", isSelected
                                                                                                ? "bg-primary border-primary text-primary-foreground"
                                                                                                : "border-muted-foreground/30"), children: isSelected && _jsx(Check, { className: "h-3 w-3" }) }), _jsx("span", { className: "font-medium", children: option.label }), _jsx(Badge, { variant: "outline", className: "ml-auto text-xs font-normal text-muted-foreground", children: option.type })] }, option.value));
                                                                            }) })] }) })] })] }), _jsxs("div", { className: "col-span-3", children: [_jsx(Label, { htmlFor: `operator-select-${filter.id}`, className: "text-xs font-medium text-muted-foreground mb-1 block", children: "Operator" }), _jsxs(Select, { value: filter.operator, onValueChange: (value) => handleFilterChange(filter.id, {
                                                            operator: value,
                                                            value: "",
                                                            value2: undefined,
                                                        }), disabled: !filter.field, children: [_jsx(SelectTrigger, { id: `operator-select-${filter.id}`, className: "h-9", children: _jsx(SelectValue, { placeholder: "Select operator..." }) }), _jsx(SelectContent, { children: operators.map((op) => (_jsx(SelectItem, { value: op.value, children: op.label }, op.value))) })] })] }), _jsx("div", { className: cn(needsSecondValue ? "col-span-2" : "col-span-4"), children: filter.operator && (_jsxs(_Fragment, { children: [_jsx(Label, { className: "text-xs font-medium text-muted-foreground mb-1 block", children: needsSecondValue ? "First value" : "Value" }), _jsx("input", { type: inputType, placeholder: needsSecondValue ? "First value" : "Value", value: filter.value || "", onChange: (e) => handleFilterChange(filter.id, {
                                                                value: e.target.value,
                                                            }), className: "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" })] })) }), needsSecondValue && (_jsxs("div", { className: "col-span-2", children: [_jsx(Label, { className: "text-xs font-medium text-muted-foreground mb-1 block", children: "And" }), _jsx("input", { type: inputType, placeholder: "Second value", value: filter.value2 || "", onChange: (e) => handleFilterChange(filter.id, {
                                                            value2: e.target.value,
                                                        }), className: "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" })] }))] }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", onClick: () => onRemoveFilter(filter.id), className: "text-destructive hover:text-destructive/80 h-9 w-9", "data-testid": `remove-filter-${filter.id}`, children: _jsx(X, { className: "h-4 w-4" }) })] }, filter.id));
                        }), _jsxs(Button, { variant: "outline", size: "sm", onClick: onAddFilter, className: "w-full mt-2", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "Add Filter"] })] })) })] }));
}
export default FilterControls;
