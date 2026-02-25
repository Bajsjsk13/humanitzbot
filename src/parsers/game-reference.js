/**
 * Game reference module — seeds static game data into SQLite.
 *
 * Uses the curated data from game-data.js (high quality, hand-verified).
 *
 * Run once at startup via db.seedGameReference() or manually via
 *   node -e "require('./src/parsers/game-reference').seed(db)"
 *
 * Tables populated:
 *   - game_professions   (from PROFESSION_DETAILS)
 *   - game_afflictions    (from AFFLICTION_MAP)
 *   - game_skills         (from SKILL_EFFECTS)
 *   - game_challenges     (from CHALLENGES + CHALLENGE_DESCRIPTIONS)
 *   - game_loading_tips   (from LOADING_TIPS)
 *   - game_server_setting_defs (from SERVER_SETTING_DESCRIPTIONS)
 */

const {
  AFFLICTION_MAP,
  PROFESSION_DETAILS,
  CHALLENGES,
  CHALLENGE_DESCRIPTIONS,
  LOADING_TIPS,
  SKILL_EFFECTS,
  SERVER_SETTING_DESCRIPTIONS,
  ITEM_DATABASE,
  CRAFTING_RECIPES,
  LORE_ENTRIES,
  QUEST_DATA,
  SPAWN_LOCATIONS,
  SKILL_DETAILS,
  AFFLICTION_DETAILS,
} = require('../game-data');

// ─── Seed all game reference data ──────────────────────────────────────────

/**
 * Seed all game reference data into the database.
 * Safe to call multiple times — uses INSERT OR REPLACE.
 *
 * @param {import('../db/database')} db - Initialised HumanitZDB instance
 */
function seed(db) {
  seedProfessions(db);
  seedAfflictions(db);
  seedSkills(db);
  seedChallenges(db);
  seedLoadingTips(db);
  seedServerSettingDefs(db);
  seedItems(db);
  seedRecipes(db);
  seedLore(db);
  seedQuests(db);
  seedSpawnLocations(db);

  db._setMeta('game_ref_seeded', new Date().toISOString());
  console.log('[GameRef] All game reference data seeded');
}

// ─── Professions ────────────────────────────────────────────────────────────

function seedProfessions(db) {
  const { PERK_MAP } = require('./save-parser');

  // Build enum_value → name reverse map
  const enumToName = {};
  for (const [enumVal, name] of Object.entries(PERK_MAP)) {
    enumToName[name] = enumVal;
  }

  const professions = Object.entries(PROFESSION_DETAILS).map(([name, info]) => ({
    id: name,
    enumValue: enumToName[name] || '',
    enumIndex: _enumIndex(enumToName[name]),
    perk: info.perk || '',
    description: info.description || '',
    affliction: info.affliction || '',
    skills: info.unlockedSkills || [],
  }));

  db.seedGameProfessions(professions);
}

function _enumIndex(enumValue) {
  if (!enumValue) return 0;
  const m = enumValue.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

// ─── Afflictions ────────────────────────────────────────────────────────────

function seedAfflictions(db) {
  // Merge AFFLICTION_MAP (indexed array) with AFFLICTION_DETAILS (descriptions)
  const detailsByName = {};
  for (const [, detail] of Object.entries(AFFLICTION_DETAILS)) {
    detailsByName[detail.name] = detail;
  }

  const afflictions = AFFLICTION_MAP.map((name, idx) => ({
    idx,
    name,
    description: detailsByName[name]?.description || '',
    icon: '',
  }));
  db.seedGameAfflictions(afflictions);
}

// ─── Skills ─────────────────────────────────────────────────────────────────

function seedSkills(db) {
  // Merge SKILL_EFFECTS (id→effect) with SKILL_DETAILS (full data from DT_Skills)
  const detailsByName = {};
  for (const [, detail] of Object.entries(SKILL_DETAILS)) {
    detailsByName[detail.name.toUpperCase()] = detail;
  }

  const skills = Object.entries(SKILL_EFFECTS).map(([id, effect]) => {
    const detail = detailsByName[id] || {};
    return {
      id,
      name: detail.name || id.charAt(0).toUpperCase() + id.slice(1).toLowerCase().replace(/_/g, ' '),
      description: detail.description || '',
      effect,
      category: detail.category?.toLowerCase() || _inferSkillCategory(id),
      icon: '',
    };
  });
  db.seedGameSkills(skills);
}

function _inferSkillCategory(skillId) {
  const combat = ['CALLUSED', 'SPRINTER', 'WRESTLER', 'VITAL SHOT', 'REDEYE', 'RELOADER', 'MAG FLIP', 'CONTROLLED BREATHING'];
  const survival = ['BANDOLEER', 'HEALTHY GUT', 'INFECTION TREATMENT', 'BEAST OF BURDEN'];
  const stealth = ['SPEED STEALTH', 'DEEP POCKETS', 'LIGHTFOOT', 'HACKER'];
  const crafting = ['CARPENTRY', 'METAL WORKING', 'RING MY BELL'];
  const social = ['CHARISMA', 'HAGGLER'];

  if (combat.includes(skillId)) return 'combat';
  if (survival.includes(skillId)) return 'survival';
  if (stealth.includes(skillId)) return 'stealth';
  if (crafting.includes(skillId)) return 'crafting';
  if (social.includes(skillId)) return 'social';
  return 'general';
}

// ─── Challenges ─────────────────────────────────────────────────────────────

function seedChallenges(db) {
  // Merge CHALLENGES (from DT_StatConfig) with CHALLENGE_DESCRIPTIONS (from save field mapping)
  const merged = [];

  // From DT_StatConfig
  for (const ch of CHALLENGES) {
    merged.push({
      id: ch.id,
      name: ch.name,
      description: ch.description,
      saveField: '',
      target: 0,
    });
  }

  // From save field mapping (these have save_field keys)
  for (const [field, info] of Object.entries(CHALLENGE_DESCRIPTIONS)) {
    const existing = merged.find(m => m.name === info.name);
    if (existing) {
      existing.saveField = field;
      existing.target = info.target || 0;
      if (info.desc && !existing.description) existing.description = info.desc;
    } else {
      merged.push({
        id: field,
        name: info.name,
        description: info.desc || '',
        saveField: field,
        target: info.target || 0,
      });
    }
  }

  db.seedGameChallenges(merged);
}

// ─── Loading tips ───────────────────────────────────────────────────────────

function seedLoadingTips(db) {
  const categorized = LOADING_TIPS.map(text => {
    let category = 'general';
    if (/RMB|LMB|press|toggle|click|key|ctrl|shift|spacebar|hot key|button/i.test(text)) category = 'controls';
    else if (/health|thirst|hunger|stamina|infection|vital/i.test(text)) category = 'vitals';
    else if (/inventory|weapon|slot|backpack|carry/i.test(text)) category = 'inventory';
    else if (/fish|reel|tension|bait/i.test(text)) category = 'fishing';
    else if (/build|craft|station|structure|workbench/i.test(text)) category = 'crafting';
    else if (/vehicle|car|trunk|stall|horn|headlight/i.test(text)) category = 'vehicles';
    else if (/zeek|zombie|spawn/i.test(text)) category = 'combat';
    return { text, category };
  });
  db.seedLoadingTips(categorized);
}

// ─── Server setting definitions ─────────────────────────────────────────────

function seedServerSettingDefs(db) {
  const stmt = db.db.prepare(
    'INSERT OR REPLACE INTO game_server_setting_defs (key, label, description, type, default_val, options) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const tx = db.db.transaction(() => {
    for (const [key, label] of Object.entries(SERVER_SETTING_DESCRIPTIONS)) {
      const type = _inferSettingType(key);
      stmt.run(key, label, '', type, '', '[]');
    }
  });
  tx();
}

