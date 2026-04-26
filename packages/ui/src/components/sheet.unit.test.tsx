import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from './sheet';

describe('Sheet', () => {
  it('renders content when open', () => {
    const { getByText } = render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>My Sheet</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    expect(getByText('My Sheet')).toBeTruthy();
  });

  it('does not render content when closed', () => {
    const { queryByText } = render(
      <Sheet open={false}>
        <SheetContent>
          <SheetTitle>Hidden Title</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(queryByText('Hidden Title')).toBeNull();
  });

  it('has proper data-slot attributes', () => {
    const { baseElement } = render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Description</SheetDescription>
          </SheetHeader>
          <SheetFooter>Footer</SheetFooter>
        </SheetContent>
      </Sheet>
    );
    expect(baseElement.querySelector('[data-slot="sheet-content"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="sheet-overlay"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="sheet-header"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="sheet-footer"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="sheet-title"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="sheet-description"]')).toBeTruthy();
  });

  it('merges className on SheetContent', () => {
    const { baseElement } = render(
      <Sheet open>
        <SheetContent className="custom-class">
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    const content = baseElement.querySelector('[data-slot="sheet-content"]');
    expect(content?.className).toContain('custom-class');
  });

  it('renders SheetHeader, SheetTitle, and SheetDescription', () => {
    const { getByText } = render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title Text</SheetTitle>
            <SheetDescription>Description Text</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    expect(getByText('Title Text')).toBeTruthy();
    expect(getByText('Description Text')).toBeTruthy();
  });

  it('renders SheetFooter with children', () => {
    const { getByText } = render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
          <SheetFooter>
            <button>Save</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
    expect(getByText('Save')).toBeTruthy();
  });

  it('renders close button by default', () => {
    const { baseElement } = render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(baseElement.querySelector('[data-slot="sheet-close"]')).toBeTruthy();
  });

  it('renders SheetClose component', () => {
    const { getByText } = render(
      <Sheet open>
        <SheetContent showCloseButton={false}>
          <SheetTitle>Title</SheetTitle>
          <SheetClose>Close Me</SheetClose>
        </SheetContent>
      </Sheet>
    );
    expect(getByText('Close Me')).toBeTruthy();
    expect(getByText('Close Me').getAttribute('data-slot')).toBe('sheet-close');
  });

  it('has proper ARIA role on content', () => {
    const { baseElement } = render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(baseElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it.each(['top', 'bottom', 'left', 'right'] as const)('renders with side="%s"', (side) => {
    const { baseElement } = render(
      <Sheet open>
        <SheetContent side={side}>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    const content = baseElement.querySelector('[data-slot="sheet-content"]');
    expect(content).toBeTruthy();
  });
});
