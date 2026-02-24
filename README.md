# Changelog — Experimental Branch

**Generated:** 2026-02-24  
**Branch:** `experimental`  
**Base:** `main`  
**Status:** Active Development

---

## Summary

- **Total Commits:** 42
- **Main Branch Commits:** 33
- **Experimental-Only Commits:** 9
- **Files Changed:** 47
  - Added: 16
  - Modified: 30
  - Deleted: 1

---

## Experimental Branch Changes (vs Main)

These features exist only in the experimental branch and are not yet merged to main.

### New Features

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

- config.js path prefixing + add smart .env sync utility `70767dd`
- auto-discovery for GameServerSettings.ini and WelcomeMessage.txt `4c9ce5f`
- stop excluding web-map assets from git `24ba7c8`

### Other Changes

- Merge branch 'web-map' into experimental `ef62fa6`

---

## File Changes

### Added Files (16)

- `scripts/generate-changelog.js`
- `src/activity-log.js`
- `src/db/diff-engine.js`
- `src/env-sync.js`
- `src/rcon-colors.js`
- `src/ue4-names.js`
- `src/web-map/auth.js`
- `src/web-map/dev-server.js`
- `src/web-map/public/app.js`
- `src/web-map/public/index.html`
- `src/web-map/public/map-2048.jpg`
- `src/web-map/public/map-2048.png`
- `src/web-map/public/map-4096.png`
- `src/web-map/server.js`
- `test/diff-engine.test.js`
- `test/ue4-names.test.js`

### Modified Files (30)

- `.env.example`
- `.gitignore`
- `package.json`
- `setup.js`
- `src/auto-messages.js`
- `src/chat-relay.js`
- `src/commands/threads.js`
- `src/config.js`
- `src/db/database.js`
- `src/db/schema.js`
- `src/game-server/humanitz-agent.js`
- `src/index.js`
- `src/log-watcher.js`
- `src/multi-server.js`
- `src/panel-channel.js`
- `src/parsers/game-reference.js`
- `src/parsers/gvas-reader.js`
- `src/parsers/save-parser.js`
- `src/parsers/save-service.js`
- `src/player-embed.js`
- `src/player-stats-channel.js`
- `src/player-stats.js`
- `src/playtime-tracker.js`
- `src/pvp-scheduler.js`
- `src/server-info.js`
- `src/server-resources.js`
- `src/server-status.js`
- `test/agent.test.js`
- `test/new-parser.test.js`
- `test/save-parser.test.js`

### Deleted Files (1)

- `src/save-parser.js`

---

## Complete History (All Commits)

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
**Last Generated:** 2026-02-24T23:36:12.422Z
