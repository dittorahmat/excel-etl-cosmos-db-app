interface DataChartProps {
    data: any[];
    loading?: boolean;
    onExport?: (format: 'csv' | 'json') => void;
}
export declare function DataChart({ data, loading, onExport }: DataChartProps): import("react/jsx-runtime").JSX.Element;
export {};
