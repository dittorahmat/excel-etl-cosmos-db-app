import { render, screen, waitFor, act } from '@testing-library/react';
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
    api.get.mockReturnValueOnce(new Promise(() => {})); // Never resolve
    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);
    expect(screen.getByText('Loading fields...')).toBeInTheDocument();
  });

  it('renders error state if fields fail to load', async () => {
    api.get.mockResolvedValueOnce({ success: false, message: 'Failed to load fields' });
    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);
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
        { name: 'city', type: 'string', label: 'City' },
      ],
    });
    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);

    await waitFor(() => {
      expect(screen.queryByText('Loading fields...')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('City'));

    const apiUrlInput = screen.getByLabelText('Generated API URL');
    expect(apiUrlInput).toHaveValue('/api/v2/query/rows?fields=city&limit=10&offset=0');
  });

  it('allows adding filters and generates URL with filters', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValueOnce({
      success: true,
      fields: [
        { name: 'id', type: 'string', label: 'ID' },
        { name: 'name', type: 'string', label: 'Name' },
        { name: 'city', type: 'string', label: 'City' },
      ],
    });
    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);

    await waitFor(() => {
      expect(screen.queryByText('Loading fields...')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('City'));

    await user.click(screen.getByRole('button', { name: 'Show filters' }));
    await user.click(screen.getByRole('button', { name: 'Add Filter' }));

    // Select field for filter
    await user.click(screen.getByLabelText('Field'));
    screen.debug(); // Debug after opening the field selector
    await waitFor(() => {
      const cityOption = screen.getByRole('option', { name: /City/i });
      expect(cityOption).toBeInTheDocument();
      user.click(cityOption);
    });

    // Select operator for filter
    await user.click(screen.getByLabelText('Operator'));
    await user.click(screen.getByRole('option', { name: /^Equals$/i }));

    // Enter value for filter
    await user.type(screen.getByPlaceholderText('Value'), 'New York');

    const apiUrlInput = screen.getByLabelText('Generated API URL');
    expect(apiUrlInput.value).toContain('filters=');
  });

  it('copies the generated URL to clipboard', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValueOnce({
      success: true,
      fields: [
        { name: 'id', type: 'string', label: 'ID' },
        { name: 'name', type: 'string', label: 'Name' },
        { name: 'city', type: 'string', label: 'City' },
      ],
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
    });

    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);

    await waitFor(() => {
      expect(screen.queryByText('Loading fields...')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('City'));

    await user.click(screen.getByRole('button', { name: 'Copy URL' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '/api/v2/query/rows?fields=city&limit=10&offset=0'
      );
    });
  });
});
