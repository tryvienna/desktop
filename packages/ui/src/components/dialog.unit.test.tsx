import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './dialog';

describe('Dialog', () => {
  it('renders content when open', () => {
    const { getByText } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    expect(getByText('My Dialog')).toBeTruthy();
  });

  it('shows title and description', () => {
    const { getByText } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title Text</DialogTitle>
            <DialogDescription>Description Text</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    expect(getByText('Title Text')).toBeTruthy();
    expect(getByText('Description Text')).toBeTruthy();
  });

  it('has proper data-slot attributes', () => {
    const { baseElement } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <DialogFooter>Footer</DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(baseElement.querySelector('[data-slot="dialog-content"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="dialog-header"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="dialog-footer"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="dialog-title"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="dialog-description"]')).toBeTruthy();
  });

  it('has proper ARIA role on content', () => {
    const { baseElement } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(baseElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('renders DialogHeader with children', () => {
    const { getByText } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Header Content</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
    expect(getByText('Header Content')).toBeTruthy();
  });

  it('renders DialogFooter with children', () => {
    const { getByText } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogFooter>
            <button>Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    expect(getByText('Save')).toBeTruthy();
  });

  it('renders close button by default', () => {
    const { baseElement } = render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(baseElement.querySelector('[data-slot="dialog-close"]')).toBeTruthy();
  });

  it('hides close button when showCloseButton is false', () => {
    const { baseElement } = render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(baseElement.querySelector('[data-slot="dialog-close"]')).toBeNull();
  });

  it('renders DialogClose component', () => {
    const { getByText } = render(
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
          <DialogClose>Close Me</DialogClose>
        </DialogContent>
      </Dialog>
    );
    expect(getByText('Close Me')).toBeTruthy();
    expect(getByText('Close Me').getAttribute('data-slot')).toBe('dialog-close');
  });

  it('does not render content when closed', () => {
    const { queryByText } = render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Hidden Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(queryByText('Hidden Title')).toBeNull();
  });
});
