interface QueryBuilderProps {
    onQueryChange: (query: Record<string, unknown>) => void;
    onExecute: (query: Record<string, unknown>) => void;
    loading?: boolean;
}
export declare function QueryBuilder({ onQueryChange, onExecute, loading }: QueryBuilderProps): import("react/jsx-runtime").JSX.Element;
export {};
