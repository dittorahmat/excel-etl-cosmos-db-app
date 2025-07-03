import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Download, BarChart2, LineChart, PieChart, Table as TableIcon, Loader2 } from 'lucide-react';
import type { ComponentType } from 'react';
import {
  BarChart as RechartsBarChart,
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
  ResponsiveContainer,
} from 'recharts';

export type ChartType = 'bar' | 'line' | 'pie' | 'table';




export interface ChartDataPoint extends Record<string, unknown> {
  name?: string;
  value?: unknown;
  id?: string | number;
  [key: string]: unknown;
}

export interface DataChartProps {
  data: ChartDataPoint[] | Record<string, unknown>[];
  loading?: boolean;
  onExport?: (format: 'csv' | 'json') => void;
  availableFields?: string[];
  defaultXAxis?: string;
  defaultYAxis?: string;
  onFieldMappingChange?: (mapping: { xAxis?: string; yAxis?: string }) => void;
}

// Utility to extract all field paths from data
const extractFieldPaths = (data: Record<string, unknown>[]): string[] => {
  const keys = new Set<string>();
  const extract = (obj: Record<string, unknown>, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        extract(value as Record<string, unknown>, fullKey);
      } else {
        keys.add(fullKey);
      }
    });
  };
  data.forEach(item => extract(item));
  return Array.from(keys);
};

interface ChartTypeOption {
  value: ChartType;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
    payload: Record<string, unknown>;
  }>;
  label?: string;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d',
  '#ffc658', '#d0ed57', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc658'
];

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={`tooltip-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const DataChart: React.FC<DataChartProps> = ({
  data = [],
  loading = false,
  onExport,
  availableFields: propAvailableFields,
  defaultXAxis = 'name',
  defaultYAxis = 'value',
  onFieldMappingChange,
}) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxis, setXAxis] = useState<string>(defaultXAxis);
  const [yAxis, setYAxis] = useState<string>(defaultYAxis);

    // Automatically detect available fields (including nested fields)
  const availableFields = useMemo(() => {
    if (propAvailableFields && propAvailableFields.length > 0) return propAvailableFields;
    return extractFieldPaths(Array.isArray(data) ? data : []);
  }, [data, propAvailableFields]);

  // Update axis fields when availableFields/data changes
  useEffect(() => {
    if (availableFields.length > 0) {
      const updates: { xAxis?: string; yAxis?: string } = {};
      
      if (!availableFields.includes(xAxis)) {
        updates.xAxis = availableFields[0];
      }
      
      if (!availableFields.includes(yAxis) && availableFields.length > 1) {
        updates.yAxis = availableFields[1];
      }
      
      if (Object.keys(updates).length > 0) {
        setXAxis(prev => updates.xAxis || prev);
        setYAxis(prev => updates.yAxis || prev);
        onFieldMappingChange?.({
          xAxis: updates.xAxis || xAxis,
          yAxis: updates.yAxis || yAxis
        });
      }
    }
  }, [availableFields, xAxis, yAxis, onFieldMappingChange]);

  // Get nested value by dot notation
  const getNestedValue = useCallback((obj: Record<string, unknown>, path: string): unknown => {
    return path.split('.').reduce(
      (acc, key) => (acc && typeof acc === 'object' && key in acc ? (acc as Record<string, unknown>)[key] : undefined),
      obj
    );
  }, []);

  // Memoize chart type options
  const chartTypeOptions = useMemo<ChartTypeOption[]>(
    () => [
      { value: 'bar', label: 'Bar Chart', icon: BarChart2 },
      { value: 'line', label: 'Line Chart', icon: LineChart },
      { value: 'pie', label: 'Pie Chart', icon: PieChart },
      { value: 'table', label: 'Table', icon: TableIcon },
    ],
    []
  );

  // Render chart based on type
  const renderChart = useCallback(() => {
    if (!data.length) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No data available
        </div>
      );
    }

    const chartData = data.map(item => ({
      ...item,
      name: String(getNestedValue(item, xAxis) || ''),
      value: Number(getNestedValue(item, yAxis)) || 0,
    }));

    switch (chartType) {
      case 'bar':
        return (
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </RechartsBarChart>
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
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
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
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        );

      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {xAxis}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {yAxis}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartData.map((row, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.name as string}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.value as string | number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  }, [chartType, data, xAxis, yAxis, getNestedValue]);

  const handleXAxisChange = useCallback(
    (value: string) => {
      setXAxis(value);
      onFieldMappingChange?.({ xAxis: value, yAxis });
    },
    [yAxis, onFieldMappingChange]
  );

  const handleYAxisChange = useCallback(
    (value: string) => {
      setYAxis(value);
      onFieldMappingChange?.({ xAxis, yAxis: value });
    },
    [xAxis, onFieldMappingChange]
  );

  // Render chart type selector
  const renderChartTypeSelector = useCallback(() => (
    <Select
      value={chartType}
      onValueChange={(value) => setChartType(value as ChartType)}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Chart Type" />
      </SelectTrigger>
      <SelectContent>
        {chartTypeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <option.icon className="h-4 w-4" />
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ), [chartType, chartTypeOptions]);

  // Render axis selectors
  const renderAxisSelectors = useCallback(() => (
    <>
      <Select 
        value={xAxis}
        onValueChange={handleXAxisChange}
        disabled={availableFields.length === 0}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="X-Axis" />
        </SelectTrigger>
        <SelectContent>
          {availableFields.map(field => (
            <SelectItem key={`x-${field}`} value={field}>
              {field}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select 
        value={yAxis}
        onValueChange={handleYAxisChange}
        disabled={availableFields.length === 0}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Y-Axis" />
        </SelectTrigger>
        <SelectContent>
          {availableFields.map(field => (
            <SelectItem key={`y-${field}`} value={field}>
              {field}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  ), [xAxis, yAxis, availableFields, handleXAxisChange, handleYAxisChange]);

  // Render loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Data...</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <CardTitle>Data Visualization</CardTitle>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {renderChartTypeSelector()}
          {renderAxisSelectors()}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('csv')}
              disabled={!data.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <div className="p-6 pt-0">
        {renderChart()}
      </div>
    </Card>
  );
};

export default DataChart;
