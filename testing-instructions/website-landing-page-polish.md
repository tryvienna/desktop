# Website Landing Page Polish

PR: https://github.com/tryvienna/desktop/pull/460

## What changed
Redesigned landing page and all marketing pages (download, features, changelog, waitlist, privacy, terms) with professional SaaS treatment: centered heroes, fade-in scroll animations, refined spacing, green feature checkmarks, subtle hero glow, and removed pricing page.

## Testing steps

### Landing page (`/`)
1. Load the landing page in dark mode
   - Hero should be centered with "Vienna" eyebrow, headline, sub, two CTAs, and "Free · macOS · BYOK · No account required" note
   - Subtle warm radial glow should be visible behind the hero area
2. Scroll down — each section should fade in smoothly as it enters the viewport
3. Section headings should have uppercase labels above them (Extensibility, Workflow, Capabilities)
4. Bento video rows should have generous spacing between them (~80px)
5. Feature list should have green checkmarks next to each item; checkmark border should brighten on hover
6. FAQ section should include "How much does Vienna cost?" with answer "Vienna is free..."
7. Bottom CTA should be centered with heading + subtitle + two buttons
8. Switch to light mode — hero glow should be slightly more subtle, all colors/contrast should work

### Pricing removed
9. Navigate to `/pricing` — should return 404
10. Check header nav (desktop and mobile) — no "pricing" link should exist
11. Check footer — no "pricing" link should exist

### Content pages
12. `/download` — centered intro header with "Download" label, cards fade in
13. `/features` — centered intro, nav pills centered, feature cards fade in on scroll
14. `/changelogs` — centered intro, changelog entries fade in
15. `/waitlist` — centered intro with proper layout (no inline styles), form fades in
16. `/privacy` and `/terms` — centered intro headers with "Legal" label, body content fades in

### Responsive
17. Resize to mobile width (<700px) — bento grid should stack single-column, feature list should go to 2 columns, CTA buttons should stack vertically

### Accessibility
18. Enable "Reduce motion" in OS settings — fade-in animations should be disabled (elements appear immediately)
