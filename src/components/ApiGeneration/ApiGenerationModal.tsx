import { FilterCondition, SpecialFilters } from '../QueryBuilder/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ApiGenerationContent } from './ApiGenerationContent';

interface ApiGenerationModalProps {
  selectedFields: string[];
  filters: FilterCondition[];
  specialFilters?: SpecialFilters;
  baseUrl?: string;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ApiGenerationModal({ 
  selectedFields, 
  filters, 
  specialFilters,
  baseUrl,
  trigger,
  isOpen,
  onOpenChange
}: ApiGenerationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Create API</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>API Code Generation</DialogTitle>
        </DialogHeader>
        <ApiGenerationContent 
          selectedFields={selectedFields} 
          filters={filters} 
          specialFilters={specialFilters}
          baseUrl={baseUrl} 
        />
        <div className="flex justify-end">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}