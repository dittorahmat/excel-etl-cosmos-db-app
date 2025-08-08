type Option = {
    label: string;
    value: string;
};
type MultiSelectProps = {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
    searchPlaceholder?: string;
    emptyText?: string;
};
export declare function MultiSelect({ options, selected, onChange, placeholder, searchPlaceholder, emptyText, className, }: MultiSelectProps): import("react/jsx-runtime").JSX.Element;
export {};
