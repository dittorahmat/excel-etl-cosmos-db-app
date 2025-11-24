export type FieldType = "string" | "number" | "boolean" | "date" | "array" | "object";
export interface FieldDefinition {
    name: string;
    type: FieldType;
    path?: string;
    description?: string;
    example?: unknown;
    label?: string;
}
export interface Operator {
    value: string;
    label: string;
    inputType?: "text" | "number" | "date" | "select";
    needsSecondValue?: boolean;
}
export interface FilterCondition {
    id: string;
    field: string;
    operator: string;
    value: string | number | boolean;
    value2?: string | number | boolean;
}
export interface QueryBuilderProps {
    fields: FieldDefinition[];
    selectedFields: string[];
    onFieldsChange: (fields: string[]) => void;
    onExecute: (query: {
        fields: string[];
        limit: number;
        offset: number;
    }) => void;
    loading?: boolean;
    error?: string | null;
    className?: string;
    defaultShowFilters?: boolean;
    page?: number;
    pageSize?: number;
    fieldsLoading?: boolean;
}
export interface FieldOption {
    value: string;
    label: string;
    type: FieldType;
    [key: string]: unknown;
}
