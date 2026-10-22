Bug Eyez View UI correction pass

Extract this ZIP directly into C:\BugEyezView and allow overwrite.

Corrections in this pass:
- Channel identity stays visible on the player; EPG detail expands when controls are shown.
- Player touch HUD keeps Previous / Guide / Next / More / Fullscreen together.
- Removed the duplicate fullscreen control from the lower native-video controls.
- Mobile Guide and AI controls are icon-only with aria/title labels (no visible label text fallback).
- Personal/Public source toggle moved into the same compact icon control row.
- Genre strip made more compact; arrows reduced; selected genre remains centered/visible.
- Mobile/tablet top header/menu moved lower for safer touch placement.

After extraction:
cd /d C:\BugEyezView\frontend\web
npx tsc --noEmit
