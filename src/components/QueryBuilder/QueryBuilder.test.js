import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryBuilder } from './QueryBuilder';
describe('QueryBuilder', () => {
    it('renders the QueryBuilder component', () => {
        const availableFields = [
            { name: 'field1', label: 'Field 1', type: 'string' },
            { name: 'field2', label: 'Field 2', type: 'number' },
        ];
        render(_jsx(QueryBuilder, { fields: availableFields, selectedFields: [], onFieldsChange: () => { }, onExecute: () => { } }));
        expect(screen.getByText('Execute Query')).toBeInTheDocument();
    });
});
