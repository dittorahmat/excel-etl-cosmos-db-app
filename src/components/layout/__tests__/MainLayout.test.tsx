import { render, screen } from '@testing-library/react';
import { MainLayout } from '../MainLayout';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import { Navbar } from '../Navbar';
import { Sidebar } from '../Sidebar';

// Mock child components
vi.mock('../Navbar', () => ({
  Navbar: vi.fn(() => <div>Mock Navbar</div>),
}));

vi.mock('../Sidebar', () => ({
  Sidebar: vi.fn(() => <div>Mock Sidebar</div>),
}));

vi.mock('../../common/ErrorBoundary', () => ({
  ErrorBoundary: vi.fn(({ children }) => <div>{children}</div>),
}));

describe('MainLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders Navbar, Sidebar, and children correctly', () => {
    const testChildren = <div data-testid="test-children">Test Children Content</div>;
    render(<MainLayout>{testChildren}</MainLayout>);

    // Check if Navbar and Sidebar mocks are rendered
    expect(screen.getByText('Mock Navbar')).toBeInTheDocument();
    expect(screen.getByText('Mock Sidebar')).toBeInTheDocument();

    // Check if children content is rendered
    expect(screen.getByTestId('test-children')).toBeInTheDocument();
    expect(screen.getByText('Test Children Content')).toBeInTheDocument();
  });

  it('renders with the correct layout classes', () => {
    const { container } = render(<MainLayout><div>Children</div></MainLayout>);

    // The outermost div rendered by MainLayout (after ErrorBoundary mock)
    const mainLayoutDiv = container.firstChild?.firstChild as HTMLElement;
    expect(mainLayoutDiv.className).toContain('flex');
    expect(mainLayoutDiv.className).toContain('h-screen');
    expect(mainLayoutDiv.className).toContain('bg-gray-100');
    expect(mainLayoutDiv.className).toContain('dark:bg-gray-900');

    const flexColDiv = screen.getByText('Mock Navbar').parentElement;
    expect(flexColDiv.className).toContain('flex');
    expect(flexColDiv.className).toContain('flex-col');
    expect(flexColDiv.className).toContain('flex-1');

    const mainElement = screen.getByRole('main');
    expect(mainElement.className).toContain('flex-1');
    expect(mainElement.className).toContain('p-4');
    expect(mainElement.className).toContain('overflow-y-auto');
  });

  it('wraps content with ErrorBoundary', () => {
    render(<MainLayout><div>Children</div></MainLayout>);
    expect(ErrorBoundary).toHaveBeenCalledTimes(1);
    expect(ErrorBoundary).toHaveBeenCalledWith(expect.objectContaining({
      children: expect.any(Object),
    }), {});
  });
});
