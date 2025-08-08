import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { api } from '../utils/api';
import { Loader2, Copy } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { format, addDays } from 'date-fns';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '../components/ui/use-toast';
const ApiKeyManagementPage = () => {
    console.log("[ApiKeyManagementPage] Render - Start");
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyExpiresAt, setNewKeyExpiresAt] = useState(undefined);
    const [newKeyAllowedIps, setNewKeyAllowedIps] = useState('');
    const [generatedApiKey, setGeneratedApiKey] = useState(null);
    const [creatingKey, setCreatingKey] = useState(false);
    const { toast } = useToast();
    const fetchApiKeys = async () => {
        console.log("[ApiKeyManagementPage] fetchApiKeys - Start");
        setLoading(true);
        setError(null);
        try {
            // Log the current state before making the API call
            console.log("[ApiKeyManagementPage] Current state:", {
                loading,
                error,
                apiKeys: apiKeys ? `Array(${apiKeys.length})` : 'null/undefined',
            });
            console.log("[ApiKeyManagementPage] Making API call to /api/v2/keys");
            // Make the API call and handle the response
            const response = await api.get('/api/v2/keys')
                .catch(error => {
                console.error("[ApiKeyManagementPage] API call failed:", {
                    error: error.toString(),
                    response: error.response,
                    status: error.response?.status,
                    data: error.response?.data,
                    config: {
                        url: error.config?.url,
                        method: error.config?.method,
                        headers: error.config?.headers,
                    },
                });
                throw error;
            });
            // Log the raw response for debugging
            console.log("[ApiKeyManagementPage] Raw API Response:", response);
            // Handle different response formats
            if (Array.isArray(response)) {
                // Case 1: Direct array of API keys
                console.log(`[ApiKeyManagementPage] Successfully fetched ${response.length} API keys (array format)`);
                setApiKeys(response);
            }
            else if (response && 'keys' in response && Array.isArray(response.keys)) {
                // Case 2: { keys: ApiKey[], ... } format
                console.log(`[ApiKeyManagementPage] Successfully fetched ${response.keys.length} API keys (keys object format)`);
                setApiKeys(response.keys);
            }
            // This condition is already covered by the previous condition
            // else if (response && 'success' in response && response.success === true && 'keys' in response && Array.isArray(response.keys)) {
            //   // Case 3: { success: true, keys: ApiKey[], ... } format
            //   console.log(`[ApiKeyManagementPage] Successfully fetched ${response.keys.length} API keys (success with keys format)`);
            //   setApiKeys(response.keys);
            // }
            else if (response && 'success' in response && response.success === false) {
                // Case 4: Error response with success: false
                const errorMsg = response.message || 'Failed to fetch API keys';
                console.error("[ApiKeyManagementPage] API returned error:", errorMsg);
                setError(errorMsg);
                setApiKeys([]);
            }
            else if (response && 'data' in response && Array.isArray(response.data)) {
                // Case 5: Legacy format with data array
                console.log(`[ApiKeyManagementPage] Successfully fetched ${response.data.length} API keys (legacy data format)`);
                setApiKeys(response.data);
            }
            else {
                // Unknown response format
                const errorMsg = typeof response?.message === 'string'
                    ? response.message
                    : 'Invalid response format from server: expected keys array';
                console.error("[ApiKeyManagementPage] Unexpected response format:", response);
                setError(errorMsg);
                setApiKeys([]);
            }
        }
        catch (err) {
            const error = err;
            const errorMessage = error?.response?.data?.message ||
                error?.message ||
                'Unknown error occurred';
            const status = error?.response?.status;
            console.error("[ApiKeyManagementPage] Error in fetchApiKeys:", {
                message: errorMessage,
                status,
                error: error.toString(),
                response: error?.response?.data,
                stack: error.stack,
            });
            setError(`Failed to fetch API keys: ${errorMessage}${status ? ` (${status})` : ''}`);
            setApiKeys([]);
        }
        finally {
            console.log("[ApiKeyManagementPage] fetchApiKeys - Loading complete");
            setLoading(false);
        }
    };
    // Memoize the fetchApiKeys function with useCallback to prevent unnecessary re-renders
    const memoizedFetchApiKeys = React.useCallback(async () => {
        console.log("[ApiKeyManagementPage] memoizedFetchApiKeys - Start");
        setLoading(true);
        setError(null);
        try {
            console.log("[ApiKeyManagementPage] Making API call to /api/v2/keys");
            const response = await api.get('/api/v2/keys')
                .catch(error => {
                console.error("[ApiKeyManagementPage] API call failed:", {
                    error: error.toString(),
                    response: error.response,
                    status: error.response?.status,
                    data: error.response?.data,
                });
                throw error;
            });
            // Handle different response formats
            if (Array.isArray(response)) {
                setApiKeys(response);
            }
            else if (response && 'keys' in response && Array.isArray(response.keys)) {
                setApiKeys(response.keys);
            }
            else if (response && 'success' in response && response.success === false) {
                const errorMsg = response.message || 'Failed to fetch API keys';
                setError(errorMsg);
                setApiKeys([]);
            }
            else if (response && 'data' in response && Array.isArray(response.data)) {
                setApiKeys(response.data);
            }
            else {
                const errorResponse = response;
                const errorMsg = typeof errorResponse?.message === 'string'
                    ? errorResponse.message
                    : 'Invalid response format from server: expected keys array';
                setError(errorMsg);
                setApiKeys([]);
            }
        }
        catch (err) {
            const error = err;
            const errorMessage = error?.response?.data?.message ||
                error?.message ||
                'Unknown error occurred';
            const status = error?.response?.status;
            console.error("[ApiKeyManagementPage] Error in fetchApiKeys:", {
                message: errorMessage,
                status,
                error: error.toString(),
            });
            setError(`Failed to fetch API keys: ${errorMessage}${status ? ` (${status})` : ''}`);
            setApiKeys([]);
        }
        finally {
            console.log("[ApiKeyManagementPage] fetchApiKeys - Loading complete");
            setLoading(false);
        }
    }, []); // No dependencies since we don't use any external values
    // Fetch API keys on component mount
    useEffect(() => {
        void memoizedFetchApiKeys();
    }, [memoizedFetchApiKeys]);
    const handleRevokeKey = async (id) => {
        if (window.confirm('Are you sure you want to revoke this API key?')) {
            try {
                const response = await api.delete(`/api/v2/keys/${id}`);
                if (response.success) {
                    toast({
                        title: "API Key Revoked",
                        description: "The API key has been successfully revoked.",
                        variant: "default",
                        open: true,
                        onOpenChange: () => { }
                    });
                    fetchApiKeys(); // Refresh the list
                }
                else {
                    setError(response.message || 'Failed to revoke API key');
                    toast({
                        title: "Error",
                        description: response.message || 'Failed to revoke API key',
                        variant: "destructive",
                        open: true,
                        onOpenChange: () => { }
                    });
                }
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to revoke API key');
                toast({
                    title: "Error",
                    description: err instanceof Error ? err.message : 'Failed to revoke API key',
                    variant: "destructive",
                    open: true,
                    onOpenChange: () => { }
                });
            }
        }
    };
    const handleCreateKey = async (e) => {
        e.preventDefault();
        setCreatingKey(true);
        setGeneratedApiKey(null);
        setError(null);
        try {
            const payload = {
                name: newKeyName,
            };
            if (newKeyExpiresAt) {
                payload.expiresAt = newKeyExpiresAt.toISOString();
            }
            if (newKeyAllowedIps) {
                payload.allowedIps = newKeyAllowedIps.split(',').map(ip => ip.trim());
            }
            const response = await api.post('/api/v2/keys', payload);
            if (response.success && response.key) {
                setGeneratedApiKey(response.key);
                setNewKeyName('');
                setNewKeyExpiresAt(undefined);
                setNewKeyAllowedIps('');
                fetchApiKeys(); // Refresh the list
                toast({
                    title: "API Key Created",
                    description: "Your new API key has been generated.",
                    variant: "default",
                    open: true,
                    onOpenChange: () => { }
                });
            }
            else {
                setError(response.message || 'Failed to create API key');
                toast({
                    title: "Error",
                    description: response.message || 'Failed to create API key',
                    variant: "destructive",
                    open: true,
                    onOpenChange: () => { }
                });
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create API key');
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : 'Failed to create API key',
                variant: "destructive",
                open: true,
                onOpenChange: () => { }
            });
        }
        finally {
            setCreatingKey(false);
        }
    };
    const handleCopyApiKey = () => {
        if (generatedApiKey) {
            navigator.clipboard.writeText(generatedApiKey);
            toast({
                title: "Copied!",
                description: "API key copied to clipboard.",
                variant: "default",
                open: true,
                onOpenChange: () => { }
            });
        }
    };
    return (_jsxs("div", { className: "container mx-auto p-4", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "API Key Management" }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Manage Your API Keys" }) }), _jsx(CardContent, { children: _jsx("p", { children: "This section will allow you to create, list, and revoke API keys, and build API query URLs." }) })] }), _jsxs("div", { className: "grid gap-4 mt-4", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Your API Keys" }) }), _jsx(CardContent, { children: loading ? (_jsxs("div", { className: "flex items-center justify-center p-4", children: [_jsx(Loader2, { className: "h-6 w-6 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading API keys..." })] })) : error ? (_jsxs("div", { className: "p-4 bg-red-100 border border-red-400 text-red-700 rounded", children: [_jsx("p", { className: "font-bold", children: "Error loading API keys" }), _jsx("p", { children: error }), _jsx("button", { onClick: fetchApiKeys, className: "mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700", children: "Retry" })] })) : !Array.isArray(apiKeys) || apiKeys.length === 0 ? (_jsx("div", { className: "p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded", children: _jsx("p", { children: "No API keys found. Create one below!" }) })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Created At" }), _jsx(TableHead, { children: "Expires At" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "Allowed IPs" }), _jsx(TableHead, { children: "Actions" })] }) }), _jsx(TableBody, { children: apiKeys.map((key) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: key.name }), _jsx(TableCell, { children: format(new Date(key.createdAt), 'PPpp') }), _jsx(TableCell, { children: key.expiresAt ? format(new Date(key.expiresAt), 'PPpp') : 'Never' }), _jsx(TableCell, { children: key.isActive ? 'Active' : 'Revoked' }), _jsx(TableCell, { children: key.allowedIps && key.allowedIps.length > 0 ? key.allowedIps.join(', ') : 'Any' }), _jsx(TableCell, { children: _jsx(Button, { variant: "destructive", size: "sm", onClick: () => handleRevokeKey(key.id), disabled: !key.isActive, children: "Revoke" }) })] }, key.id))) })] }) })) })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Create New API Key" }) }), _jsxs(CardContent, { children: [_jsxs("form", { onSubmit: handleCreateKey, className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "keyName", children: "Key Name" }), _jsx(Input, { id: "keyName", value: newKeyName, onChange: (e) => setNewKeyName(e.target.value), placeholder: "e.g., My Data Access Key", required: true, disabled: creatingKey })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "expiresAt", children: "Expires At (Optional)" }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: cn("w-[240px] justify-start text-left font-normal", !newKeyExpiresAt && "text-muted-foreground"), disabled: creatingKey, children: [_jsx(CalendarIcon, { className: "mr-2 h-4 w-4" }), newKeyExpiresAt ? format(newKeyExpiresAt, "PPP") : _jsx("span", { children: "Pick a date" })] }) }), _jsx(PopoverContent, { className: "w-auto p-0", align: "start", children: _jsx(Calendar, { mode: "single", selected: newKeyExpiresAt, onSelect: setNewKeyExpiresAt, initialFocus: true, disabled: (date) => date < new Date() || date < addDays(new Date(), -1) }) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "allowedIps", children: "Allowed IPs (Optional, comma-separated)" }), _jsx(Input, { id: "allowedIps", value: newKeyAllowedIps, onChange: (e) => setNewKeyAllowedIps(e.target.value), placeholder: "e.g., 192.168.1.1, 10.0.0.0/24", disabled: creatingKey })] }), _jsx(Button, { type: "submit", disabled: creatingKey || !newKeyName, children: creatingKey ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Creating..."] })) : ("Create API Key") })] }), generatedApiKey && (_jsxs("div", { className: "mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center justify-between", children: [_jsx("span", { className: "font-mono text-sm break-all mr-4", children: generatedApiKey }), _jsx(Button, { variant: "ghost", size: "sm", onClick: handleCopyApiKey, title: "Copy to clipboard", children: _jsx(Copy, { className: "h-4 w-4" }) })] }))] })] })] })] }));
};
export default ApiKeyManagementPage;
