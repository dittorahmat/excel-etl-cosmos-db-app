import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DashboardPage from './DashboardPage';
import { useAuth } from '../auth/useAuth';
import { api } from '../utils/api';

// Mock the useAuth hook
vi.mock('../auth/useAuth');

// Mock the api utility
vi.mock('../utils/api');

describe('DashboardPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (useAuth as vi.Mock).mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'mock-token' }),
    });

    (api.get as vi.Mock).mockClear();
    (api.post as vi.Mock).mockClear();

    // Default mock for api.get('/api/fields')
    (api.get as vi.Mock).mockImplementation((url: string) => {
      if (url === '/api/fields') {
        return Promise.resolve({
          success: true,
          fields: ['id', 'name', 'value'],
        });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });

    // Default mock for api.post('/api/v2/query/rows')
    (api.post as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/v2/query/rows') {
        return Promise.resolve({
          success: true,
          items: [{ id: '1', name: 'Test1', value: 10 }],
          total: 1,
          hasMore: false,
        });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  test('renders DashboardPage and loads fields on authentication', async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    // Check if the Dashboard title is rendered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Wait for fields to load and QueryBuilder to appear
    await waitFor(() => {
      expect(screen.getByText('Build Your Query')).toBeInTheDocument();
    });

    // Verify that api.get('/api/fields') was called
    expect(api.get).toHaveBeenCalledWith('/api/fields');
  });
});
