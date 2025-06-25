import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @vitest-environment jsdom
import { useState, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
// Mock MSAL
vi.mock('@azure/msal-react', () => ({
    useMsal: () => ({
        instance: {
            acquireTokenSilent: vi.fn().mockResolvedValue({
                accessToken: 'test-token',
            }),
        },
        accounts: [
            {
                homeAccountId: 'test-account-id',
                environment: 'test',
                tenantId: 'test-tenant-id',
                username: 'test@example.com',
            },
        ],
    }),
    useIsAuthenticated: () => true,
    useAccount: vi.fn().mockReturnValue({
        homeAccountId: 'test-account-id',
        environment: 'test',
        tenantId: 'test-tenant-id',
        username: 'test@example.com',
    }),
}));
// Mock API client
const mockApi = {
    getData: vi.fn().mockResolvedValue({
        items: [{ id: 1, name: 'Test Item' }],
    }),
    // Reset mock implementation before each test
    reset: () => {
        mockApi.getData.mockResolvedValue({
            items: [{ id: 1, name: 'Test Item' }],
        });
    },
};
// Component that makes API calls
const DataFetcher = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await mockApi.getData();
                setData(result.items);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    if (loading)
        return _jsx("div", { "data-testid": "loading", children: "Loading..." });
    if (error)
        return _jsx("div", { "data-testid": "error", children: error });
    return (_jsxs("div", { children: [_jsx("h2", { "data-testid": "title", children: "Data List" }), _jsx("ul", { "data-testid": "data-list", children: data.map(item => (_jsx("li", { "data-testid": `item-${item.id}`, children: item.name }, item.id))) })] }));
};
describe('Component with API calls', () => {
    beforeEach(() => {
        // Clear all mocks and reset DOM
        vi.clearAllMocks();
        document.body.innerHTML = '';
        mockApi.reset();
    });
    it('fetches and displays data', async () => {
        // Setup mock
        mockApi.getData.mockResolvedValueOnce({
            items: [{ id: 1, name: 'Test Item' }]
        });
        render(_jsx(DataFetcher, {}));
        // Initial loading state
        expect(screen.getByTestId('loading')).toBeInTheDocument();
        // Wait for data to be loaded and verify content
        await waitFor(() => {
            expect(screen.getByTestId('title')).toHaveTextContent('Data List');
        });
        // Verify data is displayed
        expect(screen.getByTestId('data-list')).toBeInTheDocument();
        expect(screen.getByTestId('item-1')).toHaveTextContent('Test Item');
    });
    it('handles API errors', async () => {
        // Mock API to reject
        const errorMessage = 'API Error';
        mockApi.getData.mockRejectedValueOnce(new Error(errorMessage));
        render(_jsx(DataFetcher, {}));
        // Wait for error state
        const errorElement = await screen.findByTestId('error');
        expect(errorElement).toHaveTextContent(errorMessage);
    });
});
