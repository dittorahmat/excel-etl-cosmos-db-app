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
import { toast } from '../components/ui/use-toast';
import { ApiQueryBuilder } from '../components/ApiQueryBuilder/ApiQueryBuilder';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  allowedIps?: string[];
}

const ApiKeyManagementPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState<Date | undefined>(undefined);
  const [newKeyAllowedIps, setNewKeyAllowedIps] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  const fetchApiKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ success: boolean; keys: ApiKey[] }>('/api/keys');
      if (response.success) {
        setApiKeys(response.keys);
      } else {
        setError(response.message || 'Failed to fetch API keys');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleRevokeKey = async (id: string) => {
    if (window.confirm('Are you sure you want to revoke this API key?')) {
      try {
        const response = await api.delete<{ success: boolean; message?: string }>(`/api/keys/${id}`);
        if (response.success) {
          toast({
            title: "API Key Revoked",
            description: "The API key has been successfully revoked.",
          });
          fetchApiKeys(); // Refresh the list
        } else {
          setError(response.message || 'Failed to revoke API key');
          toast({
            title: "Error",
            description: response.message || 'Failed to revoke API key',
            variant: "destructive",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revoke API key');
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : 'Failed to revoke API key',
          variant: "destructive",
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

      const response = await api.post<{ success: boolean; key?: string; message?: string }>('/api/keys', payload);
      if (response.success && response.key) {
        setGeneratedApiKey(response.key);
        setNewKeyName('');
        setNewKeyExpiresAt(undefined);
        setNewKeyAllowedIps('');
        fetchApiKeys(); // Refresh the list
        toast({
          title: "API Key Created",
          description: "Your new API key has been generated.",
        });
      } else {
        setError(response.message || 'Failed to create API key');
        toast({
          title: "Error",
          description: response.message || 'Failed to create API key',
          variant: "destructive",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create API key',
        variant: "destructive",
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
              <div className="text-red-500">Error: {error}</div>
            ) : apiKeys.length === 0 ? (
              <p>No API keys found. Create one below!</p>
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

        {/* Section for API Query Builder */}
        <Card>
          <CardHeader>
            <CardTitle>API Query Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <ApiQueryBuilder baseUrl="/api/v2/query/rows" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApiKeyManagementPage;
