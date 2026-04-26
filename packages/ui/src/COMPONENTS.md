# @tryvienna/ui Component Catalog

> AI-readable reference for the Vienna UI component library.
> Built on Radix UI + Tailwind CSS v4 + CVA. All spacing on 8pt grid (4px sub-steps).
> OKLCH color system, 3 themes (Light, Dark Gold, VS Code Dark). WCAG AAA via Radix primitives.
> Every component has `data-slot` attributes for CSS targeting.

## Import

```tsx
import { Button, Dialog, Card } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';
import { useCompactMode } from '@tryvienna/ui/hooks';
import '@tryvienna/ui/styles.css'; // required once at app root
```

---

## Quick Reference

| Component         | File                   | Key Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Description                                    |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Button            | button.tsx             | `Button`, `buttonVariants`                                                                                                                                                                                                                                                                                                                                                                                                                                   | 6 variants, 8 sizes, asChild support           |
| Input             | input.tsx              | `Input`                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Text input with error state via aria-invalid   |
| Label             | label.tsx              | `Label`                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Form label (Radix)                             |
| Textarea          | textarea.tsx           | `Textarea`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Multi-line text input                          |
| Checkbox          | checkbox.tsx           | `Checkbox`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Radix checkbox                                 |
| Switch            | switch.tsx             | `Switch`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Toggle switch                                  |
| RadioGroup        | radio-group.tsx        | `RadioGroup`, `RadioGroupItem`                                                                                                                                                                                                                                                                                                                                                                                                                               | Radio selection                                |
| Slider            | slider.tsx             | `Slider`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Range slider                                   |
| Form              | form.tsx               | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`                                                                                                                                                                                                                                                                                                                                                                | React Hook Form integration                    |
| Card              | card.tsx               | `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent`                                                                                                                                                                                                                                                                                                                                                              | Container card                                 |
| Separator         | separator.tsx          | `Separator`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Horizontal/vertical divider                    |
| AspectRatio       | aspect-ratio.tsx       | `AspectRatio`                                                                                                                                                                                                                                                                                                                                                                                                                                                | Constrained aspect ratio container             |
| ScrollArea        | scroll-area.tsx        | `ScrollArea`, `ScrollBar`                                                                                                                                                                                                                                                                                                                                                                                                                                    | Custom scrollbar area                          |
| Badge             | badge.tsx              | `Badge`, `badgeVariants`                                                                                                                                                                                                                                                                                                                                                                                                                                     | Status/label badge, 6 variants                 |
| Avatar            | avatar.tsx             | `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`                                                                                                                                                                                                                                                                                                                                                                  | User avatar with fallback                      |
| Skeleton          | skeleton.tsx           | `Skeleton`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Loading placeholder                            |
| Progress          | progress.tsx           | `Progress`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Progress bar                                   |
| Alert             | alert.tsx              | `Alert`, `AlertTitle`, `AlertDescription`, `alertVariants`                                                                                                                                                                                                                                                                                                                                                                                                   | Alert message (default/destructive)            |
| Table             | table.tsx              | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`                                                                                                                                                                                                                                                                                                                                                     | Data table                                     |
| Tooltip           | tooltip.tsx            | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`                                                                                                                                                                                                                                                                                                                                                                                             | Hover tooltip                                  |
| Dialog            | dialog.tsx             | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`                                                                                                                                                                                                                                                                                                                                | Modal dialog                                   |
| AlertDialog       | alert-dialog.tsx       | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`                                                                                                                                                                                                                                                                  | Confirmation dialog                            |
| Popover           | popover.tsx            | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`                                                                                                                                                                                                                                                                                                                                                                                               | Popover panel                                  |
| HoverCard         | hover-card.tsx         | `HoverCard`, `HoverCardTrigger`, `HoverCardContent`                                                                                                                                                                                                                                                                                                                                                                                                          | Hover preview card                             |
| Sheet             | sheet.tsx              | `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`                                                                                                                                                                                                                                                                                                                                        | Side panel                                     |
| Drawer            | drawer.tsx             | `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`, `DrawerClose`                                                                                                                                                                                                                                                                                                                                | Bottom drawer (vaul)                           |
| Accordion         | accordion.tsx          | `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`                                                                                                                                                                                                                                                                                                                                                                                         | Expandable sections                            |
| Tabs              | tabs.tsx               | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                                                                                                                                                                                                                                                                                                                                                                                             | Tab navigation                                 |
| Breadcrumb        | breadcrumb.tsx         | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`                                                                                                                                                                                                                                                                                                                            | Breadcrumb trail                               |
| Collapsible       | collapsible.tsx        | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`                                                                                                                                                                                                                                                                                                                                                                                                    | Expand/collapse container                      |
| Toggle            | toggle.tsx             | `Toggle`, `toggleVariants`                                                                                                                                                                                                                                                                                                                                                                                                                                   | Toggle button (2 variants, 3 sizes)            |
| ToggleGroup       | toggle-group.tsx       | `ToggleGroup`, `ToggleGroupItem`                                                                                                                                                                                                                                                                                                                                                                                                                             | Toggle button group                            |
| Pagination        | pagination.tsx         | `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`                                                                                                                                                                                                                                                                                                                          | Page navigation                                |
| Select            | select.tsx             | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, `SelectGroup`, `SelectLabel`                                                                                                                                                                                                                                                                                                                                                        | Dropdown select                                |
| DropdownMenu      | dropdown-menu.tsx      | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`                                                                                                                                                                                                                               | Context-aware dropdown                         |
| ContextMenu       | context-menu.tsx       | `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`                                                                                                                                                                                                                                                                                                                                                                                 | Right-click menu                               |
| Menubar           | menubar.tsx            | `Menubar`, `MenubarMenu`, `MenubarTrigger`, `MenubarContent`, `MenubarItem`                                                                                                                                                                                                                                                                                                                                                                                  | Application menu bar                           |
| NavigationMenu    | navigation-menu.tsx    | `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`                                                                                                                                                                                                                                                                                                                         | Site navigation                                |
| Command           | command.tsx            | `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandShortcut`, `CommandSeparator`                                                                                                                                                                                                                                                                                                              | Command palette (cmdk)                         |
| Calendar          | calendar.tsx           | `Calendar`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Date picker calendar (react-day-picker)        |
| Carousel          | carousel.tsx           | `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`                                                                                                                                                                                                                                                                                                                                                                            | Content carousel (embla)                       |
| Chart             | chart.tsx              | `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`                                                                                                                                                                                                                                                                                                                                                                 | Recharts wrapper                               |
| Toaster           | sonner.tsx             | `Toaster`, `toast`                                                                                                                                                                                                                                                                                                                                                                                                                                           | Toast notifications (sonner)                   |
| Sidebar           | sidebar.tsx            | `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarGroupAction`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuSub`, `SidebarMenuSubButton`, `SidebarMenuSubItem`, `SidebarMenuSkeleton`, `SidebarInput`, `SidebarInset`, `SidebarRail`, `SidebarSeparator`, `SidebarTrigger`, `useSidebar` | Full sidebar system                            |
| ContentProvider   | content-provider.tsx   | `ContentProvider`, `useContentDensity`, `sectionSpacing`, `metadataSpacing`, `timelineSpacing`                                                                                                                                                                                                                                                                                                                                                               | Density context system                         |
| ContentSection    | content-section.tsx    | `ContentSection`                                                                                                                                                                                                                                                                                                                                                                                                                                             | Collapsible section with title + action        |
| MetadataList      | metadata-list.tsx      | `MetadataList`                                                                                                                                                                                                                                                                                                                                                                                                                                               | Key-value metadata display                     |
| Timeline          | timeline.tsx           | `Timeline`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Vertical timeline with dot variants            |
| EmptyState        | empty-state.tsx        | `EmptyState`                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Empty state with icon + action                 |
| EntityCard        | entity-card.tsx        | `EntityCard`                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Rich entity card with emoji, badges, stats     |
| InlineEdit        | inline-edit.tsx        | `InlineEdit`                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Inline text editing with marquee overflow      |
| SearchFilterBar   | search-filter-bar.tsx  | `SearchFilterBar`                                                                                                                                                                                                                                                                                                                                                                                                                                            | Search input with filter dropdown              |
| ConfirmDialog     | confirm-dialog.tsx     | `ConfirmDialog`                                                                                                                                                                                                                                                                                                                                                                                                                                              | Confirmation dialog with async onConfirm       |
| Combobox          | combobox.tsx           | `Combobox`                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Searchable select with multi-select support    |
| Markdown          | markdown.tsx           | `Markdown`, `markdownVariants`                                                                                                                                                                                                                                                                                                                                                                                                                               | Markdown renderer (marked + highlight.js)      |
| MarkdownEditor    | markdown-editor.tsx    | `MarkdownEditor`                                                                                                                                                                                                                                                                                                                                                                                                                                             | Write/preview markdown editor                  |
| MermaidBlock      | mermaid-block.tsx      | `MermaidBlock`                                                                                                                                                                                                                                                                                                                                                                                                                                               | Mermaid diagram renderer (lazy-loaded)         |
| ChartBlock        | chart-block.tsx        | `ChartBlock`                                                                                                                                                                                                                                                                                                                                                                                                                                                 | JSON-configured chart renderer (lazy recharts) |
| Spinner           | spinner.tsx            | `Spinner`, `spinnerVariants`                                                                                                                                                                                                                                                                                                                                                                                                                                 | Loading spinner (5 sizes, 4 variants)          |
| Status            | status.tsx             | `StatusBadge`, `StatusIndicator`, `StatusIcon`, `getStatusColor`, `getStatusDisplayLabel`, `getStatusLabel`                                                                                                                                                                                                                                                                                                                                                  | Semantic status display                        |
| ModelSelector     | model-selector.tsx     | `ModelSelector`, `getModel`, `getModelDisplayName`, `getModelColor`, `CLAUDE_MODELS`                                                                                                                                                                                                                                                                                                                                                                         | Claude model picker                            |
| WorkstreamLinker  | workstream-linker.tsx  | `WorkstreamStatusIndicator`, `WorkstreamStatusDot`, `WorkstreamChip`, `WorkstreamDropdown`, `WorkstreamSection`, `WorkstreamHeaderAction`                                                                                                                                                                                                                                                                                                                    | Workstream linking system                      |
| FullscreenOverlay | fullscreen-overlay.tsx | `FullscreenOverlay`                                                                                                                                                                                                                                                                                                                                                                                                                                          | Portal fullscreen overlay                      |
| FullscreenButton  | fullscreen-button.tsx  | `FullscreenButton`                                                                                                                                                                                                                                                                                                                                                                                                                                           | Fullscreen toggle button                       |
| NavSidebar        | nav-sidebar.tsx        | `NavSidebar`, `NavSection`, `NavItem`, `NavActionButton`, `NavHeaderActions`, `NavCreateButton`, `NavSettingsButton`, `NavDismissButton`, `NavPinButton`, `NavNotificationDot`, `NavNotificationBadge`                                                                                                                                                                                                                                                       | Full navigation sidebar                        |
| DrawerLayout      | drawer-layout.tsx      | `DrawerBody`, `DrawerPanelFooter`                                                                                                                                                                                                                                                                                                                                                                                                                            | Drawer layout primitives                       |

