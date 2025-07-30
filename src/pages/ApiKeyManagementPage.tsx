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

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  allowedIps?: string[];
}

const ApiKeyManagementPage: React.FC = () => {
  console.log("[ApiKeyManagementPage] Render - Start");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState<Date | undefined>(undefined);
  const [newKeyAllowedIps, setNewKeyAllowedIps] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const { toast } = useToast();

  // Define possible API response formats
  type ApiKeyResponse = 
    | { success: true; keys: ApiKey[]; message?: string }  // Success response with keys
    | { success: false; message: string }                  // Error response
    | { keys: ApiKey[]; message?: string }                 // Legacy format without success flag
    | ApiKey[];                                           // Direct array of API keys

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
      const response = await api.get<ApiKeyResponse>('/api/v2/keys')
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
        const errorMsg = typeof (response as { message?: unknown })?.message === 'string' 
          ? (response as { message: string }).message 
          : 'Invalid response format from server: expected keys array';
        console.error("[ApiKeyManagementPage] Unexpected response format:", response);
        setError(errorMsg);
        setApiKeys([]);
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string}}, message?: string, stack?: string };
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
    } finally {
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
      const response = await api.get<ApiKeyResponse>('/api/v2/keys')
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
        const errorResponse = response as { message?: string; [key: string]: unknown };
        const errorMsg = typeof errorResponse?.message === 'string' 
          ? errorResponse.message 
          : 'Invalid response format from server: expected keys array';
        setError(errorMsg);
        setApiKeys([]);
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string}}, message?: string };
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
    } finally {
      console.log("[ApiKeyManagementPage] fetchApiKeys - Loading complete");
      setLoading(false);
    }
  }, []); // No dependencies since we don't use any external values

  // Fetch API keys on component mount
  useEffect(() => {
    void memoizedFetchApiKeys();
  }, [memoizedFetchApiKeys]);

  const handleRevokeKey = async (id: string) => {
    if (window.confirm('Are you sure you want to revoke this API key?')) {
      try {
        const response = await api.delete<{ success: boolean; message?: string }>(`/api/v2/keys/${id}`);
        if (response.success) {
          toast({
            title: "API Key Revoked",
            description: "The API key has been successfully revoked.",
            variant: "default",
            open: true,
            onOpenChange: () => {}
          });
          fetchApiKeys(); // Refresh the list
        } else {
          setError(response.message || 'Failed to revoke API key');
          toast({
            title: "Error",
            description: response.message || 'Failed to revoke API key',
            variant: "destructive",
            open: true,
            onOpenChange: () => {}
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revoke API key');
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : 'Failed to revoke API key',
          variant: "destructive",
          open: true,
          onOpenChange: () => {}
        });
      }
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingKey(true);
    setGeneratedApiKey(null);
    setError(null);

    try {
      const payload: { name: string; expiresAt?: string; allowedIps?: string[] } = {
        name: newKeyName,
      };
      if (newKeyExpiresAt) {
        payload.expiresAt = newKeyExpiresAt.toISOString();
      }
      if (newKeyAllowedIps) {
        payload.allowedIps = newKeyAllowedIps.split(',').map(ip => ip.trim());
      }

      const response = await api.post<{ success: boolean; key?: string; message?: string }>('/api/v2/keys', payload);
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
          onOpenChange: () => {}
        });
      } else {
        setError(response.message || 'Failed to create API key');
        toast({
          title: "Error",
          description: response.message || 'Failed to create API key',
          variant: "destructive",
          open: true,
          onOpenChange: () => {}
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create API key',
        variant: "destructive",
        open: true,
        onOpenChange: () => {}
      });
    } finally {
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
        onOpenChange: () => {}
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Key Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Your API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This section will allow you to create, list, and revoke API keys, and build API query URLs.</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 mt-4">
        {/* Section for Listing API Keys */}
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading API keys...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                <p className="font-bold">Error loading API keys</p>
                <p>{error}</p>
                <button 
                  onClick={fetchApiKeys}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : !Array.isArray(apiKeys) || apiKeys.length === 0 ? (
              <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded">
                <p>No API keys found. Create one below!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Expires At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Allowed IPs</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>{key.name}</TableCell>
                        <TableCell>{format(new Date(key.createdAt), 'PPpp')}</TableCell>
                        <TableCell>{key.expiresAt ? format(new Date(key.expiresAt), 'PPpp') : 'Never'}</TableCell>
                        <TableCell>{key.isActive ? 'Active' : 'Revoked'}</TableCell>
                        <TableCell>{key.allowedIps && key.allowedIps.length > 0 ? key.allowedIps.join(', ') : 'Any'}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={!key.isActive}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section for Creating New API Key */}
        <Card>
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., My Data Access Key"
                  required
                  disabled={creatingKey}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !newKeyExpiresAt && "text-muted-foreground"
                      )}
                      disabled={creatingKey}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newKeyExpiresAt ? format(newKeyExpiresAt, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newKeyExpiresAt}
                      onSelect={setNewKeyExpiresAt}
                      initialFocus
                      disabled={(date) => date < new Date() || date < addDays(new Date(), -1)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowedIps">Allowed IPs (Optional, comma-separated)</Label>
                <Input
                  id="allowedIps"
                  value={newKeyAllowedIps}
                  onChange={(e) => setNewKeyAllowedIps(e.target.value)}
                  placeholder="e.g., 192.168.1.1, 10.0.0.0/24"
                  disabled={creatingKey}
                />
              </div>
              <Button type="submit" disabled={creatingKey || !newKeyName}>
                {creatingKey ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create API Key"
                )}
              </Button>
            </form>

            {generatedApiKey && (
              <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center justify-between">
                <span className="font-mono text-sm break-all mr-4">{generatedApiKey}</span>
                <Button variant="ghost" size="sm" onClick={handleCopyApiKey} title="Copy to clipboard">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Section for API Query Builder */}
      </div>
  );
};

export default ApiKeyManagementPage;
