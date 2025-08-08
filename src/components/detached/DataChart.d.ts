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
    onFieldMappingChange?: (mapping: {
        xAxis?: string;
        yAxis?: string;
    }) => void;
}
export declare const DataChart: React.FC<DataChartProps>;
export default DataChart;
