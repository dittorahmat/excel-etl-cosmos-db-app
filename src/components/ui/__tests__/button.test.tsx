import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../button';

describe('Button', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('h-10');
    expect(button).toHaveClass('px-4');
    expect(button).toHaveClass('py-2');
  });

  it('renders with destructive variant', () => {
    render(<Button variant="destructive">Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toHaveClass('bg-destructive');
  });

  it('renders with outline variant', () => {
    render(<Button variant="outline">Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('border-input');
  });

  it('renders with sm size', () => {
    render(<Button size="sm">Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toHaveClass('h-9');
    expect(button).toHaveClass('rounded-md');
    expect(button).toHaveClass('px-3');
  });

  it('applies custom class names', () => {
    render(<Button className="custom-button">Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toHaveClass('custom-button');
  });

  it('passes through arbitrary props', () => {
    render(<Button data-testid="test-button">Click me</Button>);
    const button = screen.getByTestId('test-button');
    expect(button).toBeInTheDocument();
  });

  it('renders as a child component when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Test Link</a>
      </Button>
    );
    const link = screen.getByRole('link', { name: /test link/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
    expect(link.tagName).toBe('A');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
