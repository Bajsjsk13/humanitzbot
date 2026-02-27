# Changelog — Experimental Branch

**Generated:** 2026-02-27  
**Branch:** `experimental`  
**Base:** `main`  
**Status:** Active Development

---

## Summary

- **Total Commits:** 80
- **Main Branch Commits:** 33
- **Experimental-Only Commits:** 47
- **Files Changed:** 101
  - Added: 46
  - Modified: 34
  - Deleted: 6

---

## Experimental Branch Changes (vs Main)

These features exist only in the experimental branch and are not yet merged to main.

### New Features

- DB seeding in setup.js, per-server DB for multi-server, playtime flush timer `5f7d640`
  - - setup.js: Added seedDatabase() to write imported player stats and playtime
  - directly to SQLite after first-run SFTP import, preventing orphaned data
  - when PlayerStats/PlaytimeTracker no longer read JSON files
- DB-first migration Phase 1 — eliminate JSON persistence, use bot_state `2df72a0`
  - Schema v12 adds bot_state key-value table for runtime operational state.
  - All modules now persist to SQLite instead of JSON files:
  - - PlayerStats: removed JSON load/save/autoSave/migration (~190 lines deleted)
- complete .env sync + dynamic changelog generator `fd83e2f`
  - Panel Button Integration:
  - - Sync .env button in bot controls panel
  - - Shows sync status and performs intelligent merge
- comprehensive SSH key authentication for VPS deployments `a18561a`
  - - Added SSH private key support across all SFTP connections
  - - Updated hasFtp() checks to accept FTP_PRIVATE_KEY_PATH
  - - Fixed SaveService, AutoMessages, LogWatcher, Threads to use sftpConnectConfig()
- wire ChatRelay DB inserts + fix schema version test `78475f1`
- DB-first architecture  activity_log + chat_log, log watcher DB inserts, save-service refactor, new parsers, diff engine, activity log module `e27af88`
- web map module  interactive Leaflet map with Discord OAuth and live player positions `a4fa2c7`

### Bug Fixes

- template DB now includes game_ref_version in meta table `3bd828e`
- audit fixes — nuke wipe list, PUBLIC_HOST in .env.example, test stability `68596c3`
- web map loads player data immediately on page load `6d6611b`
- wire DISCORD_OAUTH_SECRET to config for web map startup `0856f77`
- add .env.backup* to .gitignore to prevent credential exposure `b003975`
- replace deprecated ephemeral option with MessageFlags across all commands `b469872`
- panel channel ActionRow overflow + ephemeral deprecation `1150d51`
- defer player stats select menu interactions `d639e6c`
- config.js path prefixing + add smart .env sync utility `70767dd`
- auto-discovery for GameServerSettings.ini and WelcomeMessage.txt `4c9ce5f`
- stop excluding web-map assets from git `24ba7c8`

### Documentation

- regenerate changelog with correct commit hashes `c0fab31`
- update changelog with latest commits `a0ddc72`

### Other Changes

- Replace Tailwind CDN with compiled CSS build `5d8ad26`
- Fix dashboard layout and sparkline chart expansion `bacd4ec`
- Correct all game reference data against authoritative extraction `069a8f9`
- Harden web panel security and fix broken test suites `5cefab6`
- Add reverse proxy support for web panel `755836f`
- Use LinuxGSM restart inside container instead of docker restart `9951ba3`
- Fix playtime data loss, embed duplication, env-sync settings destruction, and clan field mismatch `08e1f81`
- Runtime-configurable display settings, .env bootstrap, and Discord setup wizard `e78fb63`
- Remove JSON file fallbacks — DB is sole data store\n\nAutoMessages: removed JSON fallbacks from loadCachedSettings() and\nloadWelcomeStats(), removed unused dataDir parameter and fs/path imports.\n\nLogWatcher: removed JSON fallbacks from day-counts, pvp-kills, and\nlog-offsets persistence. All state reads/writes use bot_state table.\nRemoved fs/path imports and constructor path constants.\n\nPanelChannel: removed JSON fallbacks from settings cache, message IDs,\nand multi-server settings. Multi-server settings now use bot_state with\nper-server keys. Removed SETTINGS_CACHE and _DATA_DIR constants.\n\nPlayerStatsChannel: removed orphaned _DEFAULT_DATA_DIR constant and\nunused this._dataDir from constructor." `6a5bebb`
- ServerStatus reads from DB, remove JSON fallbacks from server-status and stdin-console `0bdfbed`
- PlayerStatsChannel reads from DB instead of SFTP, remove JSON dual-writes `a15f677`
- Add stdin console for headless hosts, template DB with copy-on-first-run `c11a0e0`
- Regenerate humanitz-agent.js for updated project structure `e9452c2`
- Update .gitignore comments to reflect data/ subdirectory structure `06c9f20`
- Restructure project: organize src/ into module directories, clean up data/ `64d4cfc`
- track game-tables-raw.json for DB seeding until template DB is built `020aa45`
- Schema v11, game data extraction pipeline, timeline snapshots, repo hygiene `0ab828d`
- DB-first architecture, schema v9, embed redesign, item tracking, codebase cleanup `fb67ff8`
- Server scheduler with daily rotation, web panel security, map calibration `9f58741`
- Complete save parser overhaul: extract all game data with positions `705936c`
- Web panel overhaul, server scheduler, player ID & container name fixes `35b98ff`
- Fix NUKE_BOT breaking bot startup permanently `a1807fd`
- Unified item name cleaning across all display surfaces `1329e46`
- Add container-player cross-referencing, per-event timestamps, and web map online status `34e5009`
- Make auto-discovery truly universal `eacbd4f`
- Fix interaction timeout bugs (defer-before-async pattern) `7288a2a`
- Merge branch 'web-map' into experimental `ef62fa6`

---

## File Changes

### Added Files (46)

- `data/game-tables-raw.json`
- `data/humanitz-template.db`
- `src/db/build-template-db.js`
- `src/db/diff-engine.js`
- `src/db/item-fingerprint.js`
- `src/db/item-tracker.js`
- `src/env-sync.js`
- `src/modules/activity-log.js`
- `src/modules/milestone-tracker.js`
- `src/modules/player-embed.js`
- `src/modules/recap-service.js`
- `src/modules/schedule-utils.js`
- `src/modules/server-scheduler.js`
- `src/parsers/game-data-extract.js`
- `src/parsers/game-data.js`
- `src/parsers/ue4-names.js`
- `src/rcon/rcon-colors.js`
- `src/stdin-console.js`
- `src/tracking/snapshot-service.js`
- `src/web-map/auth.js`
- `src/web-map/dev-server.js`
- `src/web-map/public/app.js`
- `src/web-map/public/calibrate.html`
- `src/web-map/public/island-shape.svg`
- `src/web-map/public/map-2048.jpg`
- `src/web-map/public/map-2048.png`
- `src/web-map/public/map-4096.png`
- `src/web-map/public/map-standalone.html`
- `src/web-map/public/panel.css`
- `src/web-map/public/panel.html`
- `src/web-map/public/panel.js`
- `src/web-map/public/tailwind-input.css`
- `src/web-map/public/tailwind.css`
- `src/web-map/public/timeline.js`
- `src/web-map/server.js`
- `tailwind.config.js`
- `test/diff-engine.test.js`
- `test/interactions.test.js`
- `test/item-fingerprint.test.js`
- `test/item-tracker.test.js`
- `test/milestone-tracker.test.js`
- `test/recap-service.test.js`
- `test/schedule-utils.test.js`
- `test/stdin-console.test.js`
- `test/timeline.test.js`
- `test/ue4-names.test.js`

