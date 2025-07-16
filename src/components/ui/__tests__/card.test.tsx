import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card';

describe('Card', () => {
  it('renders correctly with children', () => {
    render(<Card>Test Card Content</Card>);
    expect(screen.getByText('Test Card Content')).toBeInTheDocument();
    expect(screen.getByText('Test Card Content').tagName).toBe('DIV');
  });

  it('applies custom class names', () => {
    render(<Card className="custom-card">Test Card</Card>);
    expect(screen.getByText('Test Card')).toHaveClass('custom-card');
  });

  it('passes through arbitrary props', () => {
    render(<Card data-testid="card-test">Test Card</Card>);
    expect(screen.getByTestId('card-test')).toBeInTheDocument();
  });
});

describe('CardHeader', () => {
  it('renders correctly with children', () => {
    render(<CardHeader>Test Header</CardHeader>);
    expect(screen.getByText('Test Header')).toBeInTheDocument();
    expect(screen.getByText('Test Header').tagName).toBe('DIV');
  });

  it('applies custom class names', () => {
    render(<CardHeader className="custom-header">Test Header</CardHeader>);
    expect(screen.getByText('Test Header')).toHaveClass('custom-header');
  });
});

describe('CardTitle', () => {
  it('renders correctly with children', () => {
    render(<CardTitle>Test Title</CardTitle>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Title').tagName).toBe('H3');
  });

  it('applies custom class names', () => {
    render(<CardTitle className="custom-title">Test Title</CardTitle>);
    expect(screen.getByText('Test Title')).toHaveClass('custom-title');
  });
});

describe('CardDescription', () => {
  it('renders correctly with children', () => {
    render(<CardDescription>Test Description</CardDescription>);
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Description').tagName).toBe('P');
  });

  it('applies custom class names', () => {
    render(<CardDescription className="custom-description">Test Description</CardDescription>);
    expect(screen.getByText('Test Description')).toHaveClass('custom-description');
  });
});

describe('CardContent', () => {
  it('renders correctly with children', () => {
    render(<CardContent>Test Content</CardContent>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Content').tagName).toBe('DIV');
  });

  it('applies custom class names', () => {
    render(<CardContent className="custom-content">Test Content</CardContent>);
    expect(screen.getByText('Test Content')).toHaveClass('custom-content');
  });
});

describe('CardFooter', () => {
  it('renders correctly with children', () => {
    render(<CardFooter>Test Footer</CardFooter>);
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
    expect(screen.getByText('Test Footer').tagName).toBe('DIV');
  });

  it('applies custom class names', () => {
    render(<CardFooter className="custom-footer">Test Footer</CardFooter>);
    expect(screen.getByText('Test Footer')).toHaveClass('custom-footer');
  });
});
