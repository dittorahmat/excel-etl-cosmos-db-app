export interface FilterCondition {
    id: string;
    field: string;
    operator: string;
    value: string | number | boolean | null;
    value2?: string | number | boolean | null;
}
