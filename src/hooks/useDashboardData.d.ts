type FieldType = 'string' | 'number' | 'date' | 'boolean';
interface FieldDefinition {
    name: string;
    type: FieldType;
    label?: string;
    description?: string;
}
interface QueryResult {
    items: Record<string, unknown>[];
    fields: string[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
    continuationToken?: string;
}
interface FilterCondition {
    id: string;
    field: string;
    operator: string;
    value: string;
    value2?: string;
}
export declare const useDashboardData: () => {
    queryResult: QueryResult;
    loading: boolean;
    error: string | null;
    fieldDefinitions: FieldDefinition[];
    selectedFields: string[];
    fieldsLoading: boolean;
    sortField: string;
    sortDirection: "desc" | "asc";
    setQueryResult: import("react").Dispatch<import("react").SetStateAction<QueryResult>>;
    setSelectedFields: import("react").Dispatch<import("react").SetStateAction<string[]>>;
    handleExecuteQuery: (query: {
        fields: string[];
        filters: FilterCondition[];
        limit: number;
        offset: number;
    }) => Promise<void>;
    handleFieldsChange: (newFields: string[]) => void;
    handleSort: (field: string) => void;
};
export {};
