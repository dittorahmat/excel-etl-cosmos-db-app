import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Download, BarChart2, LineChart, PieChart, Table as TableIcon, Loader2 } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
// Utility to extract all field paths from data
const extractFieldPaths = (data) => {
    const keys = new Set();
    const extract = (obj, prefix = '') => {
        Object.entries(obj).forEach(([key, value]) => {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                extract(value, fullKey);
            }
            else {
                keys.add(fullKey);
            }
        });
    };
    data.forEach(item => extract(item));
    return Array.from(keys);
};
const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d',
    '#ffc658', '#d0ed57', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc658'
];
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (_jsxs("div", { className: "bg-white p-4 border border-gray-200 rounded shadow-lg", children: [_jsx("p", { className: "font-medium", children: label }), payload.map((entry, index) => (_jsx("p", { style: { color: entry.color }, children: `${entry.name}: ${entry.value}` }, `tooltip-${index}`)))] }));
    }
    return null;
};
export const DataChart = ({ data = [], loading = false, onExport, availableFields: propAvailableFields, defaultXAxis = 'name', defaultYAxis = 'value', onFieldMappingChange, }) => {
    const [chartType, setChartType] = useState('bar');
    const [xAxis, setXAxis] = useState(defaultXAxis);
    const [yAxis, setYAxis] = useState(defaultYAxis);
    // Automatically detect available fields (including nested fields)
    const availableFields = useMemo(() => {
        if (propAvailableFields && propAvailableFields.length > 0)
            return propAvailableFields;
        return extractFieldPaths(Array.isArray(data) ? data : []);
    }, [data, propAvailableFields]);
    // Update axis fields when availableFields/data changes
    useEffect(() => {
        if (availableFields.length > 0) {
            const updates = {};
            if (!availableFields.includes(xAxis)) {
                updates.xAxis = availableFields[0];
            }
            if (!availableFields.includes(yAxis) && availableFields.length > 1) {
                updates.yAxis = availableFields[1];
            }
            if (Object.keys(updates).length > 0) {
                setXAxis(prev => updates.xAxis || prev);
                setYAxis(prev => updates.yAxis || prev);
                onFieldMappingChange?.({
                    xAxis: updates.xAxis || xAxis,
                    yAxis: updates.yAxis || yAxis
                });
            }
        }
    }, [availableFields, xAxis, yAxis, onFieldMappingChange]);
    // Get nested value by dot notation
    const getNestedValue = useCallback((obj, path) => {
        return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' && key in acc ? acc[key] : undefined), obj);
    }, []);
    // Memoize chart type options
    const chartTypeOptions = useMemo(() => [
        { value: 'bar', label: 'Bar Chart', icon: BarChart2 },
        { value: 'line', label: 'Line Chart', icon: LineChart },
        { value: 'pie', label: 'Pie Chart', icon: PieChart },
        { value: 'table', label: 'Table', icon: TableIcon },
    ], []);
    // Render chart based on type
    const renderChart = useCallback(() => {
        if (!data.length) {
            return (_jsx("div", { className: "flex items-center justify-center h-64 text-muted-foreground", children: "No data available" }));
        }
        const chartData = data.map(item => ({
            ...item,
            name: String(getNestedValue(item, xAxis) || ''),
            value: Number(getNestedValue(item, yAxis)) || 0,
        }));
        switch (chartType) {
            case 'bar':
                return (_jsx("div", { className: "h-96 w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RechartsBarChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Bar, { dataKey: "value", fill: "#8884d8", children: chartData.map((entry, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))) })] }) }) }));
            case 'line':
                return (_jsx("div", { className: "h-96 w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RechartsLineChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: "value", stroke: "#8884d8", activeDot: { r: 8 } })] }) }) }));
            case 'pie':
                return (_jsx("div", { className: "h-96 w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RechartsPieChart, { children: [_jsx(Pie, { data: chartData, cx: "50%", cy: "50%", labelLine: false, outerRadius: 80, fill: "#8884d8", dataKey: "value", nameKey: "name", label: ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`, children: chartData.map((entry, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))) }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {})] }) }) }));
            case 'table':
                return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: xAxis }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: yAxis })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: chartData.map((row, i) => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: row.name }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: row.value })] }, i))) })] }) }));
            default:
                return null;
        }
    }, [chartType, data, xAxis, yAxis, getNestedValue]);
    const handleXAxisChange = useCallback((value) => {
        setXAxis(value);
        onFieldMappingChange?.({ xAxis: value, yAxis });
    }, [yAxis, onFieldMappingChange]);
    const handleYAxisChange = useCallback((value) => {
        setYAxis(value);
        onFieldMappingChange?.({ xAxis, yAxis: value });
    }, [xAxis, onFieldMappingChange]);
    // Render chart type selector
    const renderChartTypeSelector = useCallback(() => (_jsxs(Select, { value: chartType, onValueChange: (value) => setChartType(value), children: [_jsx(SelectTrigger, { className: "w-[140px]", "data-testid": "chart-type-selector", children: _jsx(SelectValue, { placeholder: "Chart Type" }) }), _jsx(SelectContent, { children: chartTypeOptions.map((option) => (_jsx(SelectItem, { value: option.value, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(option.icon, { className: "h-4 w-4" }), option.label] }) }, option.value))) })] })), [chartType, chartTypeOptions]);
    // Render axis selectors
    const renderAxisSelectors = useCallback(() => (_jsxs(_Fragment, { children: [_jsxs(Select, { value: xAxis, onValueChange: handleXAxisChange, disabled: availableFields.length === 0, children: [_jsx(SelectTrigger, { className: "w-[120px]", "data-testid": "x-axis-selector", children: _jsx(SelectValue, { placeholder: "X-Axis" }) }), _jsx(SelectContent, { children: availableFields.map(field => (_jsx(SelectItem, { value: field, children: field }, `x-${field}`))) })] }), _jsxs(Select, { value: yAxis, onValueChange: handleYAxisChange, disabled: availableFields.length === 0, children: [_jsx(SelectTrigger, { className: "w-[120px]", "data-testid": "y-axis-selector", children: _jsx(SelectValue, { placeholder: "Y-Axis" }) }), _jsx(SelectContent, { children: availableFields.map(field => (_jsx(SelectItem, { value: field, children: field }, `y-${field}`))) })] })] })), [xAxis, yAxis, availableFields, handleXAxisChange, handleYAxisChange]);
    // Render loading state
    if (loading) {
        return (_jsxs(Card, { className: "w-full", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Loading Data..." }) }), _jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(Loader2, { className: "w-8 h-8 animate-spin text-primary", "data-testid": "loader" }) })] }));
    }
    return (_jsxs(Card, { className: "w-full", children: [_jsxs(CardHeader, { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-2", children: [_jsx("div", { children: _jsx(CardTitle, { children: "Data Visualization" }) }), _jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [renderChartTypeSelector(), renderAxisSelectors(), onExport && (_jsxs(Button, { variant: "outline", size: "sm", onClick: () => onExport('csv'), disabled: !data.length, children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), "Export"] }))] })] }), _jsx("div", { className: "p-6 pt-0", children: renderChart() })] }));
};
export default DataChart;
