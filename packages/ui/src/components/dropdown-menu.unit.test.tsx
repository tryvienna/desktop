import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from './dropdown-menu';

describe('DropdownMenu', () => {
  it('renders trigger', () => {
    const { getByText } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(getByText('Open')).toBeTruthy();
  });

  it('opens on trigger click', async () => {
    const user = userEvent.setup();
    const { getByText, queryByText } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Action</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(queryByText('Action')).toBeNull();
    await user.click(getByText('Open'));
    expect(getByText('Action')).toBeTruthy();
  });

  it('renders menu items when open', () => {
    const { getByText } = render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(getByText('Edit')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
  });

  it('has data-slot attributes', () => {
    const { baseElement } = render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(baseElement.querySelector('[data-slot="dropdown-menu-content"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="dropdown-menu-item"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="dropdown-menu-label"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-slot="dropdown-menu-separator"]')).toBeTruthy();
  });

  it('merges className on DropdownMenuContent', () => {
    const { baseElement } = render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent className="custom-menu">
          <DropdownMenuItem>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const content = baseElement.querySelector('[data-slot="dropdown-menu-content"]');
    expect(content?.className).toContain('custom-menu');
  });

  it('renders DropdownMenuShortcut', () => {
    const { getByText } = render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            Copy <DropdownMenuShortcut>Cmd+C</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(getByText('Cmd+C')).toBeTruthy();
  });

  it('supports destructive variant on DropdownMenuItem', () => {
    const { baseElement } = render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const item = baseElement.querySelector('[data-slot="dropdown-menu-item"]');
    expect(item?.className).toContain('text-destructive');
  });
});
