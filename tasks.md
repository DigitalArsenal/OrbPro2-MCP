# OrbPro2-MCP Testing & Fix Tasks

## Context
The command decomposer and orchestrator are now wired into the UI. Multi-step commands get decomposed via NLP, each step is sent to the 1.5B model individually, and geocoding corrects coordinates. We need to test the full pipeline end-to-end and fix issues.

## Known Issues to Fix

### 1. Polyline positions not rendering
**Problem:** `addPolyline` calls produce empty `cartographicDegrees: []` even though the geocoder resolves positions correctly. The geocoder returns `positions: [{longitude, latitude}, ...]` which is the correct format for the MCP server, but the line doesn't render.
**Debug:** Console logs have been added (`Step N - toolName args: ...`). Run "draw a line from berlin to prague" and check browser console to see if positions are in the args.
**Files:** `src/app.ts` (geocodeToolArgs), `src/llm/geocoder.ts` (correctPolylineCoordinates), `src/mcp/cesium-mcp-server.ts` (addPolyline handler)

### 2. Intent classification mismatches (9 failures)
**Problem:** The decomposer classifies some intents incorrectly. These don't break execution (the model picks the right tool regardless), but should be fixed for accuracy.

- `"zoom into london"` → classified as `camera_control` instead of `navigate`
- `"place a green cylinder there"` → classified as `unknown` instead of `add_entity` (cylinder not in OBJECT_TYPES?)
- `"add a blue cylinder there"` → classified as `unknown` instead of `add_entity`
- `"add a path from X to Y"` → classified as `calculate_route` instead of `add_entity`
- `"draw a polyline from X to Y"` → classified as `calculate_route` instead of `add_entity`
- `"add a dashed line from X to Y"` → classified as `calculate_route` instead of `add_entity`
- `"create a path from X to Y"` → classified as `calculate_route` instead of `add_entity`
- `"draw a path to florence"` → classified as `calculate_route` instead of `add_entity`
- `"add a path to kyoto"` → classified as `calculate_route` instead of `add_entity`

**Fix:** In `src/llm/command-decomposer.ts`:
1. Add `cylinder` to OBJECT_TYPES array if missing
2. In `classifyIntent()`, when keywords like `path`, `line`, `polyline` appear WITH `draw`, `add`, `create` → should be `add_entity`, not `calculate_route`. Only classify as `calculate_route` for "calculate route", "get directions", etc.
**Files:** `src/llm/command-decomposer.ts`

## Test Suite

Run these 50 commands through the app (via browser) to validate end-to-end. For each, verify:
- Correct decomposition (step count shown in system message)
- Correct tool(s) called (shown in assistant message Actions)
- Visual result on globe (camera moved, entities visible)

### Single-step commands (should NOT decompose, 1 step):
1. `fly to tokyo`
2. `show me the eiffel tower`
3. `add a blue sphere at the colosseum`
4. `zoom into london`
5. `fly to sydney australia`
6. `navigate to the great wall of china`
7. `add a red marker at the statue of liberty`
8. `go to cairo egypt`
9. `show me mount everest`
10. `fly to the kremlin`

### Two-step (and-based, expect 2 steps):
11. `fly to the vatican and add a red sphere there`
12. `go to paris and add a blue marker there`
13. `fly to tokyo and place a green cylinder there`
14. `navigate to london and add a yellow sphere there`
15. `fly to the pyramids and draw a red circle there`
16. `go to the colosseum and add a glowing sphere there`
17. `fly to sydney and place a label there`
18. `navigate to moscow and add a red box there`
19. `fly to new york and add a point there`
20. `go to berlin and create a blue sphere there`

### Two-step (comma-based, expect 2 steps):
21. `fly to dubai, add a gold sphere there`
22. `go to rio de janeiro, place a green marker there`
23. `fly to the taj mahal, then add a white sphere there`
24. `navigate to the grand canyon, add a red point there`
25. `fly to machu picchu, then place a label there`

### Three-step (expect 3 steps):
26. `fly to rome, add a red sphere there and add a blue sphere at the colosseum`
27. `go to paris, add a marker at the eiffel tower, then fly to london`
28. `fly to tokyo, add a green sphere there, then navigate to kyoto`
29. `navigate to cairo, add a yellow sphere at the pyramids, and fly to dubai`
30. `fly to new york, add a red marker there, then go to washington dc`

### Four-step (expect 4 steps):
31. `fly to the vatican, add a red sphere there, then fly to the colosseum and add a blue sphere there`
32. `go to london, place a marker at big ben, then fly to paris and add a sphere at the louvre`
33. `fly to sydney, add a point there, then navigate to melbourne and place a label there`
34. `navigate to berlin, add a red box there, then go to munich and add a blue cylinder there`
35. `fly to tokyo, add a sphere there, fly to osaka, and add a sphere there too`

### Reference-heavy (expect 2 steps):
36. `fly to the statue of liberty and put a spinning sphere on it`
37. `go to the eiffel tower and place a red marker there`
38. `navigate to the leaning tower of pisa and add a label there`
39. `fly to angkor wat and create a glowing sphere there`
40. `go to the forbidden city and add a yellow sphere there`

### Polyline/path single-step (expect 1 step):
41. `draw a line from paris to london`
42. `add a path from new york to washington dc`
43. `draw a polyline from rome to florence`
44. `add a dashed line from tokyo to osaka`
45. `create a path from cairo to alexandria`

### Mixed navigation + polyline (expect 2-3 steps):
46. `fly to paris, then draw a line from paris to london`
47. `go to rome, add a red sphere there, then draw a path to florence`
48. `fly to new york, add a marker there, then draw a line to boston`
49. `navigate to tokyo, place a sphere there, then add a path to kyoto`
50. `fly to berlin, add a point there, then draw a line from berlin to prague`

## Automated Decomposer Test

Run the decomposer test to validate NLP splitting (no model needed):
```bash
npx tsx /private/tmp/claude/-Users-tj-software-OrbPro2-MCP/c6cdb500-a1a6-4074-af61-85362a054cce/scratchpad/test-decompose.ts
```

Current score: 41/50 (9 intent classification mismatches that don't affect tool selection).

## Architecture Reference

- `src/llm/command-decomposer.ts` — NLP clause splitting, intent classification, entity extraction
- `src/llm/geocoder.ts` — Coordinate resolution (KNOWN_LOCATIONS + Nominatim API)
- `src/app.ts` — Main orchestration loop in `handleUserMessage()`, reference resolution between steps
- `src/llm/tool-parser.ts` — Extracts tool calls from model text output
- `src/mcp/cesium-mcp-server.ts` — MCP tool definitions and CZML generation
