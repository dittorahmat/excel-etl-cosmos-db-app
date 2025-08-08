import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Alert, AlertTitle, AlertDescription } from '../alert';
describe('Alert', () => {
    it('renders with default variant', () => {
        render(_jsx(Alert, { children: "Test Alert" }));
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveClass('bg-background');
        expect(alert).toHaveClass('text-foreground');
    });
    it('renders with destructive variant', () => {
        render(_jsx(Alert, { variant: "destructive", children: "Test Alert" }));
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveClass('border-destructive/50');
        expect(alert).toHaveClass('text-destructive');
    });
    it('applies custom class names', () => {
        render(_jsx(Alert, { className: "custom-class", children: "Test Alert" }));
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveClass('custom-class');
    });
    it('passes through arbitrary props', () => {
        render(_jsx(Alert, { "data-testid": "alert-test", children: "Test Alert" }));
        const alert = screen.getByTestId('alert-test');
        expect(alert).toBeInTheDocument();
    });
});
describe('AlertTitle', () => {
    it('renders its children', () => {
        render(_jsx(AlertTitle, { children: "Test Title" }));
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Title').tagName).toBe('H5');
    });
    it('applies custom class names', () => {
        render(_jsx(AlertTitle, { className: "custom-title-class", children: "Test Title" }));
        expect(screen.getByText('Test Title')).toHaveClass('custom-title-class');
    });
    it('passes through arbitrary props', () => {
        render(_jsx(AlertTitle, { "data-testid": "title-test", children: "Test Title" }));
        expect(screen.getByTestId('title-test')).toBeInTheDocument();
    });
});
describe('AlertDescription', () => {
    it('renders its children', () => {
        render(_jsx(AlertDescription, { children: "Test Description" }));
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('Test Description').tagName).toBe('DIV');
    });
    it('applies custom class names', () => {
        render(_jsx(AlertDescription, { className: "custom-desc-class", children: "Test Description" }));
        expect(screen.getByText('Test Description')).toHaveClass('custom-desc-class');
    });
    it('passes through arbitrary props', () => {
        render(_jsx(AlertDescription, { "data-testid": "desc-test", children: "Test Description" }));
        expect(screen.getByTestId('desc-test')).toBeInTheDocument();
    });
});
