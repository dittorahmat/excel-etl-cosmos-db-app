import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { api } from '../utils/api.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Loader2, Upload as UploadIcon, Database as DatabaseIcon, BarChart2 as ChartIcon } from 'lucide-react';
import { FileListTable } from '../components/FileListTable.js';
import { QueryBuilder } from '../components/QueryBuilder.js';
import DataChart from '../components/DataChart.jsx';
export const DashboardPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('files');
    const [queryResult, setQueryResult] = useState({ items: [], hasMore: false });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Handle query execution from QueryBuilder
    const handleExecuteQuery = useCallback(async (query) => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.post('/api/query', query);
            if (!response.ok) {
                throw new Error('Failed to execute query');
            }
            const result = await response.json();
            setQueryResult(result);
            setActiveTab('results');
        }
        catch (err) {
            console.error('Error executing query:', err);
            setError(err instanceof Error ? err.message : 'Failed to execute query');
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Handle data export
    const handleExportData = useCallback(async (format) => {
        try {
            const response = await api.get(`/api/export?format=${format}`);
            if (!response.ok) {
                throw new Error('Failed to export data');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `data-export-${new Date().toISOString()}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        }
        catch (err) {
            console.error('Error exporting data:', err);
            setError(err instanceof Error ? err.message : 'Failed to export data');
        }
    }, []);
    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);
    if (!isAuthenticated) {
        return (_jsx("div", { className: "flex items-center justify-center h-screen", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin" }) }));
    }
    return (_jsxs("div", { className: "container mx-auto p-4 space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h1", { className: "text-3xl font-bold", children: "Data Explorer" }), _jsxs(Button, { onClick: () => navigate('/upload'), children: [_jsx(UploadIcon, { className: "h-4 w-4 mr-2" }), "Upload File"] })] }), _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "space-y-4", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-3 max-w-md", children: [_jsxs(TabsTrigger, { value: "files", children: [_jsx(DatabaseIcon, { className: "h-4 w-4 mr-2" }), "Files"] }), _jsxs(TabsTrigger, { value: "query", children: [_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "mr-2", children: [_jsx("path", { d: "m12 20 7-19-7 4-7-4 7 19Z" }), _jsx("path", { d: "M12 20v-8" })] }), "Query"] }), _jsxs(TabsTrigger, { value: "results", disabled: !queryResult.items.length, children: [_jsx(ChartIcon, { className: "h-4 w-4 mr-2" }), "Results"] })] }), _jsx(TabsContent, { value: "files", className: "space-y-4", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Uploaded Files" }) }), _jsx(CardContent, { children: _jsx(FileListTable, {}) })] }) }), _jsx(TabsContent, { value: "query", className: "space-y-4", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Query Builder" }) }), _jsx(CardContent, { children: _jsx(QueryBuilder, { onQueryChange: () => { }, onExecute: handleExecuteQuery, loading: loading }) })] }) }), _jsx(TabsContent, { value: "results", className: "space-y-4", children: _jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between", children: [_jsx(CardTitle, { children: "Query Results" }), _jsxs("div", { className: "space-x-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => handleExportData('csv'), disabled: !queryResult.items.length, children: "Export CSV" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => handleExportData('json'), disabled: !queryResult.items.length, children: "Export JSON" })] })] }), _jsx(CardContent, { children: error ? (_jsx("div", { className: "p-4 bg-red-50 text-red-700 rounded-md", children: error })) : loading ? (_jsxs("div", { className: "flex items-center justify-center h-64", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading results..." })] })) : queryResult.items.length > 0 ? (_jsx(DataChart, { data: queryResult.items, loading: loading, onExport: handleExportData })) : (_jsx("div", { className: "text-center py-8 text-muted-foreground", children: "No results to display. Run a query to see results." })) })] }) })] }), error && (_jsxs("div", { className: "fixed bottom-4 right-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md shadow-lg", children: [error, _jsx("button", { onClick: () => setError(null), className: "ml-4 text-red-700 hover:text-red-900", children: "\u00D7" })] }))] }));
};
export default DashboardPage;
