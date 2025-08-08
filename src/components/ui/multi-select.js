import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Badge } from "./badge";
export function MultiSelect({ options, selected, onChange, placeholder = "Select items...", searchPlaceholder = "Search...", emptyText = "No items found.", className, }) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const filteredOptions = React.useMemo(() => {
        if (!inputValue)
            return options;
        return options.filter((option) => option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
            option.value.toLowerCase().includes(inputValue.toLowerCase()));
    }, [options, inputValue]);
    const handleSelect = (value) => {
        const newSelected = selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };
    const handleRemove = (value, e) => {
        e.stopPropagation();
        onChange(selected.filter((item) => item !== value));
    };
    const selectedLabels = selected.map((value) => options.find((opt) => opt.value === value)?.label || value);
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", role: "combobox", "aria-expanded": open, className: cn("w-full justify-between h-auto min-h-10", className), onClick: () => setOpen(!open), children: [_jsx("div", { className: "flex flex-wrap gap-1 max-w-full overflow-hidden", children: selected.length === 0 ? (_jsx("span", { className: "text-muted-foreground", children: placeholder })) : (selectedLabels.map((label, index) => (_jsxs(Badge, { variant: "secondary", className: "mr-1 mb-1", onClick: (e) => handleRemove(selected[index], e), children: [label, _jsx(X, { className: "ml-1 h-3 w-3" })] }, selected[index])))) }), _jsx(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })] }) }), _jsx(PopoverContent, { className: "w-full p-0", align: "start", children: _jsxs(Command, { children: [_jsx(CommandInput, { placeholder: searchPlaceholder, value: inputValue, onValueChange: setInputValue, className: "h-9" }), _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: emptyText }), _jsx(CommandGroup, { children: filteredOptions.map((option) => {
                                        const isSelected = selected.includes(option.value);
                                        return (_jsxs(CommandItem, { value: option.value, onSelect: () => handleSelect(option.value), className: "cursor-pointer", children: [_jsx("div", { className: cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected
                                                        ? "bg-primary text-primary-foreground"
                                                        : "opacity-50 [&_svg]:invisible"), children: _jsx(Check, { className: cn("h-4 w-4") }) }), _jsx("span", { children: option.label })] }, option.value));
                                    }) })] })] }) })] }));
}
