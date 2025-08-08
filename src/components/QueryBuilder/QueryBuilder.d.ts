import { FieldDefinition, FilterCondition } from "./types";
interface QueryBuilderProps {
    fields: FieldDefinition[];
    selectedFields: string[];
    onFieldsChange: (fields: string[]) => void;
    onExecute: (query: {
        fields: string[];
        filters: FilterCondition[];
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
export declare function QueryBuilder({ fields, selectedFields, onFieldsChange, onExecute, loading, error, className, defaultShowFilters, page, pageSize, fieldsLoading, }: QueryBuilderProps): import("react/jsx-runtime").JSX.Element;
export default QueryBuilder;
