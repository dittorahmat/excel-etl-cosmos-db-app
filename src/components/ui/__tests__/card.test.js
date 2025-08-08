import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, } from '../card';
describe('Card', () => {
    it('renders correctly with children', () => {
        render(_jsx(Card, { children: "Test Card Content" }));
        expect(screen.getByText('Test Card Content')).toBeInTheDocument();
        expect(screen.getByText('Test Card Content').tagName).toBe('DIV');
    });
    it('applies custom class names', () => {
        render(_jsx(Card, { className: "custom-card", children: "Test Card" }));
        expect(screen.getByText('Test Card')).toHaveClass('custom-card');
    });
    it('passes through arbitrary props', () => {
        render(_jsx(Card, { "data-testid": "card-test", children: "Test Card" }));
        expect(screen.getByTestId('card-test')).toBeInTheDocument();
    });
});
describe('CardHeader', () => {
    it('renders correctly with children', () => {
        render(_jsx(CardHeader, { children: "Test Header" }));
        expect(screen.getByText('Test Header')).toBeInTheDocument();
        expect(screen.getByText('Test Header').tagName).toBe('DIV');
    });
    it('applies custom class names', () => {
        render(_jsx(CardHeader, { className: "custom-header", children: "Test Header" }));
        expect(screen.getByText('Test Header')).toHaveClass('custom-header');
    });
});
describe('CardTitle', () => {
    it('renders correctly with children', () => {
        render(_jsx(CardTitle, { children: "Test Title" }));
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Title').tagName).toBe('H3');
    });
    it('applies custom class names', () => {
        render(_jsx(CardTitle, { className: "custom-title", children: "Test Title" }));
        expect(screen.getByText('Test Title')).toHaveClass('custom-title');
    });
});
describe('CardDescription', () => {
    it('renders correctly with children', () => {
        render(_jsx(CardDescription, { children: "Test Description" }));
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('Test Description').tagName).toBe('P');
    });
    it('applies custom class names', () => {
        render(_jsx(CardDescription, { className: "custom-description", children: "Test Description" }));
        expect(screen.getByText('Test Description')).toHaveClass('custom-description');
    });
});
describe('CardContent', () => {
    it('renders correctly with children', () => {
        render(_jsx(CardContent, { children: "Test Content" }));
        expect(screen.getByText('Test Content')).toBeInTheDocument();
        expect(screen.getByText('Test Content').tagName).toBe('DIV');
    });
    it('applies custom class names', () => {
        render(_jsx(CardContent, { className: "custom-content", children: "Test Content" }));
        expect(screen.getByText('Test Content')).toHaveClass('custom-content');
    });
});
describe('CardFooter', () => {
    it('renders correctly with children', () => {
        render(_jsx(CardFooter, { children: "Test Footer" }));
        expect(screen.getByText('Test Footer')).toBeInTheDocument();
        expect(screen.getByText('Test Footer').tagName).toBe('DIV');
    });
    it('applies custom class names', () => {
        render(_jsx(CardFooter, { className: "custom-footer", children: "Test Footer" }));
        expect(screen.getByText('Test Footer')).toHaveClass('custom-footer');
    });
});
