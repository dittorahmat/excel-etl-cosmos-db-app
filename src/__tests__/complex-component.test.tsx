// @vitest-environment jsdom
import React, { useState, useEffect, useCallback } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  fetchItems: vi.fn().mockResolvedValue({
    items: Array(10).fill(0).map((_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.random() * 100,
    })),
  }),
  updateItem: vi.fn().mockResolvedValue({ success: true }),
  deleteItem: vi.fn().mockResolvedValue({ success: true }),
  reset: () => {
    mockApi.fetchItems.mockResolvedValue({
      items: Array(10).fill(0).map((_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.random() * 100,
      })),
    });
    mockApi.updateItem.mockClear();
    mockApi.deleteItem.mockClear();
  },
};

// Complex component with multiple states and effects
const ComplexComponent = () => {
  const [items, setItems] = useState<Array<{id: number; name: string; value: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [counter, setCounter] = useState(0);

  // Fetch items on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await mockApi.fetchItems();
        setItems(result.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update counter every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCounter(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const handleUpdate = useCallback(async (id: number, newValue: number) => {
    try {
      await mockApi.updateItem({ id, value: newValue });
      setItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, value: newValue } : item
        )
      );
    } catch (err) {
      setError('Failed to update item');
    }
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await mockApi.deleteItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (err) {
      setError('Failed to delete item');
    }
  }, [selectedId]);

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error}</div>;

  return (
    <div>
      <h1 data-testid="title">Complex Component</h1>
      <div data-testid="counter">Counter: {counter}</div>
      
      <div data-testid="items-list">
        {items.map(item => (
          <div key={item.id} data-testid={`item-${item.id}`}>
            <span>{item.name}</span>
            <span data-testid={`value-${item.id}`}>{item.value.toFixed(2)}</span>
            <button 
              data-testid={`select-${item.id}`}
              onClick={() => handleSelect(item.id)}
            >
              {selectedId === item.id ? 'Deselect' : 'Select'}
            </button>
            {selectedId === item.id && (
              <div data-testid={`actions-${item.id}`}>
                <button 
                  data-testid={`update-${item.id}`}
                  onClick={() => handleUpdate(item.id, Math.random() * 100)}
                >
                  Update
                </button>
                <button 
                  data-testid={`delete-${item.id}`}
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

describe('Complex Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockApi.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads and displays items', async () => {
    render(<ComplexComponent />);
    
    // Initial loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    
    // Wait for items to load
    const itemsList = await screen.findByTestId('items-list');
    expect(itemsList).toBeInTheDocument();
    
    // Check if items are rendered
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByTestId(`item-${i}`)).toBeInTheDocument();
    }
    
    // Check counter is incrementing
    const counter = screen.getByTestId('counter');
    expect(counter).toHaveTextContent('Counter: 0');
    
    // Fast-forward timers
    await vi.advanceTimersByTimeAsync(1000);
    expect(counter).toHaveTextContent('Counter: 1');
    
    await vi.advanceTimersByTimeAsync(1000);
    expect(counter).toHaveTextContent('Counter: 2');
  });

  it('handles item selection and actions', async () => {
    render(<ComplexComponent />);
    
    // Wait for items to load
    await screen.findByTestId('items-list');
    
    // Select an item
    const selectButton = screen.getByTestId('select-1');
    fireEvent.click(selectButton);
    
    // Check if actions are shown
    expect(screen.getByTestId('actions-1')).toBeInTheDocument();
    
    // Update the item
    const updateButton = screen.getByTestId('update-1');
    fireEvent.click(updateButton);
    
    // Check if update was called
    await waitFor(() => {
      expect(mockApi.updateItem).toHaveBeenCalledTimes(1);
    });
    
    // Delete the item
    const deleteButton = screen.getByTestId('delete-1');
    fireEvent.click(deleteButton);
    
    // Check if delete was called
    await waitFor(() => {
      expect(mockApi.deleteItem).toHaveBeenCalledWith(1);
    });
    
    // Check if item was removed
    await waitFor(() => {
      expect(screen.queryByTestId('item-1')).not.toBeInTheDocument();
    });
  });
});
