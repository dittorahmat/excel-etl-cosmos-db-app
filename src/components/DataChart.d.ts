import type { ComponentType } from 'react';

type Primitive = string | number | boolean | null | undefined;
type NestedObject = { [key: string]: Primitive | NestedObject | Primitive[] | NestedObject[] };

type ChartType = 'bar' | 'line' | 'pie' | 'table';
type ExportFormat = 'csv' | 'json';

/**
 * Represents a single data point in the chart
 */
interface ChartDataPoint extends NestedObject {
  /** Display name for the data point */
  name?: string;
  /** Numeric value for the data point */
  value?: number | string | boolean | Date;
  /** Unique identifier for the data point */
  id?: string | number;
}

/**
 * Props for the DataChart component
 */
interface DataChartProps {
  /** Array of data points to visualize */
  data: ChartDataPoint[];
  /** Whether the component is in a loading state */
  loading?: boolean;
  /** Callback function for export actions */
  onExport?: (format: ExportFormat) => void;
  /** Available fields for axis mapping */
  availableFields?: string[];
  /** Default field to use for X-axis */
  defaultXAxis?: string;
  /** Default field to use for Y-axis */
  defaultYAxis?: string;
  /** Callback when field mappings change */
  onFieldMappingChange?: (mapping: { xAxis?: string; yAxis?: string }) => void;
  /** Current X-axis field */
  xAxis?: string;
  /** Current Y-axis field */
  yAxis?: string;
}

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
 *   availableFields={['name', 'value']}
 *   defaultXAxis="name"
 *   defaultYAxis="value"
 *   onFieldMappingChange={(mapping) => console.log('Field mapping changed:', mapping)}
 * />
 * ```
 *
 * @param {DataChartProps} props - Component props
 * @returns {JSX.Element} Rendered chart component
 */
declare const DataChart: React.FC<DataChartProps>;

export default DataChart;
