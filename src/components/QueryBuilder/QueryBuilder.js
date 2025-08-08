import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback, useMemo } from "react";
import { Button } from "../ui/button";
import { Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldSelector } from "./FieldSelector";
import { FilterControls } from "./FilterControls";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "./constants";
export function QueryBuilder({ fields = [], selectedFields = [], onFieldsChange, onExecute, loading = false, error, className, defaultShowFilters = false, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, fieldsLoading = false, }) {
    // State for filters
    const [filters, setFilters] = useState([]);
    const [showFilters, setShowFilters] = useState(defaultShowFilters);
    // Field options for the dropdown
    const fieldOptions = useMemo(() => {
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
    const handleFieldsChange = useCallback((newFields) => {
        console.log('[QueryBuilder] Fields changed:', newFields);
        onFieldsChange(newFields);
    }, [onFieldsChange]);
    // Handle filter changes - using direct state setter in JSX now
    // Add a new filter
    const handleAddFilter = useCallback(() => {
        const newFilter = {
            id: `filter-${Date.now()}`,
            field: "",
            operator: "",
            value: "",
        };
        setFilters((prevFilters) => [...prevFilters, newFilter]);
    }, []);
    // Remove a filter
    const handleRemoveFilter = useCallback((id) => {
        setFilters((prev) => prev.filter((filter) => filter.id !== id));
    }, []);
    // Handle execute button click
    const handleExecuteClick = useCallback(() => {
        // Ensure we have valid fields to query
        const validFields = selectedFields.filter((field) => fieldOptions.some((f) => f.value === field));
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
    // Handle loading state
    if (fieldsLoading) {
        return (_jsxs("div", { className: cn("flex items-center justify-center p-8", className), children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading fields..." })] }));
    }
    // Handle no fields case
    if (fieldOptions.length === 0) {
        return (_jsx("div", { className: cn("p-4 text-center text-muted-foreground", className), children: "No fields available to query." }));
    }
    // Main render
    return (_jsxs("div", { className: cn("space-y-4", className), children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(FieldSelector, { fields: fieldOptions, selectedFields: selectedFields, onFieldsChange: handleFieldsChange, loading: fieldsLoading, disabled: fieldsLoading }), error && _jsx("div", { className: "text-sm text-destructive", children: error })] }), !showFilters && (_jsx("div", { className: "pt-6", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setShowFilters(true), className: "h-auto p-0 text-sm", children: "Show filters" }) }))] }), showFilters && (_jsx("div", { className: "space-y-2", children: _jsx(FilterControls, { fields: fieldOptions, filters: filters, onFiltersChange: (newFilters) => setFilters(newFilters), onAddFilter: handleAddFilter, onRemoveFilter: handleRemoveFilter, defaultShowFilters: true }) }))] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: handleExecuteClick, disabled: loading || selectedFields.length === 0, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Executing..."] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { className: "mr-2 h-4 w-4" }), "Execute Query"] })) }) })] }));
}
export default QueryBuilder;
