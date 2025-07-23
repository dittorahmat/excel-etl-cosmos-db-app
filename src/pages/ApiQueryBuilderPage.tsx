import React from 'react';
import { ApiQueryBuilder } from '../components/ApiQueryBuilder/ApiQueryBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const ApiQueryBuilderPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Query Builder Standalone</h1>
      <Card>
        <CardHeader>
          <CardTitle>Build Your API Query</CardTitle>
        </CardHeader>
        <CardContent>
          <ApiQueryBuilder baseUrl="/api/v2/query/rows" />
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiQueryBuilderPage;
