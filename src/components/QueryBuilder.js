import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.js';
import { api } from '../utils/api.js';
import { Loader2, Plus, X } from 'lucide-react';
export function QueryBuilder({ onQueryChange, onExecute, loading = false }) {
    const [availableFields, setAvailableFields] = useState([]);
    const [filters, setFilters] = useState([{
            id: '1',
            field: '',
            operator: '=',
            value: ''
        }]);
    const operators = [
        { value: '=', label: 'equals' },
        { value: '!=', label: 'not equals' },
        { value: '>', label: 'greater than' },
        { value: '>=', label: 'greater than or equal' },
        { value: '<', label: 'less than' },
        { value: '<=', label: 'less than or equal' },
        { value: 'contains', label: 'contains' },
        { value: 'startsWith', label: 'starts with' },
        { value: 'endsWith', label: 'ends with' },
    ];
    useEffect(() => {
        // Load available fields from the server
        const loadFields = async () => {
            try {
                const response = await api.get('/api/fields');
                if (response.ok) {
                    const data = await response.json();
                    setAvailableFields(data.fields || []);
                }
            }
            catch (error) {
                console.error('Error loading fields:', error);
            }
        };
        loadFields();
    }, []);
    const buildQuery = useCallback(() => {
        const whereClauses = filters
            .filter((f) => Boolean(f.field) && Boolean(f.operator) && f.value !== '')
            .map(f => {
            const fieldType = availableFields.find(af => af.name === f.field)?.type || 'string';
            const value = fieldType === 'number' ? parseFloat(f.value) : f.value;
            return {
                [f.field]: {
                    [f.operator]: value
                }
            };
        });
        if (whereClauses.length === 0) {
            return {};
        }
        if (whereClauses.length === 1) {
            return whereClauses[0];
        }
        return {
            and: whereClauses
        };
    }, [filters, availableFields]);
    useEffect(() => {
        // Notify parent component about query changes
        onQueryChange(buildQuery());
    }, [buildQuery, onQueryChange]);
    const addFilter = () => {
        setFilters(prevFilters => [
            ...prevFilters,
            {
                id: Date.now().toString(),
                field: '',
                operator: '=',
                value: ''
            }
        ]);
    };
    const removeFilter = (id) => {
        if (filters.length <= 1)
            return;
        const newFilters = filters.filter(filter => filter.id !== id);
        setFilters(newFilters);
    };
    const updateFilter = (id, field, value) => {
        setFilters(prevFilters => prevFilters.map(filter => filter.id === id
            ? { ...filter, [field]: value }
            : filter));
    };
    const handleExecute = () => {
        onExecute(buildQuery());
    };
    const getFieldType = (fieldName) => {
        const field = availableFields.find(f => f.name === fieldName);
        return field ? field.type : 'string';
    };
    const getInputType = (fieldType) => {
        const typeMap = {
            'number': 'number',
            'date': 'date',
            'datetime': 'datetime-local',
            'time': 'time',
            'email': 'email',
            'url': 'url',
            'tel': 'tel',
            'password': 'password',
            'search': 'search',
            'color': 'color',
            'range': 'range'
        };
        return typeMap[fieldType] || 'text';
    };
    return (_jsxs("div", { className: "space-y-4 p-4 border rounded-lg bg-card", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("h3", { className: "text-lg font-medium", children: "Query Builder" }), _jsxs(Button, { variant: "outline", size: "sm", onClick: addFilter, disabled: loading, children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Add Filter"] })] }), _jsx("div", { className: "space-y-3", children: filters.map((filter) => (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsxs(Select, { value: filter.field, onValueChange: (value) => updateFilter(filter.id, 'field', value), disabled: loading, children: [_jsx(SelectTrigger, { className: "w-48", children: _jsx(SelectValue, { placeholder: "Select field" }) }), _jsx(SelectContent, { children: availableFields.map((field) => (_jsxs(SelectItem, { value: field.name, children: [field.name, " (", field.type, ")"] }, field.name))) })] }), _jsxs(Select, { value: filter.operator, onValueChange: (value) => updateFilter(filter.id, 'operator', value), disabled: !filter.field || loading, children: [_jsx(SelectTrigger, { className: "w-36", children: _jsx(SelectValue, { placeholder: "Operator" }) }), _jsx(SelectContent, { children: operators.map((op) => (_jsx(SelectItem, { value: op.value, children: op.label }, op.value))) })] }), filter.field && (_jsx(Input, { type: getInputType(getFieldType(filter.field)), value: filter.value, onChange: (e) => updateFilter(filter.id, 'value', e.target.value), placeholder: "Value", disabled: loading, className: "flex-1" })), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => removeFilter(filter.id), disabled: filters.length <= 1 || loading, children: _jsx(X, { className: "h-4 w-4" }) })] }, filter.id))) }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: handleExecute, disabled: !filters.some(f => f.field && f.operator && f.value !== '') || loading, children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Executing..."] })) : ('Execute Query') }) })] }));
}
