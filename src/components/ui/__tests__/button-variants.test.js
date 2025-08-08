import { buttonVariants } from '../button-variants';
import { describe, it, expect } from 'vitest';
describe('buttonVariants', () => {
    it('should return default classes for default variant and size', () => {
        const classes = buttonVariants({});
        expect(classes).toContain('bg-primary');
        expect(classes).toContain('text-primary-foreground');
        expect(classes).toContain('hover:bg-primary/90');
        expect(classes).toContain('h-10');
        expect(classes).toContain('px-4');
        expect(classes).toContain('py-2');
    });
    it('should return correct classes for destructive variant', () => {
        const classes = buttonVariants({ variant: 'destructive' });
        expect(classes).toContain('bg-destructive');
        expect(classes).toContain('text-destructive-foreground');
        expect(classes).toContain('hover:bg-destructive/90');
    });
    it('should return correct classes for outline variant', () => {
        const classes = buttonVariants({ variant: 'outline' });
        expect(classes).toContain('border');
        expect(classes).toContain('border-input');
        expect(classes).toContain('bg-background');
        expect(classes).toContain('hover:bg-accent');
        expect(classes).toContain('hover:text-accent-foreground');
    });
    it('should return correct classes for secondary variant', () => {
        const classes = buttonVariants({ variant: 'secondary' });
        expect(classes).toContain('bg-secondary');
        expect(classes).toContain('text-secondary-foreground');
        expect(classes).toContain('hover:bg-secondary/80');
    });
    it('should return correct classes for ghost variant', () => {
        const classes = buttonVariants({ variant: 'ghost' });
        expect(classes).toContain('hover:bg-accent');
        expect(classes).toContain('hover:text-accent-foreground');
    });
    it('should return correct classes for link variant', () => {
        const classes = buttonVariants({ variant: 'link' });
        expect(classes).toContain('text-primary');
        expect(classes).toContain('underline-offset-4');
        expect(classes).toContain('hover:underline');
    });
    it('should return correct classes for sm size', () => {
        const classes = buttonVariants({ size: 'sm' });
        expect(classes).toContain('h-9');
        expect(classes).toContain('rounded-md');
        expect(classes).toContain('px-3');
    });
    it('should return correct classes for lg size', () => {
        const classes = buttonVariants({ size: 'lg' });
        expect(classes).toContain('h-11');
        expect(classes).toContain('rounded-md');
        expect(classes).toContain('px-8');
    });
    it('should return correct classes for icon size', () => {
        const classes = buttonVariants({ size: 'icon' });
        expect(classes).toContain('h-10');
        expect(classes).toContain('w-10');
    });
    it('should combine variant and size classes correctly', () => {
        const classes = buttonVariants({ variant: 'destructive', size: 'sm' });
        expect(classes).toContain('bg-destructive');
        expect(classes).toContain('h-9');
    });
    it('should apply custom class names', () => {
        const classes = buttonVariants({ className: 'custom-class' });
        expect(classes).toContain('custom-class');
    });
});