---

## Utilities & Hooks

```tsx
// Class name composition (clsx + tailwind-merge)
import { cn } from '@tryvienna/ui/utils';
cn('px-4 py-2', condition && 'bg-blue', className);

// Window width detection for Electron
import { useCompactMode } from '@tryvienna/ui/hooks';
const isCompact = useCompactMode(768); // default breakpoint
```

---

## Form Controls

### Button

```tsx
import { Button, buttonVariants } from '@tryvienna/ui';
```

| Prop    | Type                                                                                 | Default     | Description                            |
| ------- | ------------------------------------------------------------------------------------ | ----------- | -------------------------------------- |
| variant | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"`        | `"default"` | Visual style                           |
| size    | `"default" \| "xs" \| "sm" \| "lg" \| "icon" \| "icon-xs" \| "icon-sm" \| "icon-lg"` | `"default"` | Size (all on 8pt grid)                 |
| asChild | `boolean`                                                                            | `false`     | Render as child element via Radix Slot |

Size reference: `xs`=h-6/24px, `sm`=h-8/32px, `default`=h-10/40px, `lg`=h-12/48px, `icon`=40px, `icon-xs`=24px, `icon-sm`=32px, `icon-lg`=48px.

```tsx
<Button variant="destructive" size="sm">Delete</Button>
<Button asChild><a href="/home">Home</a></Button>
```

