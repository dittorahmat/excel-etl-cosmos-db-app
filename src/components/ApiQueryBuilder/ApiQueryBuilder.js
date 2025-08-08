import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { FieldSelector } from '../QueryBuilder/FieldSelector';
import { FilterControls } from '../QueryBuilder/FilterControls';
import { Label } from '../ui/label';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from '../ui/use-toast';
import { api } from '../../utils/api';
export const ApiQueryBuilder = ({ baseUrl = '/api/v2/query/rows' }) => {
    const [fields, setFields] = useState([]);
    console.log("[ApiQueryBuilder] Render - fields state:", fields);
    const [selectedFields, setSelectedFields] = useState([]);
    const [filters, setFilters] = useState([]);
    const [generatedUrl, setGeneratedUrl] = useState('');
    const [fieldsLoading, setFieldsLoading] = useState(true);
    const [error, setError] = useState(null);
    // Fetch available fields
    useEffect(() => {
        console.log("[ApiQueryBuilder] useEffect fetchFields - Start");
        const fetchFields = async () => {
            setFieldsLoading(true);
            setError(null);
            try {
                console.log("[ApiQueryBuilder] useEffect fetchFields - Calling api.get('/api/fields')");
                const response = await api.get('/api/fields');
                console.log("[ApiQueryBuilder] useEffect fetchFields - API response:", response);
                if (response.success && Array.isArray(response.fields)) {
                    const fieldDefinitions = response.fields.map(field => (typeof field === 'string' ? { name: field, value: field, label: field, type: 'string' } : { ...field, value: field.name, label: field.label || field.name }));
                    console.log("[ApiQueryBuilder] useEffect fetchFields - Setting fields:", fieldDefinitions);
                    setFields(fieldDefinitions);
                }
                else {
                    console.error("[ApiQueryBuilder] useEffect fetchFields - API call failed or returned invalid data:", response.message);
                    setError(response.message || 'Failed to load fields');
                }
            }
            catch (err) {
                console.error("[ApiQueryBuilder] useEffect fetchFields - Error:", err);
                setError(err instanceof Error ? err.message : 'Failed to load fields');
            }
            finally {
                setFieldsLoading(false);
            }
        };
        fetchFields();
    }, []);
    const handleFieldsChange = useCallback((newFields) => {
        setSelectedFields(newFields);
    }, []);
    const handleFiltersChange = useCallback((newFilters) => {
        setFilters(newFilters);
    }, []);
    const handleAddFilter = useCallback(() => {
        setFilters((prevFilters) => [
            ...prevFilters,
            { id: `filter-${Date.now()}`, field: '', operator: '', value: '' },
        ]);
    }, []);
    const handleRemoveFilter = useCallback((id) => {
        setFilters((prev) => prev.filter((filter) => filter.id !== id));
    }, []);
    const generateApiUrl = useCallback(() => {
        const body = {
            fields: selectedFields,
            filters: filters.filter(f => f.field && f.operator && f.value),
            limit: 10,
            offset: 0,
        };
        const fullUrl = `${window.location.origin}${baseUrl}`;
        const curlCommand = `curl -X POST ${fullUrl} \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '${JSON.stringify(body, null, 2)}'`;
        setGeneratedUrl(curlCommand);
    }, [selectedFields, filters, baseUrl]);
    useEffect(() => {
        generateApiUrl();
    }, [selectedFields, filters, generateApiUrl]);
    const handleCopyUrl = useCallback(() => {
        if (generatedUrl) {
            navigator.clipboard.writeText(generatedUrl);
            toast({
                title: 'Copied!',
                description: 'API URL copied to clipboard.',
                open: true,
                onOpenChange: () => { }
            });
        }
    }, [generatedUrl]);
    if (fieldsLoading) {
        return (_jsxs("div", { className: "flex items-center justify-center p-8", children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading fields..." })] }));
    }
    if (error) {
        return _jsxs("div", { className: "text-red-500", children: ["Error: ", error] });
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Select Fields for API Response" }), _jsx(FieldSelector, { fields: fields.map(f => ({
                            value: f.value,
                            label: f.label,
                            name: f.name,
                            type: f.type,
                            description: f.description
                        })), selectedFields: selectedFields, onFieldsChange: handleFieldsChange })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { children: "Filter API Results" }), _jsx(FilterControls, { fields: fields.map(f => ({
                            value: f.value,
                            label: f.label,
                            name: f.name,
                            type: f.type,
                            description: f.description
                        })), filters: filters, onFiltersChange: handleFiltersChange, onAddFilter: handleAddFilter, onRemoveFilter: handleRemoveFilter, defaultShowFilters: true })] }), _jsx(Button, { onClick: generateApiUrl, className: "w-full", children: "Generate API URL" }), generatedUrl && (_jsxs("div", { className: "space-y-2 mt-4", children: [_jsx(Label, { htmlFor: "apiUrl", children: "Generated cURL Command" }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("textarea", { id: "apiUrl", value: generatedUrl, readOnly: true, className: "flex-1 w-full h-48 p-2 border rounded-md bg-gray-100 dark:bg-gray-800" }), _jsx(Button, { onClick: handleCopyUrl, size: "icon", variant: "outline", "aria-label": "Copy URL", children: _jsx(Copy, { className: "h-4 w-4" }) })] }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Replace `YOUR_API_KEY` with your actual API key." })] }))] }));
};
