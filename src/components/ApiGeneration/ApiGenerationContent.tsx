import { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Copy } from 'lucide-react';
import { Label } from '../ui/label';
import { FilterCondition, SpecialFilters } from '../QueryBuilder/types';
import { useAuth } from '../../auth/AuthContext';

interface ApiGenerationContentProps {
  selectedFields: string[]; // This is now used to determine available fields in the result
  filters: FilterCondition[];
  specialFilters?: SpecialFilters;
  baseUrl?: string;
}

export function ApiGenerationContent({
  selectedFields,
  filters,
  specialFilters,
  baseUrl = '/api/query/file-get'
}: ApiGenerationContentProps) {
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { getAccessToken } = useAuth();

  // Generate API URL
  const generateApiUrl = useCallback(async () => {
    setLoading(true);
    try {
      // Get the real access token
      console.log('Attempting to get access token...');
      const token = await getAccessToken();
      console.log('Token retrieved:', token ? 'Yes' : 'No', token);
      if (!token) {
        throw new Error('No access token available. User may not be authenticated or API scopes may not be configured.');
      }
      const tokenValue = token;

      // Using the GET endpoint with query parameters
      const fullUrl = `${window.location.origin}${baseUrl}`;

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add file ID and special filters
      if (specialFilters?.FileId) {
        queryParams.append('fileId', specialFilters.FileId);
      }
      
      if (specialFilters?.Source) {
        queryParams.append('Source', specialFilters.Source);
      }
      
      if (specialFilters?.Category) {
        queryParams.append('Category', specialFilters.Category);
      }
      
      if (specialFilters?.['Sub Category']) {
        queryParams.append('Sub Category', specialFilters['Sub Category']);
      }
      
      if (specialFilters?.Year && Array.isArray(specialFilters.Year) && specialFilters.Year.length > 0) {
        queryParams.append('Year', specialFilters.Year.join(','));
      }

      if (filters.length > 0) {
        queryParams.append('filters', JSON.stringify(filters.filter(f => f.field && f.operator && f.value)));
      }

      // Add the token as a query parameter instead of in headers
      queryParams.append('token', tokenValue);

      const fullUrlWithParams = `${fullUrl}?${queryParams.toString()}`;

      setGeneratedUrl(fullUrlWithParams);
    } catch (error) {
      console.error('Error generating API URL with real token:', error);
      console.log('Using fallback URL with placeholder token.');

      // Using the GET endpoint with query parameters
      const fullUrl = `${window.location.origin}${baseUrl}`;

      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add file ID and special filters
      if (specialFilters?.FileId) {
        queryParams.append('fileId', specialFilters.FileId);
      }
      
      if (specialFilters?.Source) {
        queryParams.append('Source', specialFilters.Source);
      }
      
      if (specialFilters?.Category) {
        queryParams.append('Category', specialFilters.Category);
      }
      
      if (specialFilters?.['Sub Category']) {
        queryParams.append('Sub Category', specialFilters['Sub Category']);
      }
      
      if (specialFilters?.Year && Array.isArray(specialFilters.Year) && specialFilters.Year.length > 0) {
        queryParams.append('Year', specialFilters.Year.join(','));
      }

      if (filters.length > 0) {
        queryParams.append('filters', JSON.stringify(filters.filter(f => f.field && f.operator && f.value)));
      }

      // Add placeholder token as a query parameter
      queryParams.append('token', 'YOUR_ACTUAL_TOKEN');

      const fullUrlWithParams = `${fullUrl}?${queryParams.toString()}`;

      setGeneratedUrl(fullUrlWithParams);
    } finally {
      setLoading(false);
    }
  }, [specialFilters, filters, baseUrl, getAccessToken]);

  // Handle copy URL
  const handleCopyUrl = useCallback(() => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      console.log('API URL copied to clipboard.');
    }
  }, [generatedUrl]);

  // Handle refresh token
  const handleRefreshToken = useCallback(() => {
    // Simply regenerate the API URL which will fetch a new token
    generateApiUrl();
  }, [generateApiUrl]);

  // Generate URL when fields, filters or special filters change
  useEffect(() => {
    // Since generateApiUrl is now async, we need to handle it properly
    const generate = async () => {
      await generateApiUrl();
    };
    generate();
  }, [selectedFields, filters, specialFilters, generateApiUrl]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="apiUrl">Generated API URL</Label>
        <div className="flex items-center space-x-2">
          <textarea
            id="apiUrl"
            value={generatedUrl}
            readOnly
            className="flex-1 w-full h-64 p-3 border rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-sm"
          />
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleCopyUrl}
              size="icon"
              variant="outline"
              aria-label="Copy URL"
              disabled={loading}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleRefreshToken}
              size="icon"
              variant="outline"
              aria-label="Refresh token"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M8 16H3v5"></path>
              </svg>
            </Button>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Retrieving authorization token...</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This API endpoint includes the authentication token as a query parameter.
          </p>
        )}
      </div>
    </div>
  );
}