### Input

```tsx
import { Input } from '@tryvienna/ui';
```

Standard `<input>` props. Height h-10 (40px). Error state via `aria-invalid`.

```tsx
<Input type="email" placeholder="you@example.com" />
<Input aria-invalid={!!errors.email} />
```

### Label

```tsx
import { Label } from '@tryvienna/ui';
```

Radix label. Pairs with `htmlFor`. Error styling via `data-invalid` or `peer-aria-invalid`.

### Textarea

```tsx
import { Textarea } from '@tryvienna/ui';
```

Standard `<textarea>` props. Same styling system as Input.

### Checkbox

```tsx
import { Checkbox } from '@tryvienna/ui';
```

Radix checkbox. `checked`, `onCheckedChange`, `disabled`.

### Switch

```tsx
import { Switch } from '@tryvienna/ui';
```

Radix switch. `checked`, `onCheckedChange`.

### RadioGroup

```tsx
import { RadioGroup, RadioGroupItem } from '@tryvienna/ui';
```

```tsx
<RadioGroup value={value} onValueChange={setValue}>
  <RadioGroupItem value="a" />
  <RadioGroupItem value="b" />
</RadioGroup>
```

### Slider

```tsx
import { Slider } from '@tryvienna/ui';
```

Radix slider. `value`, `onValueChange`, `min`, `max`, `step`.

