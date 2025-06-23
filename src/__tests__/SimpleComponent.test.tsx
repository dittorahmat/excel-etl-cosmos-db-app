import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

const SimpleComponent: React.FC = () => {
  return <div data-testid="test-element">Test Content</div>;
};

describe('SimpleComponent', () => {
  it('renders test content', () => {
    render(<SimpleComponent />);
    expect(screen.getByTestId('test-element')).toHaveTextContent('Test Content');
  });
});