### Modified Files (34)

- `.env.example`
- `.gitignore`
- `README.md`
- `package-lock.json`
- `package.json`
- `setup.js`
- `src/commands/panel.js`
- `src/commands/players.js`
- `src/commands/playerstats.js`
- `src/commands/playtime.js`
- `src/commands/rcon.js`
- `src/commands/server.js`
- `src/commands/threads.js`
- `src/config.js`
- `src/db/database.js`
- `src/db/schema.js`
- `src/game-server/humanitz-agent.js`
- `src/index.js`
- `src/parsers/agent-builder.js`
- `src/parsers/game-reference.js`
- `src/parsers/gvas-reader.js`
- `src/parsers/save-parser.js`
- `src/parsers/save-service.js`
- `test/agent.test.js`
- `test/game-data.test.js`
- `test/log-watcher.test.js`
- `test/new-parser.test.js`
- `test/player-stats-channel.test.js`
- `test/player-stats.test.js`
- `test/playtime-tracker.test.js`
- `test/pvp-scheduler.test.js`
- `test/save-parser.test.js`
- `test/server-info.test.js`
- `test/web-map-auth.test.js`

### Deleted Files (6)

- `src/commands/map.js`
- `src/game-data.js`
- `src/player-embed.js`
- `src/player-map.js`
- `src/save-parser.js`
- `test/player-map.test.js`

---

## Complete History (All Commits)

### [EXPERIMENTAL] `5d8ad26` Replace Tailwind CDN with compiled CSS build

**Author:** QS-Zuq  
**Date:** 2026-02-27  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
- Install tailwindcss@3 as devDependency, add build:css and dev:css scripts
- Create tailwind.config.js at project root with the survival theme
- Build compiled tailwind.css (20KB minified) from HTML + JS content scan
- Replace CDN <script> tag with compiled <link> stylesheet in panel.html
- Remove cdn.tailwindcss.com from Content-Security-Policy header
- Remove unused browser-side tailwind-config.js from public/
Fixes the production CDN warning. End users serve pre-compiled CSS;
developers run npm run build:css after changing Tailwind classes.
```

### [EXPERIMENTAL] `3bd828e` template DB now includes game_ref_version in meta table

**Author:** QS-Zuq  
**Date:** 2026-02-27  
**Type:** fix  
**Status:** Experimental only  

**Details:**
```
Without this, first-run installs from the template would trigger an
unnecessary re-seed of all 22 game reference tables on every startup
because the version check couldn't find the stored version.
```

### [EXPERIMENTAL] `bacd4ec` Fix dashboard layout and sparkline chart expansion

**Author:** QS-Zuq  
**Date:** 2026-02-27  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
- Wrap sparkline canvases in fixed-height containers to prevent
  infinite vertical growth from Chart.js responsive resize
- Add overflow:hidden to stat-card to clip any overflow
- Set resizeDelay:0 on Chart options for immediate sizing
- Replace fixed 2-column grid for schedule/resources cards with
  auto-fit layout that adapts when cards are hidden
```

### [EXPERIMENTAL] `069a8f9` Correct all game reference data against authoritative extraction

**Author:** QS-Zuq  
**Date:** 2026-02-27  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
ENUM_MAPS: Overhauled 13 enums with data-verified values, added 6 new
enums (E_ClanRank, E_DogCommand, E_QuestStatus, Enum_CharacterStartPerk,
E_InvSlotType, E_ContainerSlots). E_SpecificType, Enum_SkillCategories,
Enum_Professions, E_ResourceType, E_CarUpgradeTypes all corrected against
actual DT usage.
Skills: seedSkills() now uses SKILL_DETAILS (35 extracted from DT_Skills)
as primary source instead of hand-curated SKILL_EFFECTS (21). All skill
categories verified: Survival(0), Crafting(1), Combat(2).
Challenges: New DT_StatConfig extractor (67 entries). CHALLENGES merges
DT_Statistics + DT_StatConfig via Map dedup — 116 total with progressMax.
Upgrade path: GAME_REF_VERSION=2 auto-detects stale reference data and
re-seeds existing databases on startup.
Template DB regenerated with correct data (718 items, 35 skills, 116
challenges, proper enum resolutions).
Web panel: Minify front-facing JS/CSS/HTML. Add tailwind-config.js.
```

### [EXPERIMENTAL] `5cefab6` Harden web panel security and fix broken test suites

**Author:** QS-Zuq  
**Date:** 2026-02-27  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Security (web panel):
- Sanitize RCON input on message and console endpoints: strip control
  characters and newlines to prevent command injection (same pattern
  as chat-relay)
- Consolidate RCON command blocklists between web panel and slash
  command: both now block the same set of destructive commands using
  first-word matching instead of startsWith
- Use timing-safe comparison for OAuth state parameter (consistent
  with session signature verification)
- Persist session secret: generate once per process if not configured,
  warn when WEB_MAP_SESSION_SECRET is not set in .env
- Add rate limiting to remaining unprotected timeline endpoints
- Add dotfiles: deny to static file serving
- Add WEB_MAP_SESSION_SECRET to .env.example as optional key
Bug fixes:
- stdin-console: fix _cmdWorld() to handle getAllWorldState() returning
  an object instead of an array
- stdin-console test: add missing db.init() call in before() hook
- web-map-auth test: update assertion to match current setupAuth
  behavior (stub routes registered even when OAuth is disabled)
Tests: 753/753 passing (was 721/753 before this commit)
```

### [EXPERIMENTAL] `755836f` Add reverse proxy support for web panel

**Author:** QS-Zuq  
**Date:** 2026-02-27  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Set Express trust proxy to loopback so X-Forwarded-* headers from
the local Caddy reverse proxy are respected. This ensures correct
client IP resolution, secure cookie handling, and protocol detection
when the panel is served behind HTTPS.
```

### [EXPERIMENTAL] `9951ba3` Use LinuxGSM restart inside container instead of docker restart

**Author:** QS-Zuq  
**Date:** 2026-02-27  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
LinuxGSM gracefully stops the game process, waits for clean exit, then
starts fresh — RCON port binds correctly because the old process fully
releases it. Falls back to docker stop+start if LinuxGSM fails.
docker restart sends SIGTERM then immediately starts, which can leave
RCON on a random port when the game hasn't released port 8888 yet.
```

### [EXPERIMENTAL] `08e1f81` Fix playtime data loss, embed duplication, env-sync settings destruction, and clan field mismatch

