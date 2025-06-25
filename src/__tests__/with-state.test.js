import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { useState, useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
// Component with state and effects
const CounterWithEffect = () => {
    const [count, setCount] = useState(0);
    const [data, setData] = useState(null);
    useEffect(() => {
        // Simulate data fetching
        const timer = setTimeout(() => {
            setData('Fetched Data');
        }, 100);
        return () => clearTimeout(timer);
    }, []);
    return (_jsxs("div", { children: [_jsxs("div", { "data-testid": "count", children: ["Count: ", count] }), _jsx("button", { "data-testid": "increment", onClick: () => setCount(c => c + 1), children: "Increment" }), data && _jsx("div", { "data-testid": "data", children: data })] }));
};
describe('Component with State and Effects', () => {
    beforeEach(() => {
        // Clear all mocks and reset DOM
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });
    it('increments counter and fetches data', async () => {
        render(_jsx(CounterWithEffect, {}));
        // Initial render
        expect(screen.getByTestId('count')).toHaveTextContent('Count: 0');
        expect(screen.queryByTestId('data')).not.toBeInTheDocument();
        // Test state update
        const button = screen.getByTestId('increment');
        await act(async () => {
            button.click();
        });
        expect(screen.getByTestId('count')).toHaveTextContent('Count: 1');
        // Test effect (data fetching)
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
        });
        expect(screen.getByTestId('data')).toHaveTextContent('Fetched Data');
    });
});
