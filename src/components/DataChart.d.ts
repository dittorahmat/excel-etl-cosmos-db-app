type ChartDataPoint = Record<string, string | number | null | undefined> & {
    name?: string;
    value?: number;
};
type ExportFormat = 'csv' | 'json';
interface DataChartProps {
    data: ChartDataPoint[];
    loading?: boolean;
    onExport?: (format: ExportFormat) => void;
}
declare const DataChartWithErrorBoundary: React.FC<DataChartProps>;
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
