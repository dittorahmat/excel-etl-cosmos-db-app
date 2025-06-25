import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
const SimpleComponent = () => {
    return _jsx("div", { "data-testid": "test-element", children: "Test Content" });
};
describe('SimpleComponent', () => {
    it('renders test content', () => {
        render(_jsx(SimpleComponent, {}));
        expect(screen.getByTestId('test-element')).toHaveTextContent('Test Content');
    });
});
