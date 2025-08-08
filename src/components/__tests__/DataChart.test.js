import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataChart } from '../DataChart';
// Mock recharts library
vi.mock('recharts', async () => {
    const original = await vi.importActual('recharts');
    const MockResponsiveContainer = ({ children }) => (_jsx("div", { "data-testid": "responsive-container", style: { width: 800, height: 500 }, children: children }));
    const MockChart = ({ children, dataTestId }) => (_jsx("div", { "data-testid": dataTestId, children: children }));
    return {
        ...original,
        ResponsiveContainer: MockResponsiveContainer,
        BarChart: (props) => _jsx(MockChart, { ...props, dataTestId: "bar-chart" }),
        LineChart: (props) => _jsx(MockChart, { ...props, dataTestId: "line-chart" }),
        PieChart: (props) => _jsx(MockChart, { ...props, dataTestId: "pie-chart" }),
        Tooltip: () => _jsx("div", { "data-testid": "tooltip" }), // Mock Tooltip
        Legend: () => _jsx("div", { "data-testid": "legend" }), // Mock Legend
        XAxis: () => _jsx("div", { "data-testid": "x-axis" }),
        YAxis: () => _jsx("div", { "data-testid": "y-axis" }),
        CartesianGrid: () => _jsx("div", { "data-testid": "grid" }),
        Bar: () => _jsx("div", { "data-testid": "bar" }),
        Line: () => _jsx("div", { "data-testid": "line" }),
        Pie: () => _jsx("div", { "data-testid": "pie" }),
        Cell: () => _jsx("div", { "data-testid": "cell" }),
    };
});
const mockData = [
    { id: 1, category: 'A', value: 100 },
    { id: 2, category: 'B', value: 150 },
    { id: 3, category: 'C', value: 75 },
];
const defaultProps = {
    data: mockData,
    loading: false,
    onExport: vi.fn(),
    availableFields: ['category', 'value'],
    defaultXAxis: 'category',
    defaultYAxis: 'value',
};
describe('DataChart', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('renders loading state when loading is true', () => {
        render(_jsx(DataChart, { ...defaultProps, loading: true }));
        expect(screen.getByText('Loading Data...')).toBeInTheDocument();
        // Use a more robust selector for the loading spinner
        expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
    it('renders "No data available" when data is empty', () => {
        render(_jsx(DataChart, { ...defaultProps, data: [] }));
        expect(screen.getByText('No data available')).toBeInTheDocument();
    });
    it('renders with default bar chart', () => {
        render(_jsx(DataChart, { ...defaultProps }));
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
    it('allows switching chart types', async () => {
        const user = userEvent.setup();
        render(_jsx(DataChart, { ...defaultProps }));
        const chartTypeSelector = screen.getByTestId('chart-type-selector');
        // Switch to Line Chart
        await user.click(chartTypeSelector);
        await user.click(screen.getByText('Line Chart'));
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        // Switch to Pie Chart
        await user.click(chartTypeSelector);
        await user.click(screen.getByText('Pie Chart'));
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        // Switch to Table
        await user.click(chartTypeSelector);
        await user.click(screen.getByText('Table'));
        expect(screen.getByRole('table')).toBeInTheDocument();
    });
    it('calls onExport when export button is clicked', () => {
        render(_jsx(DataChart, { ...defaultProps }));
        const exportButton = screen.getByRole('button', { name: /Export/i });
        fireEvent.click(exportButton);
        expect(defaultProps.onExport).toHaveBeenCalledWith('csv');
    });
    it('disables export button when there is no data', () => {
        render(_jsx(DataChart, { ...defaultProps, data: [] }));
        const exportButton = screen.getByRole('button', { name: /Export/i });
        expect(exportButton).toBeDisabled();
    });
});
