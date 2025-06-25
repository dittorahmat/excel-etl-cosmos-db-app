import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
// Minimal React component
const MinimalComponent = () => _jsx("div", { "data-testid": "minimal", children: "Minimal Test" });
describe('Minimal React Test', () => {
    it('renders without crashing', () => {
        render(_jsx(MinimalComponent, {}));
        expect(screen.getByTestId('minimal')).to.exist;
        expect(screen.getByTestId('minimal').textContent).to.include('Minimal Test');
    });
});
