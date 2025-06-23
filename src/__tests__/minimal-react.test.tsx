// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';

// Minimal React component
const MinimalComponent = () => <div data-testid="minimal">Minimal Test</div>;

describe('Minimal React Test', () => {
  it('renders without crashing', () => {
    render(<MinimalComponent />);
    expect(screen.getByTestId('minimal')).to.exist;
    expect(screen.getByTestId('minimal').textContent).to.include('Minimal Test');
  });
});
