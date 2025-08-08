import { FieldOption, FilterCondition } from "./types";
interface FilterControlsProps {
    fields: FieldOption[];
    filters: FilterCondition[];
    onFiltersChange: (filters: FilterCondition[]) => void;
    onAddFilter: () => void;
    onRemoveFilter: (id: string) => void;
    defaultShowFilters?: boolean;
}
export declare function FilterControls({ fields, filters, onFiltersChange, onAddFilter, onRemoveFilter, defaultShowFilters, }: FilterControlsProps): import("react/jsx-runtime").JSX.Element;
export default FilterControls;