function _inferSettingType(key) {
  if (/enabled|fire|anywhere|position|drop/i.test(key)) return 'bool';
  if (/max|time|drain|multiplier|population|difficulty/i.test(key)) return 'float';
  if (/mode|level/i.test(key)) return 'enum';
  if (/name/i.test(key)) return 'string';
  return 'string';
}

// ─── Items (game_items — 718 entries) ───────────────────────────────────────

function seedItems(db) {
  const items = Object.entries(ITEM_DATABASE).map(([id, item]) => ({
    id,
    name: item.name,
    description: item.description || '',
    category: item.type || '',
    icon: '',
    blueprint: '',
    stackSize: item.stack || 1,
    extra: {
      weight: item.weight,
      tradeValue: item.tradeValue,
      playerValue: item.playerValue,
      durabilityLoss: item.durabilityLoss,
      doesDecay: item.doesDecay,
      armorValue: item.armorValue,
      warmthValue: item.warmthValue,
      isSkillBook: item.isSkillBook,
      spawnChance: item.spawnChance,
    },
  }));
  db.seedGameItems(items);
}

// ─── Recipes (game_recipes — 154 entries) ───────────────────────────────────

function seedRecipes(db) {
  const stmt = db.db.prepare(
    'INSERT OR REPLACE INTO game_recipes (id, name, type, station, ingredients, result, extra) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const tx = db.db.transaction(() => {
    for (const [id, recipe] of Object.entries(CRAFTING_RECIPES)) {
      stmt.run(
        id,
        recipe.name,
        'crafting',
        recipe.station || '',
        JSON.stringify(recipe.ingredients || []),
        recipe.result || '',
        JSON.stringify({ resultAmount: recipe.resultAmount || 1 })
      );
    }
  });
  tx();
}

// ─── Lore (game_lore — 12 entries) ──────────────────────────────────────────

function seedLore(db) {
  const stmt = db.db.prepare(
    'INSERT OR REPLACE INTO game_lore (id, title, text, location) VALUES (?, ?, ?, ?)'
  );

  const tx = db.db.transaction(() => {
    for (const [id, lore] of Object.entries(LORE_ENTRIES)) {
      const text = [lore.byline, lore.author, lore.body].filter(Boolean).join('\n\n');
      stmt.run(id, lore.title || '', text, lore.type || '');
    }
  });
  tx();
}

// ─── Quests (game_quests — 18 entries) ──────────────────────────────────────

function seedQuests(db) {
  const stmt = db.db.prepare(
    'INSERT OR REPLACE INTO game_quests (id, name, description, objectives, rewards, extra) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const tx = db.db.transaction(() => {
    for (const [id, quest] of Object.entries(QUEST_DATA)) {
      stmt.run(
        id,
        quest.name,
        '',
        '[]',
        JSON.stringify([
          quest.xp ? { type: 'xp', amount: quest.xp } : null,
          quest.skillPoint ? { type: 'skillPoint', amount: quest.skillPoint } : null,
        ].filter(Boolean)),
        JSON.stringify({ next: quest.next || '', dependsOn: quest.dependsOn || '' })
      );
    }
  });
  tx();
}

// ─── Spawn locations (game_spawn_locations — 10 entries) ────────────────────

function seedSpawnLocations(db) {
  const stmt = db.db.prepare(
    'INSERT OR REPLACE INTO game_spawn_locations (id, name, description, type, image) VALUES (?, ?, ?, ?, ?)'
  );

  const tx = db.db.transaction(() => {
    for (const [id, spawn] of Object.entries(SPAWN_LOCATIONS)) {
      stmt.run(id, spawn.name, spawn.description || '', '', '');
    }
  });
  tx();
}

module.exports = { seed };
