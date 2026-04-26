# Missing Components in `@vienna/chat-ui`

Comparison of `@vienna/chat-ui` (vienna) against the reference `@drift/chat` package (drift-v2).

---

## Entire Systems (not started)

### Palette System

The `@` entity and `/` command palette system is completely absent.

- `EntityPalette` — searchable palette for selecting entities, triggered by `@`
- `CommandPalette` — searchable palette for selecting commands, triggered by `/`
- `CommandPaletteWithFlows` — extended command palette with multi-step flow support
- `FlowPrimitives` — FlowScreen, FlowHeader, FlowList, FlowListItem, FlowConfirmation
- Palette primitives:
  - `PaletteContainer`, `PaletteEntityChip`, `PaletteFilterBar`
  - `PaletteKeyboardHints`, `PaletteResultItem`, `PaletteResultsList`
  - `PaletteSection`, `PaletteStates`, `PaletteTabBar`
  - `EntityIcon`, `FlowKeyboardContext`
- All palette types and data provider interfaces

### NanoContext System

Contextual data attachment is completely absent.

- `NanoContextProvider` / `useNanoContext`
- `NanoContextTypeRegistry`
- Selection capture: `useSelectionCapture`, `useDrawerSelectionCapture`, `SelectionCaptureWrapper`, `SelectionPopover`
- Display components: `NanoContextPreview`, `NanoContextPreviewList`, `NanoContextWidget`
- Factory functions & serialization utilities

### Plan Drawer

Plan viewing interface missing.

- `PlanDrawerPanel` — main plan display container with tabs
- `PlanCodeView` — code view of plan with syntax highlighting
- `PlanSlideView` — slide-by-slide plan presentation
- `splitPlanIntoSlides` — utility to split plan into presentable slides

### Detachable Cards

Floating card system missing.

- `DetachableEntityCard` — card component that can be detached and moved
- `FloatingMiniCard` — compact floating card for entity previews
- `FloatingCardLayer` — container managing multiple floating cards
- `DetachableCardProvider` / `useDetachableCards` context

### Bulk Review

File change review panel missing.

- `FileChangeReviewPanel` — panel for reviewing file modifications (Edit/Write tool outputs)
- `ChangeItem` — single file change item in review panel

### Exploration Tools

Tool result exploration missing.

- `ExplorationPanel` — panel for exploring tool results, groups related tools
- `ExplorationItemRow` — single exploration result row

### System Widgets

The `system/` directory exists but is empty. All 10 widgets missing:

- `CompactingWidget` — indicates message history compaction
- `ModelChangeWidget` — notifies when AI model has changed
- `EntityLinkWidget` — shows entity linking or reference events
- `SkillActivationWidget` — indicates skill/tool activation
- `InterruptedWidget` — shows message was interrupted
- `TaskNotificationWidget` — notification for task-related events
- `RateLimitWidget` — rate limit warning/notification
- `UnknownMessageWidget` — fallback for unknown message types
- `ApiErrorWidget` — API error display with details
- `VerificationActionWidget` — verification request interface
- `LinkedEntityEditProvider` / `useLinkedEntityEdit` context

### Content Renderer Registry

Block-level renderer system missing.

- `RendererRegistry`, `createRendererRegistry`, `RendererRegistryProvider`, `useRendererRegistry`, `useRenderer`
- Built-in renderers: `TextRenderer`, `CodeRenderer`, `ToolUseRenderer`, `ToolResultRenderer`
- System renderers (10): CompactBoundary, ModelChange, EntityLink, SkillActivation, Interrupted, TaskNotification, RateLimit, ApiError, UnknownMessage, VerificationAction
- Specialized renderers: `EntityTextRenderer`, `EntityWidgetRenderer`, `NanoContextRenderer`, `ImageAttachmentRenderer`, `PasteTextRenderer`

---

## Input Components

chat-ui has basic `ChatInput` only. Missing the rich input stack:

- `ChatInputUnified` — unified input with mentions, attachments, palettes
- `ChatInputBase` — bare contenteditable foundation
- `ChatInputComposed` — composable variant
- `ChatInputWithMentions` — `@` mention autocomplete
- `ChatInputWithAttachments` — file attachment support
- `ChatInputWithPalettes` — palette trigger integration (legacy)
- `PermissionActionBar` — action bar for pending permission requests
- `VerificationActionBar` — action bar for verification requests
- `QuestionActionBar` — action bar for pending questions to user
- Sub-components:
  - `EntityChip` — renders mentions/references with entity colors and icons
  - `AttachmentPreview` — shows preview of attached files
  - `AttachmentMenu` — dropdown menu for selecting attachments/skills
  - `SkillPreviewList` — list of skill previews before message send
  - `PasteEditorModal` — modal for editing pasted content

