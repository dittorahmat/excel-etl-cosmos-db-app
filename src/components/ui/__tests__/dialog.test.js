import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, } from '../dialog';
describe('Dialog', () => {
    it('opens and closes the dialog', async () => {
        render(_jsxs(Dialog, { children: [_jsx(DialogTrigger, { children: "Open Dialog" }), _jsxs(DialogContent, { children: [_jsx(DialogTitle, { children: "Dialog Title" }), _jsx(DialogDescription, { children: "Dialog Description" })] })] }));
        // Dialog should not be visible initially
        expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
        // Open dialog
        fireEvent.click(screen.getByText('Open Dialog'));
        expect(screen.getByText('Dialog Title')).toBeInTheDocument();
        expect(screen.getByText('Dialog Description')).toBeInTheDocument();
        // Close dialog
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
    });
    it('renders DialogHeader and DialogFooter', () => {
        render(_jsx(Dialog, { defaultOpen: true, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: "Header Content" }), _jsx(DialogTitle, { children: "Title" }), _jsx(DialogDescription, { children: "Description" }), _jsx(DialogFooter, { children: "Footer Content" })] }) }));
        expect(screen.getByText('Header Content')).toBeInTheDocument();
        expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });
    it('applies custom class names to DialogContent', () => {
        render(_jsx(Dialog, { defaultOpen: true, children: _jsxs(DialogContent, { className: "custom-content-class", children: [_jsx(DialogTitle, { children: "Title" }), _jsx(DialogDescription, { children: "Description" })] }) }));
        expect(screen.getByRole('dialog')).toHaveClass('custom-content-class');
    });
    it('applies custom class names to DialogHeader and DialogFooter', () => {
        render(_jsx(Dialog, { defaultOpen: true, children: _jsxs(DialogContent, { children: [_jsx(DialogTitle, { children: "Title" }), _jsx(DialogDescription, { children: "Description" }), _jsx(DialogHeader, { className: "custom-header-class", children: "Header" }), _jsx(DialogFooter, { className: "custom-footer-class", children: "Footer" })] }) }));
        expect(screen.getByText('Header')).toHaveClass('custom-header-class');
        expect(screen.getByText('Footer')).toHaveClass('custom-footer-class');
    });
    it('renders the close button', () => {
        render(_jsx(Dialog, { defaultOpen: true, children: _jsxs(DialogContent, { children: [_jsx(DialogTitle, { children: "Title" }), _jsx(DialogDescription, { children: "Description" })] }) }));
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
});