**Author:** QS-Zuq  
**Date:** 2026-02-27  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
PlaytimeTracker: Fix init/setDb race condition where init() runs before
setDb() is called, causing empty data to overwrite DB. setDb() now reloads
from DB using MAX() to preserve the highest known values. upsertPlayerPlaytime
uses MAX() as defense in depth.
Server status / player stats / panel channel: Remove bootTime-based message
filtering in cleanup routines that skipped recently-posted messages during
rapid systemd restarts, causing duplicate embeds to accumulate.
Env-sync: Fix parseEnv() to handle commented optional keys in .env.example
(e.g. #RESTART_TIMES=...) so they are recognized as valid optional keys
rather than classified as deprecated and removed from the user's .env.
Backups now saved to data/backups/ with 2-file retention instead of
accumulating .env.backup.* files in the project root.
Database: getAllClans() now normalizes member fields to camelCase (steamId,
canInvite, canKick) while preserving snake_case aliases, fixing clan
kills and playtime showing as zero in welcome message leaderboards.
Also includes milestone tracker, recap service modules, and web panel
enhancements from prior work.
```

### [EXPERIMENTAL] `e78fb63` Runtime-configurable display settings, .env bootstrap, and Discord setup wizard

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Display toggles (SHOW_*, feed toggles, admin-only flags) stored in bot_state DB — editable via panel channel without restart. PANEL_CHANNEL_ID is now required. If no .env exists, copy from template and exit with setup instructions.
Discord setup wizard: when RCON credentials are missing, bot boots in minimal mode and posts an interactive wizard in the panel channel. Guides users through hosting profile selection, RCON/SFTP credential entry with live connection testing, SFTP auto-discovery of game files, and channel assignment. Writes .env and triggers FIRST_RUN on apply.
Config validation relaxed — RCON no longer hard-required at startup. Added config.needsSetup flag. index.js skips all modules except PanelChannel when in setup mode.
```

### [EXPERIMENTAL] `6a5bebb` Remove JSON file fallbacks — DB is sole data store\n\nAutoMessages: removed JSON fallbacks from loadCachedSettings() and\nloadWelcomeStats(), removed unused dataDir parameter and fs/path imports.\n\nLogWatcher: removed JSON fallbacks from day-counts, pvp-kills, and\nlog-offsets persistence. All state reads/writes use bot_state table.\nRemoved fs/path imports and constructor path constants.\n\nPanelChannel: removed JSON fallbacks from settings cache, message IDs,\nand multi-server settings. Multi-server settings now use bot_state with\nper-server keys. Removed SETTINGS_CACHE and _DATA_DIR constants.\n\nPlayerStatsChannel: removed orphaned _DEFAULT_DATA_DIR constant and\nunused this._dataDir from constructor."

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

### [EXPERIMENTAL] `0bdfbed` ServerStatus reads from DB, remove JSON fallbacks from server-status and stdin-console

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

### [EXPERIMENTAL] `a15f677` PlayerStatsChannel reads from DB instead of SFTP, remove JSON dual-writes

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

### [EXPERIMENTAL] `c11a0e0` Add stdin console for headless hosts, template DB with copy-on-first-run

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Stdin console (ENABLE_STDIN_CONSOLE): interactive CLI via process.stdin
for managing the bot on hosts without SSH access (e.g. Bisect). Commands
for player lookup, DB stats, SQL queries, bot_state management, world
state, clans, vehicles. Read-only by default, write ops gated behind
STDIN_CONSOLE_WRITABLE toggle.
Template DB: pre-seeded humanitz-template.db (1.3MB, 3291 rows across
23 game reference tables). On first run, database.js copies it as the
starting point instead of extracting from 22MB game-tables-raw.json.
game-reference.js skips seeding if tables already populated.
```

### [EXPERIMENTAL] `e9452c2` Regenerate humanitz-agent.js for updated project structure

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

### [EXPERIMENTAL] `06c9f20` Update .gitignore comments to reflect data/ subdirectory structure

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

### [EXPERIMENTAL] `64d4cfc` Restructure project: organize src/ into module directories, clean up data/

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Source reorganization:
- src/modules/ — activity-log, auto-messages, chat-relay, log-watcher,
  panel-channel, player-embed, player-stats-channel, pvp-scheduler,
  schedule-utils, server-scheduler, server-status, status-channels
- src/rcon/ — rcon.js, rcon-colors.js, server-info.js
- src/server/ — multi-server.js, panel-api.js, server-resources.js
- src/tracking/ — player-stats.js, playtime-tracker.js, snapshot-service.js
- src/parsers/ — game-data.js, game-data-extract.js, ue4-names.js (joined
  existing save-parser, gvas-reader, agent-builder, game-reference)
- src/db/ — added build-template-db.js (from scripts/)
- tools/ — moved generate-changelog.js (gitignored, dev-only)
- Removed scripts/ directory
Data folder cleanup:
- data/logs/ — downloaded server logs (PlayerIDMapped.txt,
  PlayerConnectedLog.txt, HMZLog-downloaded.log)
- data/backups/ — all backup files (player-stats, playtime, .env)
- data/game-reference/ — obsolete dt-*.txt datatable dumps
- Updated all path references across modules, web-map, setup.js
All require() paths updated across 50+ files. 674/674 tests passing.
```

### [EXPERIMENTAL] `5f7d640` DB seeding in setup.js, per-server DB for multi-server, playtime flush timer

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** feat  
**Status:** Experimental only  

**Details:**
```
- setup.js: Added seedDatabase() to write imported player stats and playtime
  directly to SQLite after first-run SFTP import, preventing orphaned data
  when PlayerStats/PlaytimeTracker no longer read JSON files
- multi-server: Each ServerInstance now creates its own HumanitZDB at
  data/servers/<id>/humanitz.db with game reference seeding, passed to
  PlayerStats and PlaytimeTracker for full DB persistence
- index.js + multi-server: Added 60-second playtime flush timer calling
  flushActiveSessions() to persist active session data periodically,
  preventing data loss on unexpected shutdown
```

### [EXPERIMENTAL] `2df72a0` DB-first migration Phase 1 — eliminate JSON persistence, use bot_state

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** feat  
**Status:** Experimental only  

**Details:**
```
Schema v12 adds bot_state key-value table for runtime operational state.
All modules now persist to SQLite instead of JSON files:
- PlayerStats: removed JSON load/save/autoSave/migration (~190 lines deleted)
- PlaytimeTracker: removed JSON persistence, added flushActiveSessions()
- LogWatcher: log-offsets, day-counts, pvp-kills moved to bot_state
  (JSON fallback retained for multi-server without DB)
- ServerStatus: message ID + settings reads from bot_state
- PlayerStatsChannel: message ID, kill tracker, weekly baseline,
  welcome stats, server settings all use bot_state (dual-write to
  JSON kept for modules without DB access)
- PanelChannel: message IDs stored in bot_state
- AutoMessages: helper functions accept optional db param
- bot-running.flag replaced with bot_state key
FIRST_RUN clears bot_state transient keys. Shutdown deletes
bot_running before db.close(). All 674 tests pass.
```

### [EXPERIMENTAL] `020aa45` track game-tables-raw.json for DB seeding until template DB is built

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

### [EXPERIMENTAL] `c0fab31` regenerate changelog with correct commit hashes

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** docs  
**Status:** Experimental only  

### [EXPERIMENTAL] `0ab828d` Schema v11, game data extraction pipeline, timeline snapshots, repo hygiene

**Author:** QS-Zuq  
**Date:** 2026-02-26  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
- Schema v10→v11: 9 timeline tables, death_causes, 11 new game reference tables
- game-data-extract.js: 24 extractors for 105 raw game tables (718 items, 122 buildings, 154 recipes)
- game-reference.js rewritten to seed 23 tables from extracted data
- database.js: 16 new seed methods, boolean binding fixes
- SnapshotService: periodic world state snapshots for timeline tracking
- Timeline UI: panel tab with snapshot browser and change history
- Web panel: expanded ALLOWED whitelist (+17 tables), secure cookie flags
- .gitignore cleanup: .github/ fully ignored, data/ properly blocked
- Changelog generator script added (scripts/generate-changelog.js)
- All 674 tests passing
```

### [EXPERIMENTAL] `fb67ff8` DB-first architecture, schema v9, embed redesign, item tracking, codebase cleanup

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Schema & Database:
- Bump to schema v9 with 13 new player columns for granular log/playtime persistence
- Add server_peaks KV table for peak tracking
- Add item_instances, item_movements, item_groups, world_drops tables for item tracking
- Add new DB methods: upsertFullLogStats, upsertFullPlaytime, setServerPeak, getAllServerPeaks
- Remove deprecated updatePlayerLogStats and updatePlayerPlaytime methods
- Add item fingerprint utility (src/db/item-fingerprint.js) and reconciler (src/db/item-tracker.js)
- Add game-reference.js seed functions for 10 DB reference tables
DB-First Migration:
- player-stats.js: load from DB first, fallback to JSON, one-time migration, persist on every mutation
- playtime-tracker.js: load from DB first, fallback to JSON, one-time migration, persist on every mutation
- Both modules maintain JSON backup on autosave for recovery
Embed Redesign:
- Server overview: compact stat summary, inline 3-column leaderboards, emoji section headers
- Player detail: character info in description, visual health bars, merged combat/base/inventory sections
- Log-based player embed: merged sections, emoji prefixes, reduced field count
Web Panel Enhancements:
- Add /api/panel/clans, /api/panel/mapdata, /api/panel/items, /api/panel/movements endpoints
- Add /api/panel/db/:table generic admin query with table whitelist
- Add auth to /api/servers endpoint (requireTier survivor)
- Filter sensitive settings (AdminPass, RCONPass) from settings API
- Resolve steam IDs and clean UE4 names in activity feed API
- Add timezone-aware event counting, game day from save-cache fallback
Game Data:
- Map all 36 dt-* files into game-data.js (29 exports, 1882 lines)
- Wire ue4-names.js with authoritative ITEM_NAMES/BUILDING_NAMES lookups
- Add PvP NPC source detection with comprehensive NPC name filtering
Cleanup:
- Remove legacy player-map module (src/player-map.js, test/player-map.test.js, src/commands/map.js)
- Remove @napi-rs/canvas dependency (only used by deleted player-map)
- Remove stale .bak files from web panel
- Fix broken require path in dev-server.js (save-parser → parsers/save-parser)
Tests: 635 passing (20 test files, 161 suites)
```

### [EXPERIMENTAL] `9f58741` Server scheduler with daily rotation, web panel security, map calibration

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Server Scheduler:
- 3 difficulty profiles (Calm/Surge/Horde) cycling across 3 daily restart windows
- Daily rotation: profile↔time-slot mapping shifts each day so players
  experience different difficulty at each time of day
- RESTART_ROTATE_DAILY toggle (default: true)
- Shared schedule-utils.js module for consistent rotation logic across
  scheduler, Discord embeds, welcome messages, and web panel
- 18 new tests for rotation math (560 total, all passing)
Web Panel:
- Discord OAuth security with tiered access (public/user/admin)
- 14+ routes protected with requireTier middleware
- Landing page shows today's rotated schedule with active marker
- Dashboard scheduler card with countdown to next restart
- Renamed index.html → map-standalone.html (panel.html is main entry)
- Developer credit updated
Infrastructure:
- Env-sync preserves dynamic keys (RESTART_PROFILE_*, PVP_HOURS_*, etc.)
  via DYNAMIC_PREFIXES list instead of deprecating them
- Activity log deduplication (consecutive identical events collapse with ×N)
- Map coordinate calibration (xMin:3076, xMax:398076, yMin:-397582, yMax:-2582)
- Player map tests updated for calibrated bounds
```

### [EXPERIMENTAL] `705936c` Complete save parser overhaul: extract all game data with positions

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Parser changes (save-parser.js + gvas-reader.js):
- Disable skipLargeArrays to parse ALL array data (was skipping arrays >10 elements)
- Increase recoverForward scan from 50KB to 500KB to find all sections
- Extract BuildActorTransform positions: 633/633 structures now have coordinates
- Fix DestroyedRandCars: Vector format (not Transform children), 56/56 with positions
- Add NodeSaveData AI extraction: 119 spawns (72 zombies, 7 bandits, 40 animals)
  with types (ZombieDefault2, AnimalStag, BanditMelee, etc.) and positions
- Add SGlobalContainerSave handler: 437 world containers with item data
- Add LODPickups full extraction: 5282 items with positions and RowName item IDs
- Add BackpackData handler: 293 dropped backpacks with positions
- Add PreBuildActors extraction: 133 with class, position, resources
- Add LODHouseData extraction: 517 houses with window/door/furniture state
- Add LodModularLootActor extraction: 300 actors, 602 slots with item configs
- Expand HZActorManagerData: destroyed actors (111) + destroyed instances (218)
- Expand GameDiff: structured server settings (loot, zombie, season, etc.)
- Expand StoneCutting: name, stage, time per station
- Add BuildingDecay summary: count + active decay tracking
- Fix ExplodableBarrelsTransform: extract Translation from children
- Fix Exp handler: parse StructProperty for Level, SkillPoints, XP
- Fix CompanionData: extract class, transform, stats, inventory per companion
- Add SavedActors full extraction: class, position, health, owner, locked
Player data additions:
- CharProfile: full appearance (preset, skin, hair, body type, eye color, etc.)
- FloatData: all keys (BadFood, Skin_Blood, Skin_Dirt, Clean, Sleepers)
- Appearance fields: Rep* cosmetics, Backpack size, Profile, Skin tone
- Expanded createPlayerData() with all new fields
Map coordinate fixes:
- Update world bounds: X[-60K..380K] Y[-400K..50K] (was X[-20K..260K] Y[-370K..20K])
- Verified 0/1663 player-relevant entities out of bounds (was 323 off-map)
- Updated both player-map.js and web-map/server.js defaults
Parse performance: 670ms for 68MB file (improved from ~2s with skipping)
All 542 tests pass.
```

### [EXPERIMENTAL] `35b98ff` Web panel overhaul, server scheduler, player ID & container name fixes

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Web Panel:
- 4-tier auth system (public/survivor/mod/admin) with role-based access
- Public landing page with multi-server status, connect info, copy button
- Dashboard, activity feed, chat log, RCON console, settings editor
- requireTier() middleware for per-route access control
- Map tab restricted to mod tier and above
- Survivors get community stats, leaderboards, connect details
Server Scheduler:
- Timed server restarts with configurable profiles (difficulty rotation)
- Per-profile GameServerSettings.ini overrides via SFTP
- Countdown warnings in Discord and in-game via RCON
- Profile cycling (e.g. day/night difficulty rotation)
- Docker container restart support
Bug Fixes:
- Zombie loot containers now display as 'Zombie Drop' instead of 'Container Enemy AI'
- Player names resolve correctly in activity logs (was showing raw SteamIDs)
- SaveService auto-loads PlayerIDMapped.txt on startup
- LogWatcher shares ID map updates with SaveService in real-time
- One-time DB repair fixes existing activity_log rows with SteamID-as-name
```

### [EXPERIMENTAL] `a1807fd` Fix NUKE_BOT breaking bot startup permanently

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Two bugs caused the nuke feature to kill the bot on every restart:
1. rcon.js: Socket error during connect() never rejected the promise,
   causing `await rcon.connect()` to hang forever. The entire ClientReady
   handler would stall — no modules started, no NUKE_BOT=false written.
2. index.js: NUKE_BOT=false was only written at the END of the nuke
   process. If anything crashed during channel wipe or thread rebuild,
   the flag stayed true and the bot would nuke again on next restart.
Fixes:
- rcon.js: Socket error handler now rejects the connect promise on
  initial connection failures (auto-reconnect still handles recovery)
- index.js: Wrap rcon.connect() in try/catch so RCON being unavailable
  doesn't crash the entire startup sequence
- index.js: Write NUKE_BOT=false BEFORE the channel wipe phase so a
  crash during nuke can't cause an infinite nuke loop
```

### [EXPERIMENTAL] `1329e46` Unified item name cleaning across all display surfaces

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Shared cleanItemName (ue4-names.js):
- Added 60+ ITEM_ALIASES map for common broken names (tacticalmachette, 22ammo, etc.)
- Hex GUID detection and filtering (isHexGuid, cleanItemArray)
- Lv→Lvl expansion, ABCDef→ABC Def splitting, title casing
- Smart trailing digit strip (glued to words only, not after spaces)
player-stats-channel.js:
- Replaced inferior local _cleanItemName with shared cleaner wrapper
- Status effects and body conditions now properly cleaned
- Unique items filtered of hex GUIDs via cleanItemArray
web-map/server.js:
- Server-side cleaning of all inventory, recipes, skills, status effects
- Unique items cleaned with cleanItemArray
activity-log.js:
- Clear verbs ("took from"/"stored in"), grid location references
- Destroyed container contents display, new structure/vehicle event types
diff-engine.js:
- Added diffStructures(), diffVehicleState() for structure and vehicle tracking
All 539 tests pass (4 new test cases for Lv→Lvl, ABCDef, status effects).
```

### [EXPERIMENTAL] `34e5009` Add container-player cross-referencing, per-event timestamps, and web map online status

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
Activity Log:
- Cross-reference container item changes with player inventory changes from
  the same save diff cycle to attribute who accessed containers. Uses item
  name matching + position proximity validation (5000 UE4 units). Falls
  back to log-based attribution if no cross-reference match found.
- Add per-event timestamps (HH:MM in bot timezone) to all activity feed
  lines for better readability.
- SaveService now emits syncTime in the sync event for timestamp display.
Web Map:
- /api/players endpoint now queries RCON for the live player list and sets
  isOnline on matching players. Frontend already checks this field — players
  now correctly show green/red/grey status markers.
Tests:
- 8 new cross-referencing tests in diff-engine.test.js covering: basic
  take/deposit attribution, distance filtering, multi-player best-match,
  null coordinate handling, empty event arrays, and full end-to-end through
  diffSaveState(). All 526 tests pass.
```

### [EXPERIMENTAL] `68596c3` audit fixes — nuke wipe list, PUBLIC_HOST in .env.example, test stability

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** fix  
**Status:** Experimental only  

**Details:**
```
- Add save-cache.json and weekly-baseline.json to factory reset wipe list
  (previously survived nuke, leaving stale data after reset)
- Add PUBLIC_HOST to .env.example with documentation
- Fix dev-server.js MAP_PORT → WEB_MAP_PORT (with backward compat fallback)
- Fix player-map test: force _load() while fs mocks are active to prevent
  real player-locations.json from contaminating test state
```

### [EXPERIMENTAL] `6d6611b` web map loads player data immediately on page load

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** fix  
**Status:** Experimental only  

**Details:**
```
Initial load called refreshPlayers() which opens an SSE connection
to /api/refresh — an endpoint that doesn't exist. This caused the
map to show no players until the 30s auto-refresh timer fired.
Changed initial load to use fetchPlayersQuick() which hits the
working /api/players endpoint directly. Also added fallback in
the SSE error handler to fetch data via the quick endpoint.
```

### [EXPERIMENTAL] `0856f77` wire DISCORD_OAUTH_SECRET to config for web map startup

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** fix  
**Status:** Experimental only  

**Details:**
```
config.discordClientSecret was referenced in index.js but never
defined in config.js, preventing the web map from starting even
when credentials were set. Also corrected the error message to
reference the actual env var name (DISCORD_OAUTH_SECRET).
```

### [EXPERIMENTAL] `b003975` add .env.backup* to .gitignore to prevent credential exposure

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** fix  
**Status:** Experimental only  

### [EXPERIMENTAL] `b469872` replace deprecated ephemeral option with MessageFlags across all commands

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** fix  
**Status:** Experimental only  

**Details:**
```
Replace ephemeral: true with flags: MessageFlags.Ephemeral in all
slash commands and interaction handlers to resolve discord.js v14
deprecation warnings. Affected files: index.js, map.js, panel.js,
playerstats.js, rcon.js, server.js, threads.js.
```

### [EXPERIMENTAL] `1150d51` panel channel ActionRow overflow + ephemeral deprecation

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** fix  
**Status:** Experimental only  

**Details:**
```
- Move Add Server button to separate ActionRow to avoid Discord
  5-component limit crash when multi-server is enabled
- Replace all ephemeral: true with flags: MessageFlags.Ephemeral
  across panel-channel.js (59 occurrences) to resolve discord.js
  deprecation warning
```

### [EXPERIMENTAL] `eacbd4f` Make auto-discovery truly universal

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
- Auto-detects FTP_BASE_PATH from discovered file locations
- Smarter directory prioritization (data, serverfiles, home, opt, etc.)
- Skips system directories for faster discovery
- Fixed web-map require path (save-parser moved to parsers/)
- Works with any SFTP setup: Docker bind mounts, direct container access, or traditional server layouts
Discovery now finds common parent directory and writes it to .env automatically.
No manual FTP_BASE_PATH configuration needed - just provide FTP credentials.
```

### [EXPERIMENTAL] `7288a2a` Fix interaction timeout bugs (defer-before-async pattern)

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** other  
**Status:** Experimental only  

**Details:**
```
- Fixed player/clan select menus in index.js to defer immediately
- Fixed 12 panel handlers to defer before admin checks and async work
- Added _isAdmin() synchronous helper, deprecated async _requireAdmin()
- Created comprehensive interaction tests (6 passing)
- Removed scripts/ from tracking (personal dev utilities)
All interaction handlers now follow the pattern:
1. deferReply() immediately (before any async operations)
2. Synchronous checks (_isAdmin, config flags)
3. Use editReply() for all responses after defer
This prevents Discord API 10062 'Unknown interaction' errors caused by
token expiry when async operations happen before defer.
```

### [EXPERIMENTAL] `d639e6c` defer player stats select menu interactions

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** fix  
**Status:** Experimental only  

**Details:**
```
- Add deferReply before building player/clan embeds
- Prevents DiscordAPIError[10062] Unknown interaction timeouts
- Use flags: 64 instead of deprecated ephemeral option
- Fixes crash when selecting players from stats dropdown
```

### [EXPERIMENTAL] `a0ddc72` update changelog with latest commits

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** docs  
**Status:** Experimental only  

### [EXPERIMENTAL] `fd83e2f` complete .env sync + dynamic changelog generator

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** feat  
**Status:** Experimental only  

**Details:**
```
Panel Button Integration:
- Sync .env button in bot controls panel
- Shows sync status and performs intelligent merge
- Creates timestamped backups and reports changes
- Auto-refreshes panel after sync
Auto-Sync on Startup:
- Checks .env schema version on bot startup
- Logs sync results to console
- Non-blocking error handling
Dynamic Changelog Generator (scripts/generate-changelog.js):
- Compares experimental vs main branch commit history
- Groups commits by type (feat/fix/docs/refactor/test)
- Lists file changes (added/modified/deleted)
- Shows [EXPERIMENTAL] badge for experimental-only commits
- Outputs to README.md via 'npm run changelog'
- JSON export via 'npm run changelog:json'
All .env sync features complete and tested.
```

### [EXPERIMENTAL] `70767dd` config.js path prefixing + add smart .env sync utility

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** fix  
**Status:** Experimental only  

**Details:**
```
- Fixed config.js FTP_BASE_PATH logic to check startsWith('/') not startsWith(prefix)
- Created env-sync.js utility for intelligent .env updates
- Added ENV_SCHEMA_VERSION=2 to .env.example for version tracking
- Sync preserves user values, adds new keys, comments deprecated ones
- Creates timestamped backups before modifying .env
Next: Add panel button for manual sync + auto-sync on startup
```

### [EXPERIMENTAL] `4c9ce5f` auto-discovery for GameServerSettings.ini and WelcomeMessage.txt

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** fix  
**Status:** Experimental only  

**Details:**
```
- Added FTP_SETTINGS_PATH and FTP_WELCOME_PATH to DISCOVERY_TARGETS
- Fixed path prefixing logic to detect absolute vs relative paths correctly
- Changed check from startsWith(basePath) to startsWith('/') to avoid double-prefixing
- Auto-discovery now finds all 6 file types instead of just 4
- Panel diagnostics now shows missing files explicitly (save/log)
Fixes issue where settings and welcome paths weren't auto-discovered during
first-run or NUKE_BOT, requiring manual configuration.
```

### [EXPERIMENTAL] `a18561a` comprehensive SSH key authentication for VPS deployments

**Author:** QS-Zuq  
**Date:** 2026-02-25  
**Type:** feat  
**Status:** Experimental only  

**Details:**
```
- Added SSH private key support across all SFTP connections
- Updated hasFtp() checks to accept FTP_PRIVATE_KEY_PATH
- Fixed SaveService, AutoMessages, LogWatcher, Threads to use sftpConnectConfig()
- Fixed ServerResources to use SSH key auth for monitoring
- Added PUBLIC_HOST config for VPS setups where game server binds to localhost
- Updated setup.js to support FTP_BASE_PATH + SSH keys
- Improved agent parser: horse data, containers, crafting content, attachments
- All modules support both password and SSH key authentication
Enables bot deployment on VPS with Docker game servers using localhost SFTP
connections via SSH key authentication without exposing passwords in config.
```

### [EXPERIMENTAL] `24ba7c8` stop excluding web-map assets from git

**Author:** @Zach  
**Date:** 2026-02-24  
**Type:** fix  
**Status:** Experimental only  

### [EXPERIMENTAL] `ef62fa6` Merge branch 'web-map' into experimental

**Author:** @Zach  
**Date:** 2026-02-24  
**Type:** other  
**Status:** Experimental only  

### [EXPERIMENTAL] `78475f1` wire ChatRelay DB inserts + fix schema version test

**Author:** @Zach  
**Date:** 2026-02-24  
**Type:** feat  
**Status:** Experimental only  

### [EXPERIMENTAL] `e27af88` DB-first architecture  activity_log + chat_log, log watcher DB inserts, save-service refactor, new parsers, diff engine, activity log module

**Author:** @Zach  
**Date:** 2026-02-24  
**Type:** feat  
**Status:** Experimental only  

### [EXPERIMENTAL] `a4fa2c7` web map module  interactive Leaflet map with Discord OAuth and live player positions

**Author:** @Zach  
**Date:** 2026-02-24  
**Type:** feat  
**Status:** Experimental only  

### `b38b117` nuke thread fix, SQLite/save-service, /map command, player-map, game-server agent, new parsers

**Author:** @Zach  
**Date:** 2026-02-24  
**Type:** feat  

**Details:**
```
- Fix nuke thread duplication: _nukeActive flag suppresses LogWatcher/ChatRelay
  thread creation during NUKE_BOT rebuild (prevents premature threads)
- Add SQLite database layer (src/db/): schema, migrations, save-service
- Add /map command with stats subcommand (overlays under development)
- Add player-map.js for map image generation from save data
- Move save-parser to src/parsers/ (src/save-parser.js is now a shim)
- Add GVAS reader, game-reference parser, agent-builder in src/parsers/
- Move agent to src/game-server/humanitz-agent.js
- Remove all emoji from panel buttons (16 .setEmoji calls removed)
- Add web-map to .gitignore (separate branch for large map images)
- Add _*.js to .gitignore (personal developer scripts)
- New env keys: SHOW_WORLD_STATS, ENABLE_CHALLENGE_FEED, and more
- Add timezone tests for _isNewWeek, nuke-active suppression tests
- 455 tests passing
```

### `5a88c4d` text inconsistencies, performance caching, ENABLE_GAME_SETTINGS_EDITOR toggle\n\n- Fix hardcoded [PLAYER STATS] / [PVP KILLFEED] log prefixes to use this._label\n- Normalize emoji usage (rcon.js, panel.js, pvp-scheduler.js)\n- Fix 'PVP Enabled' -> 'PvP Enabled' casing in server name suffix\n- Fix 'Zombies' -> 'Zombie Kills' in player embed kill breakdown\n- Fix 'Server Totals' -> 'Server Totals (All Time)' in /playerstats\n- Add mtime-cached _loadServerSettings() in server-status.js\n- Add dirty-flag caching for getAllPlayers() and getLeaderboard()\n- Add Set-backed uniqueToday lookups in playtime-tracker.js\n- Add .catch() to player-stats-channel save poll interval\n- Add ENABLE_GAME_SETTINGS_EDITOR toggle (config, .env.example, panel-channel)\n- Update copilot-instructions.md for panel security accuracy"

**Author:** @Zach  
**Date:** 2026-02-23  
**Type:** fix  

### `46a9ace` update README with admin panel, multi-server, resource monitoring, new commands

**Author:** @Zach  
**Date:** 2026-02-22  
**Type:** docs  

### `90d3f2a` admin panel, multi-server, server status overhaul, PvP per-day hours

**Author:** @Zach  
**Date:** 2026-02-22  
**Type:** feat  

**Details:**
```
Admin Panel Channel (panel-channel.js, panel-api.js, server-resources.js):
- Two-embed dashboard: bot controls + server panel
- Env editor with category dropdowns and live-apply
- Pterodactyl API: power control, backups, schedules, resources
- Host resource monitoring (Panel API or SSH backend)
- Game settings editor, welcome message editor, broadcasts
- Per-server managed embeds with server-specific controls
- Primary Server embed when no Panel API but SFTP available
Multi-Server Support (multi-server.js):
- Additional server instances via Add Server button
- Isolated module stacks per server (RCON, stats, playtime, logs)
- Per-server data directories (data/servers/<id>/)
- Per-server auto-messages config and custom text
- Server-scoped select menu IDs for channel-sharing safety
- Interaction routing via _findMultiServerModuleById()
Server Status Overhaul (server-status.js):
- Offline detection with red state and last-known data
- State persistence across bot restarts
- Host resource fields (CPU/RAM/disk progress bars)
- Direct-connect address (GAME_PORT)
- Content-hash dedup to reduce API calls
- Granular section toggles (9 setting categories + 8 feature sections)
Config Hardening (config.js):
- canShow()/isAdminView()/addAdminMembers() helpers
- ADMIN_ROLE_IDS, ADMIN_VIEW_PERMISSIONS
- SERVER_NAME, GAME_PORT
- Minimum interval enforcement on all poll values
- envTime() for HH:MM parsing
- Per-day PvP hour overrides (PVP_HOURS_MON-SUN)
Per-Day PvP Hours (pvp-scheduler.js):
- PVP_HOURS_MON through PVP_HOURS_SUN overrides
- Day-specific windows with global fallback
- Overnight window support across day boundaries
Thread & Chat Improvements:
- resetThreadCache() on LogWatcher and ChatRelay
- Self-healing _sendToThread() on error 10003
- NUKE_THREADS resets all thread caches
- Server name labels in thread titles and daily summaries
- ChatRelay startup accepts adminChannelId as fallback
Bot Lifecycle:
- Crash detection via bot-running.flag file
- Unexpected Shutdown notification on next startup
Tests: 235 passing (new: pvp-scheduler, expanded: config, threads, playtime)
```

### `38ac898` timezone-aware timestamps, RCON welcome messages, thread rebuild, server status improvements

**Author:** @Zach  
**Date:** 2026-02-22  
**Type:** feat  

**Details:**
```
Timezone support:
- Add BOT_TIMEZONE / LOG_TIMEZONE config keys; all date formatting now respects botTimezone
- Add parseLogTimestamp() + _tzOffsetMs() helpers in config.js for TZ-correct log parsing
- Replace pvpTimezone references with botTimezone across auto-messages, pvp-scheduler, player-embed
- Log-watcher uses config.parseLogTimestamp() instead of assuming UTC
RCON welcome messages:
- Auto-messages detects new player joins via poll snapshots
- Sends personalized welcome (returning vs first-time) with playtime, PvP schedule, Discord link
- Anti-spam cooldown between welcome messages
- Controlled by ENABLE_WELCOME_MSG config flag
Thread rebuild:
- New /threads slash command with rebuild subcommand (admin only)
- NUKE_THREADS .env flag for one-shot startup thread rebuild
- Auto-resets flag to false after execution
Server status embed improvements:
- Reorganized embed layout and field formatting
- Granular SHOW_SETTINGS_* toggles for each settings category
Tests:
- New tests for _tzOffsetMs, parseLogTimestamp (DST, half-hour offsets, midnight crossing)
- New threads.test.js for thread rebuild logic
- Fix singleton timer cleanup in player-stats-channel tests
Cleanup:
- Removed temp files (git-status-tmp.txt, test-out.txt, test-results*.txt)
- Updated .env.example with new config keys and removed PVP_TIMEZONE (merged into BOT_TIMEZONE)
```

### `fb421ed` Add MIT License file

**Author:** Zach  
**Date:** 2026-02-22  
**Type:** other  

### `b992698` welcome file 'updated each restart' note, README refresh

**Author:** @Zach  
**Date:** 2026-02-21  
**Type:** feat  

**Details:**
```
- auto-messages: add 'Updated each restart' on discord link line
- README: add SFTP welcome file, weekly stats, death loop, PVP_DAYS features
- README: add Configuration and Hosting wiki links
```

### `ca1fc85` welcome file, weekly stats, death loop, PvP days, extended settings, tests

**Author:** @Zach  
**Date:** 2026-02-21  
**Type:** feat  

**Details:**
```
- Auto-messages: SFTP welcome file with rich-text leaderboards, inline multi-color tags
- Player stats channel: weekly leaderboards, clan select, kill/survival tracker
- Log watcher: death loop detection, PvP kill attribution
- PvP scheduler: day-of-week filtering (PVP_DAYS)
- Server status: extended settings, weather odds, season progress
- Config: new toggles (SHOW_WEEKLY_STATS, WEEKLY_RESET_DAY, DEATH_LOOP_*, etc.)
- Added test suite (9 test files, node:test)
- .gitignore: added .github/, .dev/, *.txt
- .env.example: synced with all new config keys
```

### `11c1299` Fix Statistics parsing: correct property name from ExtendedStats to Statistics

**Author:** @Zach  
**Date:** 2026-02-21  
**Type:** other  

**Details:**
```
The save file stores player statistics (kills, bites, fish, challenges) in
a property named 'Statistics', not 'ExtendedStats'. This single-word fix
enables extraction of all 31 tracked stats per player.
```

### `d5b214f` Add game data integration, extended stats, embed rework, thread toggles, comment cleanup

**Author:** @Zach  
**Date:** 2026-02-21  
**Type:** other  

**Details:**
```
- Extract game data from pak DataTables (professions, afflictions, challenges, skill effects, loading tips)
- Expand save parser: bites, fish caught, 17 challenge categories, affliction display names
- Rework all embeds: clean formatting with code-block grids, consistent layout
- Add USE_CHAT_THREADS / USE_ACTIVITY_THREADS config toggles
- Add [Discord] DisplayName prefix on outbound chat messages
- Strip JSDoc and module docblocks (documented in wiki instead)
- Update .env.example with new settings
```

### `05e8e6b` chat-relay fallback + _ensureInit guards on all record methods

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

### `6a375ae` Fix cleanup deleting thread starter messages (preserves inline threads)

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

**Details:**
```
- player-stats-channel + server-status: skip messages with hasThread
  during _cleanOldMessages() so thread starter embeds aren't deleted
  when modules share the same channel as the log watcher
```

### `4d01f89` Auto-join admin users to daily threads (ADMIN_USER_IDS)

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

**Details:**
```
- config: parse ADMIN_USER_IDS as comma-separated Discord user ID list
- log-watcher + chat-relay: call thread.members.add() for each admin
  after creating new daily threads, so threads stay visible for them
- .env.example: document new ADMIN_USER_IDS setting
```

### `261715d` Fix chat-relay threads to appear inline (same startThread pattern as log-watcher)

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

### `9ffd3af` Add cross-validated player resolver, inline activity threads, thread-only Bot Online

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

**Details:**
```
- player-stats-channel: add _resolvePlayer() that cross-validates name,
  lastActive, firstSeen across playtime/stats/save sources; replace 5
  ad-hoc name resolution sites; add First Seen to player embed
- log-watcher: create daily threads from starter embed message so they
  appear inline in the channel feed (not hidden in threads panel);
  remove unused ChannelType import
- index: Bot Online/Offline posts to activity thread (preferred) with
  admin channel fallback instead of both
- playtime-tracker: expand getPlaytime() to return lastSeen + lastLogin
```

### `5eeaa2c` Fix Bot Online/Offline posting to admin channel + minor fixes

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

**Details:**
```
- Post Bot Online/Offline embeds to admin channel (visible) AND daily thread (logging)
  Previously only posted to thread, making it hard to find
- setup.js: add pvpKills/pvpDeaths to newRecord() for consistency
- setup.js: use config.getToday() instead of UTC date for playtime peaks
- player-stats-channel.js: remove dead save.playerName reference
```

### `9027f11` Uncomment ADMIN_CHANNEL_ID in .env.example - it's effectively required as fallback for Bot Online/Offline notifications

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

### `de6d58b` Fix timestamp regex for comma-in-year format (2,026)

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

**Details:**
```
Some HumanitZ servers output years with a thousands separator (e.g. 2,026
instead of 2026). Updated all 5 timestamp regexes in log-watcher.js and
setup.js to accept an optional comma in the year portion. The comma is
stripped before constructing Date objects.
```

### `05473c7` Module dependency system, auto-discovery, name resolution, timezone fix

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

**Details:**
```
- Dependency-aware module startup with status tracking (//)
- Guard clauses prevent crashes when modules are disabled
- Online/offline embeds show full module status with skip reasons
- SFTP auto-discovery of file paths (log, save, settings)
- Auto-update .env with discovered paths, auto-set FIRST_RUN=false
- Name resolution: getNameForId() + _loadLocalIdMap() from cached IDMap
- Fixed roster/dropdown builders to show names instead of SteamIDs
- Timestamp regex fixes for optional seconds and date separators
- Playtime peak tracking uses timezone-aware dates (config.getToday)
- .env.example: all toggles uncommented with dependency docs
- Removed dead code (exploreDirectories, searchFiles)
```

### `187f483` handle numeric ByteProperty for StartingPerk, remove affliction display

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** fix  

**Details:**
```
- Add PERK_INDEX_MAP for numeric perk indices (ByteProperty storage)
- Perk handler now resolves both string (EnumProperty) and number values
- Suppress logging for default/unset perk (index 0 / NewEnumerator0)
- Remove affliction from per-player survival stats (unclear stat)
```

### `1ce60d1` add PvP killfeed and timezone to README features"

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** docs  

### `1c6ff28` PvP killfeed, BOT_TIMEZONE, proactive midnight rollover\n\n- PvP kill attribution via damage→death correlation (60s window)\n- ⚔️ PvP Kill embeds in daily activity thread\n- Per-player PvP kills/deaths/K/D on stats embed\n- Optional \"Last 10 PvP Kills\" on overview (SHOW_PVP_KILLS, default off)\n- BOT_TIMEZONE controls all daily threads, summaries, displayed times\n- Proactive midnight rollover check (60s timer)\n- .env.example updated with all new settings"

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** feat  

### `b1b0112` Route notifications to threads, remove fish/bitten stats, clean up logging

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

**Details:**
```
- Bot online/offline notifications  daily activity thread (fallback: admin channel)
- PvP scheduler warnings/toggles  daily activity thread (fallback: admin channel)
- !admin alerts  daily chat thread (fallback: admin channel)
- Remove chat relay startup notification embed
- Remove fish stats (caughtFish, caughtPike) and bitten stats (bites, timesBitten)
- Remove verbose RCON packet/command/response logging
- Remove auto-messages debug polling log
- Fix startup log prefix consistency
- Clean up .gitignore (remove stale entries)
```

### `b751420` Fix null data crash, server name regex, add FIRST_RUN toggle

**Author:** @Zach  
**Date:** 2026-02-20  
**Type:** other  

**Details:**
```
- playtime-tracker.js / player-stats.js: validate parsed JSON in _load(),
  null-check in _save(), backup rotation (every 15 min, keep last 5)
- pvp-scheduler.js: fix _updateServerName() regex for quoted ServerName values
  (two-pass: quoted first, then unquoted fallback)
- config.js: add firstRun toggle (FIRST_RUN env var)
- index.js: run setup.js main() on FIRST_RUN=true before bot login
- setup.js: export main() for reuse, require.main guard for standalone use
- package.json: add setup / setup:local / setup:find / setup:validate scripts
- .env.example: document FIRST_RUN and PVP_UPDATE_SERVER_NAME options
```

### `3a6d6c3` PvP scheduler improvements - HH:MM time format, dynamic welcome countdown, optional server name update

**Author:** @Zach  
**Date:** 2026-02-19  
**Type:** feat  

**Details:**
```
- Support HH:MM format for PVP_START_TIME/PVP_END_TIME (backward compatible with hour-only)
- Minute-precision countdown scheduling (warnings start before the hour, not after)
- Dynamic PvP countdown in player welcome messages (time remaining / time until)
- Optional PVP_UPDATE_SERVER_NAME to append PvP schedule to server name during PvP window
- Updated README and .env.example with new options
```

### `f9aece2` add PvP scheduler and bot lifecycle to README features

**Author:** @Zach  
**Date:** 2026-02-19  
**Type:** docs  

### `0f13d23` PvP scheduler, bot lifecycle notifications, code quality fixes

**Author:** @Zach  
**Date:** 2026-02-19  
**Type:** feat  

**Details:**
```
New:
- PvP scheduler: toggles PvP on/off at scheduled hours via SFTP ini edit + server restart with countdown warnings
- Bot online/offline embeds posted to admin channel with active modules and uptime
- Uncaught exception and unhandled rejection handlers
Fixes:
- RCON: replace busy-wait with promise-chain queue, add cache eviction
- Playtime: fix duplicate join time loss, session count inflation, atomic file writes
- Player stats: O(1) name→ID index, init guards, atomic file writes
- Server status: recover from deleted status message (re-create on Unknown Message)
- Chat relay: escape Discord markdown in bridged messages, cap outbound at 500 chars
- Commands: block destructive RCON commands (shutdown/restart), mask Steam IDs for non-admins
- Log watcher: public sendToThread() API replacing private method access
- Player stats channel: use public sendToThread() API
- Save parser: Buffer.slice → Buffer.subarray
- Gitignore: exclude GameServerSettings.ini
```

### `e0a344b` cumulative survival tracking, kill/survival activity feed, new leaderboards (afflicted, fishers, bitten), allTrackedIds union fix

**Author:** @Zach  
**Date:** 2026-02-19  
**Type:** feat  

### `734a401` Add full feature toggle system (ENABLE_* env vars)

**Author:** @Zach  
**Date:** 2026-02-19  
**Type:** other  

**Details:**
```
- 7 major module toggles: status channels, server status, chat relay,
  auto-messages, log watcher, player stats, playtime
- 3 auto-message sub-toggles: link broadcast, promo, welcome
- All default to true (opt-out model)
- ADMIN_CHANNEL_ID no longer required (modules skip gracefully)
- Guards in index.js, chat-relay, log-watcher, auto-messages
- Updated .env.example with full toggle documentation
```

### `01a19ea` Audit fixes, feature toggles, envBool helper, .env format update

**Author:** @Zach  
**Date:** 2026-02-19  
**Type:** other  

**Details:**
```
- Add envBool() helper in config.js for clean boolean toggle handling
- Add SHOW_VITALS/STATUS_EFFECTS/INVENTORY/RECIPES/LORE/CONNECTIONS toggles
- Wire chatChannelId in chat-relay (falls back to adminChannelId)
- Fix raid daily summary bug (_dayCounts.raids -> raidHits)
- Remove unused imports (EmbedBuilder, PERK_MAP)
- Fix stale auto-message interval comments (now 30/45 min)
- Add fetchchat to server-info docs, fix misleading NOTE
- Update .env.example with full comments and toggle docs
- Add See It Live section to README
```

### `f813cfb` Spread out auto-messages (30/45 min), add !admin tip to welcome messages

**Author:** @Zach  
**Date:** 2026-02-19  
**Type:** other  

### `9723b0a` Slim README, move detailed docs to wiki

**Author:** @Zach  
**Date:** 2026-02-19  
**Type:** other  

### `6aa2d67` Initial commit: HumanitZ Discord bot

**Author:** @Zach  
**Date:** 2026-02-19  
**Type:** other  

**Details:**
```
- RCON client with auto-reconnect for HumanitZ dedicated servers
- Bidirectional chat bridge (Discord <-> in-game)
- Live server status via voice channel + text embed
- Player stats channel with save file parsing (UE4 GVAS binary)
- Clan data parsing and leaderboards
- Activity log watcher via SFTP with daily threads
- Playtime tracking with peak stats
- Auto-messages (welcome, Discord link, promo)
- Slash commands: /server, /players, /playtime, /playerstats, /rcon
- Setup utility for first-run data import and validation
```

---

## How to Read This Changelog

- **[EXPERIMENTAL]** — Commits only in experimental branch (not in main)
- No badge — Commits that exist in both branches
- **Breaking changes** are highlighted at the top
- Commits are grouped by type (feat, fix, docs, etc.)
- Full commit history includes all branches

---

**Repository:** QS-Zuq/humanitzbot-dev  
**Branch Comparison:** `main..experimental`  
**Last Generated:** 2026-02-27T15:15:56.403Z
