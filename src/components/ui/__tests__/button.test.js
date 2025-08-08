import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../button';
describe('Button', () => {
    it('renders with default variant and size', () => {
        render(_jsx(Button, { children: "Click me" }));
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeInTheDocument();
        expect(button).toHaveClass('bg-primary');
        expect(button).toHaveClass('h-10');
        expect(button).toHaveClass('px-4');
        expect(button).toHaveClass('py-2');
    });
    it('renders with destructive variant', () => {
        render(_jsx(Button, { variant: "destructive", children: "Click me" }));
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toHaveClass('bg-destructive');
    });
    it('renders with outline variant', () => {
        render(_jsx(Button, { variant: "outline", children: "Click me" }));
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toHaveClass('border');
        expect(button).toHaveClass('border-input');
    });
    it('renders with sm size', () => {
        render(_jsx(Button, { size: "sm", children: "Click me" }));
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toHaveClass('h-9');
        expect(button).toHaveClass('rounded-md');
        expect(button).toHaveClass('px-3');
    });
    it('applies custom class names', () => {
        render(_jsx(Button, { className: "custom-button", children: "Click me" }));
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toHaveClass('custom-button');
    });
    it('passes through arbitrary props', () => {
        render(_jsx(Button, { "data-testid": "test-button", children: "Click me" }));
        const button = screen.getByTestId('test-button');
        expect(button).toBeInTheDocument();
    });
    it('renders as a child component when asChild is true', () => {
        render(_jsx(Button, { asChild: true, children: _jsx("a", { href: "/test", children: "Test Link" }) }));
        const link = screen.getByRole('link', { name: /test link/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/test');
        expect(link.tagName).toBe('A');
    });
    it('handles click events', () => {
        const handleClick = vi.fn();
        render(_jsx(Button, { onClick: handleClick, children: "Click me" }));
        const button = screen.getByRole('button', { name: /click me/i });
        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
