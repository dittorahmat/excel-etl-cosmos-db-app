import { FieldOption } from '@/components/QueryBuilder/types';

interface UseFieldsResult {
  fields: FieldOption[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export declare const useFields: (relatedTo?: string[]) => UseFieldsResult;