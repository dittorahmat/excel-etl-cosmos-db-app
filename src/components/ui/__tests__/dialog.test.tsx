import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../dialog';

describe('Dialog', () => {
  it('opens and closes the dialog', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    // Dialog should not be visible initially
    expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();

    // Open dialog
    fireEvent.click(screen.getByText('Open Dialog'));
    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    expect(screen.getByText('Dialog Description')).toBeInTheDocument();

    // Close dialog
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByText('Dialog Title')).not.toBeInTheDocument();
  });

  it('renders DialogHeader and DialogFooter', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>Header Content</DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
          <DialogFooter>Footer Content</DialogFooter>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText('Header Content')).toBeInTheDocument();
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('applies custom class names to DialogContent', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent className="custom-content-class">
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole('dialog')).toHaveClass('custom-content-class');
  });

  it('applies custom class names to DialogHeader and DialogFooter', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
          <DialogHeader className="custom-header-class">Header</DialogHeader>
          <DialogFooter className="custom-footer-class">Footer</DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Header')).toHaveClass('custom-header-class');
    expect(screen.getByText('Footer')).toHaveClass('custom-footer-class');
  });

  it('renders the close button', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });
});