import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, BarChart2, LineChart, PieChart, Table as TableIcon, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d',
  '#ffc658', '#d0ed57', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc658'
];

interface DataChartProps {
  data: any[];
  loading?: boolean;
  onExport?: (format: 'csv' | 'json') => void;
}

export function DataChart({ data, loading = false, onExport }: DataChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'table'>('bar');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [groupBy, setGroupBy] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [numericFields, setNumericFields] = useState<string[]>([]);
  const [categoryFields, setCategoryFields] = useState<string[]>([]);

  // Extract available fields from data
  useEffect(() => {
    if (data.length > 0) {
      const fields = Object.keys(data[0]).filter(key => key !== 'id' && key !== '_rid' && key !== '_self' && key !== '_etag' && key !== '_attachments' && key !== '_ts');
      setAvailableFields(fields);
      
      // Try to identify numeric and category fields
      const sampleItem = data[0];
      const numeric: string[] = [];
      const category: string[] = [];
      
      fields.forEach(field => {
        const value = sampleItem[field];
        if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)) && value !== '')) {
          numeric.push(field);
        } else if (typeof value === 'string') {
          category.push(field);
        } else if (value instanceof Date) {
          category.push(field);
        } else if (Array.isArray(value) || typeof value === 'object') {
          // Skip arrays and objects
        } else {
          category.push(field);
        }
      });
      
      setNumericFields(numeric);
      setCategoryFields(category);
      
      // Auto-select fields if possible
      if (numeric.length > 0 && !yAxis) setYAxis(numeric[0]);
      if (category.length > 0 && !xAxis) setXAxis(category[0]);
    }
  }, [data]);

  // Process data for chart
  const getProcessedData = () => {
    if (!xAxis) return [];
    
    if (chartType === 'table') return data;
    
    // For bar and line charts with grouping
    if (groupBy) {
      const groupedData: Record<string, any> = {};
      
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
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading chart data...</span>
        </div>
      );
    }
    
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No data available for the selected chart type and fields.
        </div>
      );
    }
    
    switch (chartType) {
      case 'bar':
        return (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {yAxis && <Bar dataKey={yAxis} fill={COLORS[0]} name={yAxis} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
        
      case 'line':
        return (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {yAxis && (
                  <Line 
                    type="monotone" 
                    dataKey={yAxis} 
                    stroke={COLORS[0]} 
                    name={yAxis}
                    dot={false}
                  />
                )}
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        );
        
      case 'pie':
        return (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        );
        
      case 'table':
        if (data.length === 0) return <div>No data available</div>;
        
        const columns = Object.keys(data[0]);
        
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 10).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((col) => (
                      <td key={col} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {data.length > 10 && (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-4 text-sm text-center text-gray-500">
                      Showing 10 of {data.length} rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
        
      default:
        return <div>Select a chart type and fields to visualize the data.</div>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Data Visualization</CardTitle>
        <div className="flex space-x-2">
          <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chart Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">
                <div className="flex items-center">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  Bar Chart
                </div>
              </SelectItem>
              <SelectItem value="line">
                <div className="flex items-center">
                  <LineChart className="h-4 w-4 mr-2" />
                  Line Chart
                </div>
              </SelectItem>
              <SelectItem value="pie">
                <div className="flex items-center">
                  <PieChart className="h-4 w-4 mr-2" />
                  Pie Chart
                </div>
              </SelectItem>
              <SelectItem value="table">
                <div className="flex items-center">
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table View
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={() => onExport?.('csv')} disabled={data.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport?.('json')} disabled={data.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis / Category</label>
            <Select
              value={xAxis}
              onValueChange={setXAxis}
              disabled={chartType === 'pie' || chartType === 'table'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {categoryFields.map((field) => (
                  <SelectItem key={`x-${field}`} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {chartType === 'pie' ? 'Value' : 'Y-Axis / Value'}
            </label>
            <Select
              value={yAxis}
              onValueChange={setYAxis}
              disabled={chartType === 'table'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {numericFields.map((field) => (
                  <SelectItem key={`y-${field}`} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
            <Select
              value={groupBy}
              onValueChange={setGroupBy}
              disabled={chartType === 'pie' || chartType === 'table'}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {categoryFields.filter(f => f !== xAxis).map((field) => (
                  <SelectItem key={`g-${field}`} value={field}>
                    {field}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {renderChart()}
      </CardContent>
    </Card>
  );
}
