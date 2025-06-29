import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo, useCallback, Component } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Download, BarChart2, LineChart, PieChart, Table as TableIcon, Loader2, AlertCircle } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, } from 'recharts';
// Removed unused interface
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
const DataChart = ({ data = [], loading = false, onExport, }) => {
    const [chartType, setChartType] = useState('bar');
    // Axis values
    const xAxis = 'name';
    const yAxis = 'value';
    // Memoize chart type options
    const chartTypeOptions = useMemo(() => [
        { value: 'bar', label: 'Bar Chart', icon: BarChart2 },
        { value: 'line', label: 'Line Chart', icon: LineChart },
        { value: 'pie', label: 'Pie Chart', icon: PieChart },
        { value: 'table', label: 'Table', icon: TableIcon },
    ], []);
    // Handle chart type change
    const handleChartTypeChange = useCallback((value) => {
        setChartType(value);
    }, [setChartType]);
    // Available fields for axis selection
    const availableFields = useMemo(() => {
        if (!data.length)
            return [];
        return Object.keys(data[0] || {});
    }, [data]);
    // Render chart based on type
    const renderChart = useCallback(() => {
        if (!data.length) {
            return (_jsx("div", { className: "flex items-center justify-center h-64 text-muted-foreground", children: "No data available" }));
        }
        switch (chartType) {
            case 'bar':
                return (_jsx(ResponsiveContainer, { width: "100%", height: 400, children: _jsxs(RechartsBarChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: xAxis }), _jsx(YAxis, {}), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Bar, { dataKey: yAxis, fill: "#8884d8", children: data.map((_, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))) })] }) }));
            case 'line':
                return (_jsx(ResponsiveContainer, { width: "100%", height: 400, children: _jsxs(RechartsLineChart, { data: data, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3" }), _jsx(XAxis, { dataKey: xAxis }), _jsx(YAxis, {}), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {}), _jsx(Line, { type: "monotone", dataKey: yAxis, stroke: "#8884d8", activeDot: { r: 8 } })] }) }));
            case 'pie':
                return (_jsx("div", { className: "flex justify-center", children: _jsxs(RechartsPieChart, { width: 400, height: 400, children: [_jsx(Pie, { data: data, cx: "50%", cy: "50%", labelLine: false, outerRadius: 150, fill: "#8884d8", dataKey: yAxis, label: ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`, children: data.map((_, index) => (_jsx(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))) }), _jsx(Tooltip, { content: _jsx(CustomTooltip, {}) }), _jsx(Legend, {})] }) }));
            case 'table':
                return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsx("tr", { children: availableFields.map((field) => (_jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: field }, field))) }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: data.map((row, rowIndex) => (_jsx("tr", { children: availableFields.map((field) => (_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: String(row[field] ?? '') }, `${rowIndex}-${field}`))) }, `row-${rowIndex}`))) })] }) }));
            default:
                return null;
        }
    }, [chartType, data, xAxis, yAxis, availableFields]);
    // Render export buttons
    const renderExportButtons = useCallback(() => {
        if (!onExport)
            return null;
        return (_jsxs("div", { className: "flex space-x-2", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => onExport('csv'), className: "flex items-center gap-1", children: [_jsx(Download, { className: "h-4 w-4" }), _jsx("span", { children: "CSV" })] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => onExport('json'), className: "flex items-center gap-1", children: [_jsx(Download, { className: "h-4 w-4" }), _jsx("span", { children: "JSON" })] })] }));
    }, [onExport]);
    // Render chart type selector
    const renderChartTypeSelector = useCallback(() => (_jsxs(Select, { value: chartType, onValueChange: handleChartTypeChange, children: [_jsx(SelectTrigger, { className: "w-[180px]", children: _jsx(SelectValue, { placeholder: "Select chart type" }) }), _jsx(SelectContent, { children: chartTypeOptions.map((option) => {
                    const Icon = option.icon;
                    return (_jsx(SelectItem, { value: option.value, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Icon, { className: "h-4 w-4" }), _jsx("span", { children: option.label })] }) }, option.value));
                }) })] })), [chartType, chartTypeOptions, handleChartTypeChange]);
    // Render chart content with loading state
    const renderChartContent = useCallback(() => {
        if (loading) {
            return (_jsxs("div", { className: "flex items-center justify-center h-64", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading chart data..." })] }));
        }
        // Using default axis values for now
        return renderChart();
    }, [loading, renderChart]);
    return (_jsxs(Card, { className: "w-full", children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [_jsx(CardTitle, { className: "text-sm font-medium", children: "Data Visualization" }), _jsxs("div", { className: "flex items-center space-x-2", children: [renderChartTypeSelector(), renderExportButtons()] })] }), _jsx(CardContent, { className: "pt-4", children: renderChartContent() })] }));
};
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Error in DataChart:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return this.props.fallback || (_jsxs("div", { className: "flex flex-col items-center justify-center p-4 text-center text-red-600", children: [_jsx(AlertCircle, { className: "h-8 w-8 mb-2" }), _jsx("p", { className: "font-medium", children: "Something went wrong" }), this.state.error && (_jsx("p", { className: "text-sm text-muted-foreground mt-2", children: this.state.error.message }))] }));
        }
        return this.props.children;
    }
}
// Wrapper component with error boundary
const DataChartWithErrorBoundary = (props) => (_jsx(ErrorBoundary, { children: _jsx(DataChart, { ...props }) }));
DataChartWithErrorBoundary.displayName = 'DataChartWithErrorBoundary';
/**
 * DataChart - A reusable chart component that supports multiple chart types and data visualization.
 *
 * @component
 * @example
 * ```tsx
 * <DataChart
 *   data={[
 *     { name: 'Jan', value: 400 },
 *     { name: 'Feb', value: 300 },
 *     // ...more data points
 *   ]}
 *   loading={false}
 *   onExport={(format) => console.log(`Exporting as ${format}`)}
 * />
 * ```
 *
 * @param {Object} props - Component props
 * @param {ChartDataPoint[]} props.data - Array of data points to visualize
 * @param {boolean} [props.loading=false] - Whether the component is in a loading state
 * @param {(format: 'csv' | 'json') => void} [props.onExport] - Callback function for export actions
 *
 * @returns {JSX.Element} Rendered chart component
 */
export default DataChartWithErrorBoundary;
