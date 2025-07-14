import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadPage } from '../pages/UploadPage';
import { api } from '../utils/api';
import { useToast } from '../components/ui/use-toast';

// Mock the api module
vi.mock('../utils/api', () => ({
  api: {
    post: vi.fn(),
  },
  getAuthToken: vi.fn(() => Promise.resolve('mock-token')),
}));

// Mock the useToast hook
const mockToast = vi.fn();
vi.mock('../components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: mockToast,
  })),
}));

// Mock the FileUpload component
let onUploadCallback: (file: File) => void;
vi.mock('../components/upload/FileUpload', () => ({
  FileUpload: vi.fn(({ onUpload, children }) => {
    onUploadCallback = onUpload;
    return <div data-testid="mock-file-upload">{children}</div>;
  }),
}));

describe('UploadPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.mocked(api.post).mockReset();
    mockToast.mockReset();
  });

  it('renders UploadPage component correctly', () => {
    render(<UploadPage />);
    expect(screen.getByText('Upload Excel/CSV File')).toBeInTheDocument();
    expect(screen.getByText('Upload your Excel or CSV file to process and store the data in Cosmos DB.')).toBeInTheDocument();
    expect(screen.getByText('File Upload')).toBeInTheDocument();
    expect(screen.getByText('How to upload files')).toBeInTheDocument();
    expect(screen.getByText('File Requirements')).toBeInTheDocument();
  });

  it('handles successful file upload', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { rowCount: 100 } });

    render(<UploadPage />);

    const file = new File(['dummy content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    await act(async () => {
      await onUploadCallback(file);
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/v2/query/imports',
        expect.any(FormData),
        expect.objectContaining({
          onUploadProgress: expect.any(Function),
        })
      );
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Upload Successful',
          description: 'Successfully uploaded test.xlsx. Processed 100 rows.',
        })
      );
    });
  });

  it('handles failed file upload', async () => {
    const error = new Error('Network Error');
    vi.mocked(api.post).mockRejectedValueOnce(error);

    render(<UploadPage />);

    const file = new File(['dummy content'], 'test.csv', { type: 'text/csv' });
    
    await act(async () => {
      try {
        await onUploadCallback(file);
      } catch (e) {
        // Prevent unhandled promise rejection
      }
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Upload Failed',
          description: 'Network Error',
        })
      );
    });
  });
});

