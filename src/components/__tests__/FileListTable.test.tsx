import React from 'react';
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
        blobUrl: '/api/v2/query/imports/1/download'
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
        blobUrl: '/api/v2/query/imports/2/download'
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
    } as Response);

    

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
    vi.mocked(api.get).mockReturnValueOnce(new Promise(() => {})); // Never resolve to keep loading
    act(() => {
      render(<MemoryRouter><FileListTable /></MemoryRouter>);
    });
    expect(screen.getByText('Loading files...')).toBeInTheDocument();
  });

  it('renders no files message when no data', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 }, pagination: { total: 0, limit: 10, offset: 0, hasMoreResults: false } });
    act(() => {
      render(<MemoryRouter><FileListTable /></MemoryRouter>);
    });
    await waitFor(() => {
      expect(screen.getByTestId('no-files-message')).toBeInTheDocument();
    });
  });

  it('renders files correctly', async () => {
    act(() => {
      render(<MemoryRouter><FileListTable /></MemoryRouter>);
    });
    await waitFor(() => {
      expect(screen.getByText('test1.xlsx')).toBeInTheDocument();
      expect(screen.getByText('test2.csv')).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('90'))).toBeInTheDocument(); // validRows for test1.xlsx
      expect(screen.getByText((content) => content.includes('Processing') && content.includes('50') && content.includes('200'))).toBeInTheDocument(); // status for test2.csv
    });
  });

  it.skip('handles download button click', async () => {
    act(() => {
      render(<MemoryRouter><FileListTable /></MemoryRouter>);
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
      render(<MemoryRouter><FileListTable /></MemoryRouter>);
    });
    await waitFor(() => {
      expect(screen.getByText('test1.xlsx')).toBeInTheDocument();
    });

    const deleteButton = await screen.findByTestId('delete-button-1');
    await userEvent.click(deleteButton);

    // Check that the confirmation dialog is shown
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "test1.xlsx"? This action cannot be undone.')).toBeInTheDocument();
    
    // Click the confirm button in the dialog
    const confirmButton = screen.getByText('Delete');
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/v2/query/imports/1');
      expect(api.get).toHaveBeenCalledTimes(2); // Initial fetch and refetch after delete
    });
  });

  it('handles pagination', async () => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url.includes('page=1')) {
        return Promise.resolve({
          data: {
            items: [{ id: '1', fileName: 'page1.xlsx', fileSize: 100, status: 'completed', rowCount: 10, createdAt: '2023-01-01T00:00:00Z', blobUrl: '/api/v2/query/imports/1/download', validRows: 5 }],
            total: 20,
            page: 1,
            pageSize: 10,
            totalPages: 2,
          },
          pagination: { total: 20, limit: 10, offset: 0, hasMoreResults: true },
        });
      } else if (url.includes('page=2')) {
        return Promise.resolve({
          data: {
            items: [{ id: '2', fileName: 'page2.xlsx', fileSize: 200, status: 'completed', rowCount: 20, createdAt: '2023-01-02T00:00:00Z', blobUrl: '/api/v2/query/imports/2/download', validRows: 0 }],
            total: 20,
            page: 2,
            pageSize: 10,
            totalPages: 2,
          },
          pagination: { total: 20, limit: 10, offset: 10, hasMoreResults: false },
        });
      }
      // Default to page 1
      return Promise.resolve({
        data: {
          items: [{ id: '1', fileName: 'page1.xlsx', fileSize: 100, status: 'completed', rowCount: 10, createdAt: '2023-01-01T00:00:00Z', blobUrl: '/api/v2/query/imports/1/download', validRows: 5 }],
          total: 20,
          page: 1,
          pageSize: 10,
          totalPages: 2,
        },
        pagination: { total: 20, limit: 10, offset: 0, hasMoreResults: true },
      });
    });

    const user = userEvent.setup();
    act(() => {
      render(<MemoryRouter><FileListTable /></MemoryRouter>);
    });

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('page1.xlsx'))).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('page2.xlsx'))).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('Page 2 of 2'))).toBeInTheDocument();
    });

    const previousButton = screen.getByRole('button', { name: /previous/i });
    await userEvent.click(previousButton);

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('page1.xlsx'))).toBeInTheDocument();
      expect(screen.getByText((content) => content.includes('Page 1 of 2'))).toBeInTheDocument();
    });
  });
});