import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ApiKeyManagementPage from '../ApiKeyManagementPage';
import { api } from '../../utils/api';
import { toast } from '../../components/ui/use-toast';

vi.mock('../../components/ApiQueryBuilder/ApiQueryBuilder', () => ({
  ApiQueryBuilder: () => <div>ApiQueryBuilder Mock</div>,
}));

// Mock the API utility
vi.mock('../../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the toast hook
vi.mock('../../components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock date-fns format function
vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    format: vi.fn((date, fmt) => {
      if (fmt === 'PPpp') return `FormattedDate-${date.toISOString()}`;
      if (fmt === 'PPP') return `FormattedDateShort-${date.toISOString()}`;
      return actual.format(date, fmt);
    }),
    addDays: vi.fn((date, days) => {
      const newDate = new Date(date);
      newDate.setDate(date.getDate() + days);
      return newDate;
    }),
  };
});

describe('ApiKeyManagementPage', () => {
  beforeEach(() => {
    console.log("[ApiKeyManagementPage.test.tsx] beforeEach - Start");
    // Reset mocks before each test
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    toast.mockReset();

    // Explicitly mock api.get for initial fetch to ensure it resolves
    api.get.mockResolvedValue({ success: true, keys: [] });
    console.log("[ApiKeyManagementPage.test.tsx] beforeEach - api.get mocked to resolve with empty keys, timers run");
  });

  afterEach(() => {
    
  });

  const renderComponent = async () => {
    console.log("[ApiKeyManagementPage.test.tsx] renderComponent - Start");
    const { container } = render(
      <MemoryRouter>
        <ApiKeyManagementPage />
      </MemoryRouter>
    );
    console.log("[ApiKeyManagementPage.test.tsx] renderComponent - Component rendered, waiting for loading to disappear");
    await waitFor(() => {
      console.log("[ApiKeyManagementPage.test.tsx] renderComponent - Checking for loading text");
      expect(screen.queryByText('Loading API keys...')).not.toBeInTheDocument();
    }, { timeout: 10000 }); // Increased timeout for initial render wait
    console.log("[ApiKeyManagementPage.test.tsx] renderComponent - Loading text disappeared");
    return { container };
  };

  it('renders loading state initially', async () => {
    api.get.mockReturnValueOnce(new Promise(() => {})); // Never resolve to keep loading
    await act(async () => {
      await renderComponent();
    });
    expect(screen.getByText('Loading API keys...')).toBeInTheDocument();
  });

  it('renders error message if fetching API keys fails', async () => {
    api.get.mockResolvedValueOnce({ success: false, message: 'Failed to fetch' });
    await act(async () => {
      await renderComponent();
    });
    await waitFor(() => expect(screen.getByText(/Error: Failed to fetch/i)).toBeInTheDocument());
  });

  it('renders no API keys message if none exist', async () => {
    api.get.mockResolvedValueOnce({ success: true, keys: [] });
    await act(async () => {
      await renderComponent();
    });
    await waitFor(() => expect(screen.getByText('No API keys found. Create one below!')).toBeInTheDocument());
  });

  it('renders API keys in a table', async () => {
    const mockKeys = [
      {
        id: '1',
        name: 'Test Key 1',
        createdAt: new Date().toISOString(),
        isActive: true,
        allowedIps: ['127.0.0.1'],
      },
      {
        id: '2',
        name: 'Test Key 2',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // +1 day
        isActive: false,
        allowedIps: [],
      },
    ];
    api.get.mockResolvedValueOnce({ success: true, keys: mockKeys });
    await act(async () => {
      await renderComponent();
    });

    await waitFor(() => {
      expect(screen.getByText('Test Key 1')).toBeInTheDocument();
      expect(screen.getByText('Test Key 2')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Revoked')).toBeInTheDocument();
      expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
      expect(screen.getAllByText('Any').length).toBeGreaterThanOrEqual(1); // For the key with no IPs
    });
  });

  it('creates a new API key successfully', async () => {
    api.get.mockResolvedValueOnce({ success: true, keys: [] }); // Initial fetch
    api.post.mockResolvedValueOnce({ success: true, key: 'new-api-key-value', message: 'Key created' });
    api.get.mockResolvedValueOnce({ success: true, keys: [{ id: '3', name: 'New Key', createdAt: new Date().toISOString(), isActive: true }] });

    await act(async () => {
      await renderComponent();
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Key Name/i), { target: { value: 'New Key' } });
      fireEvent.click(screen.getByRole('button', { name: /Create API Key/i }));
    });

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/v2/keys', { name: 'New Key' });
      expect(screen.getByText('new-api-key-value')).toBeInTheDocument();
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'API Key Created' }));
      expect(screen.getByText('New Key')).toBeInTheDocument(); // Verify new key in table
    });
  });

  it('handles API key creation failure', async () => {
    api.get.mockResolvedValueOnce({ success: true, keys: [] });
    api.post.mockResolvedValueOnce({ success: false, message: 'Creation failed' });

    await act(async () => {
      await renderComponent();
    });
    await waitFor(() => expect(screen.getByText('No API keys found. Create one below!')).toBeInTheDocument());

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Key Name/i), { target: { value: 'Failing Key' } });
      fireEvent.click(screen.getByRole('button', { name: /Create API Key/i }));
    });

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error', description: 'Creation failed' }));
      expect(screen.queryByText('Failing Key')).not.toBeInTheDocument();
    });
  });

  it('revokes an API key successfully', async () => {
    const mockKey = { id: '1', name: 'Revoke Me', createdAt: new Date().toISOString(), isActive: true };
    api.get.mockResolvedValueOnce({ success: true, keys: [mockKey] }); // Initial fetch
    api.delete.mockResolvedValueOnce({ success: true, message: 'Key revoked' });
    api.get.mockResolvedValueOnce({ success: true, keys: [{ ...mockKey, isActive: false }] }); // After revoke fetch

    await act(async () => {
      await renderComponent();
    });
    await waitFor(() => expect(screen.getByText('Revoke Me')).toBeInTheDocument());

    window.confirm = vi.fn(() => true); // Mock user confirmation

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    });

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to revoke this API key?');
      expect(api.delete).toHaveBeenCalledWith('/api/v2/keys/1');
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'API Key Revoked' }));
      expect(screen.getByText('Revoked')).toBeInTheDocument(); // Status updated in table
    });
  });

  it('handles API key revocation failure', async () => {
    const mockKey = { id: '1', name: 'Revoke Me', createdAt: new Date().toISOString(), isActive: true };
    api.get.mockResolvedValueOnce({ success: true, keys: [mockKey] });
    api.delete.mockResolvedValueOnce({ success: false, message: 'Revocation failed' });

    await act(async () => {
      await renderComponent();
    });
    await waitFor(() => expect(screen.getByText('Revoke Me')).toBeInTheDocument());

    window.confirm = vi.fn(() => true);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    });

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error', description: 'Revocation failed' }));
      expect(screen.getByText(/Error: Revocation failed/i)).toBeInTheDocument();
      expect(screen.queryByText('Active')).not.toBeInTheDocument(); // Status should not be visible
    });
  });

  it('copies generated API key to clipboard', async () => {
    api.get.mockResolvedValueOnce({ success: true, keys: [] });
    api.post.mockResolvedValueOnce({ success: true, key: 'key-to-copy', message: 'Key created' });
    api.get.mockResolvedValueOnce({ success: true, keys: [{ id: '3', name: 'New Key', createdAt: new Date().toISOString(), isActive: true }] });

    await renderComponent();
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/Key Name/i), { target: { value: 'New Key' } });
      fireEvent.click(screen.getByRole('button', { name: /Create API Key/i }));
    });

    await waitFor(() => expect(screen.getByText('key-to-copy')).toBeInTheDocument(), { timeout: 10000 });

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(),
      },
      writable: true,
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copy to clipboard/i }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('key-to-copy');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Copied!' }));
  });
});