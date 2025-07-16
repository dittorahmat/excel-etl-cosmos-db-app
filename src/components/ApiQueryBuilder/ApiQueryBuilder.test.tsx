import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApiQueryBuilder } from '../ApiQueryBuilder/ApiQueryBuilder';
import { api } from '../../utils/api';
import { toast } from '../../components/ui/use-toast';

// Mock API and toast
vi.mock('../../utils/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('../../components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

describe('ApiQueryBuilder', () => {
  const mockFields = [
    { name: 'City', type: 'string', label: 'City' },
    { name: 'Name', type: 'string', label: 'Name' },
    { name: 'Age', type: 'number', label: 'Age' },
  ];

  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn(),
      },
      writable: true,
    });
  });

  beforeEach(() => {
    api.get.mockResolvedValue({ success: true, fields: mockFields.map(f => f.name) });
    toast.mockClear();
    (navigator.clipboard.writeText as vi.Mock).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    api.get.mockReturnValueOnce(new Promise(() => {})); // Never resolve
    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);
    expect(screen.getByText('Loading fields...')).toBeInTheDocument();
  });

  it('renders error state if fields fail to load', async () => {
    api.get.mockResolvedValueOnce({ success: false, message: 'Failed to load' });
    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);
    await waitFor(() => expect(screen.getByText(/Error: Failed to load/i)).toBeInTheDocument());
  });

  it('allows selecting fields and generates URL', async () => {
    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);

    await waitFor(() => expect(screen.getByText('Select fields to display...')).toBeInTheDocument());

    // Select City
    fireEvent.click(screen.getByRole('button', { name: /Select fields to display/i }));
    fireEvent.click(screen.getByText('City'));
    fireEvent.click(screen.getByRole('button', { name: /Edit selection/i })); // Close popover

    // Select Name
    fireEvent.click(screen.getByRole('button', { name: /Edit selection/i }));
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByRole('button', { name: /Edit selection/i })); // Close popover

    fireEvent.click(screen.getByRole('button', { name: 'Generate API URL' }));

    await waitFor(() => {
      const expectedUrl = '/api/v2/query/rows?fields=City%2CName&limit=10&offset=0';
      expect(screen.getByDisplayValue(expectedUrl)).toBeInTheDocument();
    });
  });

  it('allows adding filters and generates URL with filters', async () => {
    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);

    await waitFor(() => expect(screen.getByText('Select fields to display...')).toBeInTheDocument());

    // Select City field
    fireEvent.click(screen.getByRole('button', { name: /Select fields to display/i }));
    fireEvent.click(screen.getByText('City'));
    fireEvent.click(screen.getByRole('button', { name: /Edit selection/i }));

    // Add a filter
    fireEvent.click(screen.getByRole('button', { name: /Add Filter/i }));

    // Select field for filter
    fireEvent.click(screen.getByRole('button', { name: /Select field/i }));
    fireEvent.click(screen.getByText('City'));

    // Select operator for filter
    fireEvent.mouseDown(screen.getByRole('button', { name: /Select operator/i })); // Use mouseDown for Select component
    fireEvent.click(screen.getByText('equals'));

    // Enter value for filter
    fireEvent.change(screen.getByPlaceholderText('Value'), { target: { value: 'New York' } });

    fireEvent.click(screen.getByRole('button', { name: 'Generate API URL' }));

    await waitFor(() => {
      const expectedFilters = encodeURIComponent(JSON.stringify([
        { id: expect.any(String), field: 'City', operator: 'equals', value: 'New York' }
      ]));
      const expectedUrl = `/api/v2/query/rows?fields=City&filters=${expectedFilters}&limit=10&offset=0`;
      expect(screen.getByDisplayValue(expectedUrl)).toBeInTheDocument();
    });
  });

  it('copies the generated URL to clipboard', async () => {
    render(<ApiQueryBuilder baseUrl="/api/v2/query/rows" />);

    await waitFor(() => expect(screen.getByText('Select fields to display...')).toBeInTheDocument());

    // Select City
    fireEvent.click(screen.getByRole('button', { name: /Select fields to display/i }));
    fireEvent.click(screen.getByText('City'));
    fireEvent.click(screen.getByRole('button', { name: /Edit selection/i }));

    fireEvent.click(screen.getByRole('button', { name: 'Generate API URL' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('/api/v2/query/rows?fields=City&limit=10&offset=0')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Copy to clipboard/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('/api/v2/query/rows?fields=City&limit=10&offset=0');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Copied!' }));
  });
});
