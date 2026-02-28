/**
 * player-stats-embeds.js — Embed builder methods for PlayerStatsChannel.
 *
 * Extracted from player-stats-channel.js to keep the main module focused on
 * polling, data resolution, and event handling.  Methods are mixed in via
 * Object.assign(PlayerStatsChannel.prototype, ...) so `this` is the PSC
 * instance — all instance properties (_config, _saveData, _clanData,
 * _killTracker, _playerStats, _playtime, _logWatcher, etc.) are available.
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { PERK_MAP } = require('../parsers/save-parser');
const gameData = require('../parsers/game-data');
const { cleanItemName: _sharedCleanItemName, cleanItemArray } = require('../parsers/ue4-names');

// ─── Local helper ────────────────────────────────────────────────────
/**
 * Clean an item name using the shared cleaner from ue4-names.js.
 * Returns '' for null/undefined (not 'Unknown') to preserve .filter(Boolean) patterns.
 */
function _cleanItemName(name) {
  if (!name) return '';
  const cleaned = _sharedCleanItemName(name);
  return cleaned === 'Unknown' ? '' : cleaned;
}

// ═════════════════════════════════════════════════════════════════════
//  _buildOverviewEmbed — Main server overview embed with leaderboards
// ═════════════════════════════════════════════════════════════════════
function _buildOverviewEmbed() {
  const serverTag = this._config.serverName ? ` — ${this._config.serverName}` : '';
  const embed = new EmbedBuilder()
    .setTitle(`📊 Player Statistics${serverTag}`)
    .setColor(0x9b59b6)
    .setTimestamp()
    .setFooter({ text: 'Select a player below for full stats · Last updated' });

  // ── Merge all player data ──
  const allLog = this._playerStats.getAllPlayers();
  const onlinePlayers = new Set();
  const now = Date.now();
  const recentWindow = 10 * 60 * 1000; // 10 min
  for (const [name, stats] of Object.entries(allLog)) {
    if (stats.lastActive && (now - stats.lastActive) < recentWindow) onlinePlayers.add(name);
  }
  // Also pull online from playtime sessions
  const sessions = this._playtime.getActiveSessions();
  if (sessions) {
    for (const name of Object.keys(sessions)) onlinePlayers.add(name);
  }

  // Build merged roster: save + log + playtime
  const roster = new Map();
  // Populate from save data
  if (this._saveData) {
    for (const [sid, sd] of this._saveData.entries()) {
      const name = sd.name || sid;
      const at = this.getAllTimeKills(sid);
      roster.set(sid, {
        name,
        kills: at?.zeeksKilled || 0,
        deaths: 0,
        fishCaught: sd.fishCaught || 0,
        daysSurvived: sd.daysSurvived || 0,
        bitten: sd.timesBitten || 0,
        pvpKills: 0,
        playtime: 0,
        online: onlinePlayers.has(name),
      });
    }
  }
  // Merge log data
  for (const [name, stats] of Object.entries(allLog)) {
    const sid = stats.steamId || name;
    const existing = roster.get(sid) || {
      name, kills: 0, deaths: 0, fishCaught: 0, daysSurvived: 0,
      bitten: 0, pvpKills: 0, playtime: 0, online: onlinePlayers.has(name),
    };
    existing.deaths = Math.max(existing.deaths, stats.deaths || 0);
    existing.pvpKills = Math.max(existing.pvpKills, stats.pvpKills || 0);
    if (!roster.has(sid)) roster.set(sid, existing);
    else Object.assign(roster.get(sid), { deaths: existing.deaths, pvpKills: existing.pvpKills });
  }
  // Merge playtime
  const ptAll = this._playtime.getPlaytimeAll ? this._playtime.getPlaytimeAll() : {};
  for (const [name, pt] of Object.entries(ptAll)) {
    for (const [sid, r] of roster) {
      if (r.name === name) { r.playtime = pt.total || 0; break; }
    }
  }

  const players = Array.from(roster.values());
  const onlineCount = players.filter(p => p.online).length;
  const totalPlayers = players.length;

  // ── Overview stats ──
  const totalKills = players.reduce((s, p) => s + p.kills, 0);
  const totalDeaths = players.reduce((s, p) => s + p.deaths, 0);
  const totalFish = players.reduce((s, p) => s + p.fishCaught, 0);

  const overviewLines = [];
  overviewLines.push(`👥 **${onlineCount}** online · **${totalPlayers}** total players`);
  overviewLines.push(`🧟 **${totalKills.toLocaleString()}** zombie kills · 💀 **${totalDeaths}** deaths`);
  if (totalFish > 0) overviewLines.push(`🐟 **${totalFish}** fish caught`);

  embed.setDescription(overviewLines.join('\n'));

  // ── Top Killers ──
  const topKillers = players.filter(p => p.kills > 0).sort((a, b) => b.kills - a.kills).slice(0, 5);
  if (topKillers.length > 0) {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const lines = topKillers.map((p, i) => `${medals[i]} **${p.name}** — ${p.kills.toLocaleString()} kills`);
    embed.addFields({ name: '🏆 Top Killers', value: lines.join('\n'), inline: true });
  }

  // ── Top Playtime ──
  const topPlaytime = players.filter(p => p.playtime > 0).sort((a, b) => b.playtime - a.playtime).slice(0, 5);
  if (topPlaytime.length > 0) {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const fmtTime = (ms) => {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };
    const lines = topPlaytime.map((p, i) => `${medals[i]} **${p.name}** — ${fmtTime(p.playtime)}`);
    embed.addFields({ name: '⏱️ Most Active', value: lines.join('\n'), inline: true });
  }

  // ── Top Survivors ──
  const topSurvivors = players.filter(p => p.daysSurvived > 0).sort((a, b) => b.daysSurvived - a.daysSurvived).slice(0, 5);
  if (topSurvivors.length > 0) {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const lines = topSurvivors.map((p, i) => `${medals[i]} **${p.name}** — ${p.daysSurvived} days`);
    embed.addFields({ name: '📅 Longest Survival', value: lines.join('\n'), inline: true });
  }

  // ── Fun Stats ──
  const funLines = [];
  const mostBitten = players.filter(p => p.bitten > 0).sort((a, b) => b.bitten - a.bitten)[0];
  if (mostBitten) funLines.push(`🦷 Most bitten: **${mostBitten.name}** (${mostBitten.bitten}×)`);
  const topFisher = players.filter(p => p.fishCaught > 0).sort((a, b) => b.fishCaught - a.fishCaught)[0];
  if (topFisher) funLines.push(`🐟 Top angler: **${topFisher.name}** (${topFisher.fishCaught} fish)`);
  const topPvP = players.filter(p => p.pvpKills > 0).sort((a, b) => b.pvpKills - a.pvpKills)[0];
  if (topPvP) funLines.push(`🏴‍☠️ PvP leader: **${topPvP.name}** (${topPvP.pvpKills} kills)`);
  if (funLines.length > 0) embed.addFields({ name: '🎲 Fun Stats', value: funLines.join('\n') });

  // ── Weekly Stats ──
  if (this._weeklyStats) {
    const ws = this._weeklyStats;
    const weekLines = [];
    if (ws.topKiller) weekLines.push(`🧟 Top killer: **${ws.topKiller.name}** (${ws.topKiller.kills})`);
    if (ws.topPlaytime) {
      const fmtTime = (ms) => {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };
      weekLines.push(`⏱️ Most active: **${ws.topPlaytime.name}** (${fmtTime(ws.topPlaytime.time)})`);
    }
    if (ws.newPlayers > 0) weekLines.push(`🆕 New players: **${ws.newPlayers}**`);
    if (weekLines.length > 0) embed.addFields({ name: '📅 This Week', value: weekLines.join('\n') });
  }

  // ── Server Info ──
  if (this._lastSaveUpdate) {
    const ago = Math.round((Date.now() - this._lastSaveUpdate) / 60000);
    embed.addFields({ name: '💾 Last Save', value: `${ago} min ago`, inline: true });
  }

  return embed;
}

