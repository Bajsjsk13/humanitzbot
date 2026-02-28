/**
 * Server-status embed builders — presentation layer.
 *
 * Builds the Discord embeds for the live server-status channel.
 * All display helpers are imported from server-display.js (single source of truth).
 *
 * Mixed into ServerStatus.prototype by server-status.js.
 */

const { EmbedBuilder } = require('discord.js');
const {
  formatTime: _formatTime,
  weatherEmoji: _weatherEmoji,
  seasonEmoji: _seasonEmoji,
  timeEmoji: _timeEmoji,
  progressBar: _progressBar,
  buildScheduleField: _buildScheduleField,
  buildSettingsFields: _buildSettingsFields,
  buildLootScarcity: _buildLootScarcity,
  buildWeatherOdds: _buildWeatherOdds,
  buildResourceField: _buildResourceField,
} = require('../server/server-display');

/**
 * Build the "online" server-status embed.
 * @param {object|null} info  - RCON server info (name, players, time, etc.)
 * @param {object|null} playerList - RCON player list ({ count, players })
 * @param {object|null} resources  - Host resource stats (CPU, RAM, disk)
 * @returns {EmbedBuilder}
 */
function _buildEmbed(info, playerList, resources) {
  const serverTag = this._config.serverName ? ` — ${this._config.serverName}` : '';
  const embed = new EmbedBuilder()
    .setTitle(`HumanitZ Server Status${serverTag}`)
    .setColor(0x2ecc71)
    .setTimestamp()
    .setFooter({ text: 'Last updated' });

  if (!info || !playerList) {
    embed.setDescription('Fetching server data...');
    return embed;
  }

  // Server name + status line
  const host = this._config.publicHost || this._config.rconHost || 'unknown';
  const port = this._config.gamePort || null;
  const connectStr = port ? `${host}:${port}` : host;
  const descParts = [];
  if (info.name) descParts.push(`**${info.name}**`);

  let uptimeStr = '';
  // Prefer panel API container uptime (actual server process) over bot tracking
  if (resources?.uptime != null) {
    const { formatUptime: fmtUp } = require('../server/server-resources');
    const up = fmtUp(resources.uptime);
    if (up) uptimeStr = ` · Uptime: ${up}`;
  } else if (this._onlineSince) {
    const ms = Date.now() - this._onlineSince.getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) {
      uptimeStr = ` · Uptime: ${mins}m`;
    } else {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      uptimeStr = ` · Uptime: ${hrs}h ${rem}m`;
    }
  }

  descParts.push(`🟢 **Online**${uptimeStr}\n\`${connectStr}\``);
  embed.setDescription(descParts.join('\n'));

  // ── World Info (inline row) ──
  let playerCount = '--';
  let playerBar = '';
  if (info.players != null) {
    const max = parseInt(info.maxPlayers, 10) || 0;
    const cur = parseInt(info.players, 10) || 0;
    playerCount = max ? `${cur} / ${max}` : `${cur}`;
    if (max > 0) playerBar = `\n${_progressBar(cur / max, 12)}`;
  } else {
    playerCount = `${playerList.count}`;
  }

  const time = _formatTime(info.time) || '--';

  // Always load settings — save-derived fields are needed for day/season/weather/world stats fallbacks
  const settings = this._loadServerSettings();

  // Season & weather: prefer RCON, fall back to save-derived values
  const season = info.season || settings._currentSeason || '--';
  const weather = info.weather || settings._currentWeather || '--';

  embed.addFields(
    { name: '👥 Players Online', value: `${playerCount}${playerBar}`, inline: true },
    { name: `${_timeEmoji(time)}Time`, value: time, inline: true },
  );

  // Day number — prefer RCON, fall back to save file world state written by player-stats-channel
  const dayValue = info.day || (settings._daysPassed != null ? String(Math.floor(settings._daysPassed)) : null);
  if (this._config.showServerDay && dayValue) {
    embed.addFields({ name: '📅 Day', value: dayValue, inline: true });
  }

  // Season progress: compute day within current season
  let seasonDisplay = `${_seasonEmoji(season)}${season}`;
  if (this._config.showSeasonProgress && settings.DaysPerSeason) {
    const dps = parseInt(settings.DaysPerSeason, 10);
    // Prefer save-file currentSeasonDay (exact), fall back to manual calculation from total days
    if (dps > 0 && settings._currentSeasonDay != null) {
      const dayInSeason = Math.floor(settings._currentSeasonDay) + 1; // save is 0-indexed
      seasonDisplay = `${_seasonEmoji(season)}${season} (Day ${dayInSeason}/${dps})`;
    } else if (dps > 0 && dayValue) {
      const day = parseInt(dayValue, 10);
      if (day > 0) {
        const dayInSeason = ((day - 1) % dps) + 1;
        seasonDisplay = `${_seasonEmoji(season)}${season} (Day ${dayInSeason}/${dps})`;
      }
    }
  }

  embed.addFields(
    { name: '🌍 Season / Weather', value: `${seasonDisplay} · ${_weatherEmoji(weather)}${weather}`, inline: true },
  );

  // FPS + AI (from RCON info)
  if (this._config.showServerPerformance) {
    const perfParts = [];
    if (info.fps) perfParts.push(`FPS: **${info.fps}**`);
    if (info.ai) perfParts.push(`AI: **${info.ai}**`);
    if (perfParts.length > 0) {
      embed.addFields({ name: '⚡ Performance', value: perfParts.join('  ·  '), inline: true });
    }
  }

  // Version (from RCON info)
  if (this._config.showServerVersion && info.version) {
    embed.addFields({ name: '📋 Version', value: info.version, inline: true });
  }

  // Host Resources (from panel API or SSH)
  if (this._config.showHostResources && resources) {
    embed.addFields(..._buildResourceField(resources));
  }

  // ── Online Players ──
  if (playerList.players && playerList.players.length > 0) {
    const names = playerList.players.map(p => p.name).join(', ');
    embed.addFields({ name: '🎮 Online Now', value: names.substring(0, 1024) });
  } else {
    embed.addFields({ name: '🎮 Online Now', value: '*No players online*' });
  }

  // ── Server Settings (from GameServerSettings.ini) ──
  if (this._config.showServerSettings && Object.keys(settings).length > 0) {
    const settingsFields = _buildSettingsFields(settings, this._config);
    if (settingsFields.length > 0) {
      embed.addFields(...settingsFields);
    }
  }

  // ── Loot Scarcity + Weather Odds (side by side) ──
  {
    const lootLine = this._config.showLootScarcity && Object.keys(settings).length > 0
      ? _buildLootScarcity(settings) : null;
    const weatherLine = this._config.showWeatherOdds && Object.keys(settings).length > 0
      ? _buildWeatherOdds(settings) : null;
    if (lootLine && weatherLine) {
      embed.addFields(
        { name: '📦 Loot Scarcity', value: lootLine, inline: true },
        { name: '🌤️ Weather Odds', value: weatherLine, inline: true },
      );
    } else if (lootLine) {
      embed.addFields({ name: '📦 Loot Scarcity', value: lootLine });
    } else if (weatherLine) {
      embed.addFields({ name: '🌤️ Weather Odds', value: weatherLine });
    }
  }

  // ── Top 3 Playtime ──
  const leaderboard = this._playtime.getLeaderboard();
  if (leaderboard.length > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const top3 = leaderboard.slice(0, 3).map((entry, i) => {
      return `${medals[i]} **${entry.name}** — ${entry.totalFormatted}`;
    });
    embed.addFields({ name: '⏱️ Top Playtime', value: top3.join('\n') });
  }

  // ── World Stats (from save file) ──
  if (this._config.showWorldStats) {
    const worldParts = [];
    if (settings._totalPlayers != null) worldParts.push(`👥 Players: **${settings._totalPlayers}**`);
    if (settings._totalZombieKills != null) worldParts.push(`🧟 Zombies Killed: **${settings._totalZombieKills.toLocaleString()}**`);
    if (settings._totalStructures != null) worldParts.push(`🏗️ Structures: **${settings._totalStructures.toLocaleString()}**`);
    if (settings._totalVehicles != null) worldParts.push(`🚗 Vehicles: **${settings._totalVehicles}**`);
    if (settings._totalCompanions != null && settings._totalCompanions > 0) worldParts.push(`🐕 Companions: **${settings._totalCompanions}**`);
    if (worldParts.length > 0) {
      embed.addFields({ name: '🌎 World Stats', value: worldParts.join('  ·  ') });
    }
  }

  // ── Player Activity Stats ──
  const allTracked = this._playerStats.getAllPlayers();
  if (allTracked.length > 0) {
    const totalDeaths = allTracked.reduce((s, p) => s + p.deaths, 0);
    const totalBuilds = allTracked.reduce((s, p) => s + p.builds, 0);
    const totalLoots = allTracked.reduce((s, p) => s + p.containersLooted, 0);
    const parts = [
      `💀 Deaths: **${totalDeaths}**`,
      `🔨 Builds: **${totalBuilds}**`,
      `📦 Looted: **${totalLoots}**`,
    ];
    if (this._config.showRaidStats) {
      const totalRaids = allTracked.reduce((s, p) => s + p.raidsOut, 0);
      parts.push(`⚔️ Raids: **${totalRaids}**`);
    }
    embed.addFields({ name: `📊 Activity (${allTracked.length} players)`, value: parts.join('  ·  ') });
  }

  // ── Dynamic Difficulty Schedule ──
  const schedField = _buildScheduleField(this._config);
  if (schedField) {
    embed.addFields(schedField);
  }

  // ── Server Statistics ──
  const peaks = this._playtime.getPeaks();
  const trackingSince = new Date(this._playtime.getTrackingSince()).toLocaleDateString('en-GB', { timeZone: this._config.botTimezone });
  const peakDate = peaks.allTimePeakDate
    ? ` (${new Date(peaks.allTimePeakDate).toLocaleDateString('en-GB', { timeZone: this._config.botTimezone })})`
    : '';

  embed.addFields(
    { name: "📈 Today's Peak", value: `${peaks.todayPeak} online · ${peaks.uniqueToday} unique`, inline: true },
    { name: '🏆 Peak Online', value: `${peaks.allTimePeak}${peakDate}`, inline: true },
  );

  embed.setFooter({ text: `Tracking since ${trackingSince} · Last updated` });

  return embed;
}

