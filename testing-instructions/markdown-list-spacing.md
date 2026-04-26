# Markdown Bullet List Spacing Fix

**PR:** https://github.com/tryvienna/desktop/pull/453
**Issue:** WIL-306

## What changed

Reduced excessive vertical spacing between markdown bullet list items, especially in user messages. The root cause was `whitespace-pre-wrap` on user message bubbles preserving newlines in rendered list HTML.

## How to test

1. Open the desktop app
2. In a chat conversation, send a user message containing a markdown bullet list:
   ```
   Hello,

   - Apples
   - Bananas
   - Grapes
   ```
3. Verify the bullet list items are compact with no large gaps between them
4. Verify the spacing looks similar between user messages and assistant messages that contain lists
5. Send a plain text message (no markdown) and verify whitespace is still preserved correctly (e.g. multiple spaces, line breaks)
6. Test a numbered list:
   ```
   1. First
   2. Second
   3. Third
   ```
7. Test nested lists:
   ```
   - Parent
     - Child 1
     - Child 2
   - Another parent
   ```
8. Verify assistant responses with bullet lists also look correct (tighter line-height)