### Form (React Hook Form)

```tsx
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@tryvienna/ui';
```

```tsx
<Form {...form}>
  <FormField
    control={form.control}
    name="email"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormDescription>Your email address.</FormDescription>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

---

## Layout & Display

### Card

```tsx
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '@tryvienna/ui';
```

Padding: py-6 (24px), px-6 (24px), gap-6 (24px). CardAction auto-positions top-right via CSS grid.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Settings</CardTitle>
    <CardDescription>Manage your preferences</CardDescription>
    <CardAction>
      <Button size="sm">Edit</Button>
    </CardAction>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

### Badge

```tsx
import { Badge, badgeVariants } from '@tryvienna/ui';
```

| Prop    | Type                                                                          | Default     |
| ------- | ----------------------------------------------------------------------------- | ----------- |
| variant | `"default" \| "secondary" \| "destructive" \| "outline" \| "ghost" \| "link"` | `"default"` |
| asChild | `boolean`                                                                     | `false`     |

```tsx
<Badge variant="secondary">Draft</Badge>
```

### Avatar

```tsx
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from '@tryvienna/ui';
```

| Prop (Avatar) | Type                        | Default     |
| ------------- | --------------------------- | ----------- |
| size          | `"sm" \| "default" \| "lg"` | `"default"` |

Size reference: `sm`=24px, `default`=32px, `lg`=40px.

```tsx
<Avatar size="lg">
  <AvatarImage src="/user.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
  <AvatarBadge />
</Avatar>

<AvatarGroup>
  <Avatar><AvatarFallback>A</AvatarFallback></Avatar>
  <Avatar><AvatarFallback>B</AvatarFallback></Avatar>
  <AvatarGroupCount>+3</AvatarGroupCount>
</AvatarGroup>
```

### Alert

```tsx
import { Alert, AlertTitle, AlertDescription, alertVariants } from '@tryvienna/ui';
```

| Prop    | Type                         | Default     |
| ------- | ---------------------------- | ----------- |
| variant | `"default" \| "destructive"` | `"default"` |

```tsx
<Alert variant="destructive">
  <AlertCircle className="size-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

### Table

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@tryvienna/ui';
```

Standard HTML table composition with styled primitives.

### Separator, AspectRatio, ScrollArea, Skeleton, Progress

```tsx
import { Separator } from '@tryvienna/ui'; // orientation="horizontal"|"vertical"
import { AspectRatio } from '@tryvienna/ui'; // ratio={16/9}
import { ScrollArea, ScrollBar } from '@tryvienna/ui';
import { Skeleton } from '@tryvienna/ui'; // <Skeleton className="h-4 w-full" />
import { Progress } from '@tryvienna/ui'; // value={50}
```

---

## Overlays

### Dialog

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@tryvienna/ui';
```

Focus-trapped modal. Closes on Escape/overlay click. Padding: p-6 (24px), gap-4 (16px).

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>Make changes.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### AlertDialog

```tsx
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@tryvienna/ui';
```

Same as Dialog but requires explicit user action to dismiss (no overlay click close).

### ConfirmDialog

```tsx
import { ConfirmDialog } from '@tryvienna/ui';
```

| Prop                | Type                                  | Default     | Description                |
| ------------------- | ------------------------------------- | ----------- | -------------------------- |
| trigger             | `ReactNode`                           | -           | Button to open dialog      |
| title               | `string`                              | -           | Dialog title               |
| description         | `string`                              | -           | Dialog description         |
| confirmLabel        | `string`                              | `"Confirm"` | Confirm button text        |
| cancelLabel         | `string`                              | `"Cancel"`  | Cancel button text         |
| variant             | `"default" \| "destructive"`          | `"default"` | Confirm button style       |
| onConfirm           | `() => void \| Promise<void>`         | -           | Async-safe confirm handler |
| open / onOpenChange | `boolean` / `(open: boolean) => void` | -           | Controlled mode            |

```tsx
<ConfirmDialog
  trigger={<Button variant="destructive">Delete</Button>}
  title="Delete item?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={async () => await deleteItem()}
/>
```

### Tooltip, Popover, HoverCard, Sheet, Drawer

```tsx
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@tryvienna/ui';
import { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from '@tryvienna/ui';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@tryvienna/ui';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@tryvienna/ui';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@tryvienna/ui';
```

