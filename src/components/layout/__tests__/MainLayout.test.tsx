import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { render } from '../../../test-utils';
import { MainLayout } from '../MainLayout';

// Mock useMediaQuery
vi.mock('@mui/material/useMediaQuery', () => ({
  __esModule: true,
  default: vi.fn().mockReturnValue(false),
}));

// Mock the Navbar and Sidebar components
vi.mock('../Navbar', () => ({
  Navbar: ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <nav data-testid="navbar" onClick={onMenuClick}>
      Mock Navbar
    </nav>
  ),
}));

vi.mock('../Sidebar', () => ({
  Sidebar: ({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) => (
    <aside data-testid="sidebar" data-open={mobileOpen}>
      Mock Sidebar
      <button onClick={onClose}>Close</button>
    </aside>
  ),
}));

describe('MainLayout', () => {
  // Mock useMediaQuery for mobile view
  const mockUseMediaQuery = vi.hoisted(() => vi.fn());

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(mockUseMediaQuery).mockReturnValue(false);
  });

  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <MainLayout>
          <div>Test Content</div>
        </MainLayout>
      );
    });

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders children content', async () => {
    const testContent = 'Main Content';

    await act(async () => {
      render(
        <MainLayout>
          <div>{testContent}</div>
        </MainLayout>
      );
    });

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('passes the onMenuClick handler to Navbar', async () => {
    // Mock mobile view
    vi.mocked(mockUseMediaQuery).mockReturnValue(true);

    await act(async () => {
      render(
        <MainLayout>
          <div>Test</div>
        </MainLayout>
      );
    });

    // Check if the navbar has the onClick handler
    const navbar = screen.getByTestId('navbar');
    expect(navbar).toHaveAttribute('onclick');
  });
});
