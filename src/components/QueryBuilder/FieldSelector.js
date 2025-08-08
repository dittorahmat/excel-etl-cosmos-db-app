import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Check, ChevronsUpDown, X as XIcon } from "lucide-react";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, } from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
export const FieldSelector = ({ fields, selectedFields = [], onFieldsChange, loading = false, disabled = false, }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const filteredFields = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (!term)
            return fields;
        return fields.filter((option) => option.label.toLowerCase().includes(term) ||
            option.value.toLowerCase().includes(term));
    }, [fields, searchTerm]);
    const selectedFieldLabels = useMemo(() => {
        return selectedFields
            .map((field) => {
            const fieldDef = fields.find((f) => f.value === field);
            return fieldDef
                ? { value: field, label: fieldDef.label, type: fieldDef.type }
                : null;
        })
            .filter((field) => field !== null);
    }, [selectedFields, fields]);
    /**
     * Handles field selection from both dropdown (no event) and chip remove (with event).
     * Always updates state. Logs entry and exit for debugging.
     */
    const handleFieldSelect = (fieldValue) => {
        const newSelectedFields = selectedFields.includes(fieldValue)
            ? selectedFields.filter((value) => value !== fieldValue)
            : [...selectedFields, fieldValue];
        onFieldsChange(newSelectedFields);
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Label, { children: "Display Fields" }), _jsxs("span", { className: "text-sm text-muted-foreground", children: [selectedFields.length, " selected"] })] }), _jsx("div", { className: "text-xs text-muted-foreground mb-1", children: "Click on fields to select/deselect them" }), _jsxs(Popover, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("div", { className: "w-full", children: _jsx(PopoverTrigger, { asChild: true, children: _jsxs("div", { children: [selectedFieldLabels.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 max-w-full mb-2", children: selectedFieldLabels.map((field) => (_jsxs(Badge, { variant: "secondary", className: "flex items-center gap-1 px-2 py-1 text-sm", children: [field.label, _jsx("button", { "aria-label": `Remove ${field.label}`, onClick: (e) => {
                                                            e.stopPropagation();
                                                            handleFieldSelect(field.value);
                                                        }, className: "rounded-full hover:bg-accent/50 p-0.5", children: _jsx(XIcon, { className: "h-3 w-3" }) })] }, field.value))) })), _jsxs(Button, { variant: "outline", role: "combobox", "aria-expanded": isOpen, className: "w-full justify-between h-auto min-h-10 py-1.5", disabled: disabled || loading || fields.length === 0, onClick: () => setIsOpen(!isOpen), children: [_jsx("span", { className: selectedFieldLabels.length === 0 ? "text-muted-foreground" : undefined, children: selectedFieldLabels.length === 0 ? 'Select fields to display...' : 'Edit selection' }), _jsx(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })] })] }) }) }) }), _jsx(PopoverContent, { className: "w-[400px] p-0", align: "start", tabIndex: -1, onKeyDown: (e) => {
                            if (e.key === "Escape")
                                setIsOpen(false);
                        }, children: _jsxs(Command, { className: "rounded-lg border shadow-md", children: [_jsx("div", { className: "px-3 pt-2", children: _jsx(CommandInput, { placeholder: "Search fields...", value: searchTerm, onValueChange: setSearchTerm, className: "h-9", autoFocus: false }) }), _jsx(CommandEmpty, { className: "py-6 text-center text-sm text-muted-foreground", children: "No fields found." }), _jsx(CommandGroup, { className: "overflow-y-auto max-h-[300px]", children: filteredFields.map((option) => {
                                        const isSelected = selectedFields.includes(option.value);
                                        return (_jsxs(CommandItem, { value: option.value, onSelect: () => {
                                                handleFieldSelect(option.value);
                                            }, disabled: false, "data-disabled": "false", className: cn("cursor-pointer px-3 py-2 text-sm flex items-center gap-2 aria-selected:bg-accent aria-selected:text-accent-foreground", "data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"), children: [_jsx("div", { className: cn("flex h-4 w-4 items-center justify-center rounded-sm border", isSelected
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "border-muted-foreground/30"), children: isSelected && _jsx(Check, { className: "h-3 w-3" }) }), _jsx("span", { className: "font-medium", children: option.label }), _jsx(Badge, { variant: "outline", className: "ml-auto text-xs font-normal text-muted-foreground", children: option.type })] }, option.value));
                                    }) })] }) })] })] }));
};