Sheet: side panel (`side="left"|"right"|"top"|"bottom"`). Drawer: bottom sheet (vaul library).

---

## Navigation

### Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@tryvienna/ui';
```

```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Accordion

```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@tryvienna/ui';
```

```tsx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>Content</AccordionContent>
  </AccordionItem>
</Accordion>
```

### Breadcrumb

```tsx
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@tryvienna/ui';
```

### Collapsible, Toggle, ToggleGroup, Pagination

```tsx
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@tryvienna/ui';
import { Toggle, toggleVariants } from '@tryvienna/ui'; // variant: "default"|"outline", size: "sm"|"default"|"lg"
import { ToggleGroup, ToggleGroupItem } from '@tryvienna/ui';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@tryvienna/ui';
```

---

## Menus & Selection

### Select

```tsx
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@tryvienna/ui';
```

SelectTrigger `size`: `"sm"` (h-8) | `"default"` (h-10). For multi-select or searchable, use Combobox.

```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Pick..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
    <SelectItem value="b">Option B</SelectItem>
  </SelectContent>
</Select>
```

### Combobox

```tsx
import { Combobox } from '@tryvienna/ui';
```

| Prop              | Type                                   | Default       | Description              |
| ----------------- | -------------------------------------- | ------------- | ------------------------ |
| options           | `ComboboxOption[] \| ComboboxGroup[]`  | -             | Items to select from     |
| value             | `string` (single) / `string[]` (multi) | -             | Selected value(s)        |
| onValueChange     | `(value) => void`                      | -             | Selection handler        |
| multiple          | `boolean`                              | `false`       | Enable multi-select      |
| placeholder       | `string`                               | `"Select..."` | Trigger placeholder      |
| searchPlaceholder | `string`                               | `"Search..."` | Search input placeholder |
| onCreateOption    | `(inputValue: string) => void`         | -             | Enable creatable mode    |

```tsx
// Single
<Combobox options={frameworks} value={selected} onValueChange={setSelected} />

// Multi
<Combobox options={tags} value={selectedTags} onValueChange={setSelectedTags} multiple />
```

### DropdownMenu, ContextMenu, Menubar, NavigationMenu, Command

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
} from '@tryvienna/ui';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@tryvienna/ui';
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from '@tryvienna/ui';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@tryvienna/ui';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@tryvienna/ui';
```

Command is built on cmdk. Use CommandDialog for Cmd+K palette pattern.

---

## Data Display & Notifications

### Calendar

```tsx
import { Calendar } from '@tryvienna/ui';
```

react-day-picker based. Props: `mode`, `selected`, `onSelect`, `disabled`.

### Carousel

```tsx
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@tryvienna/ui';
```

Built on embla-carousel.

### Chart

```tsx
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@tryvienna/ui';
```

Recharts wrapper. ChartContainer accepts `config: Record<string, { label, color }>`.

### Toaster

```tsx
import { Toaster, toast } from '@tryvienna/ui';
```

Place `<Toaster />` once at app root. Trigger imperatively:

```tsx
toast('Event created');
toast.success('Saved!');
toast.error('Failed');
toast.promise(asyncFn(), { loading: '...', success: 'Done', error: 'Error' });
```

---

## Sidebar System

```tsx
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuSkeleton,
  SidebarInput,
  SidebarInset,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@tryvienna/ui';
```

Electron-adapted (no cookies, no mobile Sheet). CSS vars: `--sidebar-width` (16rem), `--sidebar-width-icon` (3rem). Keyboard: Cmd/Ctrl+B toggle.

| Prop (SidebarProvider) | Type       | Default |
| ---------------------- | ---------- | ------- |
| defaultOpen            | `boolean`  | `true`  |
| open / onOpenChange    | controlled | -       |
| compactBreakpoint      | `number`   | `768`   |

| Prop (Sidebar) | Type                                 | Default       |
| -------------- | ------------------------------------ | ------------- |
| side           | `"left" \| "right"`                  | `"left"`      |
| variant        | `"sidebar" \| "floating" \| "inset"` | `"sidebar"`   |
| collapsible    | `"offcanvas" \| "icon" \| "none"`    | `"offcanvas"` |

| Prop (SidebarMenuButton) | Type                            | Default     |
| ------------------------ | ------------------------------- | ----------- |
| isActive                 | `boolean`                       | `false`     |
| variant                  | `"default" \| "outline"`        | `"default"` |
| size                     | `"default" \| "sm" \| "lg"`     | `"default"` |
| tooltip                  | `string \| TooltipContentProps` | -           |
| asChild                  | `boolean`                       | `false`     |

```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader />
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Nav</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive tooltip="Home">
              <HomeIcon /> Home
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter />
  </Sidebar>
  <SidebarInset>
    <main>Content</main>
  </SidebarInset>