---

## Message Components

- `UserMessage` — dedicated user message renderer
- `AssistantMessage` — dedicated assistant message renderer
- `ProcessingIndicator` — streaming processing indicator (chat-ui only has `PreparingIndicator`)
- `ImageAttachmentWidget` — inline image previews in messages
- `MessageGroup` / `AssistantMessageGroup` — explicit group components

---

## Tool Renderers

- `TaskOutputTool` — task execution output renderer
- `WebFetchTool` — web content fetching renderer
- `ExitPlanModeTool` — separate exit plan mode (chat-ui combines into `PlanModeTool`)
- `StreamingContent` / `IsolatedStreamingContent` — progressive tool output components

---

## Standalone Components

- `TokenUsageBar` — token usage metrics display during streaming

---

## Primitives

- `StatusIndicator` — generic status dot/badge (success, error, warning, pending, info)
- `InlineSpinner` — compact loading spinner
- `ActionButton` — reusable action button
- `KeyboardHint` — keyboard shortcut display
- `Portal` — render component outside DOM tree (for modals, popovers)

---

## Hooks

- `useContentEditable` — manages contenteditable state and value
- `useCursorPosition` — tracks cursor position in editor
- `useMentionAutocomplete` — manages `@` mention suggestions
- `useCommandTrigger` — detects `/` command trigger
- `useAttachments` — manages file attachments
- `useMessageHistory` — access to previous messages for editing
- `useDraftPersistence` — saves/restores draft messages
- `useRotatingPlaceholder` — cycling placeholder text
- `useAllPendingApprovals` — aggregates all pending approvals
- `usePendingQuestion` — pending user question state
- `usePendingToolApprovals` — tool-specific pending approvals
- `useReducedMotion` — detects prefers-reduced-motion
- `useChatCurrentTurn` — current conversation turn
- `useChatAgentBusy` — agent busy state
- `useChatPendingInterrupt` — pending interrupt state
- `useChatSkipTypewriter` — skip typewriter animation
- `useChatThinking` — thinking state
- `useChatSend` — send message action
- `useChatApproval` — approval actions
- `useChatAnswerQuestion` — answer question action
- `useChatVerification` — verification actions

---

## Context Providers

- `ScrollProvider` / `useScroll` — scroll state & viewport tracking

---

## Utilities

- Entity URI utilities (`parseEntityMarkup`, `parseEntityURI`, `buildEntityURI`, `buildEntityMarkup`, `containsEntityMarkup`, `encodeLabel`, `getEntityDisplayLabel`)
- Entity styling (`getEntityColors`, `getEntityIcon`, `ENTITY_TYPE_COLORS`, `ENTITY_TYPE_ICONS`, style constants)
- Entity metadata cache (`setEntityTypeMetadata`, `getEntityTypeMetadata`, etc.)
- Fuzzy search (`createCommandSearch`)
- Palette filter keyword parser (`parseKeywordFilters`, `filtersToKeywords`, `mergeFilters`)
- Paste markup utilities (`encodePasteContent`, `decodePasteContent`, `buildPasteMarkup`, `parsePasteMarkup`, etc.)

---

## Summary

| Category            | drift-v2 `chat`                      | vienna `chat-ui`      | Gap |
| ------------------- | ------------------------------------ | --------------------- | --- |
| Core components     | ~15                                  | 6                     | 9   |
| Input variants      | 6 + 3 action bars + 5 sub-components | 1                     | 13  |
| Palette system      | 3 + 10 primitives                    | 0                     | 13  |
| Tool renderers      | 13 + streaming                       | 11                    | 4   |
| System widgets      | 10                                   | 0                     | 10  |
| Content renderers   | 14 in registry                       | 0 (inline in Message) | 14  |
| NanoContext         | ~10 components                       | 0                     | 10  |
| Plan/Review/Explore | 7                                    | 0                     | 7   |
| Detachable cards    | 3                                    | 0                     | 3   |
| Primitives          | 5                                    | 0                     | 5   |
| Hooks               | 14+                                  | 0                     | 14+ |
| Utilities           | 6 modules                            | 0                     | 6   |

`chat-ui` has the core rendering loop solid — messages, input, tool renderers, approval system, store, and streaming. What's missing is primarily the **interactive/rich features layer**: palettes, NanoContext, detachable cards, plan drawer, bulk review, system widgets, the content renderer registry, and the entire rich input stack with mentions/attachments.
