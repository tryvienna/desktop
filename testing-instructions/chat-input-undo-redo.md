# Chat Input Undo/Redo (CMD+Z)

## What changed
- Paste and ESC-clear in the chat input now integrate with the browser's native undo stack
- Previously, CMD+Z after paste or ESC would undo the wrong thing (or nothing)

## Test: Undo paste (small text)
1. Click into the chat input
2. Type some text (e.g. "hello world")
3. Paste a short string (< 500 chars, < 10 lines) from clipboard
4. Press CMD+Z
5. **Expected:** The pasted text is removed, "hello world" remains
6. Press CMD+Shift+Z (redo)
7. **Expected:** The pasted text reappears

## Test: Undo paste (large text / paste chip)
1. Copy a large block of text (500+ chars or 10+ lines)
2. Click into the chat input and type something
3. Paste the large text — it should appear as a paste chip
4. Press CMD+Z
5. **Expected:** The paste chip is removed, your typed text remains
6. Press CMD+Shift+Z (redo)
7. **Expected:** The paste chip reappears
8. Click the paste chip to verify it still opens the paste editor

## Test: Undo ESC clear
1. Type a message in the chat input
2. Press Escape — input should clear
3. Press CMD+Z
4. **Expected:** Your typed message is restored
5. Press Escape again, then CMD+Shift+Z (redo)
6. **Expected:** Message is restored again

## Test: Submit clear is NOT undoable
1. Type a message and press Enter to submit
2. Press CMD+Z in the now-empty input
3. **Expected:** Nothing happens — submit clears are permanent

## Test: Normal typing undo still works
1. Type "aaa", then "bbb", then "ccc"
2. Press CMD+Z multiple times
3. **Expected:** Text is undone in reverse order as usual
