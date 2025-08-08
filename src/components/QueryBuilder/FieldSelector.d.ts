import { FieldOption } from "./types";
interface FieldSelectorProps {
    fields: FieldOption[];
    selectedFields: string[];
    onFieldsChange: (fields: string[]) => void;
    loading?: boolean;
    disabled?: boolean;
}
export declare const FieldSelector: ({ fields, selectedFields, onFieldsChange, loading, disabled, }: FieldSelectorProps) => import("react/jsx-runtime").JSX.Element;
export {};
