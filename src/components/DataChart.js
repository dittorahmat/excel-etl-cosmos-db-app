import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.js';
import { Button } from './ui/button.js';
import { Download, BarChart2, LineChart, PieChart, Table as TableIcon, Loader2 } from 'lucide-react';
import { BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d',
    '#ffc658', '#d0ed57', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc658'
];
export function DataChart({ data, loading = false, onExport }) {
    const [chartType, setChartType] = useState('bar');
    const [xAxis, setXAxis] = useState('');
    const [yAxis, setYAxis] = useState('');
    const [groupBy, setGroupBy] = useState('');
    const [numericFields, setNumericFields] = useState([]);
    const [categoryFields, setCategoryFields] = useState([]);
    // Extract available fields from data
    useEffect(() => {
        if (data.length > 0) {
            const fields = Object.keys(data[0]).filter(key => key !== 'id' && key !== '_rid' && key !== '_self' && key !== '_etag' && key !== '_attachments' && key !== '_ts');
            // Try to identify numeric and category fields
            const sampleItem = data[0];
            const numeric = [];
            const category = [];
            fields.forEach(field => {
                const value = sampleItem[field];
                if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)) && value !== '')) {
                    numeric.push(field);
                }
                else if (typeof value === 'string') {
                    category.push(field);
                }
                else if (value instanceof Date) {
                    category.push(field);
                }
                else if (Array.isArray(value) || typeof value === 'object') {
                    // Skip arrays and objects
                }
                else {
                    category.push(field);
                }
            });
            setNumericFields(numeric);
            setCategoryFields(category);
            // Auto-select fields if possible
            if (numeric.length > 0 && !yAxis)
                setYAxis(numeric[0]);
            if (category.length > 0 && !xAxis)
                setXAxis(category[0]);
        }
    }, [data]);
    // Process data for chart
    const getProcessedData = () => {
        if (!xAxis)
            return [];
        if (chartType === 'table')
            return data;
        // For bar and line charts with grouping
        if (groupBy) {
            const groupedData = {};
            data.forEach(item => {
                const groupKey = item[groupBy] || 'Unknown';
                if (!groupedData[groupKey]) {
                    groupedData[groupKey] = { name: groupKey };
                }
                if (yAxis) {
                    groupedData[groupKey][yAxis] = (groupedData[groupKey][yAxis] || 0) + (Number(item[yAxis]) || 0);
                }
            });
            return Object.values(groupedData);
        }
        // For pie charts
        if (chartType === 'pie' && xAxis && yAxis) {
            return data.map(item => ({
                name: String(item[xAxis] || 'N/A'),
                value: Number(item[yAxis]) || 0
            }));
        }
        // For regular bar/line charts
        return data.map(item => ({
            name: String(item[xAxis] || ''),
            [yAxis]: Number(item[yAxis]) || 0
        }));
    };
    const renderChart = () => {
        const chartData = getProcessedData();
        if (loading) {
            return (_jsxs("div", { className: "flex items-center justify-center h-64", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading chart data..." })] }));
        }
        if (chartData.length === 0) {
            return (_jsx("div", { className: "flex items-center justify-center h-64 text-muted-foreground", children: "No data available for the selected chart type and fields." }));
        }
        switch (chartType) {
            case 'bar':
                return (_jsx("div", { className: "h-96 w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Legend, {}), yAxis && _jsx(Bar, { dataKey: yAxis, fill: COLORS[0], name: yAxis })] }) }) }));
            case 'line':
                return (_jsx("div", { className: "h-96 w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RechartsLineChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: "name" }), _jsx(YAxis, {}), _jsx(Tooltip, {}), _jsx(Legend, {}), yAxis && (_jsx(Line, { type: "monotone", dataKey: yAxis, stroke: COLORS[0], name: yAxis, dot: false }))] }) }) }));
            case 'pie':
                return (_jsx("div", { className: "h-96 w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RechartsPieChart, { children: [_jsx(Pie, { data: chartData, cx: "50%", cy: "50%", labelLine: false, outerRadius: 120, fill: "#8884d8", dataKey: "value", nameKey: "name", label: ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`, children: chartData.map((_, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))) }), _jsx(Tooltip, {}), _jsx(Legend, {})] }) }) }));
            case 'table':
                if (data.length === 0)
                    return _jsx("div", { children: "No data available" });
                const columns = Object.keys(data[0]);
                return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsx("tr", { children: columns.map((col) => (_jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: col }, col))) }) }), _jsxs("tbody", { className: "bg-white divide-y divide-gray-200", children: [data.slice(0, 10).map((row, rowIndex) => (_jsx("tr", { children: columns.map((col) => (_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '') }, col))) }, rowIndex))), data.length > 10 && (_jsx("tr", { children: _jsxs("td", { colSpan: columns.length, className: "px-6 py-4 text-sm text-center text-gray-500", children: ["Showing 10 of ", data.length, " rows"] }) }))] })] }) }));
            default:
                return _jsx("div", { children: "Select a chart type and fields to visualize the data." });
        }
    };
    return (_jsxs(Card, { className: "w-full", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [_jsx(CardTitle, { className: "text-lg font-medium", children: "Data Visualization" }), _jsxs("div", { className: "flex space-x-2", children: [_jsxs(Select, { value: chartType, onValueChange: (value) => setChartType(value), children: [_jsx(SelectTrigger, { className: "w-[180px]", children: _jsx(SelectValue, { placeholder: "Chart Type" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "bar", children: _jsxs("div", { className: "flex items-center", children: [_jsx(BarChart2, { className: "h-4 w-4 mr-2" }), "Bar Chart"] }) }), _jsx(SelectItem, { value: "line", children: _jsxs("div", { className: "flex items-center", children: [_jsx(LineChart, { className: "h-4 w-4 mr-2" }), "Line Chart"] }) }), _jsx(SelectItem, { value: "pie", children: _jsxs("div", { className: "flex items-center", children: [_jsx(PieChart, { className: "h-4 w-4 mr-2" }), "Pie Chart"] }) }), _jsx(SelectItem, { value: "table", children: _jsxs("div", { className: "flex items-center", children: [_jsx(TableIcon, { className: "h-4 w-4 mr-2" }), "Table View"] }) })] })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => onExport?.('csv'), disabled: data.length === 0, children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), "CSV"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => onExport?.('json'), disabled: data.length === 0, children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), "JSON"] })] })] }), _jsxs(CardContent, { children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "X-Axis / Category" }), _jsxs(Select, { value: xAxis, onValueChange: setXAxis, disabled: chartType === 'pie' || chartType === 'table', children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select field" }) }), _jsx(SelectContent, { children: categoryFields.map((field) => (_jsx(SelectItem, { value: field, children: field }, `x-${field}`))) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: chartType === 'pie' ? 'Value' : 'Y-Axis / Value' }), _jsxs(Select, { value: yAxis, onValueChange: setYAxis, disabled: chartType === 'table', children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "Select field" }) }), _jsx(SelectContent, { children: numericFields.map((field) => (_jsx(SelectItem, { value: field, children: field }, `y-${field}`))) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Group By" }), _jsxs(Select, { value: groupBy, onValueChange: setGroupBy, disabled: chartType === 'pie' || chartType === 'table', children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "None" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "", children: "None" }), categoryFields.filter(f => f !== xAxis).map((field) => (_jsx(SelectItem, { value: field, children: field }, `g-${field}`)))] })] })] })] }), renderChart()] })] }));
}