// ═════════════════════════════════════════════════════════════════════
//  _buildPlayerRow — Player select menu (sorted by kills/activity)
// ═════════════════════════════════════════════════════════════════════
function _buildPlayerRow() {
  const allLog = this._playerStats.getAllPlayers();
  const players = [];

  // Add all save data players first
  if (this._saveData) {
    for (const [sid, sd] of this._saveData.entries()) {
      const logEntry = Object.values(allLog).find(l => l.steamId === sid);
      const at = this.getAllTimeKills(sid);
      const kills = at?.zeeksKilled || 0;
      players.push({
        steamId: sid,
        name: sd.name || sid,
        kills,
        deaths: logEntry?.deaths || 0,
        daysSurvived: sd.daysSurvived || 0,
        online: false,
      });
    }
  }

  // Add log-only players not already in save data
  for (const [name, stats] of Object.entries(allLog)) {
    const sid = stats.steamId || name;
    if (players.some(p => p.steamId === sid)) continue;
    players.push({
      steamId: sid,
      name,
      kills: 0,
      deaths: stats.deaths || 0,
      daysSurvived: 0,
      online: false,
    });
  }

  // Sort: online first, then by kills desc, then name
  const sessions = this._playtime.getActiveSessions() || {};
  for (const p of players) {
    if (sessions[p.name]) p.online = true;
  }
  players.sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.name.localeCompare(b.name);
  });

  // Build select menu (max 25 options)
  const options = players.slice(0, 25).map(p => {
    const status = p.online ? '🟢 ' : '';
    const desc = `Kills: ${p.kills} · Deaths: ${p.deaths} · ${p.daysSurvived}d`;
    return {
      label: `${status}${p.name}`.substring(0, 100),
      description: desc.substring(0, 100),
      value: p.steamId.substring(0, 100),
    };
  });

  if (options.length === 0) return null;

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`psc_player${this._serverId ? `_${this._serverId}` : ''}`)
      .setPlaceholder('Select a player for detailed stats…')
      .addOptions(options)
  );
  return row;
}