</SidebarProvider>
```

---

## Composed Components

### ContentProvider (Density System)

```tsx
import {
  ContentProvider,
  useContentDensity,
  sectionSpacing,
  metadataSpacing,
  timelineSpacing,
} from '@tryvienna/ui';
```

| Prop    | Type                                  | Default     |
| ------- | ------------------------------------- | ----------- |
| density | `"compact" \| "default" \| "relaxed"` | `"compact"` |

Provides density context consumed by ContentSection, MetadataList, Timeline. CVA helpers for spacing:

- `sectionSpacing`: compact=`space-y-2 py-2`, default=`space-y-4 py-4`, relaxed=`space-y-6 py-6`
- `metadataSpacing`: compact/default=`gap-2 text-sm`, relaxed=`gap-3 text-base`
- `timelineSpacing`: compact=`gap-3 pl-6`, default=`gap-4 pl-8`, relaxed=`gap-6 pl-10`

### ContentSection

```tsx
import { ContentSection } from '@tryvienna/ui';
```

| Prop             | Type        | Default |
| ---------------- | ----------- | ------- |
| title            | `string`    | -       |
| titleAction      | `ReactNode` | -       |
| collapsible      | `boolean`   | `false` |
| defaultCollapsed | `boolean`   | `false` |
| loading          | `boolean`   | `false` |
| skeletonCount    | `number`    | `3`     |

```tsx
<ContentSection title="Details" titleAction={<Button size="xs">Edit</Button>}>
  <MetadataList items={items} />
</ContentSection>
```

### MetadataList

```tsx
import { MetadataList } from '@tryvienna/ui';
```

```tsx
<MetadataList
  items={[
    { label: 'Status', value: 'Active' },
    { label: 'ID', value: 'abc-123', copyable: true },
    { label: 'Docs', value: 'View docs', href: '/docs' },
    { label: 'Type', value: 'Bug', icon: <BugIcon /> },
  ]}
/>
```

Item shape: `{ label, value, href?, copyable?, copyValue?, icon?, hidden? }`

### Timeline

```tsx
import { Timeline } from '@tryvienna/ui';
```

```tsx
<Timeline
  items={[
    { title: 'Created', description: 'Issue opened', timestamp: '2h ago' },
    { title: 'In Progress', variant: 'active' },
    { title: 'Resolved', variant: 'success' },
  ]}
/>
```

Item shape: `{ title, description?, timestamp?, variant?: "default"|"active"|"success"|"destructive", icon? }`

### EmptyState

```tsx
import { EmptyState } from '@tryvienna/ui';
```

| Prop        | Type                |
| ----------- | ------------------- |
| icon        | `ReactNode`         |
| title       | `string` (required) |
| description | `string`            |
| action      | `ReactNode`         |

```tsx
<EmptyState
  icon={<InboxIcon />}
  title="No messages"
  description="Nothing here yet."
  action={<Button>Compose</Button>}
/>
```

### EntityCard

```tsx
import { EntityCard } from '@tryvienna/ui';
```

| Prop        | Type                    |
| ----------- | ----------------------- |
| emoji       | `string`                |
| title       | `string` (required)     |
| description | `string`                |
| badges      | `{ label, variant? }[]` |
| stats       | `{ label, value }[]`    |
| trailing    | `ReactNode`             |
| onClick     | `() => void`            |

```tsx
<EntityCard
  emoji="🎯"
  title="Project Alpha"
  description="Main project"
  badges={[{ label: 'Active' }]}
  stats={[{ label: 'Tasks', value: '12' }]}
  onClick={() => navigate('/project')}
/>
```

### InlineEdit

```tsx
import { InlineEdit } from '@tryvienna/ui';
```

| Prop        | Type                      |
| ----------- | ------------------------- |
| value       | `string`                  |
| onSave      | `(value: string) => void` |
| placeholder | `string`                  |
| disabled    | `boolean`                 |

Click to edit. Enter saves, Escape cancels.

### SearchFilterBar

```tsx
import { SearchFilterBar } from '@tryvienna/ui';
```

| Prop        | Type                                                             |
| ----------- | ---------------------------------------------------------------- |
| value       | `string`                                                         |
| onChange    | `(value: string) => void`                                        |
| placeholder | `string`                                                         |
| filter      | `{ value, onChange, placeholder?, options: { label, value }[] }` |
| autoFocus   | `boolean`                                                        |

```tsx
<SearchFilterBar
  value={search}
  onChange={setSearch}
  filter={{ value: filter, onChange: setFilter, options: [{ label: 'Active', value: 'active' }] }}
