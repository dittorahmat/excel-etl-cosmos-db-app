import { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Copy } from 'lucide-react';
import { Label } from '../ui/label';
import { FilterCondition } from '../QueryBuilder/types';

interface ApiGenerationContentProps {
  selectedFields: string[];
  filters: FilterCondition[];
  baseUrl?: string;
}

export function ApiGenerationContent({ 
  selectedFields, 
  filters, 
  baseUrl = '/api/v2/query/rows'
}: ApiGenerationContentProps) {
  const [generatedUrl, setGeneratedUrl] = useState<string>('');

  // Generate API URL
  const generateApiUrl = useCallback(() => {
    const body = {
      fields: selectedFields,
      filters: filters.filter(f => f.field && f.operator && f.value),
      limit: 10,
      offset: 0,
    };

    // Using the GET endpoint with query parameters
    const baseUrlGet = baseUrl.replace('/rows', '/rows-get');
    const fullUrl = `${window.location.origin}${baseUrlGet}`;

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('fields', selectedFields.join(','));

    if (body.filters.length > 0) {
      queryParams.append('filters', JSON.stringify(body.filters));
    }

    queryParams.append('limit', body.limit.toString());
    queryParams.append('offset', body.offset.toString());

    const fullUrlWithParams = `${fullUrl}?${queryParams.toString()}`;

    const pythonCode = `import requests

url = "${fullUrlWithParams}"
headers = {
    "x-api-key": "YOUR_API_KEY"
}

response = requests.get(url, headers=headers)
print(response.status_code)
print(response.json())`;

    setGeneratedUrl(pythonCode);
  }, [selectedFields, filters, baseUrl]);

  // Handle copy URL
  const handleCopyUrl = useCallback(() => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      console.log('API URL copied to clipboard.');
    }
  }, [generatedUrl]);

  // Generate URL when fields or filters change
  useEffect(() => {
    generateApiUrl();
  }, [selectedFields, filters, generateApiUrl]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="apiUrl">Generated Python Code</Label>
        <div className="flex items-center space-x-2">
          <textarea 
            id="apiUrl" 
            value={generatedUrl} 
            readOnly 
            className="flex-1 w-full h-64 p-3 border rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-sm" 
          />
          <Button 
            onClick={handleCopyUrl} 
            size="icon" 
            variant="outline" 
            aria-label="Copy URL"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Replace `YOUR_API_KEY` with your actual API key.
        </p>
      </div>
    </div>
  );
}