// ═════════════════════════════════════════════════════════════════════
//  _buildClanRow — Clan select menu
// ═════════════════════════════════════════════════════════════════════
function _buildClanRow() {
  if (!this._clanData || this._clanData.size === 0) return null;

  const options = [];
  for (const [clanName, clan] of this._clanData) {
    const memberCount = clan.members?.length || 0;
    // Sum clan kills from save data
    let totalKills = 0;
    if (clan.members) {
      for (const m of clan.members) {
        const sid = m.steamId || m.steam_id;
        if (sid && this._saveData?.has(sid)) {
          const at = this.getAllTimeKills(sid);
          totalKills += at?.zeeksKilled || 0;
        }
      }
    }
    options.push({
      label: `[${clanName}]`.substring(0, 100),
      description: `${memberCount} members · ${totalKills} kills`.substring(0, 100),
      value: `clan_${clanName}`.substring(0, 100),
    });
  }

  if (options.length === 0) return null;

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`psc_clan${this._serverId ? `_${this._serverId}` : ''}`)
      .setPlaceholder('Select a clan for details…')
      .addOptions(options.slice(0, 25))
  );
  return row;
}

// ═════════════════════════════════════════════════════════════════════
//  buildClanEmbed — Detailed clan stats embed
// ═════════════════════════════════════════════════════════════════════
function buildClanEmbed(clanName) {
  const clan = this._clanData?.get(clanName);
  if (!clan) return null;

  const embed = new EmbedBuilder()
    .setTitle(`🏰 Clan: ${clanName}`)
    .setColor(0xe67e22)
    .setTimestamp();

  const members = clan.members || [];
  const descLines = [`**${members.length}** member${members.length !== 1 ? 's' : ''}`];

  // Aggregate clan stats
  let totalKills = 0, totalDeaths = 0, totalDays = 0, totalPlaytime = 0;
  const memberLines = [];
  const ptAll = this._playtime.getPlaytimeAll ? this._playtime.getPlaytimeAll() : {};
  const sessions = this._playtime.getActiveSessions() || {};

  for (const m of members) {
    const sid = m.steamId || m.steam_id;
    const name = m.name || sid;
    const saveEntry = sid ? this._saveData?.get(sid) : null;
    const at = sid ? this.getAllTimeKills(sid) : null;
    const kills = at?.zeeksKilled || 0;
    const logEntry = sid ? Object.values(this._playerStats.getAllPlayers()).find(l => l.steamId === sid) : null;
    const deaths = logEntry?.deaths || 0;
    const days = saveEntry?.daysSurvived || 0;
    const pt = ptAll[name];
    const playtime = pt?.total || 0;
    const online = !!sessions[name];

    totalKills += kills;
    totalDeaths += deaths;
    totalDays = Math.max(totalDays, days);
    totalPlaytime += playtime;

    const status = online ? '🟢' : '⚫';
    const role = m.canKick || m.can_kick ? ' 👑' : '';
    memberLines.push(`${status}${role} **${name}** — ${kills} kills · ${days}d survived`);
  }

  descLines.push(`🧟 **${totalKills.toLocaleString()}** total kills · 💀 **${totalDeaths}** deaths`);
  if (totalDays > 0) descLines.push(`📅 Longest survival: **${totalDays}** days`);
  if (totalPlaytime > 0) {
    const h = Math.floor(totalPlaytime / 3600000);
    const m = Math.floor((totalPlaytime % 3600000) / 60000);
    descLines.push(`⏱️ Total playtime: **${h}h ${m}m**`);
  }

  embed.setDescription(descLines.join('\n'));

  // Member list
  if (memberLines.length > 0) {
    embed.addFields({
      name: `Members (${memberLines.length})`,
      value: memberLines.join('\n').substring(0, 1024),
    });
  }

  // Recent activity from log watcher
  if (this._logWatcher) {
    const recentEvents = [];
    const activityLog = this._playerStats.getAllPlayers();
    for (const m of members) {
      const sid = m.steamId || m.steam_id;
      const name = m.name || sid;
      const pStats = activityLog[name];
      if (pStats?.lastActive) {
        const lastDate = new Date(pStats.lastActive);
        const dateStr = lastDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: this._config.botTimezone });
        recentEvents.push(`${name}: last active ${dateStr}`);
      }
    }
    if (recentEvents.length > 0) {
      embed.addFields({
        name: '📋 Recent Activity',
        value: recentEvents.slice(0, 5).join('\n'),
      });
    }
  }

  return embed;
}

