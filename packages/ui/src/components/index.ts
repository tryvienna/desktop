/**
 * @module @tryvienna/ui/components
 *
 * Complete component library for Vienna.
 * All components follow: Radix UI primitives + Tailwind CSS v4 + CVA variants.
 *
 * @ai-context
 * - Every component uses `data-slot` attributes for CSS targeting
 * - `cn()` utility (clsx + tailwind-merge) for className composition
 * - Components accept standard React props via `React.ComponentProps<>`
 * - Radix UI primitives provide accessibility (ARIA, keyboard nav, focus management)
 * - CVA (class-variance-authority) for type-safe variant props
 * - All spacing on strict 8pt grid (4px sub-steps via --spacing: 4px)
 */

// Phase 1: Form Controls
export { Button, buttonVariants } from './button';
export { Input } from './input';
export { Label } from './label';
export { Textarea } from './textarea';
export { Checkbox } from './checkbox';
export { Switch } from './switch';
export { RadioGroup, RadioGroupItem } from './radio-group';
export { Slider } from './slider';
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from './form';

// Phase 2: Layout & Display
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './card';
export { Separator } from './separator';
export { AspectRatio } from './aspect-ratio';
export { ScrollArea, ScrollBar } from './scroll-area';
export { Badge, badgeVariants } from './badge';
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from './avatar';
export { Skeleton } from './skeleton';
export { Progress } from './progress';
export { Alert, AlertTitle, AlertDescription, alertVariants } from './alert';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';

// Phase 3: Overlays
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog';
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './popover';
export { HoverCard, HoverCardTrigger, HoverCardContent } from './hover-card';
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './sheet';
export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from './drawer';

// Phase 4: Navigation
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './breadcrumb';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';
export { Toggle, toggleVariants } from './toggle';
export { ToggleGroup, ToggleGroupItem } from './toggle-group';
export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './pagination';

// Phase 5: Menus & Selection
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
export { RichSelect } from './rich-select';
export type { RichSelectProps, RichSelectOption } from './rich-select';
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './dropdown-menu';
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from './context-menu';
export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from './menubar';
export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from './navigation-menu';
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './command';

// Phase 6: Data Display + Notifications
export { Calendar, CalendarDayButton } from './calendar';
export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from './carousel';
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  useChart,
} from './chart';
export type { ChartConfig } from './chart';
export { Toaster, toast } from './sonner';
export {
  NotificationToast,
  notificationToastVariants,
  CUSTOM_TOAST_CLASS,
} from './notification-toast';
export type { NotificationToastProps, NotificationToastAction } from './notification-toast';

// Phase 7: Sidebar System
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './sidebar';

// Phase 8: Composed Components
export {
  ContentProvider,
  useContentDensity,
  sectionSpacing,
  metadataSpacing,
  timelineSpacing,
} from './content-provider';
export type { ContentDensity, ContentProviderProps } from './content-provider';
export { ContentSection } from './content-section';
export type { ContentSectionProps } from './content-section';
export { MetadataList } from './metadata-list';
export { Timeline } from './timeline';
export { EmptyState } from './empty-state';
export type { EmptyStateProps } from './empty-state';
export { EntityCard } from './entity-card';
export type { EntityCardProps, EntityCardBadge, EntityCardStat } from './entity-card';
export { InlineEdit } from './inline-edit';
export type { InlineEditProps } from './inline-edit';
export { SearchFilterBar } from './search-filter-bar';
export type { SearchFilterBarProps, FilterConfig, FilterOption } from './search-filter-bar';
export { ConfirmDialog } from './confirm-dialog';
export type { ConfirmDialogProps } from './confirm-dialog';
export { Combobox } from './combobox';
export type { ComboboxOption } from './combobox';
export { LoadingState } from './loading-state';
export type { LoadingStateProps } from './loading-state';

// Phase 9: Rich Content
export { Markdown, markdownVariants } from './markdown';
export type { MarkdownProps } from './markdown';
export { MarkdownEditor } from './markdown-editor';
export type { MarkdownEditorProps } from './markdown-editor';
export { MermaidBlock } from './mermaid-block';
export { ChartBlock } from './chart-block';

// Phase 10: Utility & Status Components
export { Spinner, spinnerVariants } from './spinner';
export type { SpinnerProps } from './spinner';
export {
  StatusBadge,
  StatusIndicator,
  TodoStatusIcon,
  getStatusColor,
  getStatusDisplayLabel,
} from './status';
export type {
  SemanticStatus,
  StatusColor,
  StatusBadgeProps,
  StatusIndicatorProps,
  TodoStatusIconProps,
} from './status';
export { FullscreenOverlay } from './fullscreen-overlay';
export type { FullscreenOverlayProps } from './fullscreen-overlay';
export { FullscreenButton } from './fullscreen-button';
export type { FullscreenButtonProps } from './fullscreen-button';
export {
  SidePanel,
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
  PinIcon,
} from './nav-sidebar';
export type {
  SidePanelProps,
  NavSectionData,
  NavItemData,
  NavExpansionState,
  NavDensity,
  NavItemVariant,
  NavSide,
} from './nav-sidebar';
export {
  DrawerPanel,
  DrawerPanelHeader,
  DrawerPanelContent,
  DrawerBody,
  DrawerPanelFooter,
} from './drawer-layout';
export type {
  DrawerPanelProps,
  DrawerPanelHeaderProps,
  DrawerPanelContentProps,
  DrawerBodyProps,
  DrawerPanelFooterProps,
} from './drawer-layout';
export {
  FileTypeIcon,
  getFileIconType,
  EXTENSION_TO_ICON_TYPE,
  MIME_TYPE_TO_ICON_TYPE,
  GenericFileIcon,
  FolderIcon,
  FolderOpenIcon,
  TypeScriptFileIcon,
  JavaScriptFileIcon,
  ReactFileIcon,
  PythonFileIcon,
  GoFileIcon,
  RustFileIcon,
  JsonFileIcon,
  HtmlFileIcon,
  CssFileIcon,
  MarkdownFileIcon,
  ShellFileIcon,
  SqlFileIcon,
} from './file-icons';
export type { FileIconType, IconProps as FileIconProps } from './file-icons';
export { FileTree } from './file-tree';
export type { FileTreeItem, FileTreeProps } from './file-tree';
export { KeyboardHint } from './keyboard-hint';
export type { KeyboardHintProps } from './keyboard-hint';

// Entity Linking
export {
  EntityLinkingContext,
  useEntityLinking,
  LinkedWorkstreams,
  LinkedEntities,
  EntitySearchDialog,
} from './entity-linking';
export type {
  EntityLinkingAdapter,
  EntityLinkedWorkstream,
  LinkedEntity,
  EntitySearchResult,
  EntityTypeInfo,
} from './entity-linking';

