// @vitest-environment jsdom
import React, { useState, useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

// Mock API client
const mockApi = {
  fetchItems: vi.fn().mockResolvedValue({
    items: [
      { id: 1, name: 'Item 1', value: 10 },
      { id: 2, name: 'Item 2', value: 20 },
    ],
  }),
  updateItem: vi.fn().mockResolvedValue({ success: true }),
  reset: () => {
    mockApi.fetchItems.mockResolvedValue({
      items: [
        { id: 1, name: 'Item 1', value: 10 },
        { id: 2, name: 'Item 2', value: 20 },
      ],
    });
    mockApi.updateItem.mockClear();
  },
};

// Simpler component with basic functionality
const SimpleList = () => {
  const [items, setItems] = useState<Array<{id: number; name: string; value: number}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await mockApi.fetchItems();
        setItems(result.items);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpdate = async (id: number) => {
    await mockApi.updateItem({ id, value: Math.random() * 100 });
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, value: Math.random() * 100 } : item
      )
    );
  };

  if (loading) return <div data-testid="loading">Loading...</div>;

  return (
    <div>
      <h1 data-testid="title">Simple List</h1>
      <ul data-testid="items-list">
        {items.map(item => (
          <li key={item.id} data-testid={`item-${item.id}`}>
            {item.name}: {item.value.toFixed(2)}
            <button 
              data-testid={`update-${item.id}`}
              onClick={() => handleUpdate(item.id)}
            >
              Update
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('Simple List Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockApi.reset();
  });

  it('loads and displays items', async () => {
    render(<SimpleList />);
    
    // Initial loading state
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    
    // Wait for items to load
    const itemsList = await screen.findByTestId('items-list');
    expect(itemsList).toBeInTheDocument();
    
    // Check if items are rendered
    expect(screen.getByTestId('item-1')).toHaveTextContent('Item 1');
    expect(screen.getByTestId('item-2')).toHaveTextContent('Item 2');
  });

  it('updates an item', async () => {
    render(<SimpleList />);
    
    // Wait for items to load
    await screen.findByTestId('items-list');
    
    // Get the initial value
    const initialValue = screen.getByTestId('item-1').textContent;
    
    // Mock the API response
    mockApi.updateItem.mockResolvedValueOnce({ success: true });
    
    // Click update button
    const updateButton = screen.getByTestId('update-1');
    fireEvent.click(updateButton);
    
    // Wait for the update to complete and check the API was called
    await waitFor(() => {
      expect(mockApi.updateItem).toHaveBeenCalledTimes(1);
    });
    
    // The component should re-render with the new value
    await waitFor(() => {
      const updatedText = screen.getByTestId('item-1').textContent;
      expect(updatedText).toMatch(/Item 1: \d+\.\d{2}/);
      expect(updatedText).not.toBe(initialValue);
    });
  });
});
