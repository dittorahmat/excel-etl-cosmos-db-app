import { useState, useMemo, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Download, BarChart2, LineChart, PieChart, Table as TableIcon, Loader2, AlertCircle } from 'lucide-react';
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

type ChartType = 'bar' | 'line' | 'pie' | 'table';

type ChartDataPoint = Record<string, string | number | null | undefined> & {
  name?: string;
  value?: number;
};

interface ChartDataPoint extends Record<string, string | number | null | undefined> {
  name?: string;
  value?: number;
}

type ExportFormat = 'csv' | 'json';

interface DataChartProps {
  data: ChartDataPoint[];
  loading?: boolean;
  onExport?: (format: ExportFormat) => void;
}

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

// Removed unused interface

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

const DataChart: React.FC<DataChartProps> = ({
  data = [],
  loading = false,
  onExport,
}) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  // Axis values
  const xAxis = 'name';
  const yAxis = 'value';

  // Memoize chart type options
  const chartTypeOptions = useMemo<ChartTypeOption[]>(() => [
    { value: 'bar', label: 'Bar Chart', icon: BarChart2 },
    { value: 'line', label: 'Line Chart', icon: LineChart },
    { value: 'pie', label: 'Pie Chart', icon: PieChart },
    { value: 'table', label: 'Table', icon: TableIcon },
  ], []);

  // Handle chart type change
  const handleChartTypeChange = useCallback((value: ChartType) => {
    setChartType(value);
  }, [setChartType]);

  // Available fields for axis selection
  const availableFields = useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0] || {});
  }, [data]);

  // Render chart based on type
  const renderChart = useCallback(() => {
    if (!data.length) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No data available
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey={yAxis} fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey={yAxis} stroke="#8884d8" activeDot={{ r: 8 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <div className="flex justify-center">
            <RechartsPieChart width={400} height={400}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey={yAxis}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RechartsPieChart>
          </div>
        );
      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {availableFields.map((field) => (
                    <th
                      key={field}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {availableFields.map((field) => (
                      <td key={`${rowIndex}-${field}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {String(row[field] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  }, [chartType, data, xAxis, yAxis, availableFields]);

  // Render export buttons
  const renderExportButtons = useCallback(() => {
    if (!onExport) return null;
    
    return (
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onExport('csv')}
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          <span>CSV</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onExport('json')}
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          <span>JSON</span>
        </Button>
      </div>
    );
  }, [onExport]);

  // Render chart type selector
  const renderChartTypeSelector = useCallback(() => (
    <Select value={chartType} onValueChange={handleChartTypeChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select chart type" />
      </SelectTrigger>
      <SelectContent>
        {chartTypeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  ), [chartType, chartTypeOptions, handleChartTypeChange]);

  // Render chart content with loading state
  const renderChartContent = useCallback(() => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading chart data...</span>
        </div>
      );
    }
    // Using default axis values for now
    return renderChart('name', 'value');
  }, [loading, renderChart]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Data Visualization</CardTitle>
        <div className="flex items-center space-x-2">
          {renderChartTypeSelector()}
          {renderExportButtons()}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {renderChartContent()}
      </CardContent>
    </Card>
  );
};

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error in DataChart:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-4 text-center text-red-600">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="font-medium">Something went wrong</p>
          {this.state.error && (
            <p className="text-sm text-muted-foreground mt-2">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrapper component with error boundary
const DataChartWithErrorBoundary: React.FC<DataChartProps> = (props) => (
  <ErrorBoundary>
    <DataChart {...props} />
  </ErrorBoundary>
);

DataChartWithErrorBoundary.displayName = 'DataChartWithErrorBoundary';

/**
 * DataChart - A reusable chart component that supports multiple chart types and data visualization.
 * 
 * @component
 * @example
 * ```tsx
 * <DataChart
 *   data={[
 *     { name: 'Jan', value: 400 },
 *     { name: 'Feb', value: 300 },
 *     // ...more data points
 *   ]}
 *   loading={false}
 *   onExport={(format) => console.log(`Exporting as ${format}`)}
 * />
 * ```
 * 
 * @param {Object} props - Component props
 * @param {ChartDataPoint[]} props.data - Array of data points to visualize
 * @param {boolean} [props.loading=false] - Whether the component is in a loading state
 * @param {(format: 'csv' | 'json') => void} [props.onExport] - Callback function for export actions
 * 
 * @returns {JSX.Element} Rendered chart component
 */
export default DataChartWithErrorBoundary;
