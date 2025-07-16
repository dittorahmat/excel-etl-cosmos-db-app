import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Alert, AlertTitle, AlertDescription } from '../alert';

describe('Alert', () => {
  it('renders with default variant', () => {
    render(<Alert>Test Alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('bg-background');
    expect(alert).toHaveClass('text-foreground');
  });

  it('renders with destructive variant', () => {
    render(<Alert variant="destructive">Test Alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('border-destructive/50');
    expect(alert).toHaveClass('text-destructive');
  });

  it('applies custom class names', () => {
    render(<Alert className="custom-class">Test Alert</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('custom-class');
  });

  it('passes through arbitrary props', () => {
    render(<Alert data-testid="alert-test">Test Alert</Alert>);
    const alert = screen.getByTestId('alert-test');
    expect(alert).toBeInTheDocument();
  });
});

describe('AlertTitle', () => {
  it('renders its children', () => {
    render(<AlertTitle>Test Title</AlertTitle>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Title').tagName).toBe('H5');
  });

  it('applies custom class names', () => {
    render(<AlertTitle className="custom-title-class">Test Title</AlertTitle>);
    expect(screen.getByText('Test Title')).toHaveClass('custom-title-class');
  });

  it('passes through arbitrary props', () => {
    render(<AlertTitle data-testid="title-test">Test Title</AlertTitle>);
    expect(screen.getByTestId('title-test')).toBeInTheDocument();
  });
});

describe('AlertDescription', () => {
  it('renders its children', () => {
    render(<AlertDescription>Test Description</AlertDescription>);
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Description').tagName).toBe('DIV');
  });

  it('applies custom class names', () => {
    render(<AlertDescription className="custom-desc-class">Test Description</AlertDescription>);
    expect(screen.getByText('Test Description')).toHaveClass('custom-desc-class');
  });

  it('passes through arbitrary props', () => {
    render(<AlertDescription data-testid="desc-test">Test Description</AlertDescription>);
    expect(screen.getByTestId('desc-test')).toBeInTheDocument();
  });
});
