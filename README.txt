BUG EYEZ VIEW - UI UPGRADE

Baseline: working UI after d8159fc.

Included changes:
- Player overlay shows channel logo, name, channel ID and current EPG information.
- Explicit "EPG information unavailable" fallback.
- Overlay reappears when the player is touched/clicked and on channel changes.
- Fullscreen/player controls: previous channel, guide, next channel, More, fullscreen/minimize.
- Replaced expanded/collapse window glyph with a down-chevron minimize control.
- More menu shows language/genre metadata when available.
- Removed per-row favorite star.
- Long-press/right-click channel opens channel actions: Add/Remove Favorite and Add to Playlist.
- Playlist action stores channel IDs in localStorage key bugz_channel_playlist_v1 for this first UI pass.
- Mobile Guide and AI Summary long buttons replaced with compact icon buttons.
- Desktop Guide and AI headings compacted to icons.
- Genre selection scrolls selected genre into view instead of letting it disappear off-screen.
- Tablet/mobile top menu moved lower using safe-area + 8px.
- Removed standalone Play Ad button; Watch Ad remains in dropdown.
- Admin menu entry compacted to an icon-only Admin Tools control.
- Preserves Personal guide virtualization and Personal failure-loop protection.

APPLY:
Extract this ZIP directly into C:\BugEyezView and allow it to replace the included files.

VERIFY:
cd /d C:\BugEyezView\frontend\web
npx tsc --noEmit
npm run dev

No backend files are changed.