/>
```

### Combobox

See [Menus & Selection > Combobox](#combobox) above.

---

## Rich Content

### Markdown

```tsx
import { Markdown, markdownVariants } from '@tryvienna/ui';
```

| Prop    | Type                   | Default |
| ------- | ---------------------- | ------- |
| content | `string`               | -       |
| html    | `string`               | -       |
| size    | `"sm" \| "md" \| "lg"` | `"md"`  |

Uses marked (GFM) + highlight.js. Supports `\`\`\`mermaid`and`\`\`\`chart`fenced blocks (lazy-loaded). External links open via Electron shell or`window.open`.

```tsx
<Markdown content="# Hello\n\nSome **bold** text" size="sm" />
```

### MarkdownEditor

```tsx
import { MarkdownEditor } from '@tryvienna/ui';
```

| Prop        | Type                      | Default               |
| ----------- | ------------------------- | --------------------- |
| value       | `string`                  | -                     |
| onChange    | `(value: string) => void` | -                     |
| onSave      | `(value: string) => void` | -                     |
| onCancel    | `() => void`              | -                     |
| placeholder | `string`                  | `"Write markdown..."` |
| minHeight   | `string`                  | `"120px"`             |
| showActions | `boolean`                 | `true`                |
| size        | `"sm" \| "md" \| "lg"`    | -                     |

Write/Preview toggle editor. Monospace textarea in write mode, Markdown renderer in preview.

### MermaidBlock

```tsx
import { MermaidBlock } from '@tryvienna/ui';
```

Lazy-loads mermaid library. Use inside `React.Suspense`. Props: `code: string`.

### ChartBlock

```tsx
import { ChartBlock } from '@tryvienna/ui';
```

Props: `json: string`. Supports bar, line, area, pie chart types.

```json
{ "type": "bar", "title": "Revenue", "xKey": "month", "data": [{ "month": "Jan", "revenue": 100 }] }
```

---

## Domain Components

### Spinner

```tsx
import { Spinner, spinnerVariants } from '@tryvienna/ui';
```

| Prop    | Type                                           | Default     |
| ------- | ---------------------------------------------- | ----------- |
| size    | `"xs" \| "sm" \| "md" \| "lg" \| "xl"`         | `"md"`      |
| variant | `"default" \| "muted" \| "white" \| "current"` | `"default"` |
| label   | `string`                                       | `"Loading"` |

Size reference: `xs`=12px, `sm`=16px, `md`=24px, `lg`=32px, `xl`=48px.

### Status

```tsx
import {
  StatusBadge,
  StatusIndicator,
  StatusIcon,
  getStatusColor,
  getStatusDisplayLabel,
  getStatusLabel,
} from '@tryvienna/ui';
```

**StatusBadge** -- Generic semantic status badge.

| Prop    | Type                        | Default          |
| ------- | --------------------------- | ---------------- |
| status  | `SemanticStatus \| string`  | -                |
| variant | `"pill" \| "dot" \| "text"` | `"pill"`         |
| size    | `"sm" \| "md"`              | `"sm"`           |
| color   | `StatusColor`               | auto from status |
| label   | `string`                    | auto from status |

SemanticStatus values: `todo`, `pending`, `in_progress`, `active`, `done`, `completed`, `blocked`, `cancelled`, `error`.

**StatusIndicator** -- SVG icon-based status indicator. Props: `status`, `size` (px), `color`.

**StatusIcon** -- Workstream-specific status icons. Props: `status` (`ACTIVE|PROCESSING|NEEDS_REVIEW|COMPLETED_UNVIEWED|NEEDS_MANUAL_VERIFICATION`), `size` (`sm|md|lg`), `animated`.

### ModelSelector

```tsx
import {
  ModelSelector,
  getModel,
  getModelDisplayName,
  getModelColor,
  CLAUDE_MODELS,
} from '@tryvienna/ui';
```

| Prop     | Type                               | Default    |
| -------- | ---------------------------------- | ---------- |
| value    | `ClaudeModelId \| string`          | -          |
| onChange | `(modelId: ClaudeModelId) => void` | -          |
| disabled | `boolean`                          | `false`    |
| side     | `"top" \| "bottom"`                | `"bottom"` |

Models: `haiku` (green), `sonnet` (indigo), `opus` (amber).

### WorkstreamLinker

```tsx
import {
  WorkstreamStatusIndicator,
  WorkstreamStatusDot,
  WorkstreamChip,
  WorkstreamDropdown,
  WorkstreamSection,
  WorkstreamHeaderAction,
} from '@tryvienna/ui';
```

