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
  value: string;
  value2?: string;
}

export interface QueryBuilderProps {
  fields: FieldDefinition[];
  selectedFile: string;
  onFileChange: (fileId: string) => void;
  onExecute: (query: { 
    fields: string[]; 
    filters: FilterCondition[]; 
    specialFilters?: SpecialFilters;
    limit: number; 
    offset: number 
  }) => void;
  loading?: boolean;
  error?: string | null;
  className?: string;
  defaultShowFilters?: boolean;
  page?: number;
  pageSize?: number;
  fieldsLoading?: boolean;
}

export interface SpecialFilters {
  Source: string;
  Category: string;
  'Sub Category': string;
  Year: string[] | number[];
  FileId?: string;
}

export interface FieldOption {
  value: string;
  label: string;
  type: FieldType;
  [key: string]: unknown;
}
