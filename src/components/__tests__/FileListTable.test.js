import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FileListTable } from '../FileListTable';
import { api } from '../../utils/api';
// Mock the api module
vi.mock('../../utils/api', () => ({
    api: {
        get: vi.fn(),
        delete: vi.fn(),
    },
    getAuthToken: vi.fn(() => Promise.resolve('mock-token')),
}));
// Mock window.URL.createObjectURL and window.URL.revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'mock-object-url'),
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
});
Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: '' },
});
const mockFiles = {
    data: {
        items: [
            {
                id: '1',
                fileName: 'test1.xlsx',
                fileSize: 1024,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                status: 'completed',
                rowCount: 100,
                validRows: 90,
                errorRows: 10,
                createdAt: '2023-01-01T10:00:00Z',
                updatedAt: '2023-01-01T10:05:00Z',
                processedAt: '2023-01-01T10:05:00Z',
                metadata: {},
            },
            {
                id: '2',
                fileName: 'test2.csv',
                fileSize: 2048,
                mimeType: 'text/csv',
                status: 'processing',
                rowCount: 200,
                validRows: 50,
                errorRows: 0,
                createdAt: '2023-01-02T11:00:00Z',
                updatedAt: '2023-01-02T11:10:00Z',
                processedAt: null,
                metadata: {},
            },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1,
    },
    pagination: {
        total: 2,
        limit: 10,
        offset: 0,
        hasMoreResults: false,
    },
};
describe('FileListTable', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockResolvedValue(mockFiles);
        vi.mocked(api.delete).mockResolvedValue({});
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        vi.spyOn(window, 'fetch').mockResolvedValueOnce({
            ok: true,
            blob: () => Promise.resolve(new Blob(['mock blob content'])),
        });
        // Mock window.location.href for navigation tests
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { href: '' },
        });
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('renders loading state initially', () => {
        vi.mocked(api.get).mockReturnValueOnce(new Promise(() => { })); // Never resolve to keep loading
        act(() => {
            render(_jsx(MemoryRouter, { children: _jsx(FileListTable, {}) }));
        });
        expect(screen.getByText('Loading files...')).toBeInTheDocument();
    });
    it('renders no files message when no data', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }, pagination: { total: 0, limit: 10, offset: 0, hasMoreResults: false } });
        act(() => {
            render(_jsx(MemoryRouter, { children: _jsx(FileListTable, {}) }));
        });
        await waitFor(() => {
            expect(screen.getByTestId('no-files-message')).toBeInTheDocument();
        });
    });
    it('renders files correctly', async () => {
        act(() => {
            render(_jsx(MemoryRouter, { children: _jsx(FileListTable, {}) }));
        });
        await waitFor(() => {
            expect(screen.getByText('test1.xlsx')).toBeInTheDocument();
            expect(screen.getByText('test2.csv')).toBeInTheDocument();
            expect(screen.getByText('90')).toBeInTheDocument(); // validRows for test1.xlsx
            expect(screen.getByText('Processing 50 of 200')).toBeInTheDocument(); // status for test2.csv
            // Check that the link has the correct href
            const link = screen.getByText('test1.xlsx');
            expect(link).toBeInTheDocument();
            expect(link.closest('a')).toHaveAttribute('href', '/files/1');
        });
    });
    it.skip('handles download button click', async () => {
        act(() => {
            render(_jsx(MemoryRouter, { children: _jsx(FileListTable, {}) }));
        });
        await waitFor(() => {
            expect(screen.getByText('test1.xlsx')).toBeInTheDocument();
        });
        const downloadButton = await screen.findByTestId('download-button-1');
        await userEvent.click(downloadButton);
        expect(window.URL.createObjectURL).toHaveBeenCalled();
        expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    });
    it('handles delete button click', async () => {
        act(() => {
            render(_jsx(MemoryRouter, { children: _jsx(FileListTable, {}) }));
        });
        await waitFor(() => {
            expect(screen.getByText('test1.xlsx')).toBeInTheDocument();
        });
        const deleteButton = await screen.findByTestId('delete-button-1');
        await userEvent.click(deleteButton);
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this file? This action cannot be undone.');
        expect(api.delete).toHaveBeenCalledWith('/api/v2/query/imports/1');
        await waitFor(() => {
            expect(api.get).toHaveBeenCalledTimes(2); // Initial fetch and refetch after delete
        });
    });
    it('handles pagination', async () => {
        vi.mocked(api.get).mockImplementation((url) => {
            if (url.includes('page=1')) {
                return Promise.resolve({
                    data: {
                        items: [{ id: '1', fileName: 'page1.xlsx', fileSize: 100, status: 'completed', rowCount: 10, createdAt: '2023-01-01T00:00:00Z' }],
                        total: 20,
                        page: 1,
                        pageSize: 10,
                        totalPages: 2,
                    },
                    pagination: { total: 20, limit: 10, offset: 0, hasMoreResults: true },
                });
            }
            else if (url.includes('page=2')) {
                return Promise.resolve({
                    data: {
                        items: [{ id: '2', fileName: 'page2.xlsx', fileSize: 200, status: 'completed', rowCount: 20, createdAt: '2023-01-02T00:00:00Z' }],
                        total: 20,
                        page: 2,
                        pageSize: 10,
                        totalPages: 2,
                    },
                    pagination: { total: 20, limit: 10, offset: 10, hasMoreResults: false },
                });
            }
            return Promise.resolve({ data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }, pagination: { total: 0, limit: 10, offset: 0, hasMoreResults: false } });
        });
        const user = userEvent.setup();
        act(() => {
            render(_jsx(MemoryRouter, { children: _jsx(FileListTable, {}) }));
        });
        await waitFor(() => {
            expect(screen.getByText('page1.xlsx')).toBeInTheDocument();
        });
        const nextButton = screen.getByRole('button', { name: /next/i });
        await userEvent.click(nextButton);
        await waitFor(() => {
            expect(screen.getByText('page2.xlsx')).toBeInTheDocument();
            expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
        });
        const previousButton = screen.getByRole('button', { name: /previous/i });
        await userEvent.click(previousButton);
        await waitFor(() => {
            expect(screen.getByText('page1.xlsx')).toBeInTheDocument();
            expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
        });
    });
});
