# Accessibility

Vienna aims to be usable by developers regardless of how they interact
with their computer. This document captures what we've tested, what
we know is broken, and the standards we hold new code to.

Vienna is a desktop Electron app, so this focuses on macOS-specific
assistive tech (VoiceOver, keyboard navigation, Zoom, Reduce Motion,
High Contrast). Many WCAG guidelines apply transitively because the UI
is web-based.

Last audit: 2026-04-24 (informal; a formal audit is tracked on the
roadmap).

## Current state — honest assessment

Vienna is early. We have **not** yet done a systematic accessibility
audit. Known gaps:

- Not every interactive control has a focus ring distinct from its
  hover state
- Custom components (chat message list, permission bars, entity
  palette) may not expose correct ARIA roles
- Color contrast has not been measured against WCAG AA
- VoiceOver labels for icon-only buttons are inconsistent
- Keyboard-only workflows may have dead ends (modal escapes, focus
  traps)

Known strengths:

- Command palette and workstream switcher are keyboard-first
- Most critical actions have a keyboard shortcut (see **Settings →
  Keybindings**)
- Text sizing respects macOS system settings when using
  `-apple-system` font stacks

**If you hit an accessibility bug, please file an issue with the
`a11y` label** — these are prioritized.

## Standards for new code

When adding or modifying UI, check the following before merging:

### Keyboard

- [ ] Every interactive element is reachable via Tab / Shift-Tab
- [ ] Focus order matches visual reading order
- [ ] No focus trap without an obvious escape (Esc, a close button)
- [ ] The tabindex is either 0 (participates in natural order) or -1
      (programmatically focusable only) — never positive integers
- [ ] Dropdowns / menus support Arrow-key navigation and Escape to
      close
- [ ] Keyboard shortcut for a new action is documented in Settings

### Screen reader

- [ ] Icon-only buttons have `aria-label`
- [ ] Dialogs use `role="dialog"` and manage focus on open / close
- [ ] Live regions (status updates, toast messages) use
      `aria-live="polite"` (or `"assertive"` if truly urgent)
- [ ] Form inputs have an associated label — `<label htmlFor=…>` or
      `aria-labelledby`
- [ ] Decorative elements have `aria-hidden="true"`

### Visual

- [ ] Text contrast ≥ 4.5:1 against its background (WCAG AA)
- [ ] Focus indicator is visible (ring or outline), not just a color
      change
- [ ] Interactions are not conveyed by color alone — include shape,
      text, or icon
- [ ] Animations respect `prefers-reduced-motion`

### Content

- [ ] Error messages describe what went wrong AND how to recover
- [ ] Form fields communicate required-ness visually and in the
      accessible name
- [ ] Empty states are informative (not just a blank panel)

## Tooling

- Most component-level a11y smells are caught by [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y).
  Not yet enabled — tracked on the roadmap.
- Storybook with [@storybook/addon-a11y](https://storybook.js.org/addons/@storybook/addon-a11y)
  for interactive component testing — partial; some packages have it,
  not enforced.
- Manual test pass each release: keyboard-only traverse of the main
  flows, then VoiceOver pass on the same flows. Logged in the release
  notes.

## Reporting an accessibility bug

Open an issue with the `a11y` label and include:

- What assistive tech you're using (e.g. VoiceOver + macOS 14)
- Steps to reproduce
- What you expected vs. what happened
- Screenshots or screen recordings where relevant (redact any API
  keys)

We treat a11y bugs as first-class — not "nice to have".

## Contributing fixes

Accessibility PRs are especially welcome. Good places to start:

- Icon-only buttons missing `aria-label` — grep for
  `<button[^>]*>\s*<.*Icon`
- Focus indicators on custom components
- Keyboard shortcuts that are mouse-only today

## Resources

- [Apple Accessibility on macOS](https://developer.apple.com/accessibility/macos/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WCAG 2.1 at a glance](https://www.w3.org/WAI/standards-guidelines/wcag/glance/)
