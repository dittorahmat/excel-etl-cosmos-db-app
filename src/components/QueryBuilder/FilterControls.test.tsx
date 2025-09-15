
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterControls } from './FilterControls';
import { OPERATORS_BY_TYPE } from './constants';

const fields = [
  { value: 'field1', label: 'Field 1', type: 'string' as const },
  { value: 'field2', label: 'Field 2', type: 'number' as const },
];

describe('FilterControls', () => {
  it('renders with no filters', () => {
    render(<FilterControls fields={fields} filters={[]} onFiltersChange={() => {}} onAddFilter={() => {}} onRemoveFilter={() => {}} defaultShowFilters={true} />);
    expect(screen.getByText('No filters added. Click "Add Filter" to get started.')).toBeInTheDocument();
  });

  it('adds a new filter', async () => {
    const user = userEvent.setup();
    const onAddFilter = vi.fn();
    render(<FilterControls fields={fields} filters={[]} onFiltersChange={() => {}} onAddFilter={onAddFilter} onRemoveFilter={() => {}} defaultShowFilters={true} />);
    await user.click(screen.getByText('Add Filter'));

    expect(onAddFilter).toHaveBeenCalled();
  });

  it('removes a filter', async () => {
    const user = userEvent.setup();
    const onRemoveFilter = vi.fn();
    const filters = [{ id: '1', field: 'field1', operator: 'eq', value: 'test' }];
    render(<FilterControls fields={fields} filters={filters} onFiltersChange={() => {}} onAddFilter={() => {}} onRemoveFilter={onRemoveFilter} defaultShowFilters={true} />);
    await user.click(screen.getByTestId('remove-filter-1'));

    expect(onRemoveFilter).toHaveBeenCalledWith('1');
  });

  it('changes a filters field, operator, and value', async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    const filters = [{ id: '1', field: '', operator: '', value: '' }];
    
    const { rerender } = render(
        <FilterControls 
            fields={fields} 
            filters={filters} 
            onFiltersChange={onFiltersChange} 
            onAddFilter={() => {}} 
            onRemoveFilter={() => {}} 
            defaultShowFilters={true} 
        />
    );

    // Change field
    await user.click(screen.getByText('Select field...'));
    await user.click(screen.getByText('Field 1'));
    expect(onFiltersChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ field: 'field1' })]));

    // Rerender with updated props to simulate parent component state change
    const updatedFilters = [{ id: '1', field: 'field1', operator: '', value: '' }];
    rerender(
        <FilterControls 
            fields={fields} 
            filters={updatedFilters} 
            onFiltersChange={onFiltersChange} 
            onAddFilter={() => {}} 
            onRemoveFilter={() => {}} 
            defaultShowFilters={true} 
        />
    );

    // Change operator
    const operatorSelect = screen.getAllByRole('combobox')[1];
    await user.click(operatorSelect);
    
    const stringOperators = OPERATORS_BY_TYPE.string;
    const equalsOperator = stringOperators.find(op => op.value === '=');
    await user.click(screen.getByText(equalsOperator.label));

    expect(onFiltersChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ operator: '=' })]));

    // Rerender with updated props
    const filtersWithOperator = [{ id: '1', field: 'field1', operator: '=', value: '' }];
    rerender(
        <FilterControls
            fields={fields}
            filters={filtersWithOperator}
            onFiltersChange={onFiltersChange}
            onAddFilter={() => {}}
            onRemoveFilter={() => {}}
            defaultShowFilters={true}
        />
    );

    // Change value
    const valueInput = screen.getByPlaceholderText('Value');
    fireEvent.change(valueInput, { target: { value: 'test' } });
    expect(onFiltersChange).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ value: 'test' })]));
  });
});