Status types: `created`, `active`, `ai_working`, `has_updates`, `waiting_review`, `paused`, `completed`, `archived`.

- **WorkstreamStatusIndicator** -- Animated SVG status icon (size, animated, color)
- **WorkstreamStatusDot** -- Simple colored dot (size, status)
- **WorkstreamChip** -- Pill with status dot, title, remove button
- **WorkstreamDropdown** -- Dropdown to link/create workstreams
- **WorkstreamSection** -- Full section with chips + add dropdown
- **WorkstreamHeaderAction** -- Icon button with workstream count badge

### FullscreenOverlay & FullscreenButton

```tsx
import { FullscreenOverlay } from '@tryvienna/ui'; // open, onClose, children
import { FullscreenButton } from '@tryvienna/ui'; // onClick, isFullscreen
```

FullscreenOverlay renders via portal at z-200. Escape to close. Locks body scroll.

### NavSidebar

```tsx
import {
  NavSidebar,
  NavSection,
  NavItem,
  NavActionButton,
  NavHeaderActions,
  NavCreateButton,
  NavSettingsButton,
  NavDismissButton,
  NavPinButton,
  NavNotificationDot,
  NavNotificationBadge,
} from '@tryvienna/ui';
```

| Prop (NavSidebar)             | Type                           | Default                  |
| ----------------------------- | ------------------------------ | ------------------------ |
| sections                      | `NavSectionData[]`             | -                        |
| header                        | `ReactNode`                    | -                        |
| footer                        | `ReactNode`                    | -                        |
| selectedId                    | `string`                       | -                        |
| onSelect                      | `(id, item) => void`           | -                        |
| width / minWidth / maxWidth   | `number`                       | 280 / 160 / 320          |
| collapsed / onCollapsedChange | controlled                     | -                        |
| expanded / onExpandedChange   | `NavExpansionState` controlled | -                        |
| density                       | `"comfortable" \| "compact"`   | `"comfortable"`          |
| selectionColor                | `string`                       | `"var(--brand-primary)"` |
| toggleShortcutKeys            | `string[]`                     | -                        |

Full tree navigation with keyboard nav (Arrow keys, Home/End, Enter, typeahead), drag resize, glass pill collapse toggle, notification dots/badges, and folder expand-all.

### Drawer Layout Primitives

```tsx
import { DrawerBody, DrawerPanelFooter } from '@tryvienna/ui';
```

Layout primitives for drawer panel content. `DrawerBody` wraps content with ContentProvider density. `DrawerPanelFooter` is a styled footer region — pass it via `DrawerContainer`'s `footer` prop to pin it below the scroll area.

```tsx
<DrawerContainer title="Settings" footer={<DrawerPanelFooter>actions</DrawerPanelFooter>}>
  <DrawerBody density="compact">{children}</DrawerBody>
</DrawerContainer>
```

---

## Design Tokens Reference

### Spacing System

Base unit: `--spacing: 4px`. All components use 8pt grid (multiples of 8px) with 4px sub-steps.

| Token   | Value | Usage                  |
| ------- | ----- | ---------------------- |
| `gap-1` | 4px   | Tight internal spacing |
| `gap-2` | 8px   | Standard gap           |
| `gap-3` | 12px  | Medium gap             |
| `gap-4` | 16px  | Section gap            |
| `gap-6` | 24px  | Card internal gap      |
| `p-2`   | 8px   | Tight padding          |
| `p-3`   | 12px  | Medium padding         |
| `p-4`   | 16px  | Standard padding       |
| `p-6`   | 24px  | Card padding           |
| `p-8`   | 32px  | Large padding          |

### Height Scale (8pt grid)

| Class  | Height | Components                                            |
| ------ | ------ | ----------------------------------------------------- |
| `h-6`  | 24px   | Button xs, Avatar sm, Spinner sm                      |
| `h-8`  | 32px   | Button sm, Input (compact), SidebarMenuButton default |
| `h-10` | 40px   | Button default, Input, Select, Avatar default         |
| `h-12` | 48px   | Button lg, SidebarMenuButton lg                       |

### Color Tokens (CSS Custom Properties)

```
--background, --foreground
--card, --card-foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive
--border, --input, --ring
--sidebar-*, --sidebar-foreground, --sidebar-accent, --sidebar-border
```

### data-slot Targeting

Every component exposes `data-slot` for CSS overrides:

```css
[data-slot='button'] {
  /* target all buttons */
}
[data-slot='card'][data-variant='outline'] {
  /* target variant */
}
[data-slot='sidebar'][data-state='collapsed'] {
  /* sidebar state */
}
```