// ═════════════════════════════════════════════════════════════════════
//  buildFullPlayerEmbed — Detailed individual player stats embed
// ═════════════════════════════════════════════════════════════════════
function buildFullPlayerEmbed(steamId, { isAdmin = false } = {}) {
  const resolved = this._resolvePlayer(steamId);
  const logData = resolved.log;
  const saveData = resolved.save;
  const pt = resolved.playtime;

  // Pick a random loading tip for the footer
  const tips = gameData.LOADING_TIPS.filter(t => t.length > 20 && t.length < 120);
  const tip = tips.length > 0 ? tips[Math.floor(Math.random() * tips.length)] : null;

  const serverTag = this._config.serverName ? ` [${this._config.serverName}]` : '';
  const embed = new EmbedBuilder()
    .setTitle(`${resolved.name}${serverTag}`)
    .setColor(0x9b59b6)
    .setTimestamp()
    .setFooter({ text: tip ? `💡 ${tip}` : 'HumanitZ Player Stats' });

  // ═══════════════════════════════════════════════════
  //  HEADER — Character overview as description
  // ═══════════════════════════════════════════════════
  const descParts = [];
  if (saveData) {
    const gender = saveData.male ? 'Male' : 'Female';
    if (saveData.startingPerk && saveData.startingPerk !== 'Unknown') {
      const profDetails = gameData.PROFESSION_DETAILS[saveData.startingPerk];
      descParts.push(`**${saveData.startingPerk}** · ${gender}`);
      if (profDetails) descParts.push(`> *${profDetails.perk}*`);
    } else {
      descParts.push(gender);
    }
    if (typeof saveData.affliction === 'number' && saveData.affliction > 0 && saveData.affliction < gameData.AFFLICTION_MAP.length) {
      descParts.push(`⚠️ **${gameData.AFFLICTION_MAP[saveData.affliction]}**`);
    }
  }
  if (pt) descParts.push(`⏱️ ${pt.totalFormatted} · ${pt.sessions} session${pt.sessions !== 1 ? 's' : ''}`);
  if (saveData?.exp != null && saveData.exp > 0) descParts.push(`✨ ${Math.round(saveData.exp).toLocaleString()} XP`);
  if (resolved.firstSeen) {
    const fs = new Date(resolved.firstSeen);
    descParts.push(`📅 First seen ${fs.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: this._config.botTimezone })}`);
  }
  if (logData?.nameHistory && logData.nameHistory.length > 0) {
    descParts.push(`*aka ${logData.nameHistory.map(h => h.name).join(', ')}*`);
  }
  if (descParts.length > 0) embed.setDescription(descParts.join('\n'));

  // Unlocked professions — only if more than the starting one
  if (saveData?.unlockedProfessions?.length > 1) {
    const profNames = saveData.unlockedProfessions
      .filter(p => typeof p === 'string')
      .map(p => PERK_MAP[p] || _cleanItemName(p))
      .filter(Boolean);
    if (profNames.length > 0) embed.addFields({ name: '🎓 Unlocked Professions', value: profNames.join(', ') });
  }

  // ═══════════════════════════════════════════════════
  //  COMBAT — Kills + Survival + PvP
  // ═══════════════════════════════════════════════════
  if (saveData) {
    const at = this.getAllTimeKills(steamId);
    const cl = this.getCurrentLifeKills(steamId);
    const hasExt = saveData.hasExtendedStats;

    // Build kill stat lines
    const types = [
      ['🧟 Zombie', 'zeeksKilled'], ['🎯 Headshot', 'headshots'],
      ['⚔️ Melee', 'meleeKills'],   ['🔫 Ranged', 'gunKills'],
      ['💥 Blast', 'blastKills'],    ['👊 Unarmed', 'fistKills'],
      ['🗡️ Takedown', 'takedownKills'], ['🚗 Vehicle', 'vehicleKills'],
    ];
    let hasDiff = false;
    for (const [, key] of types) {
      if ((cl?.[key] || 0) !== (at?.[key] || 0)) { hasDiff = true; break; }
    }
    const killParts = [];
    for (const [label, key] of types) {
      const all = at?.[key] || 0;
      const life = cl?.[key] || 0;
      if (all > 0 || life > 0) {
        if (hasExt && hasDiff && life > 0 && life !== all) {
          killParts.push(`${label}: **${all}** *(life: ${life})*`);
        } else {
          killParts.push(`${label}: **${all}**`);
        }
      }
    }

    // Survival stats mixed in
    const survParts = [];
    if (saveData.daysSurvived > 0) {
      const atSurv = this.getAllTimeSurvival(steamId);
      if (atSurv?.daysSurvived > saveData.daysSurvived) {
        survParts.push(`📅 Days: **${saveData.daysSurvived}** *(all-time: ${atSurv.daysSurvived})*`);
      } else {
        survParts.push(`📅 Days: **${saveData.daysSurvived}**`);
      }
    }
    if (logData) survParts.push(`💀 Deaths: **${logData.deaths}**`);
    if (saveData.timesBitten > 0) survParts.push(`🦷 Bitten: **${saveData.timesBitten}**`);
    if (saveData.fishCaught > 0) {
      let fishStr = `🐟 Fish: **${saveData.fishCaught}**`;
      if (saveData.fishCaughtPike > 0) fishStr += ` (${saveData.fishCaughtPike} pike)`;
      survParts.push(fishStr);
    }

    if (killParts.length > 0 || survParts.length > 0) {
      const combined = [...killParts, ...survParts];
      embed.addFields({ name: '⚔️ Combat & Survival', value: combined.join('\n') || '*No data yet*' });
    }
  } else if (logData) {
    // No save data — just show log-based deaths
    embed.addFields({ name: '⚔️ Combat', value: `💀 Deaths: **${logData.deaths}**` });
  }

  // ── PvP Stats (inline beside combat if present) ──
  if (logData && ((logData.pvpKills || 0) > 0 || (logData.pvpDeaths || 0) > 0)) {
    const pvpParts = [];
    if (logData.pvpKills > 0) pvpParts.push(`Kills: **${logData.pvpKills}**`);
    if (logData.pvpDeaths > 0) pvpParts.push(`Deaths: **${logData.pvpDeaths}**`);
    const kd = logData.pvpDeaths > 0 ? (logData.pvpKills / logData.pvpDeaths).toFixed(2) : logData.pvpKills > 0 ? '∞' : '0';
    pvpParts.push(`K/D: **${kd}**`);
    embed.addFields({ name: '🏴‍☠️ PvP', value: pvpParts.join(' · '), inline: true });
  }

  // ═══════════════════════════════════════════════════
  //  VITALS — Health bars + Status effects (compact)
  // ═══════════════════════════════════════════════════
  if (this._config.canShow('showVitals', isAdmin) && saveData) {
    const pct = (v) => `${Math.round(Math.max(0, Math.min(100, v)))}%`;
    const bar = (v) => {
      const filled = Math.round(Math.max(0, Math.min(100, v)) / 10);
      return '█'.repeat(filled) + '░'.repeat(10 - filled);
    };
    const vitals = [];
    if (this._config.showHealth)   vitals.push(`❤️ \`${bar(saveData.health)}\` ${pct(saveData.health)}`);
    if (this._config.showHunger)   vitals.push(`🍖 \`${bar(saveData.hunger)}\` ${pct(saveData.hunger)}`);
    if (this._config.showThirst)   vitals.push(`💧 \`${bar(saveData.thirst)}\` ${pct(saveData.thirst)}`);
    if (this._config.showStamina)  vitals.push(`⚡ \`${bar(saveData.stamina)}\` ${pct(saveData.stamina)}`);
    if (this._config.showImmunity) vitals.push(`🛡️ \`${bar(saveData.infection)}\` ${pct(saveData.infection)}`);
    if (this._config.showBattery)  vitals.push(`🔋 \`${bar(saveData.battery)}\` ${pct(saveData.battery)}`);

    // Status effects inline
    const statuses = [];
    if (this._config.canShow('showStatusEffects', isAdmin)) {
      if (this._config.showPlayerStates && saveData.playerStates?.length > 0) {
        for (const s of saveData.playerStates) {
          if (typeof s !== 'string') continue;
          statuses.push(_cleanItemName(s.replace('States.Player.', '')));
        }
      }
      if (this._config.showBodyConditions && saveData.bodyConditions?.length > 0) {
        for (const s of saveData.bodyConditions) {
          if (typeof s !== 'string') continue;
          statuses.push(_cleanItemName(s.replace('Attributes.Health.', '')));
        }
      }
      if (this._config.showInfectionBuildup && saveData.infectionBuildup > 0) statuses.push(`Infection: ${saveData.infectionBuildup}%`);
      if (this._config.showFatigue && saveData.fatigue > 0.5) statuses.push('Fatigued');
    }

    if (statuses.length > 0) vitals.push(`\n**Status:** ${statuses.join(', ')}`);
    if (vitals.length > 0) embed.addFields({ name: '❤️ Vitals', value: vitals.join('\n') });
  }

  // ═══════════════════════════════════════════════════
  //  DAMAGE — Taken + Killed By (inline pair)
  // ═══════════════════════════════════════════════════
  if (logData) {
    const dmgEntries = Object.entries(logData.damageTaken);
    const dmgTotal = dmgEntries.reduce((s, [, c]) => s + c, 0);
    if (dmgTotal > 0) {
      const dmgSorted = dmgEntries.sort((a, b) => b[1] - a[1]);
      const dmgLines = dmgSorted.slice(0, 5).map(([src, count]) => `${src}: **${count}**`);
      if (dmgEntries.length > 5) dmgLines.push(`*+${dmgEntries.length - 5} more*`);
      embed.addFields({ name: `🩸 Damage (${dmgTotal} hits)`, value: dmgLines.join('\n'), inline: true });
    }

    const killEntries = Object.entries(logData.killedBy || {});
    if (killEntries.length > 0) {
      const killSorted = killEntries.sort((a, b) => b[1] - a[1]);
      const killLines = killSorted.slice(0, 5).map(([src, count]) => `${src}: **${count}**`);
      if (killEntries.length > 5) killLines.push(`*+${killEntries.length - 5} more*`);
      embed.addFields({ name: `💀 Killed By (${logData.deaths})`, value: killLines.join('\n'), inline: true });
    }
  }

  // ═══════════════════════════════════════════════════
  //  BASE — Building + Raids + Looting (compact)
  // ═══════════════════════════════════════════════════
  if (logData) {
    const baseParts = [];

    // Building
    if (logData.builds > 0) {
      const buildEntries = Object.entries(logData.buildItems);
      if (buildEntries.length > 0) {
        const topBuilds = buildEntries.sort((a, b) => b[1] - a[1]).slice(0, 4);
        const buildStr = topBuilds.map(([item, count]) => `${item} x${count}`).join(', ');
        const moreStr = buildEntries.length > 4 ? ` +${buildEntries.length - 4} more` : '';
        baseParts.push(`🏗️ **${logData.builds} placed** — ${buildStr}${moreStr}`);
      } else {
        baseParts.push(`🏗️ **${logData.builds}** placed`);
      }
    }

    // Raids
    if (this._config.canShow('showRaidStats', isAdmin)) {
      const raidParts = [];
      if (this._config.showRaidsOut && logData.raidsOut > 0) {
        raidParts.push(`Attacked: **${logData.raidsOut}**`);
        if (logData.destroyedOut > 0) raidParts.push(`Destroyed: **${logData.destroyedOut}**`);
      }
      if (this._config.showRaidsIn && logData.raidsIn > 0) {
        raidParts.push(`Raided: **${logData.raidsIn}**`);
        if (logData.destroyedIn > 0) raidParts.push(`Lost: **${logData.destroyedIn}**`);
      }
      if (raidParts.length > 0) baseParts.push(`⚒️ ${raidParts.join(' · ')}`);
    }

    // Looting
    if (logData.containersLooted > 0) {
      baseParts.push(`📦 **${logData.containersLooted}** containers looted`);
    }

    if (baseParts.length > 0) embed.addFields({ name: '🏠 Base Activity', value: baseParts.join('\n') });
  }

  // ═══════════════════════════════════════════════════
  //  INVENTORY — Equipment, slots, backpack (compact)
  // ═══════════════════════════════════════════════════
  if (this._config.canShow('showInventory', isAdmin) && saveData) {
    const notEmpty = (i) => i.item && !/^empty$/i.test(i.item) && !/^empty$/i.test(_cleanItemName(i.item));
    const fmt = (i) => {
      const amt = i.amount > 1 ? ` x${i.amount}` : '';
      const dur = i.durability > 0 ? ` (${i.durability}%)` : '';
      return `${_cleanItemName(i.item)}${amt}${dur}`;
    };

    const equip = saveData.equipment.filter(notEmpty);
    const quick = saveData.quickSlots.filter(notEmpty);
    const bpItems = (saveData.backpackItems || []).filter(notEmpty);
    const pockets = saveData.inventory.filter(notEmpty);

    const invSections = [];
    if (this._config.showEquipment && equip.length > 0) invSections.push(`**Equipped:** ${equip.map(fmt).join(', ')}`);
    if (this._config.showQuickSlots && quick.length > 0) invSections.push(`**Quick:** ${quick.map(fmt).join(', ')}`);
    if (this._config.showPockets && pockets.length > 0) invSections.push(`**Pockets:** ${pockets.map(fmt).join(', ')}`);
    if (this._config.showBackpack && bpItems.length > 0) invSections.push(`**Backpack:** ${bpItems.map(fmt).join(', ')}`);

    if (invSections.length > 0) {
      embed.addFields({ name: '🎒 Inventory', value: invSections.join('\n').substring(0, 1024) });
    }
  }

  // ═══════════════════════════════════════════════════
  //  PROGRESSION — Skills, Challenges, Recipes
  // ═══════════════════════════════════════════════════

  // Skills
  if (this._config.canShow('showSkills', isAdmin) && saveData?.unlockedSkills?.length > 0) {
    const skillNames = saveData.unlockedSkills.filter(s => typeof s === 'string').map(s => {
      const clean = s.replace(/^skills\./i, '').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
      const effect = gameData.SKILL_EFFECTS[clean];
      return effect ? `**${clean}** — *${effect}*` : `**${clean}**`;
    });
    if (skillNames.length > 0) embed.addFields({ name: `🧠 Skills (${skillNames.length})`, value: skillNames.join('\n').substring(0, 1024) });
  }

  // Challenges
  if (saveData?.hasExtendedStats) {
    const challengeEntries = [
      ['challengeKillZombies',        saveData.challengeKillZombies],
      ['challengeKill50',             saveData.challengeKill50],
      ['challengeCatch20Fish',        saveData.challengeCatch20Fish],
      ['challengeRegularAngler',      saveData.challengeRegularAngler],
      ['challengeKillZombieBear',     saveData.challengeKillZombieBear],
      ['challenge9Squares',           saveData.challenge9Squares],
      ['challengeCraftFirearm',       saveData.challengeCraftFirearm],
      ['challengeCraftFurnace',       saveData.challengeCraftFurnace],
      ['challengeCraftMeleeBench',    saveData.challengeCraftMeleeBench],
      ['challengeCraftMeleeWeapon',   saveData.challengeCraftMeleeWeapon],
      ['challengeCraftRainCollector', saveData.challengeCraftRainCollector],
      ['challengeCraftTablesaw',      saveData.challengeCraftTablesaw],
      ['challengeCraftTreatment',     saveData.challengeCraftTreatment],
      ['challengeCraftWeaponsBench',  saveData.challengeCraftWeaponsBench],
      ['challengeCraftWorkbench',     saveData.challengeCraftWorkbench],
      ['challengeFindDog',            saveData.challengeFindDog],
      ['challengeFindHeli',           saveData.challengeFindHeli],
      ['challengeLockpickSUV',        saveData.challengeLockpickSUV],
      ['challengeRepairRadio',        saveData.challengeRepairRadio],
    ].filter(([, val]) => val > 0);

    if (challengeEntries.length > 0) {
      const descs = gameData.CHALLENGE_DESCRIPTIONS;
      const lines = challengeEntries.map(([key, val]) => {
        const info = descs[key];
        if (info) {
          const progress = info.target ? `${val}/${info.target}` : `${val}`;
          return `${val >= (info.target || 1) ? '✅' : '⬜'} ${info.name}: **${progress}**`;
        }
        return `⬜ ${key}: **${val}**`;
      });
      embed.addFields({ name: `🏆 Challenges (${challengeEntries.length}/19)`, value: lines.join('\n').substring(0, 1024) });
    }
  }

  // Recipes (compact)
  if (this._config.canShow('showRecipes', isAdmin) && saveData) {
    const recipeParts = [];
    if (this._config.showCraftingRecipes && saveData.craftingRecipes.length > 0) recipeParts.push(`**Crafting (${saveData.craftingRecipes.length}):** ${saveData.craftingRecipes.map(_cleanItemName).join(', ')}`);
    if (this._config.showBuildingRecipes && saveData.buildingRecipes.length > 0) recipeParts.push(`**Building (${saveData.buildingRecipes.length}):** ${saveData.buildingRecipes.map(_cleanItemName).join(', ')}`);
    if (recipeParts.length > 0) embed.addFields({ name: '📜 Recipes', value: recipeParts.join('\n').substring(0, 1024) });
  }

  // Lore
  if (this._config.canShow('showLore', isAdmin) && saveData?.lore?.length > 0) {
    embed.addFields({ name: '📖 Lore', value: `${saveData.lore.length} entries collected`, inline: true });
  }

  // Unique Items
  if (saveData) {
    const uniques = [];
    const foundItems = cleanItemArray(saveData.lootItemUnique || []).map(i => typeof i === 'string' ? i : _cleanItemName(i)).filter(Boolean);
    const craftedItems = cleanItemArray(saveData.craftedUniques || []).map(i => typeof i === 'string' ? i : _cleanItemName(i)).filter(Boolean);
    if (foundItems.length > 0) uniques.push(`**Found:** ${foundItems.join(', ')}`);
    if (craftedItems.length > 0) uniques.push(`**Crafted:** ${craftedItems.join(', ')}`);
    if (uniques.length > 0) embed.addFields({ name: '⭐ Unique Items', value: uniques.join('\n').substring(0, 1024) });
  }

  // ═══════════════════════════════════════════════════
  //  FOOTER — Connections, location, companions
  // ═══════════════════════════════════════════════════

  // Connections + Last Active (compact inline row)
  const metaParts = [];
  if (this._config.canShow('showConnections', isAdmin) && logData) {
    const connParts = [];
    if (this._config.showConnectCount && logData.connects > 0) connParts.push(`In: **${logData.connects}**`);
    if (this._config.showConnectCount && logData.disconnects > 0) connParts.push(`Out: **${logData.disconnects}**`);
    if (this._config.showAdminAccess && logData.adminAccess > 0) connParts.push(`Admin: **${logData.adminAccess}**`);
    if (connParts.length > 0) metaParts.push(connParts.join(' · '));
  }
  if (resolved.lastActive) {
    const lastDate = new Date(resolved.lastActive);
    const dateStr = `${lastDate.toLocaleDateString('en-GB', { timeZone: this._config.botTimezone })} ${lastDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: this._config.botTimezone })}`;
    metaParts.push(`Last seen: ${dateStr}`);
  }
  if (metaParts.length > 0) embed.addFields({ name: '🔗 Connections', value: metaParts.join('\n'), inline: true });

  // Location
  if (this._config.canShow('showCoordinates', isAdmin) && saveData && saveData.x !== null && saveData.x !== 0) {
    const dir = saveData.rotationYaw !== null ? ` · ${saveData.rotationYaw}°` : '';
    embed.addFields({ name: '📍 Location', value: `${Math.round(saveData.x)}, ${Math.round(saveData.y)}, ${Math.round(saveData.z)}${dir}`, inline: true });
  }

  // Horses + Companions (combined)
  if (this._config.canShow('showHorses', isAdmin) && saveData) {
    const animalLines = [];

    if (saveData.horses?.length > 0) {
      for (const h of saveData.horses) {
        const hName = h.displayName || h.name || _cleanItemName(h.class || 'Horse');
        const parts = [];
        if (h.health != null) {
          const hpStr = h.maxHealth > 0 ? `${Math.round(h.health)}/${Math.round(h.maxHealth)}` : `${Math.round(h.health)}`;
          parts.push(`HP: ${hpStr}`);
        }
        if (h.energy != null) parts.push(`E: ${Math.round(h.energy)}`);
        const invItems = [...(h.saddleInventory || []), ...(h.inventory || [])]
          .filter(i => i?.item)
          .map(i => _cleanItemName(i.item));
        if (invItems.length > 0) parts.push(`${invItems.length} items`);
        animalLines.push(`🐴 **${hName}** — ${parts.join(' · ') || 'No stats'}`);
      }
    }

    if (saveData.companionData?.length > 0) {
      for (const c of saveData.companionData) {
        const cName = c.displayName || c.name || _cleanItemName(c.class || 'Companion');
        const hp = c.health != null ? ` — HP: ${Math.round(c.health)}` : '';
        animalLines.push(`🐕 **${cName}**${hp}`);
      }
    }

    if (animalLines.length > 0) {
      embed.addFields({ name: '🐾 Animals', value: animalLines.join('\n').substring(0, 1024) });
    }
  }

  // Anti-Cheat Flags (admin only)
  if (isAdmin && logData?.cheatFlags && logData.cheatFlags.length > 0) {
    const flagLines = logData.cheatFlags.slice(-5).map(f => {
      const d = new Date(f.timestamp);
      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: this._config.botTimezone });
      return `${dateStr} — \`${f.type}\``;
    });
    if (logData.cheatFlags.length > 5) flagLines.unshift(`*Showing last 5 of ${logData.cheatFlags.length} flags*`);
    embed.addFields({ name: '🚩 Anti-Cheat Flags', value: flagLines.join('\n') });
  }

  return embed;
}

// ─── Exports ─────────────────────────────────────────────────────────
module.exports = {
  _buildOverviewEmbed,
  _buildPlayerRow,
  _buildClanRow,
  buildClanEmbed,
  buildFullPlayerEmbed,
};
