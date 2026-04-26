# CMD+/CMD- UI Zoom Shortcuts

## What changed
Added CMD+=, CMD+-, and CMD+0 shortcuts to zoom the UI in/out/reset. Zoom level persists across app restarts. A bottom-center floating indicator shows the current zoom percentage with a Reset button.

## Test cases

### 1. Basic zoom in/out
- Press **CMD+=** — UI should zoom in, bottom-center indicator shows e.g. "120%"
- Press **CMD+-** — UI should zoom out, indicator updates to show new percentage
- Press **CMD+0** — UI resets to 100%, indicator briefly shows "100%" then auto-hides

### 2. Zoom indicator behavior
- Press **CMD+=** once — indicator appears at bottom-center with percentage and a "Reset" button
- Press **CMD+=** again while indicator is visible — indicator updates in-place (no stacking), auto-hide timer resets
- Wait ~2 seconds without pressing anything — indicator fades out
- At 100% zoom, indicator should NOT show a "Reset" button
- Click "Reset" button on the indicator — zoom resets to 100%

### 3. Zoom persistence
- Zoom to a non-default level (e.g. press CMD+= twice)
- Quit and relaunch the app
- App should launch at the previously saved zoom level

### 4. Keyboard shortcuts panel
- Press **CMD+/** to open the keyboard shortcuts modal
- A "View" category should appear with three entries: Zoom In, Zoom Out, Actual Size
- Shortcuts should be displayed as the correct key combos

### 5. View menu
- Click the "View" menu in the macOS menu bar
- Should show "Zoom In", "Zoom Out", "Actual Size" with their accelerators
- Clicking menu items should work the same as the keyboard shortcuts (zoom changes + indicator appears)

### 6. Zoom bounds
- Keep pressing CMD+= — zoom should cap at a maximum (won't zoom infinitely)
- Keep pressing CMD+- — zoom should cap at a minimum
- UI should remain usable at both extremes

### 7. Settings integration
- Open Settings > check that `appearance.zoomLevel` is present in the settings JSON
- Changing zoom via CMD+= should update the persisted value
