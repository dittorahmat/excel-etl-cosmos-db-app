import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../auth/useAuth';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { QueryBuilder } from '../components/QueryBuilder/QueryBuilder';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { FileListTable } from '../components/FileListTable';
import { useDashboardData } from '../hooks/useDashboardData';
const DashboardPage = () => {
    // Authentication and navigation
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    // Use the custom hook for dashboard data and logic
    const { queryResult, loading, error, fieldDefinitions, selectedFields, fieldsLoading, sortField, sortDirection, handleExecuteQuery, handleFieldsChange, handleSort, } = useDashboardData();
    const [activeTab, setActiveTab] = useState('query');
    // Format date for display
    const formatDate = (dateString) => {
        try {
            return format(new Date(dateString), 'PPpp');
        }
        catch (_e) {
            return dateString;
        }
    };
    if (!isAuthenticated) {
        navigate('/login');
        return null; // Will redirect to login
    }
    return (_jsxs("div", { className: "container mx-auto p-4", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Dashboard" }), _jsx("div", { className: "grid gap-4", children: _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "files", children: "Files" }), _jsx(TabsTrigger, { value: "query", children: "Query Builder" }), _jsx(TabsTrigger, { value: "results", children: "Results" })] }), _jsx(TabsContent, { value: "files", className: "space-y-4", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Uploaded Files" }) }), _jsx(CardContent, { children: _jsx(FileListTable, {}) })] }) }), _jsx(TabsContent, { value: "query", className: "space-y-4", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Build Your Query" }) }), _jsx(CardContent, { children: fieldsLoading ? (_jsxs("div", { className: "flex items-center justify-center p-4", children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading fields..." })] })) : fieldDefinitions.length > 0 ? (_jsx(QueryBuilder, { fields: fieldDefinitions, selectedFields: selectedFields, onFieldsChange: handleFieldsChange, onExecute: handleExecuteQuery, loading: loading, defaultShowFilters: false, page: queryResult.page, pageSize: queryResult.pageSize })) : (_jsx("div", { className: "text-center p-4 text-muted-foreground", children: "No fields available. Please check your data source." })) })] }) }), _jsx(TabsContent, { value: "results", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Query Results" }) }), _jsxs(CardContent, { children: [error && (_jsxs("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative", role: "alert", children: [_jsx("strong", { className: "font-bold", children: "Error: " }), _jsx("span", { className: "block sm:inline", children: error })] })), loading ? (_jsx("div", { className: "flex justify-center items-center py-8", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-gray-500" }) })) : queryResult.items.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsx(TableRow, { children: queryResult.fields.map((field) => (_jsx(TableHead, { children: _jsxs("div", { className: "flex items-center", children: [_jsx("span", { children: field }), _jsx("button", { onClick: () => handleSort(field), className: "ml-2 text-gray-400 hover:text-gray-600", children: sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' })] }) }, field))) }) }), _jsx(TableBody, { children: queryResult.items.map((item, index) => (_jsx(TableRow, { children: queryResult.fields.map((field) => (_jsx(TableCell, { children: typeof item[field] === 'string' && String(item[field]).includes('T')
                                                                        ? formatDate(String(item[field]))
                                                                        : String(item[field] || '') }, `${index}-${field}`))) }, item.id || index))) })] }) })) : (_jsxs("div", { className: "rounded-md bg-blue-50 p-4", children: [_jsx("h3", { className: "text-sm font-medium text-blue-800", children: "No results found" }), _jsx("div", { className: "mt-2 text-sm text-blue-700", children: _jsx("p", { children: "Try adjusting your search or filter criteria" }) })] }))] })] }) })] }) })] }));
};
export default DashboardPage;
