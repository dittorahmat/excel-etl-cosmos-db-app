import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiQueryBuilder } from './ApiQueryBuilder';
import { api } from '../../utils/api';
// Mock the api module
vi.mock('../../utils/api', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));
describe('ApiQueryBuilder', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
    });
    it('renders loading state initially', async () => {
        api.get.mockReturnValueOnce(new Promise(() => { })); // Never resolve
        render(_jsx(ApiQueryBuilder, { baseUrl: "/api/v2/query/rows" }));
        expect(screen.getByText('Loading fields...')).toBeInTheDocument();
    });
    it('renders error state if fields fail to load', async () => {
        api.get.mockRejectedValueOnce(new Error('Failed to load fields'));
        render(_jsx(ApiQueryBuilder, { baseUrl: "/api/v2/query/rows" }));
        await waitFor(() => {
            expect(screen.getByText('Error: Failed to load fields')).toBeInTheDocument();
        });
    });
    it('allows selecting fields and generates URL', async () => {
        const user = userEvent.setup();
        api.get.mockResolvedValueOnce({
            success: true,
            fields: [
                { name: 'id', type: 'string', label: 'ID' },
                { name: 'name', type: 'string', label: 'Name' },
                { name: 'category', type: 'string', label: 'Category' },
                { name: 'price', type: 'number', label: 'Price' },
                { name: 'quantity', type: 'number', label: 'Quantity' },
                { name: 'date', type: 'string', label: 'Date' },
                { name: 'location', type: 'string', label: 'Location' },
            ],
        });
        render(_jsx(ApiQueryBuilder, { baseUrl: "/api/v2/query/rows" }));
        await waitFor(() => {
            expect(screen.queryByText('Loading fields...')).not.toBeInTheDocument();
        });
        await user.click(screen.getByRole('combobox'));
        await user.click(screen.getByText('Category'));
        const apiUrlInput = screen.getByLabelText('Generated cURL Command');
        expect(apiUrlInput).toHaveValue(`curl -X POST ${window.location.origin}/api/v2/query/rows \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
  "fields": [
    "category"
  ],
  "filters": [],
  "limit": 10,
  "offset": 0
}'`);
    });
    it('allows adding filters and generates URL with filters', async () => {
        const user = userEvent.setup();
        api.get.mockResolvedValueOnce({
            success: true,
            fields: [
                { name: 'id', type: 'string', label: 'ID' },
                { name: 'name', type: 'string', label: 'Name' },
                { name: 'category', type: 'string', label: 'Category' },
                { name: 'price', type: 'number', label: 'Price' },
                { name: 'quantity', type: 'number', label: 'Quantity' },
                { name: 'date', type: 'string', label: 'Date' },
                { name: 'location', type: 'string', label: 'Location' },
            ],
        });
        render(_jsx(ApiQueryBuilder, { baseUrl: "/api/v2/query/rows" }));
        await waitFor(() => {
            expect(screen.queryByText('Loading fields...')).not.toBeInTheDocument();
        });
        await user.click(screen.getByRole('combobox'));
        await user.click(screen.getByText('Category'));
        // Filter controls are now visible by default, so no need to click 'Show filters'
        // If you want to test hiding them, you would click 'Hide filters' instead:
        // await user.click(screen.getByRole('button', { name: 'Hide filters' }));
        await user.click(screen.getByRole('button', { name: 'Add Filter' }));
        // Select field for filter
        await user.click(screen.getByLabelText('Field'));
        screen.debug(); // Debug after opening the field selector
        await waitFor(() => {
            const categoryOption = screen.getByRole('option', { name: /Category/i });
            expect(categoryOption).toBeInTheDocument();
            user.click(categoryOption);
        });
        // Select operator for filter
        await user.click(screen.getByLabelText('Operator'));
        await user.click(screen.getByRole('option', { name: /^Equals$/i }));
        // Enter value for filter
        await user.type(screen.getByPlaceholderText('Value'), 'New York');
        const apiUrlInput = screen.getByLabelText('Generated cURL Command');
        expect(apiUrlInput.value).toContain('filters');
    });
    it('copies the generated URL to clipboard', async () => {
        const user = userEvent.setup();
        api.get.mockResolvedValueOnce({
            success: true,
            fields: [
                { name: 'id', type: 'string', label: 'ID' },
                { name: 'name', type: 'string', label: 'Name' },
                { name: 'category', type: 'string', label: 'Category' },
                { name: 'price', type: 'number', label: 'Price' },
                { name: 'quantity', type: 'number', label: 'Quantity' },
                { name: 'date', type: 'string', label: 'Date' },
                { name: 'location', type: 'string', label: 'Location' },
            ],
        });
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
            writable: true,
        });
        render(_jsx(ApiQueryBuilder, { baseUrl: "/api/v2/query/rows" }));
        await waitFor(() => {
            expect(screen.queryByText('Loading fields...')).not.toBeInTheDocument();
        });
        await user.click(screen.getByRole('combobox'));
        await user.click(screen.getByText('Category'));
        await user.click(screen.getByRole('button', { name: 'Copy URL' }));
        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`curl -X POST ${window.location.origin}/api/v2/query/rows   -H "Content-Type: application/json"   -H "x-api-key: YOUR_API_KEY"   -d '{
  "fields": [
    "category"
  ],
  "filters": [],
  "limit": 10,
  "offset": 0
}'`);
        });
    });
});
