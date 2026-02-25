/**
 * Database manager for the HumanitZ bot.
 *
 * Wraps better-sqlite3 with:
 *   - Auto-initialisation (creates tables on first run)
 *   - Schema versioning & migration
 *   - Convenience query helpers for every data domain
 *   - WAL mode for concurrent reads during bot operation
 *
 * Usage:
 *   const db = require('./db/database');
 *   db.init();                           // call once at startup
 *   db.upsertPlayer(steamId, data);      // write parsed save data
 *   const p = db.getPlayer(steamId);     // read back
 *   db.close();                          // on shutdown
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { SCHEMA_VERSION, ALL_TABLES } = require('./schema');

const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'data', 'humanitz.db');

class HumanitZDB {
  /**
   * @param {object} [options]
   * @param {string} [options.dbPath]   - Path to the SQLite file (default: data/humanitz.db)
   * @param {boolean} [options.memory]  - Use in-memory DB (for testing)
   * @param {string} [options.label]    - Log prefix
   */
  constructor(options = {}) {
    this._dbPath = options.dbPath || DEFAULT_DB_PATH;
    this._memory = options.memory || false;
    this._label = options.label || 'DB';
    this._db = null;
    this._stmts = {};  // cached prepared statements
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Lifecycle
  // ═══════════════════════════════════════════════════════════════════════════

  init() {
    if (this._db) return;

    // Ensure data directory exists
    if (!this._memory) {
      const dir = path.dirname(this._dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    this._db = new Database(this._memory ? ':memory:' : this._dbPath);
    this._db.pragma('journal_mode = WAL');
    this._db.pragma('foreign_keys = ON');
    this._db.pragma('busy_timeout = 5000');

    this._applySchema();
    this._prepareStatements();

    const version = this._getMeta('schema_version');
    console.log(`[${this._label}] Database ready (v${version}, ${this._memory ? 'in-memory' : this._dbPath})`);
  }

  close() {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._stmts = {};
    }
  }

  get db() { return this._db; }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Schema management
  // ═══════════════════════════════════════════════════════════════════════════

  _applySchema() {
    const currentVersion = this._getMetaRaw('schema_version');

    if (!currentVersion) {
      // First run — create all tables
      this._db.exec('BEGIN');
      for (const sql of ALL_TABLES) {
        this._db.exec(sql);
      }
      this._setMeta('schema_version', String(SCHEMA_VERSION));
      this._db.exec('COMMIT');
      console.log(`[${this._label}] Schema created (v${SCHEMA_VERSION})`);
    } else if (parseInt(currentVersion, 10) < SCHEMA_VERSION) {
      this._db.exec('BEGIN');
      const fromVersion = parseInt(currentVersion, 10);

      // v1 → v2: Add player_aliases table
      if (fromVersion < 2) {
        this._db.exec(`
          CREATE TABLE IF NOT EXISTS player_aliases (
            steam_id    TEXT NOT NULL,
            name        TEXT NOT NULL,
            name_lower  TEXT NOT NULL,
            source      TEXT NOT NULL DEFAULT '',
            first_seen  TEXT DEFAULT (datetime('now')),
            last_seen   TEXT DEFAULT (datetime('now')),
            is_current  INTEGER DEFAULT 1,
            PRIMARY KEY (steam_id, name_lower)
          );
          CREATE INDEX IF NOT EXISTS idx_aliases_name_lower ON player_aliases(name_lower);
          CREATE INDEX IF NOT EXISTS idx_aliases_steam ON player_aliases(steam_id);
        `);
        // Seed aliases from existing players table
        const players = this._db.prepare('SELECT steam_id, name, name_history FROM players WHERE name != \'\'').all();
        const insertAlias = this._db.prepare(`
          INSERT OR IGNORE INTO player_aliases (steam_id, name, name_lower, source, first_seen, last_seen, is_current)
          VALUES (?, ?, ?, 'save', datetime('now'), datetime('now'), ?)
        `);
        for (const p of players) {
          if (p.name) insertAlias.run(p.steam_id, p.name, p.name.toLowerCase(), 1);
          // Also import name history
          try {
            const history = JSON.parse(p.name_history || '[]');
            for (const h of history) {
              if (h.name) insertAlias.run(p.steam_id, h.name, h.name.toLowerCase(), 0);
            }
          } catch { /* ignore bad JSON */ }
        }
        console.log(`[${this._label}] Migration v1→v2: created player_aliases (seeded ${players.length} players)`);
      }

      // v2 → v3: Add day_incremented + infection_timer columns to players
      if (fromVersion < 3) {
        // Use try/catch per column so migration is safe if columns already exist
        try { this._db.exec('ALTER TABLE players ADD COLUMN day_incremented INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN infection_timer REAL DEFAULT 0'); } catch { /* already exists */ }
        console.log(`[${this._label}] Migration v2→v3: added day_incremented + infection_timer columns`);
      }

      // v3 → v4: Add world_horses table, enrich containers, add activity_log
      if (fromVersion < 4) {
        // World horses table
        this._db.exec(`
          CREATE TABLE IF NOT EXISTS world_horses (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_name      TEXT NOT NULL DEFAULT '',
            class           TEXT DEFAULT '',
            display_name    TEXT DEFAULT '',
            horse_name      TEXT DEFAULT '',
            owner_steam_id  TEXT DEFAULT '',
            pos_x           REAL,
            pos_y           REAL,
            pos_z           REAL,
            health          REAL DEFAULT 0,
            max_health      REAL DEFAULT 0,
            energy          REAL DEFAULT 0,
            stamina         REAL DEFAULT 0,
            saddle_inventory TEXT DEFAULT '[]',
            inventory       TEXT DEFAULT '[]',
            extra           TEXT DEFAULT '{}',
            updated_at      TEXT DEFAULT (datetime('now'))
          );
        `);

        // Enrich containers table with new columns
        try { this._db.exec('ALTER TABLE containers ADD COLUMN quick_slots TEXT DEFAULT \'[]\''); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE containers ADD COLUMN locked INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE containers ADD COLUMN does_spawn_loot INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE containers ADD COLUMN alarm_off INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE containers ADD COLUMN crafting_content TEXT DEFAULT \'[]\''); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE containers ADD COLUMN extra TEXT DEFAULT \'{}\''); } catch { /* already exists */ }

        // Activity log table
        this._db.exec(`
          CREATE TABLE IF NOT EXISTS activity_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            type        TEXT NOT NULL,
            category    TEXT DEFAULT '',
            actor       TEXT DEFAULT '',
            actor_name  TEXT DEFAULT '',
            item        TEXT DEFAULT '',
            amount      INTEGER DEFAULT 0,
            details     TEXT DEFAULT '{}',
            pos_x       REAL,
            pos_y       REAL,
            pos_z       REAL,
            created_at  TEXT DEFAULT (datetime('now'))
          );
          CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(type);
          CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_log(category);
          CREATE INDEX IF NOT EXISTS idx_activity_actor ON activity_log(actor);
          CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);
          CREATE INDEX IF NOT EXISTS idx_activity_item ON activity_log(item);
        `);

        console.log(`[${this._label}] Migration v3→v4: added world_horses, enriched containers, added activity_log`);
      }

      // v4 → v5: Add steam_id + source + target columns to activity_log, create chat_log
      if (fromVersion < 5) {
        // New columns on activity_log
        try { this._db.exec('ALTER TABLE activity_log ADD COLUMN steam_id TEXT DEFAULT \'\''); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE activity_log ADD COLUMN source TEXT DEFAULT \'save\''); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE activity_log ADD COLUMN target_name TEXT DEFAULT \'\''); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE activity_log ADD COLUMN target_steam_id TEXT DEFAULT \'\''); } catch { /* already exists */ }
        // New indexes
        try { this._db.exec('CREATE INDEX IF NOT EXISTS idx_activity_steam_id ON activity_log(steam_id)'); } catch { /* */ }
        try { this._db.exec('CREATE INDEX IF NOT EXISTS idx_activity_source ON activity_log(source)'); } catch { /* */ }

        // Chat log table
        this._db.exec(`
          CREATE TABLE IF NOT EXISTS chat_log (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            type         TEXT NOT NULL,
            player_name  TEXT DEFAULT '',
            steam_id     TEXT DEFAULT '',
            message      TEXT DEFAULT '',
            direction    TEXT DEFAULT 'game',
            discord_user TEXT DEFAULT '',
            is_admin     INTEGER DEFAULT 0,
            created_at   TEXT DEFAULT (datetime('now'))
          );
          CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_log(created_at);
          CREATE INDEX IF NOT EXISTS idx_chat_type ON chat_log(type);
          CREATE INDEX IF NOT EXISTS idx_chat_steam ON chat_log(steam_id);
          CREATE INDEX IF NOT EXISTS idx_chat_player ON chat_log(player_name);
        `);

        console.log(`[${this._label}] Migration v4→v5: enriched activity_log, added chat_log`);
      }

      // v5 → v6: Add level, exp_current, exp_required, skills_point columns to players
      if (fromVersion < 6) {
        try { this._db.exec('ALTER TABLE players ADD COLUMN level INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN exp_current REAL DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN exp_required REAL DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN skills_point INTEGER DEFAULT 0'); } catch { /* already exists */ }
        console.log(`[${this._label}] Migration v5→v6: added level, exp_current, exp_required, skills_point`);
      }

      // v6 → v7: Item instance tracking, item movements, world drops
      if (fromVersion < 7) {
        this._db.exec(`
          CREATE TABLE IF NOT EXISTS item_instances (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            fingerprint     TEXT NOT NULL,
            item            TEXT NOT NULL,
            durability      REAL DEFAULT 0,
            ammo            INTEGER DEFAULT 0,
            attachments     TEXT DEFAULT '[]',
            cap             REAL DEFAULT 0,
            max_dur         REAL DEFAULT 0,
            location_type   TEXT NOT NULL DEFAULT '',
            location_id     TEXT DEFAULT '',
            location_slot   TEXT DEFAULT '',
            pos_x           REAL,
            pos_y           REAL,
            pos_z           REAL,
            amount          INTEGER DEFAULT 1,
            first_seen      TEXT DEFAULT (datetime('now')),
            last_seen       TEXT DEFAULT (datetime('now')),
            lost            INTEGER DEFAULT 0,
            lost_at         TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_item_inst_fingerprint ON item_instances(fingerprint);
          CREATE INDEX IF NOT EXISTS idx_item_inst_item ON item_instances(item);
          CREATE INDEX IF NOT EXISTS idx_item_inst_location ON item_instances(location_type, location_id);
          CREATE INDEX IF NOT EXISTS idx_item_inst_active ON item_instances(lost);
        `);

        this._db.exec(`
          CREATE TABLE IF NOT EXISTS item_movements (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            instance_id     INTEGER NOT NULL REFERENCES item_instances(id),
            item            TEXT NOT NULL,
            from_type       TEXT DEFAULT '',
            from_id         TEXT DEFAULT '',
            from_slot       TEXT DEFAULT '',
            to_type         TEXT NOT NULL,
            to_id           TEXT NOT NULL,
            to_slot         TEXT DEFAULT '',
            amount          INTEGER DEFAULT 1,
            attributed_steam_id TEXT DEFAULT '',
            attributed_name TEXT DEFAULT '',
            pos_x           REAL,
            pos_y           REAL,
            pos_z           REAL,
            created_at      TEXT DEFAULT (datetime('now'))
          );
          CREATE INDEX IF NOT EXISTS idx_item_mov_instance ON item_movements(instance_id);
          CREATE INDEX IF NOT EXISTS idx_item_mov_item ON item_movements(item);
          CREATE INDEX IF NOT EXISTS idx_item_mov_created ON item_movements(created_at);
          CREATE INDEX IF NOT EXISTS idx_item_mov_attributed ON item_movements(attributed_steam_id);
        `);

        this._db.exec(`
          CREATE TABLE IF NOT EXISTS world_drops (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            type            TEXT NOT NULL,
            actor_name      TEXT DEFAULT '',
            item            TEXT DEFAULT '',
            amount          INTEGER DEFAULT 0,
            durability      REAL DEFAULT 0,
            items           TEXT DEFAULT '[]',
            world_loot      INTEGER DEFAULT 0,
            placed          INTEGER DEFAULT 0,
            spawned         INTEGER DEFAULT 0,
            locked          INTEGER DEFAULT 0,
            does_spawn_loot INTEGER DEFAULT 0,
            pos_x           REAL,
            pos_y           REAL,
            pos_z           REAL,
            updated_at      TEXT DEFAULT (datetime('now'))
          );
          CREATE INDEX IF NOT EXISTS idx_world_drops_type ON world_drops(type);
          CREATE INDEX IF NOT EXISTS idx_world_drops_item ON world_drops(item);
          CREATE INDEX IF NOT EXISTS idx_world_drops_pos ON world_drops(pos_x, pos_y);
        `);

        console.log(`[${this._label}] Migration v6→v7: added item_instances, item_movements, world_drops`);
      }

      // v7 → v8: Item groups (fungible item tracking) + schema updates
      if (fromVersion < 8) {
        this._db.exec(`
          CREATE TABLE IF NOT EXISTS item_groups (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            fingerprint     TEXT NOT NULL,
            item            TEXT NOT NULL,
            durability      REAL DEFAULT 0,
            ammo            INTEGER DEFAULT 0,
            attachments     TEXT DEFAULT '[]',
            cap             REAL DEFAULT 0,
            max_dur         REAL DEFAULT 0,
            location_type   TEXT NOT NULL DEFAULT '',
            location_id     TEXT DEFAULT '',
            location_slot   TEXT DEFAULT '',
            pos_x           REAL,
            pos_y           REAL,
            pos_z           REAL,
            quantity        INTEGER DEFAULT 1,
            stack_size      INTEGER DEFAULT 1,
            first_seen      TEXT DEFAULT (datetime('now')),
            last_seen       TEXT DEFAULT (datetime('now')),
            lost            INTEGER DEFAULT 0,
            lost_at         TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_item_grp_fingerprint ON item_groups(fingerprint);
          CREATE INDEX IF NOT EXISTS idx_item_grp_item ON item_groups(item);
          CREATE INDEX IF NOT EXISTS idx_item_grp_location ON item_groups(location_type, location_id);
          CREATE INDEX IF NOT EXISTS idx_item_grp_active ON item_groups(lost);
          CREATE UNIQUE INDEX IF NOT EXISTS idx_item_grp_unique ON item_groups(fingerprint, location_type, location_id, location_slot) WHERE lost = 0;
        `);

        // Add group_id to item_instances if not present
        try { this._db.exec('ALTER TABLE item_instances ADD COLUMN group_id INTEGER DEFAULT NULL'); } catch { /* already exists */ }
        try { this._db.exec('CREATE INDEX IF NOT EXISTS idx_item_inst_group ON item_instances(group_id)'); } catch { /* already exists */ }

        // Add group_id + move_type to item_movements if not present
        try { this._db.exec('ALTER TABLE item_movements ADD COLUMN group_id INTEGER DEFAULT NULL'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE item_movements ADD COLUMN move_type TEXT DEFAULT \'move\''); } catch { /* already exists */ }
        try { this._db.exec('CREATE INDEX IF NOT EXISTS idx_item_mov_group ON item_movements(group_id)'); } catch { /* already exists */ }

        // Make instance_id nullable (group-level movements don't have an instance)
        // SQLite doesn't support ALTER COLUMN, but the column already allows NULL values
        // since the NOT NULL constraint is only enforced on INSERT

        console.log(`[${this._label}] Migration v7→v8: added item_groups, group_id columns`);
      }

      // v8 → v9: DB-first player stats & playtime — add detailed log columns + server_peaks
      if (fromVersion < 9) {
        // New detailed log stats columns on players
        try { this._db.exec('ALTER TABLE players ADD COLUMN log_connects INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN log_disconnects INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN log_admin_access INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN log_destroyed_out INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN log_destroyed_in INTEGER DEFAULT 0'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN log_build_items TEXT DEFAULT \'{}\''); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN log_killed_by TEXT DEFAULT \'{}\''); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN log_damage_detail TEXT DEFAULT \'{}\''); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN log_cheat_flags TEXT DEFAULT \'[]\''); } catch { /* already exists */ }
        // New playtime detail columns on players
        try { this._db.exec('ALTER TABLE players ADD COLUMN playtime_first_seen TEXT'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN playtime_last_login TEXT'); } catch { /* already exists */ }
        try { this._db.exec('ALTER TABLE players ADD COLUMN playtime_last_seen TEXT'); } catch { /* already exists */ }

        // Server peaks table
        this._db.exec(`
          CREATE TABLE IF NOT EXISTS server_peaks (
            key         TEXT PRIMARY KEY,
            value       TEXT DEFAULT '',
            updated_at  TEXT DEFAULT (datetime('now'))
          );
        `);

        console.log(`[${this._label}] Migration v8→v9: DB-first player stats & playtime`);
      }

      this._setMeta('schema_version', String(SCHEMA_VERSION));
      this._db.exec('COMMIT');
      console.log(`[${this._label}] Schema migrated to v${SCHEMA_VERSION}`);
    }
  }

  _getMetaRaw(key) {
    try {
      // meta table may not exist yet on very first run
      const row = this._db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
      return row ? row.value : null;
    } catch {
      return null;
    }
  }

  _getMeta(key) {
    const row = this._db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
    return row ? row.value : null;
  }

  /** Public meta getter. */
  getMeta(key) { return this._getMeta(key); }

  /** Public meta setter. */
  setMeta(key, value) { return this._setMeta(key, value); }

  _setMeta(key, value) {
    this._db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Prepared statements
  // ═══════════════════════════════════════════════════════════════════════════

  _prepareStatements() {
    // Player upsert — all columns
    this._stmts.upsertPlayer = this._db.prepare(`
      INSERT INTO players (
        steam_id, name, male, starting_perk, affliction, char_profile,
        zeeks_killed, headshots, melee_kills, gun_kills, blast_kills,
        fist_kills, takedown_kills, vehicle_kills,
        lifetime_kills, lifetime_headshots, lifetime_melee_kills,
        lifetime_gun_kills, lifetime_blast_kills, lifetime_fist_kills,
        lifetime_takedown_kills, lifetime_vehicle_kills, lifetime_days_survived,
        has_extended_stats,
        days_survived, times_bitten, bites, fish_caught, fish_caught_pike,
        health, max_health, hunger, max_hunger, thirst, max_thirst,
        stamina, max_stamina, infection, max_infection, battery,
        fatigue, infection_buildup, well_rested, energy, hood, hypo_handle,
        exp, level, exp_current, exp_required, skills_point,
        pos_x, pos_y, pos_z, rotation_yaw,
        respawn_x, respawn_y, respawn_z,
        cb_radio_cooldown, day_incremented, infection_timer,
        player_states, body_conditions,
        crafting_recipes, building_recipes,
        unlocked_professions, unlocked_skills, skills_data,
        inventory, equipment, quick_slots, backpack_items, backpack_data,
        lore, unique_loots, crafted_uniques, loot_item_unique,
        quest_data, mini_quest, challenges, quest_spawner_done,
        companion_data, horses, extended_stats,
        challenge_kill_zombies, challenge_kill_50, challenge_catch_20_fish,
        challenge_regular_angler, challenge_kill_zombie_bear, challenge_9_squares,
        challenge_craft_firearm, challenge_craft_furnace, challenge_craft_melee_bench,
        challenge_craft_melee_weapon, challenge_craft_rain_collector, challenge_craft_tablesaw,
        challenge_craft_treatment, challenge_craft_weapons_bench, challenge_craft_workbench,
        challenge_find_dog, challenge_find_heli, challenge_lockpick_suv, challenge_repair_radio,
        custom_data, first_seen, last_seen, updated_at
      ) VALUES (
        @steam_id, @name, @male, @starting_perk, @affliction, @char_profile,
        @zeeks_killed, @headshots, @melee_kills, @gun_kills, @blast_kills,
        @fist_kills, @takedown_kills, @vehicle_kills,
        @lifetime_kills, @lifetime_headshots, @lifetime_melee_kills,
        @lifetime_gun_kills, @lifetime_blast_kills, @lifetime_fist_kills,
        @lifetime_takedown_kills, @lifetime_vehicle_kills, @lifetime_days_survived,
        @has_extended_stats,
        @days_survived, @times_bitten, @bites, @fish_caught, @fish_caught_pike,
        @health, @max_health, @hunger, @max_hunger, @thirst, @max_thirst,
        @stamina, @max_stamina, @infection, @max_infection, @battery,
        @fatigue, @infection_buildup, @well_rested, @energy, @hood, @hypo_handle,
        @exp, @level, @exp_current, @exp_required, @skills_point,
        @pos_x, @pos_y, @pos_z, @rotation_yaw,
        @respawn_x, @respawn_y, @respawn_z,
        @cb_radio_cooldown, @day_incremented, @infection_timer,
        @player_states, @body_conditions,
        @crafting_recipes, @building_recipes,
        @unlocked_professions, @unlocked_skills, @skills_data,
        @inventory, @equipment, @quick_slots, @backpack_items, @backpack_data,
        @lore, @unique_loots, @crafted_uniques, @loot_item_unique,
        @quest_data, @mini_quest, @challenges, @quest_spawner_done,
        @companion_data, @horses, @extended_stats,
        @challenge_kill_zombies, @challenge_kill_50, @challenge_catch_20_fish,
        @challenge_regular_angler, @challenge_kill_zombie_bear, @challenge_9_squares,
        @challenge_craft_firearm, @challenge_craft_furnace, @challenge_craft_melee_bench,
        @challenge_craft_melee_weapon, @challenge_craft_rain_collector, @challenge_craft_tablesaw,
        @challenge_craft_treatment, @challenge_craft_weapons_bench, @challenge_craft_workbench,
        @challenge_find_dog, @challenge_find_heli, @challenge_lockpick_suv, @challenge_repair_radio,
        @custom_data, datetime('now'), datetime('now'), datetime('now')
      )
      ON CONFLICT(steam_id) DO UPDATE SET
        name = excluded.name,
        male = excluded.male,
        starting_perk = excluded.starting_perk,
        affliction = excluded.affliction,
        char_profile = excluded.char_profile,
        zeeks_killed = excluded.zeeks_killed,
        headshots = excluded.headshots,
        melee_kills = excluded.melee_kills,
        gun_kills = excluded.gun_kills,
        blast_kills = excluded.blast_kills,
        fist_kills = excluded.fist_kills,
        takedown_kills = excluded.takedown_kills,
        vehicle_kills = excluded.vehicle_kills,
        lifetime_kills = excluded.lifetime_kills,
        lifetime_headshots = excluded.lifetime_headshots,
        lifetime_melee_kills = excluded.lifetime_melee_kills,
        lifetime_gun_kills = excluded.lifetime_gun_kills,
        lifetime_blast_kills = excluded.lifetime_blast_kills,
        lifetime_fist_kills = excluded.lifetime_fist_kills,
        lifetime_takedown_kills = excluded.lifetime_takedown_kills,
        lifetime_vehicle_kills = excluded.lifetime_vehicle_kills,
        lifetime_days_survived = excluded.lifetime_days_survived,
        has_extended_stats = excluded.has_extended_stats,
        days_survived = excluded.days_survived,
        times_bitten = excluded.times_bitten,
        bites = excluded.bites,
        fish_caught = excluded.fish_caught,
        fish_caught_pike = excluded.fish_caught_pike,
        health = excluded.health,
        max_health = excluded.max_health,
        hunger = excluded.hunger,
        max_hunger = excluded.max_hunger,
        thirst = excluded.thirst,
        max_thirst = excluded.max_thirst,
        stamina = excluded.stamina,
        max_stamina = excluded.max_stamina,
        infection = excluded.infection,
        max_infection = excluded.max_infection,
        battery = excluded.battery,
        fatigue = excluded.fatigue,
        infection_buildup = excluded.infection_buildup,
        well_rested = excluded.well_rested,
        energy = excluded.energy,
        hood = excluded.hood,
        hypo_handle = excluded.hypo_handle,
        exp = excluded.exp,
        level = excluded.level,
        exp_current = excluded.exp_current,
        exp_required = excluded.exp_required,
        skills_point = excluded.skills_point,
        pos_x = excluded.pos_x,
        pos_y = excluded.pos_y,
        pos_z = excluded.pos_z,
        rotation_yaw = excluded.rotation_yaw,
        respawn_x = excluded.respawn_x,
        respawn_y = excluded.respawn_y,
        respawn_z = excluded.respawn_z,
        cb_radio_cooldown = excluded.cb_radio_cooldown,
        day_incremented = excluded.day_incremented,
        infection_timer = excluded.infection_timer,
        player_states = excluded.player_states,
        body_conditions = excluded.body_conditions,
        crafting_recipes = excluded.crafting_recipes,
        building_recipes = excluded.building_recipes,
        unlocked_professions = excluded.unlocked_professions,
        unlocked_skills = excluded.unlocked_skills,
        skills_data = excluded.skills_data,
        inventory = excluded.inventory,
        equipment = excluded.equipment,
        quick_slots = excluded.quick_slots,
        backpack_items = excluded.backpack_items,
        backpack_data = excluded.backpack_data,
        lore = excluded.lore,
        unique_loots = excluded.unique_loots,
        crafted_uniques = excluded.crafted_uniques,
        loot_item_unique = excluded.loot_item_unique,
        quest_data = excluded.quest_data,
        mini_quest = excluded.mini_quest,
        challenges = excluded.challenges,
        quest_spawner_done = excluded.quest_spawner_done,
        companion_data = excluded.companion_data,
        horses = excluded.horses,
        extended_stats = excluded.extended_stats,
        challenge_kill_zombies = excluded.challenge_kill_zombies,
        challenge_kill_50 = excluded.challenge_kill_50,
        challenge_catch_20_fish = excluded.challenge_catch_20_fish,
        challenge_regular_angler = excluded.challenge_regular_angler,
        challenge_kill_zombie_bear = excluded.challenge_kill_zombie_bear,
        challenge_9_squares = excluded.challenge_9_squares,
        challenge_craft_firearm = excluded.challenge_craft_firearm,
        challenge_craft_furnace = excluded.challenge_craft_furnace,
        challenge_craft_melee_bench = excluded.challenge_craft_melee_bench,
        challenge_craft_melee_weapon = excluded.challenge_craft_melee_weapon,
        challenge_craft_rain_collector = excluded.challenge_craft_rain_collector,
        challenge_craft_tablesaw = excluded.challenge_craft_tablesaw,
        challenge_craft_treatment = excluded.challenge_craft_treatment,
        challenge_craft_weapons_bench = excluded.challenge_craft_weapons_bench,
        challenge_craft_workbench = excluded.challenge_craft_workbench,
        challenge_find_dog = excluded.challenge_find_dog,
        challenge_find_heli = excluded.challenge_find_heli,
        challenge_lockpick_suv = excluded.challenge_lockpick_suv,
        challenge_repair_radio = excluded.challenge_repair_radio,
        custom_data = excluded.custom_data,
        last_seen = datetime('now'),
        updated_at = datetime('now')
    `);

    // Fast lookups
    this._stmts.getPlayer = this._db.prepare('SELECT * FROM players WHERE steam_id = ?');
    this._stmts.getAllPlayers = this._db.prepare('SELECT * FROM players ORDER BY lifetime_kills DESC');
    this._stmts.getOnlinePlayers = this._db.prepare('SELECT * FROM players WHERE online = 1');
    this._stmts.setPlayerOnline = this._db.prepare('UPDATE players SET online = ?, last_seen = datetime(\'now\') WHERE steam_id = ?');
    this._stmts.setAllOffline = this._db.prepare('UPDATE players SET online = 0');

    // Full log stats upsert — used by DB-first player-stats
    this._stmts.upsertPlayerLogStats = this._db.prepare(`
      INSERT INTO players (steam_id, name, log_deaths, log_pvp_kills, log_pvp_deaths,
        log_builds, log_loots, log_damage_taken, log_raids_out, log_raids_in,
        log_connects, log_disconnects, log_admin_access, log_destroyed_out, log_destroyed_in,
        log_build_items, log_killed_by, log_damage_detail, log_cheat_flags, log_last_event,
        first_seen, last_seen, updated_at)
      VALUES (@steam_id, @name, @log_deaths, @log_pvp_kills, @log_pvp_deaths,
        @log_builds, @log_loots, @log_damage_taken, @log_raids_out, @log_raids_in,
        @log_connects, @log_disconnects, @log_admin_access, @log_destroyed_out, @log_destroyed_in,
        @log_build_items, @log_killed_by, @log_damage_detail, @log_cheat_flags, @log_last_event,
        datetime('now'), datetime('now'), datetime('now'))
      ON CONFLICT(steam_id) DO UPDATE SET
        name = CASE WHEN excluded.name != '' THEN excluded.name ELSE players.name END,
        log_deaths = excluded.log_deaths,
        log_pvp_kills = excluded.log_pvp_kills,
        log_pvp_deaths = excluded.log_pvp_deaths,
        log_builds = excluded.log_builds,
        log_loots = excluded.log_loots,
        log_damage_taken = excluded.log_damage_taken,
        log_raids_out = excluded.log_raids_out,
        log_raids_in = excluded.log_raids_in,
        log_connects = excluded.log_connects,
        log_disconnects = excluded.log_disconnects,
        log_admin_access = excluded.log_admin_access,
        log_destroyed_out = excluded.log_destroyed_out,
        log_destroyed_in = excluded.log_destroyed_in,
        log_build_items = excluded.log_build_items,
        log_killed_by = excluded.log_killed_by,
        log_damage_detail = excluded.log_damage_detail,
        log_cheat_flags = excluded.log_cheat_flags,
        log_last_event = excluded.log_last_event,
        updated_at = datetime('now')
    `);

    // Full playtime upsert — used by DB-first playtime-tracker
    this._stmts.upsertPlayerPlaytime = this._db.prepare(`
      INSERT INTO players (steam_id, name, playtime_seconds, session_count,
        playtime_first_seen, playtime_last_login, playtime_last_seen,
        first_seen, last_seen, updated_at)
      VALUES (@steam_id, @name, @playtime_seconds, @session_count,
        @playtime_first_seen, @playtime_last_login, @playtime_last_seen,
        datetime('now'), datetime('now'), datetime('now'))
      ON CONFLICT(steam_id) DO UPDATE SET
        name = CASE WHEN excluded.name != '' THEN excluded.name ELSE players.name END,
        playtime_seconds = excluded.playtime_seconds,
        session_count = excluded.session_count,
        playtime_first_seen = excluded.playtime_first_seen,
        playtime_last_login = excluded.playtime_last_login,
        playtime_last_seen = excluded.playtime_last_seen,
        updated_at = datetime('now')
    `);

    // Get all player log stats (for loading into in-memory cache)
    this._stmts.getAllPlayerLogStats = this._db.prepare(`
      SELECT steam_id, name, log_deaths, log_pvp_kills, log_pvp_deaths,
        log_builds, log_loots, log_damage_taken, log_raids_out, log_raids_in,
        log_connects, log_disconnects, log_admin_access, log_destroyed_out, log_destroyed_in,
        log_build_items, log_killed_by, log_damage_detail, log_cheat_flags, log_last_event
      FROM players
      WHERE log_deaths > 0 OR log_pvp_kills > 0 OR log_builds > 0
        OR log_loots > 0 OR log_raids_out > 0 OR log_connects > 0
        OR log_admin_access > 0
    `);

    // Get all player playtime (for loading into in-memory cache)
    this._stmts.getAllPlayerPlaytime = this._db.prepare(`
      SELECT steam_id, name, playtime_seconds, session_count,
        playtime_first_seen, playtime_last_login, playtime_last_seen
      FROM players
      WHERE playtime_seconds > 0 OR session_count > 0
    `);

    // Server peaks
    this._stmts.setServerPeak = this._db.prepare(
      'INSERT OR REPLACE INTO server_peaks (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))'
    );
    this._stmts.getServerPeak = this._db.prepare(
      'SELECT value FROM server_peaks WHERE key = ?'
    );
    this._stmts.getAllServerPeaks = this._db.prepare(
      'SELECT * FROM server_peaks'
    );

    // Leaderboards
    this._stmts.topKillers = this._db.prepare('SELECT steam_id, name, lifetime_kills, lifetime_headshots, lifetime_melee_kills, lifetime_gun_kills FROM players ORDER BY lifetime_kills DESC LIMIT ?');
    this._stmts.topPlaytime = this._db.prepare('SELECT steam_id, name, playtime_seconds, session_count FROM players ORDER BY playtime_seconds DESC LIMIT ?');
    this._stmts.topSurvival = this._db.prepare('SELECT steam_id, name, lifetime_days_survived, days_survived FROM players ORDER BY lifetime_days_survived DESC LIMIT ?');
    this._stmts.topFish = this._db.prepare('SELECT steam_id, name, fish_caught, fish_caught_pike FROM players WHERE fish_caught > 0 ORDER BY fish_caught DESC LIMIT ?');
    this._stmts.topBitten = this._db.prepare('SELECT steam_id, name, times_bitten FROM players WHERE times_bitten > 0 ORDER BY times_bitten DESC LIMIT ?');
    this._stmts.topPvp = this._db.prepare('SELECT steam_id, name, log_pvp_kills, log_pvp_deaths FROM players WHERE log_pvp_kills > 0 ORDER BY log_pvp_kills DESC LIMIT ?');

    // Clans
    this._stmts.upsertClan = this._db.prepare('INSERT OR REPLACE INTO clans (name, updated_at) VALUES (?, datetime(\'now\'))');
    this._stmts.deleteClanMembers = this._db.prepare('DELETE FROM clan_members WHERE clan_name = ?');
    this._stmts.insertClanMember = this._db.prepare('INSERT OR REPLACE INTO clan_members (clan_name, steam_id, name, rank, can_invite, can_kick) VALUES (?, ?, ?, ?, ?, ?)');
    this._stmts.getAllClans = this._db.prepare('SELECT * FROM clans ORDER BY name');
    this._stmts.getClanMembers = this._db.prepare('SELECT * FROM clan_members WHERE clan_name = ? ORDER BY rank DESC, name');

    // World state
    this._stmts.setWorldState = this._db.prepare('INSERT OR REPLACE INTO world_state (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))');
    this._stmts.getWorldState = this._db.prepare('SELECT value FROM world_state WHERE key = ?');
    this._stmts.getAllWorldState = this._db.prepare('SELECT * FROM world_state');

    // Structures
    this._stmts.clearStructures = this._db.prepare('DELETE FROM structures');
    this._stmts.insertStructure = this._db.prepare(`
      INSERT INTO structures (actor_class, display_name, owner_steam_id, pos_x, pos_y, pos_z,
        current_health, max_health, upgrade_level, attached_to_trailer, inventory, no_spawn, extra_data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    this._stmts.getStructures = this._db.prepare('SELECT * FROM structures ORDER BY actor_class');
    this._stmts.getStructuresByOwner = this._db.prepare('SELECT * FROM structures WHERE owner_steam_id = ?');
    this._stmts.countStructuresByOwner = this._db.prepare('SELECT owner_steam_id, COUNT(*) as count FROM structures GROUP BY owner_steam_id ORDER BY count DESC');

    // Vehicles
    this._stmts.clearVehicles = this._db.prepare('DELETE FROM vehicles');
    this._stmts.insertVehicle = this._db.prepare(`
      INSERT INTO vehicles (class, display_name, pos_x, pos_y, pos_z, health, max_health, fuel, inventory, upgrades, extra, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    this._stmts.getAllVehicles = this._db.prepare('SELECT * FROM vehicles');

    // Companions
    this._stmts.clearCompanions = this._db.prepare('DELETE FROM companions');
    this._stmts.insertCompanion = this._db.prepare(`
      INSERT INTO companions (type, actor_name, owner_steam_id, pos_x, pos_y, pos_z, health, extra, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    this._stmts.getAllCompanions = this._db.prepare('SELECT * FROM companions');

    // World horses
    this._stmts.clearWorldHorses = this._db.prepare('DELETE FROM world_horses');
    this._stmts.insertWorldHorse = this._db.prepare(`
      INSERT INTO world_horses (actor_name, class, display_name, horse_name, owner_steam_id, pos_x, pos_y, pos_z, health, max_health, energy, stamina, saddle_inventory, inventory, extra, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    this._stmts.getAllWorldHorses = this._db.prepare('SELECT * FROM world_horses');

    // Dead bodies
    this._stmts.clearDeadBodies = this._db.prepare('DELETE FROM dead_bodies');
    this._stmts.insertDeadBody = this._db.prepare('INSERT OR REPLACE INTO dead_bodies (actor_name, pos_x, pos_y, pos_z, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'))');

    // Containers
    this._stmts.clearContainers = this._db.prepare('DELETE FROM containers');
    this._stmts.insertContainer = this._db.prepare(`
      INSERT OR REPLACE INTO containers (actor_name, items, quick_slots, locked, does_spawn_loot, alarm_off, crafting_content, pos_x, pos_y, pos_z, extra, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    this._stmts.getAllContainers = this._db.prepare('SELECT * FROM containers ORDER BY actor_name');
    this._stmts.getContainersWithItems = this._db.prepare('SELECT * FROM containers WHERE items != \'[]\' ORDER BY actor_name');

    // Loot actors
    this._stmts.clearLootActors = this._db.prepare('DELETE FROM loot_actors');
    this._stmts.insertLootActor = this._db.prepare('INSERT INTO loot_actors (name, type, pos_x, pos_y, pos_z, items, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))');

    // Item instances (fingerprint tracking)
    this._stmts.insertItemInstance = this._db.prepare(`
      INSERT INTO item_instances (fingerprint, item, durability, ammo, attachments, cap, max_dur, location_type, location_id, location_slot, pos_x, pos_y, pos_z, amount, group_id, first_seen, last_seen, lost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)
    `);
    this._stmts.updateItemInstanceLocation = this._db.prepare(`
      UPDATE item_instances SET location_type = ?, location_id = ?, location_slot = ?, pos_x = ?, pos_y = ?, pos_z = ?, amount = ?, group_id = ?, last_seen = datetime('now'), lost = 0, lost_at = NULL WHERE id = ?
    `);
    this._stmts.markItemInstanceLost = this._db.prepare(`
      UPDATE item_instances SET lost = 1, lost_at = datetime('now') WHERE id = ?
    `);
    this._stmts.markAllItemInstancesLost = this._db.prepare(`
      UPDATE item_instances SET lost = 1, lost_at = datetime('now') WHERE lost = 0
    `);
    this._stmts.touchItemInstance = this._db.prepare(`
      UPDATE item_instances SET last_seen = datetime('now'), lost = 0 WHERE id = ?
    `);
    this._stmts.findItemInstanceByFingerprint = this._db.prepare(
      'SELECT * FROM item_instances WHERE fingerprint = ? AND lost = 0 LIMIT 1'
    );
    this._stmts.findItemInstancesByFingerprint = this._db.prepare(
      'SELECT * FROM item_instances WHERE fingerprint = ? AND lost = 0'
    );
    this._stmts.findItemInstanceById = this._db.prepare(
      'SELECT * FROM item_instances WHERE id = ?'
    );
    this._stmts.getActiveItemInstances = this._db.prepare(
      'SELECT * FROM item_instances WHERE lost = 0 ORDER BY item, location_type'
    );
    this._stmts.getItemInstancesByItem = this._db.prepare(
      'SELECT * FROM item_instances WHERE item = ? AND lost = 0 ORDER BY location_type'
    );
    this._stmts.getItemInstancesByLocation = this._db.prepare(
      'SELECT * FROM item_instances WHERE location_type = ? AND location_id = ? AND lost = 0'
    );
    this._stmts.getItemInstanceCount = this._db.prepare(
      'SELECT COUNT(*) as count FROM item_instances WHERE lost = 0'
    );
    this._stmts.searchItemInstances = this._db.prepare(
      'SELECT * FROM item_instances WHERE item LIKE ? AND lost = 0 ORDER BY item LIMIT ?'
    );
    this._stmts.purgeOldLostItems = this._db.prepare(
      'DELETE FROM item_instances WHERE lost = 1 AND lost_at < datetime(\'now\', ?)'
    );
    this._stmts.getItemInstancesByGroup = this._db.prepare(
      'SELECT * FROM item_instances WHERE group_id = ? AND lost = 0'
    );

    // Item groups (fungible item tracking)
    this._stmts.insertItemGroup = this._db.prepare(`
      INSERT INTO item_groups (fingerprint, item, durability, ammo, attachments, cap, max_dur, location_type, location_id, location_slot, pos_x, pos_y, pos_z, quantity, stack_size, first_seen, last_seen, lost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 0)
    `);
    this._stmts.updateItemGroupQuantity = this._db.prepare(`
      UPDATE item_groups SET quantity = ?, last_seen = datetime('now'), lost = 0, lost_at = NULL WHERE id = ?
    `);
    this._stmts.updateItemGroupLocation = this._db.prepare(`
      UPDATE item_groups SET location_type = ?, location_id = ?, location_slot = ?, pos_x = ?, pos_y = ?, pos_z = ?, quantity = ?, last_seen = datetime('now'), lost = 0, lost_at = NULL WHERE id = ?
    `);
    this._stmts.markItemGroupLost = this._db.prepare(`
      UPDATE item_groups SET lost = 1, lost_at = datetime('now') WHERE id = ?
    `);
    this._stmts.markAllItemGroupsLost = this._db.prepare(`
      UPDATE item_groups SET lost = 1, lost_at = datetime('now') WHERE lost = 0
    `);
    this._stmts.touchItemGroup = this._db.prepare(`
      UPDATE item_groups SET last_seen = datetime('now'), lost = 0 WHERE id = ?
    `);
    this._stmts.findActiveGroupByLocation = this._db.prepare(
      'SELECT * FROM item_groups WHERE fingerprint = ? AND location_type = ? AND location_id = ? AND location_slot = ? AND lost = 0 LIMIT 1'
    );
    this._stmts.findActiveGroupsByFingerprint = this._db.prepare(
      'SELECT * FROM item_groups WHERE fingerprint = ? AND lost = 0'
    );
    this._stmts.findItemGroupById = this._db.prepare(
      'SELECT * FROM item_groups WHERE id = ?'
    );
    this._stmts.getActiveItemGroups = this._db.prepare(
      'SELECT * FROM item_groups WHERE lost = 0 ORDER BY item, location_type'
    );
    this._stmts.getItemGroupsByItem = this._db.prepare(
      'SELECT * FROM item_groups WHERE item = ? AND lost = 0 ORDER BY location_type'
    );
    this._stmts.getItemGroupsByLocation = this._db.prepare(
      'SELECT * FROM item_groups WHERE location_type = ? AND location_id = ? AND lost = 0'
    );
    this._stmts.getItemGroupCount = this._db.prepare(
      'SELECT COUNT(*) as count FROM item_groups WHERE lost = 0'
    );
    this._stmts.searchItemGroups = this._db.prepare(
      'SELECT * FROM item_groups WHERE item LIKE ? AND lost = 0 ORDER BY item LIMIT ?'
    );
    this._stmts.purgeOldLostGroups = this._db.prepare(
      'DELETE FROM item_groups WHERE lost = 1 AND lost_at < datetime(\'now\', ?)'
    );

    // Item movements (chain-of-custody)
    this._stmts.insertItemMovement = this._db.prepare(`
      INSERT INTO item_movements (instance_id, group_id, move_type, item, from_type, from_id, from_slot, to_type, to_id, to_slot, amount, attributed_steam_id, attributed_name, pos_x, pos_y, pos_z)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this._stmts.getItemMovements = this._db.prepare(
      'SELECT * FROM item_movements WHERE instance_id = ? ORDER BY created_at ASC'
    );
    this._stmts.getItemMovementsByGroup = this._db.prepare(
      'SELECT * FROM item_movements WHERE group_id = ? ORDER BY created_at ASC'
    );
    this._stmts.getRecentItemMovements = this._db.prepare(
      'SELECT * FROM item_movements ORDER BY created_at DESC LIMIT ?'
    );
    this._stmts.getItemMovementsByPlayer = this._db.prepare(
      'SELECT * FROM item_movements WHERE attributed_steam_id = ? ORDER BY created_at DESC LIMIT ?'
    );
    this._stmts.getItemMovementsByLocation = this._db.prepare(
      'SELECT * FROM item_movements WHERE (from_type = ? AND from_id = ?) OR (to_type = ? AND to_id = ?) ORDER BY created_at DESC LIMIT ?'
    );
    this._stmts.purgeOldMovements = this._db.prepare(
      'DELETE FROM item_movements WHERE created_at < datetime(\'now\', ?)'
    );

    // World drops
    this._stmts.clearWorldDrops = this._db.prepare('DELETE FROM world_drops');
    this._stmts.insertWorldDrop = this._db.prepare(`
      INSERT INTO world_drops (type, actor_name, item, amount, durability, items, world_loot, placed, spawned, locked, does_spawn_loot, pos_x, pos_y, pos_z)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this._stmts.getAllWorldDrops = this._db.prepare('SELECT * FROM world_drops ORDER BY type, item');
    this._stmts.getWorldDropsByType = this._db.prepare('SELECT * FROM world_drops WHERE type = ? ORDER BY item');
    this._stmts.getWorldDropsWithItems = this._db.prepare('SELECT * FROM world_drops WHERE (item != \'\' OR items != \'[]\') ORDER BY type');

    // Quests
    this._stmts.clearQuests = this._db.prepare('DELETE FROM quests');
    this._stmts.insertQuest = this._db.prepare('INSERT INTO quests (id, type, state, data, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\'))');

    // Server settings
    this._stmts.upsertSetting = this._db.prepare('INSERT OR REPLACE INTO server_settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))');
    this._stmts.getSetting = this._db.prepare('SELECT value FROM server_settings WHERE key = ?');
    this._stmts.getAllSettings = this._db.prepare('SELECT * FROM server_settings ORDER BY key');

    // Game reference
    this._stmts.upsertGameItem = this._db.prepare('INSERT OR REPLACE INTO game_items (id, name, description, category, icon, blueprint, stack_size, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    this._stmts.getGameItem = this._db.prepare('SELECT * FROM game_items WHERE id = ?');
    this._stmts.searchGameItems = this._db.prepare('SELECT * FROM game_items WHERE name LIKE ? OR id LIKE ? LIMIT 20');

    // Snapshots
    this._stmts.insertSnapshot = this._db.prepare('INSERT INTO snapshots (type, steam_id, data) VALUES (?, ?, ?)');
    this._stmts.getLatestSnapshot = this._db.prepare('SELECT * FROM snapshots WHERE type = ? AND steam_id = ? ORDER BY created_at DESC LIMIT 1');
    this._stmts.purgeOldSnapshots = this._db.prepare('DELETE FROM snapshots WHERE created_at < datetime(\'now\', ?)');

    // Activity log
    this._stmts.insertActivity = this._db.prepare(`
      INSERT INTO activity_log (type, category, actor, actor_name, item, amount, details, pos_x, pos_y, pos_z, steam_id, source, target_name, target_steam_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this._stmts.insertActivityAt = this._db.prepare(`
      INSERT INTO activity_log (type, category, actor, actor_name, item, amount, details, pos_x, pos_y, pos_z, created_at, steam_id, source, target_name, target_steam_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this._stmts.clearActivityLog = this._db.prepare('DELETE FROM activity_log');
    this._stmts.getRecentActivity = this._db.prepare(
      'SELECT * FROM activity_log ORDER BY created_at DESC, id DESC LIMIT ?'
    );
    this._stmts.getActivityByCategory = this._db.prepare(
      'SELECT * FROM activity_log WHERE category = ? ORDER BY created_at DESC, id DESC LIMIT ?'
    );
    this._stmts.getActivityByActor = this._db.prepare(
      'SELECT * FROM activity_log WHERE actor = ? ORDER BY created_at DESC, id DESC LIMIT ?'
    );
    this._stmts.getActivitySince = this._db.prepare(
      'SELECT * FROM activity_log WHERE created_at >= ? ORDER BY created_at ASC, id ASC'
    );
    this._stmts.getActivitySinceBySource = this._db.prepare(
      'SELECT * FROM activity_log WHERE created_at >= ? AND source = ? ORDER BY created_at ASC, id ASC'
    );
    this._stmts.purgeOldActivity = this._db.prepare(
      'DELETE FROM activity_log WHERE created_at < datetime(\'now\', ?)'
    );
    this._stmts.countActivity = this._db.prepare(
      'SELECT COUNT(*) as count FROM activity_log'
    );
    this._stmts.countActivityBySource = this._db.prepare(
      'SELECT source, COUNT(*) as count FROM activity_log GROUP BY source'
    );

    // Chat log
    this._stmts.insertChat = this._db.prepare(`
      INSERT INTO chat_log (type, player_name, steam_id, message, direction, discord_user, is_admin)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this._stmts.insertChatAt = this._db.prepare(`
      INSERT INTO chat_log (type, player_name, steam_id, message, direction, discord_user, is_admin, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this._stmts.getRecentChat = this._db.prepare(
      'SELECT * FROM chat_log ORDER BY created_at DESC, id DESC LIMIT ?'
    );
    this._stmts.getChatSince = this._db.prepare(
      'SELECT * FROM chat_log WHERE created_at >= ? ORDER BY created_at ASC, id ASC'
    );
    this._stmts.clearChatLog = this._db.prepare('DELETE FROM chat_log');
    this._stmts.purgeOldChat = this._db.prepare(
      'DELETE FROM chat_log WHERE created_at < datetime(\'now\', ?)'
    );
    this._stmts.countChat = this._db.prepare(
      'SELECT COUNT(*) as count FROM chat_log'
    );

    // Meta
    this._stmts.getMeta = this._db.prepare('SELECT value FROM meta WHERE key = ?');
    this._stmts.setMeta = this._db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');

    // ── Player aliases (identity resolution) ──
    this._stmts.upsertAlias = this._db.prepare(`
      INSERT INTO player_aliases (steam_id, name, name_lower, source, first_seen, last_seen, is_current)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 1)
      ON CONFLICT(steam_id, name_lower) DO UPDATE SET
        name = excluded.name,
        last_seen = datetime('now'),
        source = CASE
          WHEN excluded.source IN ('idmap', 'connect_log') THEN excluded.source
          ELSE player_aliases.source
        END,
        is_current = excluded.is_current
    `);
    this._stmts.clearCurrentAlias = this._db.prepare(
      'UPDATE player_aliases SET is_current = 0 WHERE steam_id = ? AND source = ?'
    );
    this._stmts.lookupBySteamId = this._db.prepare(
      'SELECT * FROM player_aliases WHERE steam_id = ? ORDER BY is_current DESC, last_seen DESC'
    );
    this._stmts.lookupByName = this._db.prepare(
      'SELECT * FROM player_aliases WHERE name_lower = ? ORDER BY is_current DESC, last_seen DESC'
    );
    this._stmts.lookupByNameLike = this._db.prepare(
      'SELECT * FROM player_aliases WHERE name_lower LIKE ? ORDER BY is_current DESC, last_seen DESC LIMIT 10'
    );
    this._stmts.getAllAliases = this._db.prepare(
      'SELECT * FROM player_aliases ORDER BY steam_id, last_seen DESC'
    );
    this._stmts.getAliasStats = this._db.prepare(
      'SELECT COUNT(DISTINCT steam_id) as unique_players, COUNT(*) as total_aliases FROM player_aliases'
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Player CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Upsert a player record from parsed save data.
   * @param {string} steamId
   * @param {object} data - Flat object matching column names (from save parser)
   */
  upsertPlayer(steamId, data) {
    const params = {
      steam_id: steamId,
      name: data.name || '',
      male: data.male ? 1 : 0,
      starting_perk: data.startingPerk || 'Unknown',
      affliction: data.affliction || 0,
      char_profile: _json(data.charProfile),
      zeeks_killed: data.zeeksKilled || 0,
      headshots: data.headshots || 0,
      melee_kills: data.meleeKills || 0,
      gun_kills: data.gunKills || 0,
      blast_kills: data.blastKills || 0,
      fist_kills: data.fistKills || 0,
      takedown_kills: data.takedownKills || 0,
      vehicle_kills: data.vehicleKills || 0,
      lifetime_kills: data.lifetimeKills || 0,
      lifetime_headshots: data.lifetimeHeadshots || 0,
      lifetime_melee_kills: data.lifetimeMeleeKills || 0,
      lifetime_gun_kills: data.lifetimeGunKills || 0,
      lifetime_blast_kills: data.lifetimeBlastKills || 0,
      lifetime_fist_kills: data.lifetimeFistKills || 0,
      lifetime_takedown_kills: data.lifetimeTakedownKills || 0,
      lifetime_vehicle_kills: data.lifetimeVehicleKills || 0,
      lifetime_days_survived: data.lifetimeDaysSurvived || 0,
      has_extended_stats: data.hasExtendedStats ? 1 : 0,
      days_survived: data.daysSurvived || 0,
      times_bitten: data.timesBitten || 0,
      bites: data.bites || 0,
      fish_caught: data.fishCaught || 0,
      fish_caught_pike: data.fishCaughtPike || 0,
      health: data.health || 0,
      max_health: data.maxHealth || 100,
      hunger: data.hunger || 0,
      max_hunger: data.maxHunger || 100,
      thirst: data.thirst || 0,
      max_thirst: data.maxThirst || 100,
      stamina: data.stamina || 0,
      max_stamina: data.maxStamina || 100,
      infection: data.infection || 0,
      max_infection: data.maxInfection || 100,
      battery: data.battery || 100,
      fatigue: data.fatigue || 0,
      infection_buildup: data.infectionBuildup || 0,
      well_rested: data.wellRested || 0,
      energy: data.energy || 0,
      hood: data.hood || 0,
      hypo_handle: data.hypoHandle || 0,
      exp: data.exp || 0,
      level: data.level || 0,
      exp_current: data.expCurrent || 0,
      exp_required: data.expRequired || 0,
      skills_point: data.skillPoints || 0,
      pos_x: data.x ?? null,
      pos_y: data.y ?? null,
      pos_z: data.z ?? null,
      rotation_yaw: data.rotationYaw ?? null,
      respawn_x: data.respawnX ?? null,
      respawn_y: data.respawnY ?? null,
      respawn_z: data.respawnZ ?? null,
      cb_radio_cooldown: data.cbRadioCooldown || 0,
      day_incremented: data.dayIncremented ? 1 : 0,
      infection_timer: data.infectionTimer || 0,
      player_states: _json(data.playerStates),
      body_conditions: _json(data.bodyConditions),
      crafting_recipes: _json(data.craftingRecipes),
      building_recipes: _json(data.buildingRecipes),
      unlocked_professions: _json(data.unlockedProfessions),
      unlocked_skills: _json(data.unlockedSkills),
      skills_data: _json(data.skillTree || data.skillsData),
      inventory: _json(data.inventory),
      equipment: _json(data.equipment),
      quick_slots: _json(data.quickSlots),
      backpack_items: _json(data.backpackItems),
      backpack_data: _json(data.backpackData),
      lore: _json(data.lore),
      unique_loots: _json(data.uniqueLoots),
      crafted_uniques: _json(data.craftedUniques),
      loot_item_unique: _json(data.lootItemUnique),
      quest_data: _json(data.questData),
      mini_quest: _json(data.miniQuest),
      challenges: _json(data.challenges),
      quest_spawner_done: _json(data.questSpawnerDone),
      companion_data: _json(data.companionData),
      horses: _json(data.horses),
      extended_stats: _json(data.extendedStats),
      challenge_kill_zombies: data.challengeKillZombies || 0,
      challenge_kill_50: data.challengeKill50 || 0,
      challenge_catch_20_fish: data.challengeCatch20Fish || 0,
      challenge_regular_angler: data.challengeRegularAngler || 0,
      challenge_kill_zombie_bear: data.challengeKillZombieBear || 0,
      challenge_9_squares: data.challenge9Squares || 0,
      challenge_craft_firearm: data.challengeCraftFirearm || 0,
      challenge_craft_furnace: data.challengeCraftFurnace || 0,
      challenge_craft_melee_bench: data.challengeCraftMeleeBench || 0,
      challenge_craft_melee_weapon: data.challengeCraftMeleeWeapon || 0,
      challenge_craft_rain_collector: data.challengeCraftRainCollector || 0,
      challenge_craft_tablesaw: data.challengeCraftTablesaw || 0,
      challenge_craft_treatment: data.challengeCraftTreatment || 0,
      challenge_craft_weapons_bench: data.challengeCraftWeaponsBench || 0,
      challenge_craft_workbench: data.challengeCraftWorkbench || 0,
      challenge_find_dog: data.challengeFindDog || 0,
      challenge_find_heli: data.challengeFindHeli || 0,
      challenge_lockpick_suv: data.challengeLockpickSUV || 0,
      challenge_repair_radio: data.challengeRepairRadio || 0,
      custom_data: _json(data.customData),
    };

    this._stmts.upsertPlayer.run(params);

    // Auto-register alias when a name is available
    if (data.name && /^\d{17}$/.test(steamId)) {
      this.registerAlias(steamId, data.name, 'save');
    }
  }

  getPlayer(steamId) {
    const row = this._stmts.getPlayer.get(steamId);
    return row ? _parsePlayerRow(row) : null;
  }

  getAllPlayers() {
    return this._stmts.getAllPlayers.all().map(_parsePlayerRow);
  }

  getOnlinePlayers() {
    return this._stmts.getOnlinePlayers.all().map(_parsePlayerRow);
  }

  setPlayerOnline(steamId, online) {
    this._stmts.setPlayerOnline.run(online ? 1 : 0, steamId);
  }

  setAllPlayersOffline() {
    this._stmts.setAllOffline.run();
  }

  /** Update kill tracker JSON for a player. */
  updateKillTracker(steamId, killData) {
    this._db.prepare('UPDATE players SET kill_tracker = ?, updated_at = datetime(\'now\') WHERE steam_id = ?')
      .run(JSON.stringify(killData), steamId);
  }

  /** Update name and name history. */
  updatePlayerName(steamId, name, nameHistory) {
    this._db.prepare('UPDATE players SET name = ?, name_history = ?, updated_at = datetime(\'now\') WHERE steam_id = ?')
      .run(name, JSON.stringify(nameHistory || []), steamId);
  }

  /**
   * Upsert full player log stats (DB-first — called by player-stats.js on every record call).
   * Creates the player row if it doesn't exist.
   */
  upsertFullLogStats(steamId, data) {
    this._stmts.upsertPlayerLogStats.run({
      steam_id: steamId,
      name: data.name || '',
      log_deaths: data.deaths || 0,
      log_pvp_kills: data.pvpKills || 0,
      log_pvp_deaths: data.pvpDeaths || 0,
      log_builds: data.builds || 0,
      log_loots: data.containersLooted || 0,
      log_damage_taken: data.damageTakenTotal || 0,
      log_raids_out: data.raidsOut || 0,
      log_raids_in: data.raidsIn || 0,
      log_connects: data.connects || 0,
      log_disconnects: data.disconnects || 0,
      log_admin_access: data.adminAccess || 0,
      log_destroyed_out: data.destroyedOut || 0,
      log_destroyed_in: data.destroyedIn || 0,
      log_build_items: JSON.stringify(data.buildItems || {}),
      log_killed_by: JSON.stringify(data.killedBy || {}),
      log_damage_detail: JSON.stringify(data.damageTaken || {}),
      log_cheat_flags: JSON.stringify(data.cheatFlags || []),
      log_last_event: data.lastEvent || null,
    });
  }

  /**
   * Get all player log stats from DB (for loading into PlayerStats cache on startup).
   * Returns an array of objects matching the DB columns.
   */
  getAllPlayerLogStats() {
    return this._stmts.getAllPlayerLogStats.all();
  }

  /**
   * Upsert full playtime data (DB-first — called by playtime-tracker.js).
   * Creates the player row if it doesn't exist.
   */
  upsertFullPlaytime(steamId, data) {
    this._stmts.upsertPlayerPlaytime.run({
      steam_id: steamId,
      name: data.name || '',
      playtime_seconds: Math.floor((data.totalMs || 0) / 1000),
      session_count: data.sessions || 0,
      playtime_first_seen: data.firstSeen || null,
      playtime_last_login: data.lastLogin || null,
      playtime_last_seen: data.lastSeen || null,
    });
  }

  /**
   * Get all player playtime from DB (for loading into PlaytimeTracker cache on startup).
   */
  getAllPlayerPlaytime() {
    return this._stmts.getAllPlayerPlaytime.all();
  }

  /**
   * Set a server peak value (e.g. all_time_peak, today_peak, unique_today).
   */
  setServerPeak(key, value) {
    const stored = (value !== null && typeof value === 'object')
      ? JSON.stringify(value)
      : String(value ?? '');
    this._stmts.setServerPeak.run(key, stored);
  }

  /**
   * Get a server peak value.
   */
  getServerPeak(key) {
    const r = this._stmts.getServerPeak.get(key);
    return r ? r.value : null;
  }

  /**
   * Get all server peak values as a flat object.
   */
  getAllServerPeaks() {
    const rows = this._stmts.getAllServerPeaks.all();
    const result = {};
    for (const r of rows) result[r.key] = r.value;
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Player identity / alias resolution
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a name ↔ SteamID association from any data source.
   * This is the single entry point for building the identity graph.
   *
   * @param {string} steamId - 17-digit SteamID64
   * @param {string} name    - Player display name
   * @param {string} source  - Origin: 'idmap', 'save', 'connect_log', 'log', 'playtime', 'manual'
   */
  registerAlias(steamId, name, source = '') {
    if (!steamId || !name || !/^\d{17}$/.test(steamId)) return;
    const nameLower = name.toLowerCase().trim();
    if (!nameLower) return;

    // Mark previous aliases from this source as non-current
    this._stmts.clearCurrentAlias.run(steamId, source);
    // Upsert the new alias
    this._stmts.upsertAlias.run(steamId, name.trim(), nameLower, source);
  }

  /**
   * Bulk-register aliases from a parsed PlayerIDMapped.txt.
   * @param {Array<{steamId: string, name: string}>} entries
   */
  importIdMap(entries) {
    const tx = this._db.transaction((list) => {
      for (const { steamId, name } of list) {
        this.registerAlias(steamId, name, 'idmap');
      }
    });
    tx(entries);
  }

  /**
   * Bulk-register aliases from parsed PlayerConnectedLog.txt.
   * @param {Array<{steamId: string, name: string}>} entries
   */
  importConnectLog(entries) {
    const tx = this._db.transaction((list) => {
      for (const { steamId, name } of list) {
        this.registerAlias(steamId, name, 'connect_log');
      }
    });
    tx(entries);
  }

  /**
   * Register aliases from save parser output (keyed by SteamID, name from idMap).
   * @param {Map<string, object>} players - steamId → playerData (with .name if injected)
   */
  importFromSave(players) {
    const tx = this._db.transaction(() => {
      for (const [steamId, data] of players) {
        if (data.name) this.registerAlias(steamId, data.name, 'save');
      }
    });
    tx();
  }

  /**
   * Resolve a player name to a SteamID64.
   * Returns the best match: most recent, highest-priority source.
   *
   * @param {string} name - Player name (case-insensitive)
   * @returns {{ steamId: string, name: string, source: string, isCurrent: boolean } | null}
   */
  resolveNameToSteamId(name) {
    if (!name) return null;
    const nameLower = name.toLowerCase().trim();

    // If it's already a SteamID, return directly
    if (/^\d{17}$/.test(name)) return { steamId: name, name, source: 'direct', isCurrent: true };

    const rows = this._stmts.lookupByName.all(nameLower);
    if (rows.length === 0) return null;

    // Prefer is_current=1 entries, then most recently seen
    return {
      steamId: rows[0].steam_id,
      name: rows[0].name,
      source: rows[0].source,
      isCurrent: !!rows[0].is_current,
    };
  }

  /**
   * Resolve a SteamID to the best current display name.
   *
   * Priority: idmap > connect_log > save > playtime > log
   *
   * @param {string} steamId
   * @returns {string} Display name, or the steamId itself as fallback
   */
  resolveSteamIdToName(steamId) {
    if (!steamId) return steamId;

    const rows = this._stmts.lookupBySteamId.all(steamId);
    if (rows.length === 0) return steamId;

    // Source priority for "best name"
    const priority = { idmap: 5, connect_log: 4, save: 3, playtime: 2, log: 1, manual: 0 };

    // Among is_current=1 entries, pick the highest-priority source
    const current = rows.filter(r => r.is_current);
    if (current.length > 0) {
      current.sort((a, b) => (priority[b.source] || 0) - (priority[a.source] || 0));
      return current[0].name;
    }

    // Fallback: most recently seen alias
    return rows[0].name;
  }

  /**
   * Get all known aliases for a SteamID.
   * @param {string} steamId
   * @returns {Array<{ name: string, source: string, firstSeen: string, lastSeen: string, isCurrent: boolean }>}
   */
  getPlayerAliases(steamId) {
    return this._stmts.lookupBySteamId.all(steamId).map(r => ({
      name: r.name,
      source: r.source,
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
      isCurrent: !!r.is_current,
    }));
  }

  /**
   * Search for players by partial name match.
   * @param {string} query - Partial name (case-insensitive)
   * @returns {Array<{ steamId: string, name: string, source: string }>}
   */
  searchPlayersByName(query) {
    if (!query) return [];
    const rows = this._stmts.lookupByNameLike.all(`%${query.toLowerCase().trim()}%`);
    // Deduplicate by steamId, keeping the best for each
    const seen = new Map();
    for (const r of rows) {
      if (!seen.has(r.steam_id) || r.is_current) {
        seen.set(r.steam_id, { steamId: r.steam_id, name: r.name, source: r.source });
      }
    }
    return [...seen.values()];
  }

  /**
   * Get summary stats about the alias table.
   * @returns {{ uniquePlayers: number, totalAliases: number }}
   */
  getAliasStats() {
    const row = this._stmts.getAliasStats.get();
    return { uniquePlayers: row?.unique_players || 0, totalAliases: row?.total_aliases || 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Leaderboards
  // ═══════════════════════════════════════════════════════════════════════════

  topKillers(limit = 10) { return this._stmts.topKillers.all(limit); }
  topPlaytime(limit = 10) { return this._stmts.topPlaytime.all(limit); }
  topSurvival(limit = 10) { return this._stmts.topSurvival.all(limit); }
  topFish(limit = 10) { return this._stmts.topFish.all(limit); }
  topBitten(limit = 10) { return this._stmts.topBitten.all(limit); }
  topPvp(limit = 10) { return this._stmts.topPvp.all(limit); }

  /** Aggregate server totals. */
  getServerTotals() {
    return this._db.prepare(`
      SELECT
        COUNT(*) as total_players,
        SUM(CASE WHEN online = 1 THEN 1 ELSE 0 END) as online_players,
        SUM(lifetime_kills) as total_kills,
        SUM(lifetime_headshots) as total_headshots,
        SUM(lifetime_days_survived) as total_days,
        SUM(log_deaths) as total_deaths,
        SUM(log_pvp_kills) as total_pvp_kills,
        SUM(log_builds) as total_builds,
        SUM(log_loots) as total_loots,
        SUM(fish_caught) as total_fish,
        SUM(playtime_seconds) as total_playtime
      FROM players
    `).get();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Clans
  // ═══════════════════════════════════════════════════════════════════════════

  upsertClan(name, members) {
    this._stmts.upsertClan.run(name);
    this._stmts.deleteClanMembers.run(name);
    for (const m of members) {
      this._stmts.insertClanMember.run(name, m.steamId, m.name, m.rank, m.canInvite ? 1 : 0, m.canKick ? 1 : 0);
    }
  }

  getAllClans() {
    const clans = this._stmts.getAllClans.all();
    return clans.map(c => ({
      ...c,
      members: this._stmts.getClanMembers.all(c.name),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  World state
  // ═══════════════════════════════════════════════════════════════════════════

  setWorldState(key, value) {
    const stored = (value !== null && typeof value === 'object') ? JSON.stringify(value) : String(value);
    this._stmts.setWorldState.run(key, stored);
  }
  getWorldState(key) { const r = this._stmts.getWorldState.get(key); return r ? r.value : null; }
  getAllWorldState() {
    const rows = this._stmts.getAllWorldState.all();
    const result = {};
    for (const r of rows) result[r.key] = r.value;
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Structures
  // ═══════════════════════════════════════════════════════════════════════════

  replaceStructures(structures) {
    const insert = this._db.transaction((items) => {
      this._stmts.clearStructures.run();
      for (const s of items) {
        this._stmts.insertStructure.run(
          s.actorClass, s.displayName || '', s.ownerSteamId || '',
          s.x ?? null, s.y ?? null, s.z ?? null,
          s.currentHealth || 0, s.maxHealth || 0, s.upgradeLevel || 0,
          s.attachedToTrailer ? 1 : 0, _json(s.inventory), s.noSpawn ? 1 : 0,
          s.extraData || ''
        );
      }
    });
    insert(structures);
  }

  getStructures() { return this._stmts.getStructures.all(); }
  getStructuresByOwner(steamId) { return this._stmts.getStructuresByOwner.all(steamId); }
  getStructureCounts() { return this._stmts.countStructuresByOwner.all(); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Vehicles
  // ═══════════════════════════════════════════════════════════════════════════

  replaceVehicles(vehicles) {
    const insert = this._db.transaction((items) => {
      this._stmts.clearVehicles.run();
      for (const v of items) {
        this._stmts.insertVehicle.run(
          v.class, v.displayName || '',
          v.x ?? null, v.y ?? null, v.z ?? null,
          v.health || 0, v.maxHealth || 0, v.fuel || 0,
          _json(v.inventory), _json(v.upgrades), _json(v.extra)
        );
      }
    });
    insert(vehicles);
  }

  getAllVehicles() { return this._stmts.getAllVehicles.all(); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Companions
  // ═══════════════════════════════════════════════════════════════════════════

  replaceCompanions(companions) {
    const insert = this._db.transaction((items) => {
      this._stmts.clearCompanions.run();
      for (const c of items) {
        this._stmts.insertCompanion.run(
          c.type, c.actorName,
          c.ownerSteamId || '',
          c.x ?? null, c.y ?? null, c.z ?? null,
          c.health || 0, _json(c.extra)
        );
      }
    });
    insert(companions);
  }

  getAllCompanions() { return this._stmts.getAllCompanions.all(); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  World horses
  // ═══════════════════════════════════════════════════════════════════════════

  replaceWorldHorses(horses) {
    const insert = this._db.transaction((items) => {
      this._stmts.clearWorldHorses.run();
      for (const h of items) {
        this._stmts.insertWorldHorse.run(
          h.actorName || h.class || '', h.class || '', h.displayName || '', h.name || '',
          h.ownerSteamId || '',
          h.x ?? null, h.y ?? null, h.z ?? null,
          h.health || 0, h.maxHealth || 0, h.energy || 0, h.stamina || 0,
          _json(h.saddleInventory), _json(h.inventory), _json(h.extra)
        );
      }
    });
    insert(horses);
  }

  getAllWorldHorses() { return this._stmts.getAllWorldHorses.all(); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Dead bodies
  // ═══════════════════════════════════════════════════════════════════════════

  replaceDeadBodies(bodies) {
    const insert = this._db.transaction((items) => {
      this._stmts.clearDeadBodies.run();
      for (const b of items) {
        this._stmts.insertDeadBody.run(
          b.actorName, b.x ?? null, b.y ?? null, b.z ?? null
        );
      }
    });
    insert(bodies);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Containers
  // ═══════════════════════════════════════════════════════════════════════════

  replaceContainers(containers) {
    const insert = this._db.transaction((items) => {
      this._stmts.clearContainers.run();
      for (const c of items) {
        const extra = {};
        if (c.hackCoolDown != null) extra.hackCoolDown = c.hackCoolDown;
        if (c.destroyTime != null) extra.destroyTime = c.destroyTime;
        if (c.extraFloats) extra.extraFloats = c.extraFloats;
        if (c.extraBools) extra.extraBools = c.extraBools;
        this._stmts.insertContainer.run(
          c.actorName,
          JSON.stringify(c.items || []),
          JSON.stringify(c.quickSlots || []),
          c.locked ? 1 : 0,
          c.doesSpawnLoot ? 1 : 0,
          c.alarmOff ? 1 : 0,
          JSON.stringify(c.craftingContent || []),
          c.x ?? null, c.y ?? null, c.z ?? null,
          JSON.stringify(extra)
        );
      }
    });
    insert(containers);
  }

  getAllContainers() { return this._stmts.getAllContainers.all(); }
  getContainersWithItems() { return this._stmts.getContainersWithItems.all(); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Loot actors
  // ═══════════════════════════════════════════════════════════════════════════

  replaceLootActors(lootActors) {
    const insert = this._db.transaction((items) => {
      this._stmts.clearLootActors.run();
      for (const la of items) {
        this._stmts.insertLootActor.run(
          la.name, la.type, la.x ?? null, la.y ?? null, la.z ?? null, JSON.stringify(la.items)
        );
      }
    });
    insert(lootActors);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Item instances (fingerprint tracking)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new item instance and return its row id.
   * @param {object} item - { fingerprint, item, durability, ammo, attachments, cap, maxDur, locationType, locationId, locationSlot, x, y, z, amount }
   * @returns {number} The auto-incremented ID of the new instance
   */
  /**
   * Create a new item instance and return its row id.
   * @param {object} item - { fingerprint, item, durability, ammo, attachments, cap, maxDur, locationType, locationId, locationSlot, x, y, z, amount, groupId }
   * @returns {number} The auto-incremented ID of the new instance
   */
  createItemInstance(item) {
    const result = this._stmts.insertItemInstance.run(
      item.fingerprint, item.item, item.durability || 0, item.ammo || 0,
      _json(item.attachments), item.cap || 0, item.maxDur || 0,
      item.locationType, item.locationId || '', item.locationSlot || '',
      item.x ?? null, item.y ?? null, item.z ?? null,
      item.amount || 1, item.groupId ?? null
    );
    return result.lastInsertRowid;
  }

  /**
   * Move an item instance to a new location and record the movement.
   * @param {number} instanceId - item_instances.id
   * @param {object} to - { locationType, locationId, locationSlot, x, y, z, amount, groupId }
   * @param {object} [attribution] - { steamId, name } of the player who caused the move
   * @param {string} [moveType='move'] - movement type
   */
  moveItemInstance(instanceId, to, attribution, moveType = 'move') {
    const old = this._stmts.findItemInstanceById.get(instanceId);
    if (!old) return;

    // Update location
    this._stmts.updateItemInstanceLocation.run(
      to.locationType, to.locationId || '', to.locationSlot || '',
      to.x ?? null, to.y ?? null, to.z ?? null,
      to.amount ?? old.amount, to.groupId ?? null,
      instanceId
    );

    // Record movement
    this._stmts.insertItemMovement.run(
      instanceId, null, moveType, old.item,
      old.location_type, old.location_id, old.location_slot,
      to.locationType, to.locationId || '', to.locationSlot || '',
      to.amount ?? old.amount,
      attribution?.steamId || '', attribution?.name || '',
      to.x ?? null, to.y ?? null, to.z ?? null
    );
  }

  /**
   * Mark an item instance as lost (no longer found in save data).
   */
  markItemLost(instanceId) {
    this._stmts.markItemInstanceLost.run(instanceId);
  }

  /**
   * Mark all active instances as lost (used before reconciliation).
   */
  markAllItemsLost() {
    this._stmts.markAllItemInstancesLost.run();
  }

  /**
   * Touch an instance (update last_seen, clear lost flag).
   */
  touchItemInstance(instanceId) {
    this._stmts.touchItemInstance.run(instanceId);
  }

  findItemByFingerprint(fingerprint) {
    return this._stmts.findItemInstanceByFingerprint.get(fingerprint);
  }

  findItemsByFingerprint(fingerprint) {
    return this._stmts.findItemInstancesByFingerprint.all(fingerprint);
  }

  getItemInstance(id) {
    return this._stmts.findItemInstanceById.get(id);
  }

  getActiveItemInstances() {
    return this._stmts.getActiveItemInstances.all();
  }

  getItemInstancesByItem(item) {
    return this._stmts.getItemInstancesByItem.all(item);
  }

  getItemInstancesByLocation(locationType, locationId) {
    return this._stmts.getItemInstancesByLocation.all(locationType, locationId);
  }

  getItemInstanceCount() {
    return this._stmts.getItemInstanceCount.get().count;
  }

  searchItemInstances(query, limit = 50) {
    return this._stmts.searchItemInstances.all(`%${query}%`, limit);
  }

  purgeOldLostItems(age = '-30 days') {
    return this._stmts.purgeOldLostItems.run(age);
  }

  getItemInstancesByGroup(groupId) {
    return this._stmts.getItemInstancesByGroup.all(groupId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Item groups (fungible item tracking)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create or update an item group at a specific location.
   * If a group with the same fingerprint+location already exists (active), update its quantity.
   * Otherwise create a new group.
   * @returns {{ id: number, created: boolean }}
   */
  upsertItemGroup(group) {
    const existing = this._stmts.findActiveGroupByLocation.get(
      group.fingerprint, group.locationType, group.locationId || '', group.locationSlot || ''
    );
    if (existing) {
      this._stmts.updateItemGroupQuantity.run(group.quantity, existing.id);
      return { id: existing.id, created: false };
    }
    const result = this._stmts.insertItemGroup.run(
      group.fingerprint, group.item, group.durability || 0, group.ammo || 0,
      _json(group.attachments), group.cap || 0, group.maxDur || 0,
      group.locationType, group.locationId || '', group.locationSlot || '',
      group.x ?? null, group.y ?? null, group.z ?? null,
      group.quantity || 1, group.stackSize || 1
    );
    return { id: Number(result.lastInsertRowid), created: true };
  }

  updateItemGroupQuantity(groupId, quantity) {
    this._stmts.updateItemGroupQuantity.run(quantity, groupId);
  }

  updateItemGroupLocation(groupId, to) {
    this._stmts.updateItemGroupLocation.run(
      to.locationType, to.locationId || '', to.locationSlot || '',
      to.x ?? null, to.y ?? null, to.z ?? null,
      to.quantity ?? 1, groupId
    );
  }

  markItemGroupLost(groupId) {
    this._stmts.markItemGroupLost.run(groupId);
  }

  markAllItemGroupsLost() {
    this._stmts.markAllItemGroupsLost.run();
  }

  touchItemGroup(groupId) {
    this._stmts.touchItemGroup.run(groupId);
  }

  findActiveGroupByLocation(fingerprint, locationType, locationId, locationSlot) {
    return this._stmts.findActiveGroupByLocation.get(fingerprint, locationType, locationId || '', locationSlot || '');
  }

  findActiveGroupsByFingerprint(fingerprint) {
    return this._stmts.findActiveGroupsByFingerprint.all(fingerprint);
  }

  getItemGroup(id) {
    return this._stmts.findItemGroupById.get(id);
  }

  getActiveItemGroups() {
    return this._stmts.getActiveItemGroups.all();
  }

  getItemGroupsByItem(item) {
    return this._stmts.getItemGroupsByItem.all(item);
  }

  getItemGroupsByLocation(locationType, locationId) {
    return this._stmts.getItemGroupsByLocation.all(locationType, locationId);
  }

  getItemGroupCount() {
    return this._stmts.getItemGroupCount.get().count;
  }

  searchItemGroups(query, limit = 50) {
    return this._stmts.searchItemGroups.all(`%${query}%`, limit);
  }

  purgeOldLostGroups(age = '-30 days') {
    return this._stmts.purgeOldLostGroups.run(age);
  }

  /**
   * Record a group-level movement (split, merge, transfer, adjust).
   * @param {object} opts
   * @param {number} [opts.instanceId] - individual instance (for splits)
   * @param {number} [opts.groupId] - group id
   * @param {string} opts.moveType - 'group_split', 'group_merge', 'group_transfer', 'group_adjust'
   * @param {string} opts.item - item name
   * @param {object} opts.from - { type, id, slot }
   * @param {object} opts.to - { type, id, slot }
   * @param {number} opts.amount - how many items moved
   * @param {object} [opts.attribution] - { steamId, name }
   * @param {{ x?: number, y?: number, z?: number }} [opts.pos] - position
   */
  recordGroupMovement(opts) {
    this._stmts.insertItemMovement.run(
      opts.instanceId ?? null, opts.groupId ?? null, opts.moveType,
      opts.item,
      opts.from?.type || '', opts.from?.id || '', opts.from?.slot || '',
      opts.to?.type || '', opts.to?.id || '', opts.to?.slot || '',
      opts.amount || 1,
      opts.attribution?.steamId || '', opts.attribution?.name || '',
      opts.pos?.x ?? null, opts.pos?.y ?? null, opts.pos?.z ?? null
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Item movements (chain-of-custody)
  // ═══════════════════════════════════════════════════════════════════════════

  getItemMovements(instanceId) {
    return this._stmts.getItemMovements.all(instanceId);
  }

  getItemMovementsByGroup(groupId) {
    return this._stmts.getItemMovementsByGroup.all(groupId);
  }

  getRecentItemMovements(limit = 50) {
    return this._stmts.getRecentItemMovements.all(limit);
  }

  getItemMovementsByPlayer(steamId, limit = 50) {
    return this._stmts.getItemMovementsByPlayer.all(steamId, limit);
  }

  getItemMovementsByLocation(locationType, locationId, limit = 50) {
    return this._stmts.getItemMovementsByLocation.all(locationType, locationId, locationType, locationId, limit);
  }

  purgeOldMovements(age = '-30 days') {
    return this._stmts.purgeOldMovements.run(age);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  World drops (LODPickups, dropped backpacks, global containers)
  // ═══════════════════════════════════════════════════════════════════════════

  replaceWorldDrops(drops) {
    const insert = this._db.transaction((items) => {
      this._stmts.clearWorldDrops.run();
      for (const d of items) {
        this._stmts.insertWorldDrop.run(
          d.type, d.actorName || '', d.item || '', d.amount || 0,
          d.durability || 0, _json(d.items),
          d.worldLoot ? 1 : 0, d.placed ? 1 : 0, d.spawned ? 1 : 0,
          d.locked ? 1 : 0, d.doesSpawnLoot ? 1 : 0,
          d.x ?? null, d.y ?? null, d.z ?? null
        );
      }
    });
    insert(drops);
  }

  getAllWorldDrops() { return this._stmts.getAllWorldDrops.all(); }
  getWorldDropsByType(type) { return this._stmts.getWorldDropsByType.all(type); }
  getWorldDropsWithItems() { return this._stmts.getWorldDropsWithItems.all(); }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Quests
  // ═══════════════════════════════════════════════════════════════════════════

  replaceQuests(quests) {
    const insert = this._db.transaction((items) => {
      this._stmts.clearQuests.run();
      for (const q of items) {
        this._stmts.insertQuest.run(
          q.id, q.type, q.state, JSON.stringify(q.data)
        );
      }
    });
    insert(quests);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Server settings
  // ═══════════════════════════════════════════════════════════════════════════

  upsertSettings(settings) {
    const upsert = this._db.transaction((obj) => {
      for (const [key, value] of Object.entries(obj)) {
        this._stmts.upsertSetting.run(key, String(value));
      }
    });
    upsert(settings);
  }

  getSetting(key) { const r = this._stmts.getSetting.get(key); return r ? r.value : null; }
  getAllSettings() {
    const rows = this._stmts.getAllSettings.all();
    const result = {};
    for (const r of rows) result[r.key] = r.value;
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Snapshots (for weekly/daily deltas)
  // ═══════════════════════════════════════════════════════════════════════════

  createSnapshot(type, steamId, data) {
    this._stmts.insertSnapshot.run(type, steamId, JSON.stringify(data));
  }

  getLatestSnapshot(type, steamId) {
    const row = this._stmts.getLatestSnapshot.get(type, steamId);
    return row ? { ...row, data: JSON.parse(row.data || '{}') } : null;
  }

  purgeSnapshots(olderThan) {
    this._stmts.purgeOldSnapshots.run(olderThan);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Activity log
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Insert a single activity log entry.
   * @param {object} entry - { type, category, actor, actorName, item, amount, details, x, y, z, steamId, source, targetName, targetSteamId }
   */
  insertActivity(entry) {
    this._stmts.insertActivity.run(
      entry.type, entry.category || '', entry.actor || '', entry.actorName || '',
      entry.item || '', entry.amount || 0, JSON.stringify(entry.details || {}),
      entry.x ?? null, entry.y ?? null, entry.z ?? null,
      entry.steamId || '', entry.source || 'save', entry.targetName || '', entry.targetSteamId || ''
    );
  }

  /**
   * Insert multiple activity entries in a single transaction.
   * @param {Array<object>} entries
   */
  insertActivities(entries) {
    if (!entries || entries.length === 0) return;
    const tx = this._db.transaction((list) => {
      for (const entry of list) {
        this._stmts.insertActivity.run(
          entry.type, entry.category || '', entry.actor || '', entry.actorName || '',
          entry.item || '', entry.amount || 0, JSON.stringify(entry.details || {}),
          entry.x ?? null, entry.y ?? null, entry.z ?? null,
          entry.steamId || '', entry.source || 'save', entry.targetName || '', entry.targetSteamId || ''
        );
      }
    });
    tx(entries);
  }

  /**
   * Insert multiple activity entries with explicit timestamps (for backfill).
   * Each entry must have a `createdAt` ISO string.
   * @param {Array<object>} entries
   */
  insertActivitiesAt(entries) {
    if (!entries || entries.length === 0) return;
    const tx = this._db.transaction((list) => {
      for (const entry of list) {
        this._stmts.insertActivityAt.run(
          entry.type, entry.category || '', entry.actor || '', entry.actorName || '',
          entry.item || '', entry.amount || 0, JSON.stringify(entry.details || {}),
          entry.x ?? null, entry.y ?? null, entry.z ?? null,
          entry.createdAt,
          entry.steamId || '', entry.source || 'save', entry.targetName || '', entry.targetSteamId || ''
        );
      }
    });
    tx(entries);
  }

  /** Delete all activity log entries (used by setup --fix/--backfill). */
  clearActivityLog() {
    this._stmts.clearActivityLog.run();
  }

  /** Get the most recent N activity entries. */
  getRecentActivity(limit = 50) {
    return this._stmts.getRecentActivity.all(limit).map(_parseActivityRow);
  }

  /** Get recent activity for a specific category. */
  getActivityByCategory(category, limit = 50) {
    return this._stmts.getActivityByCategory.all(category, limit).map(_parseActivityRow);
  }

  /** Get recent activity for a specific actor (container name, steam ID, etc.). */
  getActivityByActor(actor, limit = 50) {
    return this._stmts.getActivityByActor.all(actor, limit).map(_parseActivityRow);
  }

  /** Get all activity since a given ISO timestamp. */
  getActivitySince(isoTimestamp) {
    return this._stmts.getActivitySince.all(isoTimestamp).map(_parseActivityRow);
  }

  /** Purge old activity entries (e.g. '-30 days'). */
  purgeOldActivity(olderThan) {
    this._stmts.purgeOldActivity.run(olderThan);
  }

  /** Count total activity entries. */
  getActivityCount() {
    const row = this._stmts.countActivity.get();
    return row?.count || 0;
  }

  /** Get activity counts grouped by source. */
  getActivityCountBySource() {
    return this._stmts.countActivityBySource.all();
  }

  /** Get all activity since a given ISO timestamp, filtered by source. */
  getActivitySinceBySource(isoTimestamp, source) {
    return this._stmts.getActivitySinceBySource.all(isoTimestamp, source).map(_parseActivityRow);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Chat log
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Insert a single chat log entry.
   * @param {object} entry - { type, playerName, steamId, message, direction, discordUser, isAdmin }
   */
  insertChat(entry) {
    this._stmts.insertChat.run(
      entry.type, entry.playerName || '', entry.steamId || '',
      entry.message || '', entry.direction || 'game',
      entry.discordUser || '', entry.isAdmin ? 1 : 0
    );
  }

  /**
   * Insert a chat entry with explicit timestamp (for backfill).
   * @param {object} entry - includes createdAt ISO string
   */
  insertChatAt(entry) {
    this._stmts.insertChatAt.run(
      entry.type, entry.playerName || '', entry.steamId || '',
      entry.message || '', entry.direction || 'game',
      entry.discordUser || '', entry.isAdmin ? 1 : 0,
      entry.createdAt
    );
  }

  /** Get the most recent N chat entries. */
  getRecentChat(limit = 50) {
    return this._stmts.getRecentChat.all(limit);
  }

  /** Get all chat since a given ISO timestamp. */
  getChatSince(isoTimestamp) {
    return this._stmts.getChatSince.all(isoTimestamp);
  }

  /** Delete all chat log entries. */
  clearChatLog() {
    this._stmts.clearChatLog.run();
  }

  /** Purge old chat entries (e.g. '-30 days'). */
  purgeOldChat(olderThan) {
    this._stmts.purgeOldChat.run(olderThan);
  }

  /** Count total chat entries. */
  getChatCount() {
    const row = this._stmts.countChat.get();
    return row?.count || 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Bulk operations (for save-to-DB sync)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Bulk-upsert all players from a parsed save file.
   * Runs in a single transaction for performance (~1ms for 50 players).
   * @param {Map<string, object>} players - steamId → parsed player data
   */
  bulkUpsertPlayers(players) {
    const tx = this._db.transaction((entries) => {
      for (const [steamId, data] of entries) {
        this.upsertPlayer(steamId, data);
      }
    });
    tx([...players.entries()]);
  }

  /**
   * Full save sync: replace all player data, structures, vehicles, etc.
   * Everything in one transaction for atomicity.
   */
  syncFromSave(parsed) {
    const tx = this._db.transaction(() => {
      // Players
      if (parsed.players) {
        for (const [steamId, data] of parsed.players) {
          this.upsertPlayer(steamId, data);
        }
      }

      // World state
      if (parsed.worldState) {
        for (const [key, value] of Object.entries(parsed.worldState)) {
          const stored = (value !== null && typeof value === 'object') ? JSON.stringify(value) : String(value);
          this._stmts.setWorldState.run(key, stored);
        }
      }

      // Structures
      if (parsed.structures) {
        this._stmts.clearStructures.run();
        for (const s of parsed.structures) {
          this._stmts.insertStructure.run(
            s.actorClass, s.displayName || '', s.ownerSteamId || '',
            s.x ?? null, s.y ?? null, s.z ?? null,
            s.currentHealth || 0, s.maxHealth || 0, s.upgradeLevel || 0,
            s.attachedToTrailer ? 1 : 0, _json(s.inventory), s.noSpawn ? 1 : 0,
            s.extraData || ''
          );
        }
      }

      // Vehicles
      if (parsed.vehicles) {
        this._stmts.clearVehicles.run();
        for (const v of parsed.vehicles) {
          this._stmts.insertVehicle.run(
            v.class, v.displayName || '',
            v.x ?? null, v.y ?? null, v.z ?? null,
            v.health || 0, v.maxHealth || 0, v.fuel || 0,
            _json(v.inventory), _json(v.upgrades), _json(v.extra)
          );
        }
      }

      // Companions
      if (parsed.companions) {
        this._stmts.clearCompanions.run();
        for (const c of parsed.companions) {
          this._stmts.insertCompanion.run(
            c.type, c.actorName, c.ownerSteamId || '',
            c.x ?? null, c.y ?? null, c.z ?? null,
            c.health || 0, _json(c.extra)
          );
        }
      }

      // Clans
      if (parsed.clans) {
        for (const clan of parsed.clans) {
          this._stmts.upsertClan.run(clan.name);
          this._stmts.deleteClanMembers.run(clan.name);
          for (const m of clan.members) {
            this._stmts.insertClanMember.run(clan.name, m.steamId, m.name, m.rank, m.canInvite ? 1 : 0, m.canKick ? 1 : 0);
          }
        }
      }

      // Server settings
      if (parsed.serverSettings) {
        for (const [key, value] of Object.entries(parsed.serverSettings)) {
          this._stmts.upsertSetting.run(key, String(value));
        }
      }
    });

    tx();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Game reference data seeding
  // ═══════════════════════════════════════════════════════════════════════════

  seedGameItems(items) {
    const tx = this._db.transaction((list) => {
      for (const item of list) {
        this._stmts.upsertGameItem.run(
          item.id, item.name, item.description || '', item.category || '',
          item.icon || '', item.blueprint || '', item.stackSize || 1,
          _json(item.extra)
        );
      }
    });
    tx(items);
  }

  getGameItem(id) { return this._stmts.getGameItem.get(id); }
  searchGameItems(query) { const q = `%${query}%`; return this._stmts.searchGameItems.all(q, q); }

  seedGameProfessions(professions) {
    const stmt = this._db.prepare('INSERT OR REPLACE INTO game_professions (id, enum_value, enum_index, perk, description, affliction, skills) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const tx = this._db.transaction((list) => {
      for (const p of list) {
        stmt.run(p.id, p.enumValue || '', p.enumIndex || 0, p.perk || '', p.description || '', p.affliction || '', _json(p.skills));
      }
    });
    tx(professions);
  }

  seedGameAfflictions(afflictions) {
    const stmt = this._db.prepare('INSERT OR REPLACE INTO game_afflictions (idx, name, description, icon) VALUES (?, ?, ?, ?)');
    const tx = this._db.transaction((list) => {
      for (const a of list) {
        stmt.run(a.idx, a.name, a.description || '', a.icon || '');
      }
    });
    tx(afflictions);
  }

  seedGameSkills(skills) {
    const stmt = this._db.prepare('INSERT OR REPLACE INTO game_skills (id, name, description, effect, category, icon) VALUES (?, ?, ?, ?, ?, ?)');
    const tx = this._db.transaction((list) => {
      for (const s of list) {
        stmt.run(s.id, s.name, s.description || '', s.effect || '', s.category || '', s.icon || '');
      }
    });
    tx(skills);
  }

  seedGameChallenges(challenges) {
    const stmt = this._db.prepare('INSERT OR REPLACE INTO game_challenges (id, name, description, save_field, target) VALUES (?, ?, ?, ?, ?)');
    const tx = this._db.transaction((list) => {
      for (const c of list) {
        stmt.run(c.id, c.name, c.description || '', c.saveField || '', c.target || 0);
      }
    });
    tx(challenges);
  }

  seedLoadingTips(tips) {
    const stmt = this._db.prepare('INSERT OR REPLACE INTO game_loading_tips (id, text, category) VALUES (?, ?, ?)');
    const tx = this._db.transaction((list) => {
      for (let i = 0; i < list.length; i++) {
        stmt.run(i + 1, list[i].text || list[i], list[i].category || '');
      }
    });
    tx(tips);
  }

  getRandomTip() {
    return this._db.prepare('SELECT text FROM game_loading_tips ORDER BY RANDOM() LIMIT 1').get();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function _json(value) {
  if (value === undefined || value === null) return '[]';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function _parsePlayerRow(row) {
  if (!row) return null;
  // Parse JSON columns back to objects
  const jsonCols = [
    'name_history', 'char_profile', 'player_states', 'body_conditions',
    'crafting_recipes', 'building_recipes', 'unlocked_professions', 'unlocked_skills',
    'skills_data', 'inventory', 'equipment', 'quick_slots', 'backpack_items',
    'backpack_data', 'lore', 'unique_loots', 'crafted_uniques', 'loot_item_unique',
    'quest_data', 'mini_quest', 'challenges', 'quest_spawner_done',
    'companion_data', 'horses', 'extended_stats', 'kill_tracker', 'custom_data',
  ];
  const parsed = { ...row };
  for (const col of jsonCols) {
    if (parsed[col] && typeof parsed[col] === 'string') {
      try { parsed[col] = JSON.parse(parsed[col]); } catch { /* leave as string */ }
    }
  }
  // Convert SQLite integers to booleans where appropriate
  parsed.male = !!parsed.male;
  parsed.online = !!parsed.online;
  parsed.has_extended_stats = !!parsed.has_extended_stats;
  return parsed;
}

function _parseActivityRow(row) {
  if (!row) return null;
  const parsed = { ...row };
  if (parsed.details && typeof parsed.details === 'string') {
    try { parsed.details = JSON.parse(parsed.details); } catch { /* leave as string */ }
  }
  return parsed;
}

module.exports = HumanitZDB;
