import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { FieldSelector } from './FieldSelector';
const fields = [
    { value: 'field1', label: 'Field 1', type: 'string' },
    { value: 'field2', label: 'Field 2', type: 'number' },
    { value: 'field3', label: 'Another Field', type: 'boolean' },
];
describe('FieldSelector', () => {
    afterEach(() => {
        vi.useRealTimers();
    });
    it('renders with no fields selected', () => {
        render(_jsx(FieldSelector, { fields: fields, selectedFields: [], onFieldsChange: () => { } }));
        expect(screen.getByText('Select fields to display...')).toBeInTheDocument();
    });
    it('renders with a selected field', () => {
        render(_jsx(FieldSelector, { fields: fields, selectedFields: ['field1'], onFieldsChange: () => { } }));
        expect(screen.getByText('Field 1')).toBeInTheDocument();
        expect(screen.getByText('1 selected')).toBeInTheDocument();
    });
    it('allows selecting a field', async () => {
        const user = userEvent.setup();
        const onFieldsChange = vi.fn();
        render(_jsx(FieldSelector, { fields: fields, selectedFields: [], onFieldsChange: onFieldsChange }));
        await user.click(screen.getByText('Select fields to display...'));
        await user.click(screen.getByText('Field 2'));
        expect(onFieldsChange).toHaveBeenCalledWith(['field2']);
    });
    it('allows deselecting a field', async () => {
        const user = userEvent.setup();
        const onFieldsChange = vi.fn();
        render(_jsx(FieldSelector, { fields: fields, selectedFields: ['field1', 'field2'], onFieldsChange: onFieldsChange }));
        await user.click(screen.getByLabelText('Remove Field 1'));
        expect(onFieldsChange).toHaveBeenCalledWith(['field2']);
    });
    it.skip('filters fields based on search term', async () => {
        vi.useFakeTimers();
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(_jsx(FieldSelector, { fields: fields, selectedFields: [], onFieldsChange: () => { } }));
        await user.click(screen.getByText('Select fields to display...'));
        const searchInput = screen.getByPlaceholderText('Search fields...');
        await user.type(searchInput, 'Another');
        vi.runAllTimers();
        await waitFor(() => {
            expect(screen.getByText('Another Field')).toBeInTheDocument();
        });
        expect(screen.queryByText('Field 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Field 2')).not.toBeInTheDocument();
    });
});