/**
 * Build an offline-state embed showing connection details + cached data.
 * Shown when RCON cannot reach the server.
 */
async function _buildOfflineEmbed() {
  const serverTag = this._config.serverName ? ` — ${this._config.serverName}` : '';
  const embed = new EmbedBuilder()
    .setTitle(`HumanitZ Server Status${serverTag}`)
    .setColor(0xe74c3c) // red
    .setTimestamp()
    .setFooter({ text: 'Last updated' });

  // Connection info
  const host = this._config.publicHost || this._config.rconHost || 'unknown';
  const port = this._config.gamePort || null;
  const connectStr = port ? `\`${host}:${port}\`` : `\`${host}\``;

  // Offline duration
  let downtime = '';
  if (this._offlineSince) {
    const ms = Date.now() - this._offlineSince.getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) {
      downtime = ` (${mins}m)`;
    } else {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      downtime = ` (${hrs}h ${rem}m)`;
    }
  }

  // Server name from cached info
  const serverName = this._lastInfo?.name || '';
  const desc = serverName
    ? `**${serverName}**\n\n🔴 **Server Offline**${downtime}`
    : `🔴 **Server Offline**${downtime}`;
  embed.setDescription(desc);

  embed.addFields(
    { name: '🔗 Direct Connect', value: connectStr, inline: true },
  );

  // Show last known server info if we have it
  if (this._lastInfo) {
    const lastInfo = this._lastInfo;
    if (lastInfo.version) {
      embed.addFields({ name: '📋 Version', value: lastInfo.version, inline: true });
    }
  }

  // Host Resources (from panel API or SSH — still works when game is offline)
  if (this._config.showHostResources && this._serverResources.backend) {
    try {
      const resources = await this._serverResources.getResources();
      if (resources) embed.addFields(_buildResourceField(resources));
    } catch (_) {}
  }

  // Cached server settings still available (loaded from file, not RCON)
  const settings = (this._config.showServerSettings || this._config.showLootScarcity)
    ? this._loadServerSettings() : {};

  if (this._config.showServerSettings && Object.keys(settings).length > 0) {
    const settingsFields = _buildSettingsFields(settings, this._config);
    if (settingsFields.length > 0) {
      embed.addFields(...settingsFields);
    }
  }

  // Loot Scarcity + Weather Odds (side by side)
  {
    const lootLine = this._config.showLootScarcity && Object.keys(settings).length > 0
      ? _buildLootScarcity(settings) : null;
    const weatherLine = this._config.showWeatherOdds && Object.keys(settings).length > 0
      ? _buildWeatherOdds(settings) : null;
    if (lootLine && weatherLine) {
      embed.addFields(
        { name: '📦 Loot Scarcity', value: lootLine, inline: true },
        { name: '🌤️ Weather Odds', value: weatherLine, inline: true },
      );
    } else if (lootLine) {
      embed.addFields({ name: '📦 Loot Scarcity', value: lootLine });
    } else if (weatherLine) {
      embed.addFields({ name: '🌤️ Weather Odds', value: weatherLine });
    }
  }

  // Playtime leaderboard (persisted locally, survives outage)
  const leaderboard = this._playtime.getLeaderboard();
  if (leaderboard.length > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const top3 = leaderboard.slice(0, 3).map((entry, i) => {
      return `${medals[i]} **${entry.name}** — ${entry.totalFormatted}`;
    });
    embed.addFields({ name: '⏱️ Top Playtime', value: top3.join('\n') });
  }

  // Activity stats (persisted locally)
  const allTracked = this._playerStats.getAllPlayers();
  if (allTracked.length > 0) {
    const totalDeaths = allTracked.reduce((s, p) => s + p.deaths, 0);
    const totalBuilds = allTracked.reduce((s, p) => s + p.builds, 0);
    const totalLoots = allTracked.reduce((s, p) => s + p.containersLooted, 0);
    const parts = [
      `💀 Deaths: **${totalDeaths}**`,
      `🔨 Builds: **${totalBuilds}**`,
      `📦 Looted: **${totalLoots}**`,
    ];
    if (this._config.showRaidStats) {
      const totalRaids = allTracked.reduce((s, p) => s + p.raidsOut, 0);
      parts.push(`⚔️ Raids: **${totalRaids}**`);
    }
    embed.addFields({ name: `📊 Activity (${allTracked.length} players)`, value: parts.join('  ·  ') });
  }

  // Peak stats (persisted locally)
  const peaks = this._playtime.getPeaks();
  const trackingSince = new Date(this._playtime.getTrackingSince()).toLocaleDateString('en-GB', { timeZone: this._config.botTimezone });

  embed.addFields(
    { name: "📈 Today's Peak", value: `${peaks.todayPeak} online · ${peaks.uniqueToday} unique`, inline: true },
    { name: '🏆 Peak Online', value: `${peaks.allTimePeak}`, inline: true },
  );

  embed.setFooter({ text: `Tracking since ${trackingSince} · Last updated` });

  return embed;
}

module.exports = { _buildEmbed, _buildOfflineEmbed };
