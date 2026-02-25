/* HumanitZ Server Panel — panel.js v3 */
(function () {
  'use strict';

  // ──── State ────
  const S = {
    user: null,
    tier: 0,
    currentTab: 'dashboard',
    players: [],
    toggles: {},
    worldBounds: null,
    map: null,
    mapMarkers: {},
    mapReady: false,
    scheduleData: null,
    settingsOriginal: {},
    settingsChanged: {},
    consoleBuf: [],
    viewMode: 'admin',
    pollTimers: [],
    playerSort: { col: 'online', dir: 'desc' },
  };

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // ──── Comprehensive setting categories (matches actual HumanitZ server keys) ────
  const SETTING_CATEGORIES = {
    Server: ['ServerName', 'MaxPlayers', 'SaveName', 'SearchID', 'Version', 'NoJoinFeedback', 'NoDeathFeedback', 'LimitedSpawns', 'Voip'],
    Gameplay: ['PVP', 'DaysPerSeason', 'StartingSeason', 'XpMultiplier', 'AirDrop', 'AirDropInterval', 'AIEvent', 'EagleEye', 'ClearInfection', 'MultiplayerSleep', 'FreezeTime', 'MaxOwnedCars', 'Territory', 'PermaDeath', 'OnDeath'],
    'Day / Night': ['DayDur', 'NightDur', 'Seg0', 'Seg1', 'Seg2'],
    Survival: ['VitalDrain', 'FoodDecay', 'Sleep', 'GenFuel', 'WeaponBreak', 'RespawnTimer'],
    Building: ['AllowDismantle', 'AllowHouseDismantle', 'BuildingHealth', 'BuildingDecay', 'Decay', 'FakeBuildingCleanup'],
    Companions: ['DogEnabled', 'RecruitDog', 'DogNum', 'CompanionHealth', 'CompanionDmg'],
    Zombies: ['ZombieAmountMulti', 'ZombieDiffHealth', 'ZombieDiffSpeed', 'ZombieDiffDamage', 'ZombieRespawnTimer', 'ZombieDogMulti'],
    'Humans (NPC)': ['HumanAmountMulti', 'HumanHealth', 'HumanSpeed', 'HumanDamage', 'HumanRespawnTimer'],
    Animals: ['AnimalMulti', 'AnimalRespawnTimer'],
    Loot: ['LootRespawn', 'LootRespawnTimer', 'PickupRespawnTimer', 'PickupCleanup', 'SaveIntervalSec'],
    'Loot Rarity': ['RarityFood', 'RarityDrink', 'RarityMelee', 'RarityRanged', 'RarityAmmo', 'RarityArmor', 'RarityResources', 'RarityOther'],
    Weather: ['Weather_ClearSky', 'Weather_Cloudy', 'Weather_Foggy', 'Weather_LightRain', 'Weather_Rain', 'Weather_Thunderstorm', 'Weather_LightSnow', 'Weather_Snow', 'Weather_Blizzard'],
  };

  const SETTING_DESCS = {
    ServerName: 'Display name of the server', MaxPlayers: 'Maximum concurrent players', SaveName: 'Save file name',
    SearchID: 'Server search identifier', Version: 'Server version',
    NoJoinFeedback: 'Hide join notifications in-game', NoDeathFeedback: 'Hide death notifications in-game',
    LimitedSpawns: 'Restrict spawn point choices', Voip: 'Voice chat enabled',
    PVP: 'Player vs player damage', DaysPerSeason: 'In-game days per season (4 seasons = 1 year)',
    StartingSeason: 'Season index at world start', XpMultiplier: 'Experience gain multiplier',
    AirDrop: 'Air drops enabled', AirDropInterval: 'Minutes between air drops',
    AIEvent: 'Random AI events enabled', EagleEye: 'Eagle Eye perk available',
    ClearInfection: 'Allow curing infection', MultiplayerSleep: 'All players must sleep to skip night',
    FreezeTime: 'Freeze the day/night cycle', MaxOwnedCars: 'Max vehicles per player',
    Territory: 'Territory protection enabled', PermaDeath: 'Permanent death mode',
    OnDeath: 'What happens on death (0=keep, 1=drop, 2=destroy)',
    DayDur: 'Daytime duration (minutes)', NightDur: 'Nighttime duration (minutes)',
    Seg0: 'Day segment 0', Seg1: 'Day segment 1', Seg2: 'Day segment 2',
    VitalDrain: 'Hunger/thirst/stamina drain rate', FoodDecay: 'Food spoilage enabled',
    Sleep: 'Sleep mechanic enabled', GenFuel: 'Generator fuel consumption',
    WeaponBreak: 'Weapons can break', RespawnTimer: 'Respawn cooldown (seconds)',
    AllowDismantle: 'Dismantle player structures', AllowHouseDismantle: 'Dismantle pre-built houses',
    BuildingHealth: 'Structure health multiplier', BuildingDecay: 'Structure decay rate',
    Decay: 'General decay rate', FakeBuildingCleanup: 'Clean up invalid structures',
    DogEnabled: 'Dog companions enabled', RecruitDog: 'Can recruit dogs', DogNum: 'Max dogs in world',
    CompanionHealth: 'Companion health multiplier', CompanionDmg: 'Companion damage multiplier',
    ZombieAmountMulti: 'Zombie spawn density', ZombieDiffHealth: 'Zombie health multiplier',
    ZombieDiffSpeed: 'Zombie speed multiplier', ZombieDiffDamage: 'Zombie damage multiplier',
    ZombieRespawnTimer: 'Zombie respawn (seconds)', ZombieDogMulti: 'Zombie dog spawn multiplier',
    HumanAmountMulti: 'Hostile human spawn density', HumanHealth: 'Human NPC health',
    HumanSpeed: 'Human NPC speed', HumanDamage: 'Human NPC damage',
    HumanRespawnTimer: 'Human NPC respawn time', AnimalMulti: 'Animal spawn density',
    AnimalRespawnTimer: 'Animal respawn time', LootRespawn: 'Loot respawning enabled',
    LootRespawnTimer: 'Loot respawn (seconds)', PickupRespawnTimer: 'Pickup respawn (seconds)',
    PickupCleanup: 'Clean up old pickups', SaveIntervalSec: 'Auto-save interval (seconds)',
    RarityFood: 'Food loot weight', RarityDrink: 'Drink loot weight',
    RarityMelee: 'Melee weapon weight', RarityRanged: 'Ranged weapon weight',
    RarityAmmo: 'Ammo weight', RarityArmor: 'Armor weight',
    RarityResources: 'Resource weight', RarityOther: 'Misc loot weight',
    Weather_ClearSky: 'Clear sky weight', Weather_Cloudy: 'Cloudy weight',
    Weather_Foggy: 'Fog weight', Weather_LightRain: 'Light rain weight',
    Weather_Rain: 'Rain weight', Weather_Thunderstorm: 'Thunderstorm weight',
    Weather_LightSnow: 'Light snow weight', Weather_Snow: 'Snow weight',
    Weather_Blizzard: 'Blizzard weight',
  };

  const DB_TABLES = [
    { value: 'activity_log', label: 'Activity Log' },
    { value: 'chat_log', label: 'Chat Log' },
    { value: 'players', label: 'Players' },
    { value: 'player_aliases', label: 'Player Aliases' },
    { value: 'clans', label: 'Clans' },
    { value: 'clan_members', label: 'Clan Members' },
    { value: 'world_state', label: 'World State' },
    { value: 'structures', label: 'Structures' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'companions', label: 'Companions' },
    { value: 'world_horses', label: 'Horses' },
    { value: 'containers', label: 'Containers' },
    { value: 'server_settings', label: 'Server Settings' },
    { value: 'snapshots', label: 'Snapshots' },
    { value: 'game_items', label: 'Game Items' },
    { value: 'game_professions', label: 'Professions' },
    { value: 'game_afflictions', label: 'Afflictions' },
    { value: 'game_skills', label: 'Skills' },
    { value: 'game_challenges', label: 'Challenges' },
  ];

  // ──── Init ────
  document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/auth/me');
    S.user = await res.json();
    S.tier = S.user.tierLevel || 0;
    if (!S.user.authenticated) showLanding();
    else showPanel();
  });

  // ══════════════════════════════════════════════════
  //  LANDING PAGE
  // ══════════════════════════════════════════════════

  function showLanding() {
    $('#landing').classList.remove('hidden');
    $('#panel').classList.add('hidden');
    loadLanding();
  }

  async function loadLanding() {
    try {
      const r = await fetch('/api/landing');
      const d = await r.json();
      const p = d.primary;

      $('#landing-server-name').textContent = p.name || 'HumanitZ Server';

      const isOn = p.status === 'online';
      const dot = $('#ls-status-dot');
      const txt = $('#ls-status-text');
      dot.className = 'w-2 h-2 rounded-full ' + (isOn ? 'bg-calm pulse-dot' : 'bg-muted');
      txt.textContent = isOn ? 'Online' : 'Offline';
      txt.className = 'text-sm ' + (isOn ? 'text-calm' : 'text-muted');

      if (p.host) {
        const addr = p.gamePort ? p.host + ':' + p.gamePort : p.host;
        $('#landing-address').textContent = addr;
        $('#landing-connect').classList.remove('hidden');
      }

      const onlineStr = isOn ? p.onlineCount + ' / ' + (p.maxPlayers || '?') : 'Offline';
      const offlineCount = (p.totalPlayers || 0) - (p.onlineCount || 0);
      $('#ls-players').textContent = onlineStr + ' online \u00b7 ' + offlineCount + ' offline \u00b7 ' + p.totalPlayers + ' total';

      const worldParts = [];
      if (p.gameTime) worldParts.push(p.gameTime);
      if (p.gameDay != null) {
        const dps = 28;
        const seasonNames = ['Spring', 'Summer', 'Autumn', 'Winter'];
        const seasonNum = Math.floor((p.gameDay % (dps * 4)) / dps);
        const dayInSeason = (p.gameDay % dps) + 1;
        const year = Math.floor(p.gameDay / (dps * 4)) + 1;
        worldParts.push('Day ' + dayInSeason + ' of ' + (p.season || seasonNames[seasonNum]));
        worldParts.push('Year ' + year);
      }
      $('#ls-world').textContent = worldParts.length ? worldParts.join(' \u00b7 ') : '-';

      if (d.schedule && d.schedule.active) {
        S.scheduleData = d.schedule;
        $('#landing-schedule').classList.remove('hidden');
        var tzEl = $('#ls-tz');
        if (tzEl) tzEl.textContent = d.schedule.timezone || '';
        renderSchedule($('#ls-schedule-list'), d.schedule, 'landing');
        if (d.schedule.nextRestart) {
          var mins = d.schedule.minutesUntilRestart;
          var hrs = Math.floor(mins / 60);
          var m = mins % 60;
          var untilStr = hrs > 0 ? hrs + 'h ' + m + 'm' : m + 'm';
          $('#ls-next-restart').textContent = 'Next transition in ' + untilStr + ' at ' + d.schedule.nextRestart;
        }
        if (d.schedule.rotateDaily) {
          var rn = $('#ls-rotate-note');
          if (rn) rn.classList.remove('hidden');
        }
      }

      if (d.servers && d.servers.length) {
        var container = $('#server-cards');
        container.innerHTML = '';
        for (var si = 0; si < d.servers.length; si++) {
          var s = d.servers[si];
          var card = el('div', 'stat-chip flex items-center justify-between');
          card.innerHTML = '<div><div class="text-sm text-white font-medium">' + esc(s.name) + '</div><div class="text-xs text-muted">' + s.totalPlayers + ' players</div></div><span class="status-dot ' + (s.status === 'online' ? 'online' : 'offline') + '"></span>';
          container.appendChild(card);
        }
        $('#landing-servers').classList.remove('hidden');
      }

      var discordLink = $('#link-discord');
      if (discordLink) {
        var inviteUrl = p.discordInvite || '';
        if (inviteUrl) {
          discordLink.href = inviteUrl.startsWith('http') ? inviteUrl : 'https://' + inviteUrl;
          $('#landing-links').classList.remove('hidden');
        } else {
          $('#landing-links').classList.remove('hidden');
          discordLink.style.display = 'none';
          if (discordLink.nextElementSibling) discordLink.nextElementSibling.remove();
        }
      }
    } catch (e) {
      console.error('Landing fetch error:', e);
      $('#ls-status-text').textContent = 'Error';
    }
  }

  // ══════════════════════════════════════════════════
  //  PANEL
  // ══════════════════════════════════════════════════

  function showPanel() {
    $('#landing').classList.add('hidden');
    $('#panel').classList.remove('hidden');

    if (S.user.avatar) {
      var av = $('#user-avatar');
      av.src = S.user.avatar;
      av.classList.remove('hidden');
    }
    $('#user-name').textContent = S.user.displayName || S.user.username || '-';
    $('#user-tier').textContent = S.user.tier || '-';

    $$('[data-min-tier]').forEach(function(el) {
      var min = parseInt(el.dataset.minTier, 10);
      if (S.tier < min) el.classList.add('tier-hidden');
    });

    var userBlock = $('#user-block');
    if (userBlock && S.tier >= 3) userBlock.addEventListener('click', toggleViewMode);

    $$('.nav-link').forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        if (link.classList.contains('tier-hidden')) return;
        switchTab(link.dataset.tab);
      });
    });

    setupCopyBtn('#copy-address-btn', '#landing-address');
    setupCopyBtn('#d-copy-btn', '#d-address');

    var chatSendBtn = $('#chat-send-btn');
    if (chatSendBtn) {
      chatSendBtn.addEventListener('click', function() { sendChat(); });
      var chatInput = $('#chat-msg-input');
      if (chatInput) chatInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendChat(); });
    }

    var rconSendBtn = $('#rcon-send-btn');
    if (rconSendBtn) {
      rconSendBtn.addEventListener('click', function() { sendRcon(); });
      var rconInput = $('#rcon-input');
      if (rconInput) rconInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendRcon(); });
    }
    var clearBtn = $('#console-clear-btn');
    if (clearBtn) clearBtn.addEventListener('click', function() {
      S.consoleBuf = [];
      var out = $('#console-output');
      if (out) out.innerHTML = '<div class="console-line sys">Console cleared</div>';
    });

    var cmdBtn = $('#cmd-helper-btn');
    var cmdList = $('#cmd-helper-list');
    if (cmdBtn && cmdList) {
      cmdBtn.addEventListener('click', function() { cmdList.classList.toggle('hidden'); });
      document.addEventListener('click', function(e) {
        var wrap = $('#cmd-helper-wrap');
        if (wrap && !wrap.contains(e.target)) cmdList.classList.add('hidden');
      });
      $$('.cmd-item', cmdList).forEach(function(item) {
        item.addEventListener('click', function() {
          var input = $('#rcon-input');
          if (input) { input.value = item.dataset.cmd; input.focus(); }
          cmdList.classList.add('hidden');
        });
      });
    }

    $$('[data-action]').forEach(function(btn) {
      if (btn.classList.contains('quick-cmd')) return;
      btn.addEventListener('click', function() { doPowerAction(btn.dataset.action); });
    });

    $$('.quick-cmd[data-cmd]').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        try {
          var r = await fetch('/api/panel/rcon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: btn.dataset.cmd }) });
          var d = await r.json();
          appendConsole(btn.dataset.cmd, 'cmd');
          appendConsole(d.response || d.error || 'No response', d.ok ? 'resp' : 'err');
        } catch (e) { appendConsole('Error: ' + e.message, 'err'); }
      });
    });

    var ps = $('#player-search');
    if (ps) ps.addEventListener('input', renderPlayerTable);
    var pso = $('#player-sort');
    if (pso) pso.addEventListener('change', renderPlayerTable);

    var pmc = $('#player-modal-close');
    if (pmc) pmc.addEventListener('click', function() { var m = $('#player-modal'); if (m) m.classList.add('hidden'); });
    var pm = $('#player-modal');
    if (pm) pm.addEventListener('click', function(e) { if (e.target.id === 'player-modal') e.target.classList.add('hidden'); });

    var mdc = $('#map-detail-close');
    if (mdc) mdc.addEventListener('click', function() { var p = $('#map-player-detail'); if (p) p.classList.add('hidden'); });

    var ms = $('#map-search');
    if (ms) ms.addEventListener('input', filterMapPlayers);
    var mso = $('#map-show-offline');
    if (mso) mso.addEventListener('change', function() { updateMapMarkers(); filterMapPlayers(); });

    var af = $('#activity-filter');
    if (af) af.addEventListener('change', loadActivity);
    var as = $('#activity-search');
    if (as) as.addEventListener('input', loadActivity);
    var ad = $('#activity-date');
    if (ad) ad.addEventListener('change', loadActivity);

    var ss = $('#settings-search');
    if (ss) ss.addEventListener('input', filterSettings);
    var sb = $('#settings-save-btn');
    if (sb) sb.addEventListener('click', saveSettings);

    var dbt = $('#db-table');
    if (dbt) dbt.addEventListener('change', loadDatabase);
    var dbs = $('#db-search');
    if (dbs) dbs.addEventListener('input', debounce(loadDatabase, 300));
    var dbl = $('#db-limit');
    if (dbl) dbl.addEventListener('change', loadDatabase);

    // Populate DB table selector
    var dbSelect = $('#db-table');
    if (dbSelect) {
      dbSelect.innerHTML = '';
      for (var i = 0; i < DB_TABLES.length; i++) {
        var opt = document.createElement('option');
        opt.value = DB_TABLES[i].value;
        opt.textContent = DB_TABLES[i].label;
        dbSelect.appendChild(opt);
      }
    }

    // Preload players for click-to-profile on any tab
    loadPlayersInBackground();

    switchTab('dashboard');
  }

  async function loadPlayersInBackground() {
    try {
      var r = await fetch('/api/players');
      if (!r.ok) return;
      var d = await r.json();
      S.players = d.players || [];
      S.toggles = d.toggles || {};
      S.worldBounds = d.worldBounds || null;
    } catch (e) { /* silent */ }
  }

  function toggleViewMode() {
    if (S.tier < 3) return;
    S.viewMode = S.viewMode === 'admin' ? 'survivor' : 'admin';
    var badge = $('#view-mode-badge');
    if (badge) badge.classList.toggle('hidden', S.viewMode === 'admin');
    $$('[data-min-tier]').forEach(function(el) {
      var min = parseInt(el.dataset.minTier, 10);
      var effectiveTier = S.viewMode === 'survivor' ? 1 : S.tier;
      if (effectiveTier < min) el.classList.add('tier-hidden');
      else el.classList.remove('tier-hidden');
    });
  }

  function switchTab(tab) {
    S.currentTab = tab;
    $$('.tab-content').forEach(function(s) { s.classList.add('hidden'); });
    var tabEl = $('#tab-' + tab);
    if (tabEl) tabEl.classList.remove('hidden');
    $$('.nav-link').forEach(function(l) { l.classList.toggle('active', l.dataset.tab === tab); });

    S.pollTimers.forEach(clearInterval);
    S.pollTimers = [];

    switch (tab) {
      case 'dashboard': loadDashboard(); S.pollTimers.push(setInterval(loadDashboard, 30000)); break;
      case 'map': initMap(); loadMapData(); S.pollTimers.push(setInterval(loadMapData, 15000)); break;
      case 'players': loadPlayers(); break;
      case 'clans': loadClans(); break;
      case 'activity': loadActivity(); break;
      case 'chat': loadChat(); S.pollTimers.push(setInterval(loadChat, 8000)); break;
      case 'settings': loadSettings(); break;
      case 'database': loadDatabase(); break;
      case 'items': loadItems(); break;
    }
  }

  // ══════════════════════════════════════════════════
  //  DASHBOARD
  // ══════════════════════════════════════════════════

  async function loadDashboard() {
    try {
      var results = await Promise.all([fetch('/api/panel/status'), fetch('/api/panel/stats')]);
      var status = await results[0].json();
      var stats = await results[1].json();

      var isOn = status.serverState === 'running';
      var stEl = $('#d-status');
      if (stEl) { stEl.textContent = isOn ? 'Online' : 'Offline'; stEl.style.color = isOn ? '#34d399' : '#f87171'; }

      var onEl = $('#d-online');
      if (onEl) onEl.textContent = stats.onlinePlayers + ' / ' + (status.maxPlayers || '?');

      var totEl = $('#d-total');
      if (totEl) {
        var offline = (stats.totalPlayers || 0) - (stats.onlinePlayers || 0);
        totEl.textContent = stats.totalPlayers + ' (' + offline + ' offline)';
      }

      var wEl = $('#d-world');
      if (wEl) {
        var parts = [];
        if (status.gameTime) parts.push(status.gameTime);
        if (status.gameDay != null) {
          var dps = 28;
          var dayInSeason = (status.gameDay % dps) + 1;
          var year = Math.floor(status.gameDay / (dps * 4)) + 1;
          var seasonNames = ['Spring', 'Summer', 'Autumn', 'Winter'];
          var seasonNum = Math.floor((status.gameDay % (dps * 4)) / dps);
          parts.push('Day ' + dayInSeason + ' of ' + (status.season || seasonNames[seasonNum]));
          parts.push('Year ' + year);
        }
        wEl.textContent = parts.length ? parts.join(' \u00b7 ') : '-';
      }

      var evEl = $('#d-events');
      if (evEl) evEl.textContent = fmtNum(stats.eventsToday || 0);

      var tzEl = $('#d-tz');
      if (tzEl && status.timezone) tzEl.textContent = status.timezone;

      try {
        var landing = await fetch('/api/landing');
        var ld = await landing.json();
        if (ld.primary.host) {
          var addr = ld.primary.gamePort ? ld.primary.host + ':' + ld.primary.gamePort : ld.primary.host;
          var dAddr = $('#d-address');
          if (dAddr) dAddr.textContent = addr;
          var dc = $('#dashboard-connect');
          if (dc) dc.classList.remove('hidden');
        }
      } catch (e) { /* ignore */ }

      try {
        var schedRes = await fetch('/api/panel/scheduler');
        var sched = await schedRes.json();
        if (sched.active) {
          S.scheduleData = sched;
          var sc = $('#schedule-card');
          if (sc) sc.classList.remove('hidden');
          renderSchedule($('#schedule-info'), sched, 'dashboard');
        }
      } catch (e) { /* scheduler unavailable */ }

      if (status.resources && S.tier >= 3 && S.viewMode === 'admin') {
        var rc = $('#resources-card');
        if (rc) rc.classList.remove('hidden');
        renderResources(status.resources, status.uptime);
      }

      try {
        var feeds = await Promise.all([fetch('/api/panel/activity?limit=15'), fetch('/api/panel/chat?limit=15')]);
        var act = await feeds[0].json();
        var chat = await feeds[1].json();
        renderActivityFeed($('#d-activity'), act.events, true);
        renderChatFeed($('#d-chat'), chat.messages, true);
      } catch (e) { /* feeds unavailable */ }
    } catch (e) {
      console.error('Dashboard error:', e);
    }
  }

  // ══════════════════════════════════════════════════
  //  SCHEDULE RENDERER
  // ══════════════════════════════════════════════════

  function renderSchedule(container, sched, context) {
    if (!container || !sched || !sched.todaySchedule) return;
    container.innerHTML = '';
    var profileSettings = sched.profileSettings || {};

    for (var i = 0; i < sched.todaySchedule.length; i++) {
      var slot = sched.todaySchedule[i];
      var isCurrent = slot.profileName === sched.currentProfile;
      var div = el('div', 'sched-slot ' + (isCurrent ? 'active fade-in' : ''));

      var pn = slot.profileName || '';
      var colorCls = pn.includes('calm') ? 'calm' : pn.includes('surge') ? 'surge' : pn.includes('horde') ? 'horde' : '';
      var displayName = pn.charAt(0).toUpperCase() + pn.slice(1);

      var inner = '<span class="sched-time">' + esc(slot.startTime) + '</span>';
      inner += '<span class="sched-name ' + colorCls + '">' + esc(displayName) + '</span>';

      if (isCurrent) {
        inner += '<span class="sched-marker">\u25C6 NOW</span>';
      } else {
        var hint = getRelativeHint(slot, sched);
        if (hint) inner += '<span class="sched-hint">' + hint + '</span>';
      }

      var ps = profileSettings[pn];
      if (ps && Object.keys(ps).length > 0) {
        var tooltip = '<div class="sched-tooltip"><div class="sched-tooltip-title">' + esc(displayName) + ' Settings</div>';
        for (var k in ps) {
          if (!ps.hasOwnProperty(k)) continue;
          tooltip += '<div class="sched-tooltip-row"><span class="stk">' + esc(humanizeSettingKey(k)) + '</span><span class="stv">' + esc(String(ps[k])) + '</span></div>';
        }
        tooltip += '</div>';
        inner += tooltip;
      }

      div.innerHTML = inner;
      container.appendChild(div);

      // Position fixed tooltip on hover
      (function(slotDiv) {
        slotDiv.addEventListener('mouseenter', function() {
          var tt = slotDiv.querySelector('.sched-tooltip');
          if (!tt) return;
          var rect = slotDiv.getBoundingClientRect();
          tt.style.left = rect.left + 'px';
          tt.style.top = (rect.bottom + 4) + 'px';
          // Keep within viewport
          requestAnimationFrame(function() {
            var ttRect = tt.getBoundingClientRect();
            if (ttRect.right > window.innerWidth - 8) tt.style.left = Math.max(8, window.innerWidth - ttRect.width - 8) + 'px';
            if (ttRect.bottom > window.innerHeight - 8) tt.style.top = (rect.top - ttRect.height - 4) + 'px';
          });
        });
      })(div);
    }
  }

  function getRelativeHint(slot, sched) {
    if (!sched.todaySchedule) return '';
    var now = minutesFromTimeStr(getCurrentTimeInTz(sched.timezone));
    var start = minutesFromTimeStr(slot.startTime);
    var diff = start - now;
    if (diff <= 0) return '';
    if (diff < 60) return 'in ' + diff + 'm';
    var h = Math.floor(diff / 60);
    var m = diff % 60;
    return m > 0 ? 'in ' + h + 'h ' + m + 'm' : 'in ' + h + 'h';
  }

  function minutesFromTimeStr(ts) {
    if (!ts) return 0;
    var parts = ts.split(':');
    return parseInt(parts[0], 10) * 60 + (parseInt(parts[1], 10) || 0);
  }

  function getCurrentTimeInTz(tz) {
    try {
      return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' });
    } catch (e) { return new Date().toTimeString().slice(0, 5); }
  }

  // ══════════════════════════════════════════════════
  //  RESOURCES
  // ══════════════════════════════════════════════════

  function renderResources(res, uptime) {
    var container = $('#resources-info');
    if (!container) return;
    container.innerHTML = '';
    var bars = [
      { label: 'CPU', val: res.cpu, cls: 'cpu', fmt: (res.cpu || 0).toFixed(1) + '%' },
      { label: 'Memory', val: res.memPercent, cls: 'mem', fmt: res.memFormatted || (res.memPercent || 0).toFixed(1) + '%' },
      { label: 'Disk', val: res.diskPercent, cls: 'disk', fmt: res.diskFormatted || (res.diskPercent || 0).toFixed(1) + '%' },
    ];
    for (var i = 0; i < bars.length; i++) {
      var b = bars[i];
      var row = el('div', 'space-y-1');
      row.innerHTML = '<div class="flex justify-between text-xs"><span class="text-muted">' + b.label + '</span><span class="text-gray-300">' + b.fmt + '</span></div><div class="res-bar-track"><div class="res-bar-fill ' + b.cls + '" style="width:' + Math.min(b.val || 0, 100) + '%"></div></div>';
      container.appendChild(row);
    }
    if (uptime) {
      var up = el('div', 'flex justify-between text-xs mt-1');
      up.innerHTML = '<span class="text-muted">Uptime</span><span class="text-gray-300">' + esc(uptime) + '</span>';
      container.appendChild(up);
    }
  }

  // ══════════════════════════════════════════════════
  //  MAP
  // ══════════════════════════════════════════════════

  function initMap() {
    if (S.mapReady) return;
    var container = $('#map-container');
    if (!container || !window.L) return;
    S.map = L.map(container, { crs: L.CRS.Simple, minZoom: -2, maxZoom: 3, zoomControl: true, attributionControl: false });
    var bounds = [[0, 0], [4096, 4096]];
    L.imageOverlay('/map-4096.png', bounds).addTo(S.map);
    S.map.fitBounds(bounds);
    S.mapReady = true;
  }

  async function loadMapData() {
    try {
      var r = await fetch('/api/players');
      if (!r.ok) return;
      var d = await r.json();
      S.players = d.players || [];
      S.toggles = d.toggles || {};
      S.worldBounds = d.worldBounds || null;
      updateMapMarkers();
      updateMapSidebar();
    } catch (e) { console.error('Map data error:', e); }
  }

  function updateMapMarkers() {
    if (!S.map) return;
    var showOffline = true;
    var offlineChk = $('#map-show-offline');
    if (offlineChk) showOffline = offlineChk.checked;

    for (var id in S.mapMarkers) {
      S.map.removeLayer(S.mapMarkers[id]);
      delete S.mapMarkers[id];
    }

    for (var i = 0; i < S.players.length; i++) {
      var p = S.players[i];
      if (!p.hasPosition) continue;
      if (!showOffline && !p.isOnline) continue;
      if (p.lat == null || p.lng == null) continue;

      var color = p.isOnline ? '#34d399' : '#64748b';
      var icon = L.divIcon({
        className: '',
        html: '<div style="width:10px;height:10px;border-radius:50%;background:' + color + ';border:2px solid #10121e;box-shadow:0 0 4px ' + color + '40"></div>',
        iconSize: [10, 10], iconAnchor: [5, 5],
      });

      var marker = L.marker([p.lat, p.lng], { icon: icon }).addTo(S.map);
      marker.bindTooltip(p.name, { className: 'leaflet-tooltip-dark', offset: [8, 0] });
      (function(player) { marker.on('click', function() { showMapPlayerDetail(player); }); })(p);
      S.mapMarkers[p.steamId] = marker;
    }

    var count = S.players.filter(function(p) { return p.isOnline; }).length;
    var cEl = $('#map-player-count');
    if (cEl) cEl.textContent = count + ' online';
  }

  function updateMapSidebar() {
    var list = $('#map-player-list');
    if (!list) return;
    list.innerHTML = '';
    var sorted = S.players.slice().sort(function(a, b) {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      var entry = el('div', 'map-player-entry');
      entry.innerHTML = '<span class="status-dot ' + (p.isOnline ? 'online' : 'offline') + '"></span><span class="mp-name ' + (p.isOnline ? 'online' : '') + '">' + esc(p.name) + '</span>';
      (function(player) {
        entry.addEventListener('click', function() {
          if (player.hasPosition && player.lat != null && S.map) S.map.setView([player.lat, player.lng], 1);
          showMapPlayerDetail(player);
        });
      })(p);
      list.appendChild(entry);
    }
  }

  function filterMapPlayers() {
    var q = ($('#map-search') ? $('#map-search').value : '').toLowerCase();
    $$('.map-player-entry', $('#map-player-list')).forEach(function(entry) {
      var name = entry.querySelector('.mp-name');
      var text = name ? name.textContent.toLowerCase() : '';
      entry.style.display = text.includes(q) ? '' : 'none';
    });
  }

  function showMapPlayerDetail(p) {
    var panel = $('#map-player-detail');
    var content = $('#map-detail-content');
    if (!panel || !content) return;
    content.innerHTML = buildPlayerDetail(p);
    panel.classList.remove('hidden');
  }

  // ══════════════════════════════════════════════════
  //  PLAYERS
  // ══════════════════════════════════════════════════

  async function loadPlayers() {
    try {
      var r = await fetch('/api/players');
      if (!r.ok) return;
      var d = await r.json();
      S.players = d.players || [];
      S.toggles = d.toggles || {};
      renderPlayerTable();
    } catch (e) { console.error('Players error:', e); }
  }

  function renderPlayerTable() {
    var container = $('#player-list');
    if (!container) return;

    var query = ($('#player-search') ? $('#player-search').value : '').toLowerCase();
    var sort = $('#player-sort') ? $('#player-sort').value : 'online';

    var list = S.players.slice();

    if (query) {
      list = list.filter(function(p) {
        return (p.name || '').toLowerCase().includes(query) ||
          (p.steamId || '').includes(query) ||
          (p.profession || '').toLowerCase().includes(query) ||
          (p.clanName || '').toLowerCase().includes(query);
      });
    }

    // Apply dropdown sort
    list.sort(function(a, b) {
      switch (sort) {
        case 'online': return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0) || (a.name || '').localeCompare(b.name || '');
        case 'name': return (a.name || '').localeCompare(b.name || '');
        case 'kills': return (b.zeeksKilled || 0) - (a.zeeksKilled || 0);
        case 'playtime': return (b.totalPlaytime || 0) - (a.totalPlaytime || 0);
        case 'lastSeen': return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
        case 'daysSurvived': return (b.daysSurvived || 0) - (a.daysSurvived || 0);
        default: return 0;
      }
    });

    // Apply column header sort
    var sortCol = S.playerSort.col;
    var sortDir = S.playerSort.dir;
    if (sortCol !== 'online') {
      list.sort(function(a, b) {
        var va, vb;
        switch (sortCol) {
          case 'name': va = a.name || ''; vb = b.name || ''; return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
          case 'profession': va = a.profession || ''; vb = b.profession || ''; return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
          case 'clan': va = a.clanName || ''; vb = b.clanName || ''; return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
          case 'kills': return sortDir === 'asc' ? (a.zeeksKilled || 0) - (b.zeeksKilled || 0) : (b.zeeksKilled || 0) - (a.zeeksKilled || 0);
          case 'days': return sortDir === 'asc' ? (a.daysSurvived || 0) - (b.daysSurvived || 0) : (b.daysSurvived || 0) - (a.daysSurvived || 0);
          case 'health': var ha = a.maxHealth > 0 ? (a.health / a.maxHealth) : 0; var hb = b.maxHealth > 0 ? (b.health / b.maxHealth) : 0; return sortDir === 'asc' ? ha - hb : hb - ha;
          case 'playtime': return sortDir === 'asc' ? (a.totalPlaytime || 0) - (b.totalPlaytime || 0) : (b.totalPlaytime || 0) - (a.totalPlaytime || 0);
          default: return 0;
        }
      });
    }

    var table = el('table', 'player-table');
    var headers = [
      { key: '', label: '' }, { key: 'name', label: 'Name' }, { key: 'profession', label: 'Profession' },
      { key: 'clan', label: 'Clan' }, { key: 'kills', label: 'Kills' }, { key: 'days', label: 'Days' },
      { key: 'health', label: 'Health' }, { key: 'playtime', label: 'Playtime' }, { key: '', label: 'Steam ID' },
    ];

    var thead = el('thead');
    var headRow = el('tr');
    for (var hi = 0; hi < headers.length; hi++) {
      var h = headers[hi];
      var th = el('th');
      var arrow = sortCol === h.key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
      th.textContent = h.label + arrow;
      if (h.key) {
        th.style.cursor = 'pointer';
        (function(key) {
          th.addEventListener('click', function() {
            if (S.playerSort.col === key) S.playerSort.dir = S.playerSort.dir === 'asc' ? 'desc' : 'asc';
            else { S.playerSort.col = key; S.playerSort.dir = 'desc'; }
            renderPlayerTable();
          });
        })(h.key);
      }
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el('tbody');
    for (var pi = 0; pi < list.length; pi++) {
      var p = list[pi];
      var tr = el('tr', 'clickable');
      var healthPct = p.maxHealth > 0 ? Math.round((p.health / p.maxHealth) * 100) : (p.health || 0);
      var healthColor = healthPct > 60 ? '#34d399' : healthPct > 30 ? '#fbbf24' : '#f87171';

      tr.innerHTML = '<td><span class="status-dot ' + (p.isOnline ? 'online' : 'offline') + '"></span></td>' +
        '<td><span class="player-link">' + esc(p.name) + '</span></td>' +
        '<td class="text-muted">' + esc(p.profession || '-') + '</td>' +
        '<td class="text-muted">' + (p.clanName ? '[' + esc(p.clanName) + ']' : '-') + '</td>' +
        '<td>' + fmtNum(p.zeeksKilled || 0) + '</td>' +
        '<td>' + (p.daysSurvived || 0) + '</td>' +
        '<td><span style="color:' + healthColor + '">' + healthPct + '%</span></td>' +
        '<td class="text-muted">' + formatPlaytime(p.totalPlaytime) + '</td>' +
        '<td class="font-mono text-xs text-muted"><a href="https://steamcommunity.com/profiles/' + esc(p.steamId) + '" target="_blank" class="hover:text-accent transition-colors" title="Open Steam profile">' + esc(p.steamId) + '</a></td>';
      (function(player) {
        tr.addEventListener('click', function(e) {
          if (e.target.tagName === 'A') return;
          showPlayerModal(player);
        });
      })(p);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  }

  function showPlayerModal(p) {
    var modal = $('#player-modal');
    var content = $('#player-modal-content');
    if (!modal || !content) return;
    content.innerHTML = buildPlayerDetail(p);
    modal.classList.remove('hidden');
  }

  function buildPlayerDetail(p) {
    var html = '';

    html += '<div class="flex items-center gap-3 mb-4">';
    html += '<span class="status-dot ' + (p.isOnline ? 'online' : 'offline') + '" style="width:10px;height:10px"></span>';
    html += '<div>';
    html += '<h2 class="text-lg font-semibold text-white">' + esc(p.name) + '</h2>';
    html += '<div class="text-xs text-muted">' + esc(p.profession || 'Unknown') + ' \u00b7 ' + (p.male ? 'Male' : 'Female');
    if (p.affliction && p.affliction !== 'Unknown') html += ' \u00b7 ' + esc(p.affliction);
    if (p.clanName) html += ' \u00b7 [' + esc(p.clanName) + ']' + (p.clanRank ? ' (' + esc(p.clanRank) + ')' : '');
    html += '</div>';
    html += '<a href="https://steamcommunity.com/profiles/' + esc(p.steamId) + '" target="_blank" class="text-[11px] text-accent hover:underline font-mono">' + esc(p.steamId) + '</a>';
    html += '</div></div>';

    // Level / XP progress bar
    if (p.level || p.expCurrent) {
      var expPct = (p.expRequired > 0) ? Math.round((p.expCurrent / p.expRequired) * 100) : 0;
      html += '<div class="mb-4"><div class="flex items-center justify-between mb-1"><span class="text-xs font-medium text-muted">Level ' + (p.level || 0) + '</span>';
      html += '<span class="text-[10px] text-muted">' + fmtNum(Math.round(p.expCurrent || 0)) + ' / ' + fmtNum(Math.round(p.expRequired || 0)) + ' XP</span></div>';
      html += '<div class="vital-track"><div class="vital-fill" style="width:' + expPct + '%;background:#60a5fa"></div></div>';
      if (p.skillsPoint) html += '<div class="text-[10px] text-accent mt-0.5">' + p.skillsPoint + ' skill point' + (p.skillsPoint !== 1 ? 's' : '') + ' available</div>';
      html += '</div>';
    }

    // Current life kills
    html += '<div class="mb-4"><h3 class="text-xs font-medium text-muted uppercase tracking-wider mb-2">Kill Stats (Current Life)</h3>';
    html += '<div class="grid grid-cols-4 gap-2">';
    var killStats = [['Zombies', p.zeeksKilled], ['Headshots', p.headshots], ['Melee', p.meleeKills], ['Gun', p.gunKills], ['Blast', p.blastKills], ['Fist', p.fistKills], ['Takedown', p.takedownKills], ['Vehicle', p.vehicleKills]];
    for (var ki = 0; ki < killStats.length; ki++) {
      html += '<div class="text-center"><div class="text-sm font-semibold text-white">' + fmtNum(killStats[ki][1] || 0) + '</div><div class="text-[10px] text-muted">' + killStats[ki][0] + '</div></div>';
    }
    html += '</div></div>';

    // Lifetime kills
    if (p.hasExtendedStats) {
      html += '<div class="mb-4"><h3 class="text-xs font-medium text-muted uppercase tracking-wider mb-2">Lifetime Kills</h3>';
      html += '<div class="grid grid-cols-4 gap-2">';
      var ltStats = [['Total', p.lifetimeKills], ['Headshots', p.lifetimeHeadshots], ['Melee', p.lifetimeMeleeKills], ['Gun', p.lifetimeGunKills], ['Blast', p.lifetimeBlastKills], ['Fist', p.lifetimeFistKills], ['Takedown', p.lifetimeTakedownKills], ['Vehicle', p.lifetimeVehicleKills]];
      for (var li = 0; li < ltStats.length; li++) {
        html += '<div class="text-center"><div class="text-sm font-semibold text-white">' + fmtNum(ltStats[li][1] || 0) + '</div><div class="text-[10px] text-muted">' + ltStats[li][0] + '</div></div>';
      }
      html += '</div></div>';
    }

    // Survival
    html += '<div class="mb-4"><h3 class="text-xs font-medium text-muted uppercase tracking-wider mb-2">Survival</h3>';
    html += '<div class="grid grid-cols-3 gap-2 text-xs">';
    var survStats = [
      ['Days Survived', p.daysSurvived], ['Lifetime Days', p.lifetimeDaysSurvived], ['Times Bitten', p.timesBitten],
      ['Fish Caught', p.fishCaught], ['Level', p.level || 0], ['Deaths', p.deaths],
      ['PvP Kills', p.pvpKills], ['PvP Deaths', p.pvpDeaths], ['Builds', fmtNum(p.builds)],
      ['Containers Looted', fmtNum(p.containersLooted)], ['Raids Out', p.raidsOut], ['Raids In', p.raidsIn],
      ['Connections', p.connects], ['Playtime', formatPlaytime(p.totalPlaytime)],
      ['Last Seen', p.lastSeen ? new Date(p.lastSeen).toLocaleDateString() : '-'],
    ];
    for (var si = 0; si < survStats.length; si++) {
      html += '<div><span class="text-muted">' + survStats[si][0] + ':</span> <span class="text-gray-300">' + (survStats[si][1] != null ? survStats[si][1] : 0) + '</span></div>';
    }
    html += '</div></div>';

    // Vitals
    if (S.toggles.showVitals !== false) {
      html += '<div class="mb-4"><h3 class="text-xs font-medium text-muted uppercase tracking-wider mb-2">Vitals</h3>';
      html += '<div class="space-y-1.5">';
      var vitals = [
        { label: 'Health', cur: p.health, max: p.maxHealth, color: '#34d399' },
        { label: 'Hunger', cur: p.hunger, max: p.maxHunger, color: '#fbbf24' },
        { label: 'Thirst', cur: p.thirst, max: p.maxThirst, color: '#3b82f6' },
        { label: 'Stamina', cur: p.stamina, max: p.maxStamina, color: '#a855f7' },
        { label: 'Infection', cur: p.infection, max: p.maxInfection, color: '#f87171' },
      ];
      if (p.battery != null) vitals.push({ label: 'Battery', cur: p.battery, max: 100, color: '#38bdf8' });
      if (p.fatigue != null) vitals.push({ label: 'Fatigue', cur: p.fatigue, max: 100, color: '#818cf8' });
      for (var vi = 0; vi < vitals.length; vi++) {
        var v = vitals[vi];
        var max = v.max || 100;
        var pct = max > 0 ? Math.round((v.cur / max) * 100) : 0;
        html += '<div class="vital-row"><span class="vital-label">' + v.label + '</span><div class="vital-track"><div class="vital-fill" style="width:' + pct + '%;background:' + v.color + '"></div></div><span class="vital-val">' + Math.round(v.cur || 0) + ' / ' + Math.round(max) + '</span></div>';
      }
      html += '</div></div>';
    }

    // Status Effects
    if ((p.playerStates && p.playerStates.length) || (p.bodyConditions && p.bodyConditions.length)) {
      html += '<div class="mb-4"><h3 class="text-xs font-medium text-muted uppercase tracking-wider mb-2">Status Effects</h3>';
      html += '<div class="flex flex-wrap gap-1">';
      var ps2 = p.playerStates || [];
      for (var psi = 0; psi < ps2.length; psi++) html += '<span class="text-[11px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded">' + esc(ps2[psi]) + '</span>';
      var bc = p.bodyConditions || [];
      for (var bci = 0; bci < bc.length; bci++) html += '<span class="text-[11px] bg-red-400/10 text-red-400 px-1.5 py-0.5 rounded">' + esc(bc[bci]) + '</span>';
      html += '</div></div>';
    }

    // Inventory
    if (S.toggles.showInventory !== false) {
      html += buildInventorySection('Equipment', p.equipment, 'equipment');
      html += buildInventorySection('Quick Slots', p.quickSlots, 'quickslots');
      html += buildInventorySection('Inventory', p.inventory, 'storage');
      html += buildInventorySection('Backpack', p.backpackItems, 'storage');
    }

    // Recipes
    if (S.toggles.showRecipes !== false && p.craftingRecipes && p.craftingRecipes.length) {
      html += '<div class="mb-3"><h3 class="text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Crafting Recipes (' + p.craftingRecipes.length + ')</h3>';
      html += '<div class="flex flex-wrap gap-1">';
      for (var ri = 0; ri < p.craftingRecipes.length; ri++) {
        var recipeName = p.craftingRecipes[ri];
        html += '<span class="text-[10px] bg-surface-50 border border-border px-1.5 py-0.5 rounded text-muted cursor-pointer hover:text-accent hover:border-accent/40 transition-colors inv-clickable" data-item-name="' + esc(recipeName) + '">' + esc(recipeName) + '</span>';
      }
      html += '</div></div>';
    }

    // Skills
    if (p.unlockedSkills && p.unlockedSkills.length) {
      html += '<div class="mb-3"><h3 class="text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Unlocked Skills (' + p.unlockedSkills.length + ')</h3>';
      html += '<div class="flex flex-wrap gap-1">';
      for (var ski = 0; ski < p.unlockedSkills.length; ski++) html += '<span class="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">' + esc(p.unlockedSkills[ski]) + '</span>';
      html += '</div></div>';
    }

    // Coordinates
    if (S.toggles.showCoordinates !== false && p.hasPosition) {
      html += '<div class="mt-3 text-[11px] text-muted font-mono">Position: ' + p.worldX + ', ' + p.worldY + ', ' + p.worldZ + '</div>';
    }

    return html;
  }

  function buildInventorySection(title, items, gridType) {
    if (!items || !items.length) return '';
    var filled = items.filter(function(i) {
      if (!i) return false;
      if (typeof i === 'string') return i !== 'Empty' && i !== 'None' && i !== '';
      return i.item || i.name;
    });
    if (!filled.length) return '';

    var html = '<div class="mb-3"><h3 class="text-xs font-medium text-muted uppercase tracking-wider mb-1.5">' + title + '</h3>';
    html += '<div class="inv-grid ' + gridType + '">';

    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii];
      if (!item) { html += '<div class="inv-slot empty"><span class="inv-name">Empty</span></div>'; continue; }
      if (typeof item === 'string') {
        if (item === 'Empty' || item === 'None' || item === '') html += '<div class="inv-slot empty"><span class="inv-name">Empty</span></div>';
        else html += '<div class="inv-slot inv-clickable" data-item-name="' + esc(item) + '"><span class="inv-name">' + esc(item) + '</span></div>';
        continue;
      }
      var name = item.item || item.name || '';
      var qty = item.amount || item.quantity || 1;
      if (!name || name === 'Empty' || name === 'None') {
        html += '<div class="inv-slot empty"><span class="inv-name">Empty</span></div>';
      } else {
        var durPct = item.durability != null ? Math.round(item.durability) : null;
        var durColor = durPct != null ? (durPct > 60 ? '#34d399' : durPct > 25 ? '#fbbf24' : '#f87171') : '';
        var durBar = durPct != null ? '<div class="inv-dur-track"><div class="inv-dur-fill" style="width:' + durPct + '%;background:' + durColor + '"></div></div>' : '';
        html += '<div class="inv-slot inv-clickable" data-item-name="' + esc(name) + '" data-item-qty="' + qty + '" data-item-dur="' + (durPct != null ? durPct : '') + '"><span class="inv-name">' + esc(name) + '</span>' + (qty > 1 ? '<span class="inv-qty">\u00d7' + qty + '</span>' : '') + durBar + '</div>';
      }
    }
    html += '</div></div>';
    return html;
  }

  // ══════════════════════════════════════════════════
  //  CLANS
  // ══════════════════════════════════════════════════

  async function loadClans() {
    var container = $('#clan-list');
    if (!container) return;

    // Try dedicated clan API (DB-backed)
    try {
      var r = await fetch('/api/panel/clans');
      if (r.ok) {
        var d = await r.json();
        var clans = d.clans || [];
        if (clans.length > 0) {
          renderClansFromDB(container, clans);
          return;
        }
      }
    } catch (e) { /* fall through */ }

    // Fallback: group from player data
    if (!S.players.length) {
      try {
        var r2 = await fetch('/api/players');
        if (r2.ok) { var d2 = await r2.json(); S.players = d2.players || []; }
      } catch (e) { /* ignore */ }
    }

    var clanMap = {};
    for (var i = 0; i < S.players.length; i++) {
      var p = S.players[i];
      var tag = p.clanName || null;
      if (!tag) continue;
      if (!clanMap[tag]) clanMap[tag] = [];
      clanMap[tag].push(p);
    }

    if (Object.keys(clanMap).length === 0) {
      container.innerHTML = '<div class="feed-empty">No clan data available. Players will appear here when they join clans.</div>';
      return;
    }

    container.innerHTML = '';
    for (var tag in clanMap) {
      if (!clanMap.hasOwnProperty(tag)) continue;
      var members = clanMap[tag];
      var card = el('div', 'card');
      var html = '<h3 class="card-title">[' + esc(tag) + '] \u2014 ' + members.length + ' member' + (members.length !== 1 ? 's' : '') + '</h3>';
      html += '<div class="space-y-1">';
      for (var mi = 0; mi < members.length; mi++) {
        var m = members[mi];
        html += '<div class="flex items-center gap-2 text-sm"><span class="status-dot ' + (m.isOnline ? 'online' : 'offline') + '"></span><span class="player-link" data-steam-id="' + esc(m.steamId) + '">' + esc(m.name) + '</span>' + (m.clanRank ? '<span class="text-[10px] text-accent bg-accent/10 px-1.5 rounded">' + esc(m.clanRank) + '</span>' : '') + '<span class="text-muted text-xs ml-auto">' + esc(m.profession || '-') + '</span></div>';
      }
      html += '</div>';
      card.innerHTML = html;
      container.appendChild(card);
    }
  }

  function renderClansFromDB(container, clans) {
    container.innerHTML = '';
    for (var ci = 0; ci < clans.length; ci++) {
      var clan = clans[ci];
      var card = el('div', 'card');
      var members = clan.members || [];
      var html = '<h3 class="card-title">[' + esc(clan.name) + '] \u2014 ' + members.length + ' member' + (members.length !== 1 ? 's' : '') + '</h3>';
      html += '<div class="space-y-1">';
      for (var mi = 0; mi < members.length; mi++) {
        var m = members[mi];
        var player = S.players.find(function(p) { return p.steamId === m.steam_id; });
        var isOnline = player ? player.isOnline : false;
        var displayName = (player ? player.name : null) || m.name || m.steam_id;
        html += '<div class="flex items-center gap-2 text-sm"><span class="status-dot ' + (isOnline ? 'online' : 'offline') + '"></span><span class="player-link" data-steam-id="' + esc(m.steam_id) + '">' + esc(displayName) + '</span>' + (m.rank ? '<span class="text-[10px] text-accent bg-accent/10 px-1.5 rounded">' + esc(m.rank) + '</span>' : '') + (m.can_invite ? '<span class="text-[10px] text-muted">invite</span>' : '') + (m.can_kick ? '<span class="text-[10px] text-muted">kick</span>' : '') + '</div>';
      }
      html += '</div>';
      card.innerHTML = html;
      container.appendChild(card);
    }
  }

  // ══════════════════════════════════════════════════
  //  ACTIVITY
  // ══════════════════════════════════════════════════

  async function loadActivity() {
    var container = $('#activity-feed');
    if (!container) return;
    var type = $('#activity-filter') ? $('#activity-filter').value : '';
    var search = ($('#activity-search') ? $('#activity-search').value : '').toLowerCase();
    var date = $('#activity-date') ? $('#activity-date').value : '';
    var params = new URLSearchParams({ limit: '200' });
    if (type) params.set('type', type);
    if (search) params.set('actor', search);
    try {
      var r = await fetch('/api/panel/activity?' + params);
      var d = await r.json();
      var events = d.events || [];
      if (date) events = events.filter(function(e) { return (e.created_at || '').startsWith(date); });
      renderActivityFeed(container, events, false);
    } catch (e) {
      container.innerHTML = '<div class="feed-empty">Failed to load activity</div>';
    }
  }

  function renderActivityFeed(container, events, compact) {
    if (!container) return;
    if (!events || !events.length) { container.innerHTML = '<div class="feed-empty">No events</div>'; return; }
    container.innerHTML = '';
    var limit = compact ? 15 : events.length;
    for (var i = 0; i < Math.min(limit, events.length); i++) {
      var e = events[i];
      var item = el('div', 'feed-item fade-in');
      var time = e.created_at ? new Date(e.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
      var fmt = formatActivityEvent(e);
      item.innerHTML = '<span class="feed-time">' + time + '</span><span class="feed-ico">' + fmt.icon + '</span><span class="feed-txt">' + fmt.text + '</span>';
      container.appendChild(item);
    }
  }

  function formatActivityEvent(e) {
    var actor = e.actor_name || e.actor || e.steam_id || 'Unknown';
    var target = e.target_name || e.target_steam_id || '';
    var actorHtml = '<span class="player-link" data-steam-id="' + esc(e.steam_id || e.actor || '') + '">' + esc(actor) + '</span>';
    var targetHtml = target ? '<span class="player-link" data-steam-id="' + esc(e.target_steam_id || '') + '">' + esc(target) + '</span>' : '';
    var itemName = e.item || '';

    var map = {
      player_connect:    { icon: '\u2192', text: actorHtml + ' <strong>connected</strong>' },
      player_disconnect: { icon: '\u2190', text: actorHtml + ' <strong>disconnected</strong>' },
      player_death:      { icon: '\u2715', text: actorHtml + ' <strong>died</strong>' + (e.details ? ' \u2014 ' + esc(tryParseDetails(e.details, 'cause') || '') : '') },
      player_death_pvp:  { icon: '\u2694', text: actorHtml + ' <strong>killed</strong> ' + targetHtml },
      player_build:      { icon: '\u25AA', text: actorHtml + ' <strong>built</strong> ' + esc(itemName) + (e.amount > 1 ? ' \u00d7' + e.amount : '') },
      container_loot:    { icon: '\u25C7', text: actorHtml + ' <strong>looted</strong> ' + esc(itemName || 'container') + (e.amount > 1 ? ' \u00d7' + e.amount : '') },
      damage_taken:      { icon: '!', text: actorHtml + ' <strong>took damage</strong>' + (itemName ? ' from ' + esc(itemName) : '') },
      raid_damage:       { icon: '\u26A0', text: actorHtml + ' <strong>raided</strong> ' + targetHtml + (itemName ? ' (' + esc(itemName) + ')' : '') },
      building_destroyed:{ icon: '\u2715', text: esc(itemName || 'Structure') + ' <strong>destroyed</strong>' + (target ? ' by ' + targetHtml : '') },
      admin_access:      { icon: '\u2605', text: actorHtml + ' <strong>admin action</strong>' + (itemName ? ': ' + esc(itemName) : '') },
      anticheat_flag:    { icon: '\u2691', text: actorHtml + ' <strong>flagged</strong>' + (itemName ? ' \u2014 ' + esc(itemName) : '') },
      container_item_added:  { icon: '+', text: esc(itemName) + ' <strong>added</strong> to container' + (actor !== 'Unknown' ? ' (' + actorHtml + ')' : '') },
      container_item_removed:{ icon: '\u2212', text: esc(itemName) + ' <strong>removed</strong> from container' + (actor !== 'Unknown' ? ' (' + actorHtml + ')' : '') },
      structure_destroyed:   { icon: '\u2715', text: esc(itemName || 'Structure') + ' <strong>destroyed</strong>' + (e.amount > 1 ? ' \u00d7' + e.amount : '') },
      structure_placed:      { icon: '\u25AA', text: esc(itemName || 'Structure') + ' <strong>placed</strong>' + (e.amount > 1 ? ' \u00d7' + e.amount : '') },
      vehicle_change:        { icon: '\u25CE', text: 'Vehicle ' + esc(itemName) + ' <strong>state changed</strong>' },
      horse_change:          { icon: '\u25CE', text: 'Horse <strong>status changed</strong>' + (itemName ? ': ' + esc(itemName) : '') },
      world_change:          { icon: '\u25CE', text: 'World <strong>' + esc(itemName || 'updated') + '</strong>' },
    };

    return map[e.type] || { icon: '\u00b7', text: actorHtml + ' \u2014 ' + esc(e.type || 'event') + (itemName ? ' (' + esc(itemName) + ')' : '') };
  }

  function tryParseDetails(details, key) {
    if (!details) return '';
    if (typeof details === 'string') { try { details = JSON.parse(details); } catch (e) { return details; } }
    return details[key] || '';
  }

  // ══════════════════════════════════════════════════
  //  CHAT
  // ══════════════════════════════════════════════════

  async function loadChat() {
    var container = $('#chat-feed');
    if (!container) return;
    try {
      var r = await fetch('/api/panel/chat?limit=200');
      var d = await r.json();
      var messages = d.messages || [];
      renderChatFeed(container, messages, false);
      var countEl = $('#chat-count');
      if (countEl) countEl.textContent = messages.length + ' messages';
      container.scrollTop = container.scrollHeight;
    } catch (e) {
      container.innerHTML = '<div class="feed-empty">Failed to load chat</div>';
    }
  }

  function renderChatFeed(container, messages, compact) {
    if (!container) return;
    if (!messages || !messages.length) { container.innerHTML = '<div class="feed-empty">No messages</div>'; return; }
    container.innerHTML = '';
    var limit = compact ? 15 : messages.length;
    var slice = messages.slice(0, limit);
    for (var i = 0; i < slice.length; i++) {
      var m = slice[i];
      var msg = el('div', 'chat-msg');
      var isSystem = m.type === 'join' || m.type === 'leave' || m.type === 'death';
      var isOutbound = m.direction === 'outbound';
      if (isSystem) {
        var action = m.type === 'join' ? 'joined' : m.type === 'leave' ? 'left' : 'died';
        msg.innerHTML = '<span class="chat-author system">System</span><span class="chat-text text-muted">' + esc(m.player_name || 'Player') + ' ' + action + '</span>';
      } else {
        var authorCls = isOutbound ? 'outbound' : '';
        var author = isOutbound ? (m.discord_user || 'Discord') : (m.player_name || 'Player');
        msg.innerHTML = '<span class="chat-author ' + authorCls + '" data-steam-id="' + esc(m.steam_id || '') + '">' + esc(author) + '</span><span class="chat-text">' + esc(m.message || '') + '</span>';
      }
      container.appendChild(msg);
    }
  }

  async function sendChat() {
    var input = $('#chat-msg-input');
    if (!input) return;
    var msg = input.value.trim();
    if (!msg) return;
    try {
      // Use 'admin' RCON command — same format as ChatRelay (not 'say')
      await fetch('/api/panel/rcon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'admin [Panel] ' + (S.user ? S.user.displayName || 'Admin' : 'Admin') + ': ' + msg }),
      });
      input.value = '';
      var feed = $('#chat-feed');
      if (feed) {
        var div = el('div', 'chat-msg fade-in');
        div.innerHTML = '<span class="chat-author outbound">' + esc(S.user ? S.user.displayName || 'You' : 'You') + '</span><span class="chat-text">' + esc(msg) + '</span>';
        feed.appendChild(div);
        feed.scrollTop = feed.scrollHeight;
      }
      setTimeout(loadChat, 2000);
    } catch (e) { console.error('Chat send error:', e); }
  }

  // ══════════════════════════════════════════════════
  //  CONSOLE
  // ══════════════════════════════════════════════════

  async function sendRcon() {
    var input = $('#rcon-input');
    if (!input) return;
    var cmd = input.value.trim();
    if (!cmd) return;
    appendConsole(cmd, 'cmd');
    input.value = '';
    try {
      var r = await fetch('/api/panel/rcon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: cmd }) });
      var d = await r.json();
      if (d.ok) appendConsole(d.response || '(no response)', 'resp');
      else appendConsole('Error: ' + (d.error || 'Unknown error'), 'err');
    } catch (e) { appendConsole('Connection error: ' + e.message, 'err'); }
  }

  function appendConsole(text, cls) {
    var out = $('#console-output');
    if (!out) return;
    var line = el('div', 'console-line ' + cls);
    line.textContent = text;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
  }

  // ══════════════════════════════════════════════════
  //  SETTINGS
  // ══════════════════════════════════════════════════

  async function loadSettings() {
    var container = $('#settings-grid');
    if (!container) return;
    try {
      var r = await fetch('/api/panel/settings');
      if (!r.ok) { container.innerHTML = '<div class="feed-empty">Settings unavailable</div>'; return; }
      var d = await r.json();
      var settings = d.settings || {};
      S.settingsOriginal = Object.assign({}, settings);
      S.settingsChanged = {};
      renderSettingsCategories(container, settings);
      var countEl = $('#settings-count');
      if (countEl) countEl.textContent = Object.keys(settings).length + ' settings';
    } catch (e) { container.innerHTML = '<div class="feed-empty">Failed to load settings</div>'; }
  }

  function renderSettingsCategories(container, settings) {
    container.innerHTML = '';
    var assigned = {};
    var categories = [];

    for (var catName in SETTING_CATEGORIES) {
      if (!SETTING_CATEGORIES.hasOwnProperty(catName)) continue;
      var keys = SETTING_CATEGORIES[catName];
      var items = [];
      for (var ki = 0; ki < keys.length; ki++) {
        if (keys[ki] in settings) { items.push({ key: keys[ki], value: settings[keys[ki]] }); assigned[keys[ki]] = true; }
      }
      if (items.length) categories.push({ name: catName, items: items });
    }

    var other = [];
    for (var key in settings) {
      if (!settings.hasOwnProperty(key)) continue;
      if (!assigned[key]) other.push({ key: key, value: settings[key] });
    }
    if (other.length) categories.push({ name: 'Other', items: other });

    for (var ci = 0; ci < categories.length; ci++) {
      var cat = categories[ci];
      var section = el('div', 'settings-category');
      var header = el('div', 'settings-category-header');
      header.innerHTML = '<span class="cat-arrow">\u25B8</span><span class="cat-label">' + cat.name + '</span><span class="cat-count">' + cat.items.length + '</span>';

      var body = el('div', 'settings-category-items');
      for (var ii = 0; ii < cat.items.length; ii++) {
        var item = cat.items[ii];
        var row = el('div', 'setting-row');
        row.dataset.key = item.key;
        var desc = SETTING_DESCS[item.key] || '';
        row.innerHTML = '<div class="setting-name">' + esc(humanizeSettingKey(item.key)) + '</div>' + (desc ? '<div class="setting-desc">' + esc(desc) + '</div>' : '') + '<input type="text" class="setting-input" value="' + esc(String(item.value)) + '" data-key="' + esc(item.key) + '" data-original="' + esc(String(item.value)) + '">';
        body.appendChild(row);
      }

      (function(bodyEl, headerEl) {
        headerEl.addEventListener('click', function() {
          bodyEl.classList.toggle('open');
          headerEl.querySelector('.cat-arrow').classList.toggle('open');
        });
      })(body, header);

      if (ci === 0) { body.classList.add('open'); header.querySelector('.cat-arrow').classList.add('open'); }

      section.appendChild(header);
      section.appendChild(body);
      container.appendChild(section);
    }

    container.addEventListener('input', function(e) {
      if (!e.target.classList.contains('setting-input')) return;
      var key = e.target.dataset.key;
      var orig = e.target.dataset.original;
      var val = e.target.value;
      if (val !== orig) { S.settingsChanged[key] = val; e.target.classList.add('changed'); }
      else { delete S.settingsChanged[key]; e.target.classList.remove('changed'); }

      var btn = $('#settings-save-btn');
      var hasChanges = Object.keys(S.settingsChanged).length > 0;
      if (btn) { btn.disabled = !hasChanges; btn.classList.toggle('opacity-50', !hasChanges); btn.classList.toggle('cursor-not-allowed', !hasChanges); }
    });
  }

  function filterSettings() {
    var q = ($('#settings-search') ? $('#settings-search').value : '').toLowerCase();
    $$('.setting-row').forEach(function(row) {
      var key = (row.dataset.key || '').toLowerCase();
      var nameEl = row.querySelector('.setting-name');
      var descEl = row.querySelector('.setting-desc');
      var name = nameEl ? nameEl.textContent.toLowerCase() : '';
      var desc = descEl ? descEl.textContent.toLowerCase() : '';
      row.style.display = (key.includes(q) || name.includes(q) || desc.includes(q)) ? '' : 'none';
    });
    $$('.settings-category').forEach(function(cat) {
      var visibleRows = cat.querySelectorAll('.setting-row:not([style*="display: none"])');
      cat.style.display = visibleRows.length ? '' : 'none';
      if (q && visibleRows.length) {
        var items = cat.querySelector('.settings-category-items');
        if (items) items.classList.add('open');
        var arrow = cat.querySelector('.cat-arrow');
        if (arrow) arrow.classList.add('open');
      }
    });
  }

  async function saveSettings() {
    if (Object.keys(S.settingsChanged).length === 0) return;
    var btn = $('#settings-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    try {
      var r = await fetch('/api/panel/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settings: S.settingsChanged }) });
      var d = await r.json();
      if (d.ok) {
        var updated = d.updated || [];
        for (var ui = 0; ui < updated.length; ui++) {
          var key = updated[ui];
          S.settingsOriginal[key] = S.settingsChanged[key];
          var input = $('input[data-key="' + key + '"]');
          if (input) { input.dataset.original = S.settingsChanged[key]; input.classList.remove('changed'); }
        }
        S.settingsChanged = {};
        if (btn) btn.textContent = 'Saved \u2713';
        setTimeout(function() { if (btn) btn.textContent = 'Save Changes'; }, 2000);
      } else throw new Error(d.error || 'Save failed');
    } catch (e) {
      if (btn) { btn.textContent = 'Error'; btn.disabled = false; }
      console.error('Settings save error:', e);
      setTimeout(function() { if (btn) btn.textContent = 'Save Changes'; }, 2000);
    }
  }

  // ══════════════════════════════════════════════════
  //  CONTROLS
  // ══════════════════════════════════════════════════

  async function doPowerAction(action) {
    var log = $('#controls-log');
    var time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    appendLog(log, '[' + time + '] Sending ' + action + '...', 'text-muted');
    try {
      var r = await fetch('/api/panel/power', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: action }) });
      var d = await r.json();
      if (d.ok) appendLog(log, '[' + time + '] \u2713 ' + d.message, 'text-calm');
      else appendLog(log, '[' + time + '] \u2715 ' + (d.error || 'Failed'), 'text-red-400');
    } catch (e) { appendLog(log, '[' + time + '] \u2715 ' + e.message, 'text-red-400'); }
  }

  function appendLog(container, text, cls) {
    if (!container) return;
    var placeholder = container.querySelector('.text-muted');
    if (placeholder && placeholder.textContent === 'No actions yet') placeholder.remove();
    var line = el('div', 'text-xs ' + (cls || ''));
    line.textContent = text;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
  }

  // ══════════════════════════════════════════════════
  //  ITEMS — Item tracking interface
  // ══════════════════════════════════════════════════

  var _itemsData = { instances: [], groups: [], locations: [], counts: {} };
  var _itemsMovements = [];

  async function loadItems() {
    try {
      var search = ($('#items-search') ? $('#items-search').value : '').trim();
      var view = $('#items-view') ? $('#items-view').value : 'all';

      // Fetch items data
      var url = '/api/panel/items?limit=500';
      if (search) url += '&search=' + encodeURIComponent(search);
      var locFilter = $('#items-location-filter') ? $('#items-location-filter').value : '';
      if (locFilter) {
        var parts = locFilter.split('|');
        url += '&locationType=' + encodeURIComponent(parts[0]) + '&locationId=' + encodeURIComponent(parts[1]);
      }

      var resp = await fetch(url);
      _itemsData = await resp.json();

      // Fetch recent movements
      var movResp = await fetch('/api/panel/movements?limit=50');
      var movData = await movResp.json();
      _itemsMovements = movData.movements || [];

      // Update counters
      var uc = $('#items-unique-count');
      if (uc) uc.textContent = _itemsData.counts?.instances ?? _itemsData.instances.length;
      var gc = $('#items-group-count');
      if (gc) gc.textContent = _itemsData.counts?.groups ?? _itemsData.groups.length;
      var lc = $('#items-location-count');
      if (lc) lc.textContent = _itemsData.locations?.length ?? '-';
      var mc = $('#items-movement-count');
      if (mc) mc.textContent = _itemsMovements.length;

      // Populate location filter (only on first load or if empty)
      var locSelect = $('#items-location-filter');
      if (locSelect && locSelect.options.length <= 1 && _itemsData.locations) {
        _itemsData.locations.sort(function(a, b) { return (a.type + a.id).localeCompare(b.type + b.id); });
        for (var i = 0; i < _itemsData.locations.length; i++) {
          var loc = _itemsData.locations[i];
          var opt = document.createElement('option');
          opt.value = loc.type + '|' + loc.id;
          opt.textContent = _formatLocationType(loc.type) + ': ' + _shortenId(loc.id) + ' (' + loc.totalItems + ')';
          locSelect.appendChild(opt);
        }
      }

      // Render based on view mode
      var container = $('#items-content');
      if (!container) return;

      if (view === 'movements') {
        _renderMovements(container, _itemsMovements);
      } else if (view === 'instances') {
        _renderItemTable(container, _itemsData.instances, 'instance');
      } else if (view === 'groups') {
        _renderGroupTable(container, _itemsData.groups);
      } else {
        // Combined view
        _renderCombinedView(container, _itemsData);
      }

    } catch (err) {
      console.error('Failed to load items:', err);
      var c = $('#items-content');
      if (c) c.innerHTML = '<div class="text-xs text-horde">Failed to load item data</div>';
    }
  }

  function _renderCombinedView(container, data) {
    var html = '';

    // Groups section
    if (data.groups.length > 0) {
      html += '<div class="card"><h3 class="card-title">Fungible Groups <span class="text-xs text-muted font-normal">(' + data.groups.length + ')</span></h3>';
      html += '<div class="overflow-x-auto"><table class="w-full text-xs">';
      html += '<thead><tr class="text-muted text-left border-b border-border"><th class="px-2 py-1.5">Item</th><th class="px-2 py-1.5">Qty</th><th class="px-2 py-1.5">Stack</th><th class="px-2 py-1.5">Location</th><th class="px-2 py-1.5">Fingerprint</th><th class="px-2 py-1.5">Last Seen</th><th class="px-2 py-1.5"></th></tr></thead><tbody>';
      for (var i = 0; i < data.groups.length; i++) {
        var g = data.groups[i];
        html += '<tr class="border-b border-border/30 hover:bg-surface-50/50">';
        html += '<td class="px-2 py-1.5 text-white font-medium">' + esc(g.item) + '</td>';
        html += '<td class="px-2 py-1.5"><span class="text-surge font-mono">' + g.quantity + '×</span></td>';
        html += '<td class="px-2 py-1.5 text-muted">' + (g.stack_size || 1) + '</td>';
        html += '<td class="px-2 py-1.5">' + _locationBadge(g.location_type, g.location_id, g.location_slot) + '</td>';
        html += '<td class="px-2 py-1.5 font-mono text-muted text-[10px]">' + esc(g.fingerprint) + '</td>';
        html += '<td class="px-2 py-1.5 text-muted">' + _timeAgo(g.last_seen) + '</td>';
        html += '<td class="px-2 py-1.5"><button class="text-accent hover:text-accent-hover text-[10px] item-grp-detail" data-id="' + g.id + '">History</button></td>';
        html += '</tr>';
      }
      html += '</tbody></table></div></div>';
    }

    // Unique instances section
    if (data.instances.length > 0) {
      html += '<div class="card"><h3 class="card-title">Unique Items <span class="text-xs text-muted font-normal">(' + data.instances.length + ')</span></h3>';
      html += _buildInstanceTable(data.instances);
      html += '</div>';
    }

    // Recent movements section
    if (_itemsMovements.length > 0) {
      html += '<div class="card"><h3 class="card-title">Recent Movements <span class="text-xs text-muted font-normal">(last 50)</span></h3>';
      html += _buildMovementList(_itemsMovements);
      html += '</div>';
    }

    if (!data.groups.length && !data.instances.length) {
      html = '<div class="text-sm text-muted py-8 text-center">No tracked items found. Items are tracked automatically from save file syncs.</div>';
    }

    container.innerHTML = html;
    _bindItemDetailHandlers();
  }

  function _renderItemTable(container, instances, type) {
    if (!instances.length) {
      container.innerHTML = '<div class="text-sm text-muted py-8 text-center">No unique items found</div>';
      return;
    }
    container.innerHTML = '<div class="card">' + _buildInstanceTable(instances) + '</div>';
    _bindItemDetailHandlers();
  }

  function _renderGroupTable(container, groups) {
    if (!groups.length) {
      container.innerHTML = '<div class="text-sm text-muted py-8 text-center">No fungible groups found</div>';
      return;
    }
    // Re-render the combined view with only groups
    _renderCombinedView(container, { groups: groups, instances: [], locations: [] });
  }

  function _renderMovements(container, movements) {
    if (!movements.length) {
      container.innerHTML = '<div class="text-sm text-muted py-8 text-center">No movements recorded yet</div>';
      return;
    }
    container.innerHTML = '<div class="card"><h3 class="card-title">Item Movements</h3>' + _buildMovementList(movements) + '</div>';
  }

  function _buildInstanceTable(instances) {
    var html = '<div class="overflow-x-auto"><table class="w-full text-xs">';
    html += '<thead><tr class="text-muted text-left border-b border-border"><th class="px-2 py-1.5">Item</th><th class="px-2 py-1.5">Amt</th><th class="px-2 py-1.5">Durability</th><th class="px-2 py-1.5">Location</th><th class="px-2 py-1.5">Fingerprint</th><th class="px-2 py-1.5">Last Seen</th><th class="px-2 py-1.5"></th></tr></thead><tbody>';
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      var durPct = inst.max_dur > 0 ? Math.round((inst.durability / inst.max_dur) * 100) : (inst.durability > 0 ? Math.round(inst.durability * 100) : 0);
      var durColor = durPct > 60 ? 'text-calm' : durPct > 25 ? 'text-surge' : 'text-horde';
      html += '<tr class="border-b border-border/30 hover:bg-surface-50/50">';
      html += '<td class="px-2 py-1.5 text-white font-medium">' + esc(inst.item) + (inst.ammo ? ' <span class="text-muted">(' + inst.ammo + ')</span>' : '') + '</td>';
      html += '<td class="px-2 py-1.5">' + (inst.amount || 1) + '</td>';
      html += '<td class="px-2 py-1.5 ' + durColor + ' font-mono">' + durPct + '%</td>';
      html += '<td class="px-2 py-1.5">' + _locationBadge(inst.location_type, inst.location_id, inst.location_slot) + '</td>';
      html += '<td class="px-2 py-1.5 font-mono text-muted text-[10px]">' + esc(inst.fingerprint) + '</td>';
      html += '<td class="px-2 py-1.5 text-muted">' + _timeAgo(inst.last_seen) + '</td>';
      html += '<td class="px-2 py-1.5"><button class="text-accent hover:text-accent-hover text-[10px] item-inst-detail" data-id="' + inst.id + '">History</button></td>';
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  function _buildMovementList(movements) {
    var html = '<div class="space-y-1 max-h-96 overflow-y-auto">';
    for (var i = 0; i < movements.length; i++) {
      var m = movements[i];
      var icon = m.move_type === 'group_transfer' ? '⇄' : m.move_type === 'move' ? '→' : '↔';
      var typeLabel = m.move_type === 'group_transfer' ? '<span class="text-surge">group</span>' : '<span class="text-accent">move</span>';
      html += '<div class="flex items-center gap-2 text-xs py-1 border-b border-border/20">';
      html += '<span class="text-muted w-20 shrink-0">' + _timeAgo(m.created_at) + '</span>';
      html += '<span class="font-medium">' + icon + '</span>';
      html += '<span class="text-white">' + esc(m.item) + '</span>';
      html += '<span class="text-muted">×' + (m.amount || 1) + '</span>';
      html += '<span class="text-muted">from</span>' + _locationBadge(m.from_type, m.from_id, m.from_slot);
      html += '<span class="text-muted">to</span>' + _locationBadge(m.to_type, m.to_id, m.to_slot);
      if (m.attributed_name) {
        html += '<span class="text-calm ml-auto">by ' + esc(m.attributed_name) + '</span>';
      }
      html += '<span class="ml-auto">' + typeLabel + '</span>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function _locationBadge(type, id, slot) {
    var colors = {
      player: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      container: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      vehicle: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      horse: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
      structure: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      world_drop: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
      backpack: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      global_container: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    };
    var cls = colors[type] || 'bg-surface-50 text-muted border-border';
    var label = _formatLocationType(type) + ': ' + _shortenId(id);
    if (slot && slot !== 'items' && slot !== 'ground') label += ' (' + slot + ')';
    return '<span class="inline-flex px-1.5 py-0.5 rounded text-[10px] border ' + cls + '">' + esc(label) + '</span>';
  }

  function _formatLocationType(type) {
    var map = { player: 'Player', container: 'Container', vehicle: 'Vehicle', horse: 'Horse', structure: 'Structure', world_drop: 'World', backpack: 'Backpack', global_container: 'Global' };
    return map[type] || type;
  }

  function _shortenId(id) {
    if (!id) return '?';
    // Steam IDs — show last 6 digits
    if (/^\d{17}$/.test(id)) return '…' + id.slice(-6);
    // Position-based IDs
    if (id.startsWith('pickup_') || id.startsWith('backpack_')) {
      var parts = id.split('_');
      return parts[0] + ' @' + parts.slice(1).join(',');
    }
    // Actor names — shorten long ones
    if (id.length > 24) return id.slice(0, 20) + '…';
    return id;
  }

  function _timeAgo(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr + 'Z');
    var now = Date.now();
    var diff = Math.max(0, now - d.getTime());
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return Math.floor(diff / 86400000) + 'd';
  }

  function _bindItemDetailHandlers() {
    // Instance detail buttons
    $$('.item-inst-detail').forEach(function(btn) {
      btn.addEventListener('click', function() { _showItemDetail('instance', parseInt(btn.dataset.id, 10)); });
    });
    // Group detail buttons
    $$('.item-grp-detail').forEach(function(btn) {
      btn.addEventListener('click', function() { _showItemDetail('group', parseInt(btn.dataset.id, 10)); });
    });
  }

  async function _showItemDetail(type, id) {
    var modal = $('#item-detail-modal');
    var content = $('#item-detail-content');
    if (!modal || !content) return;

    content.innerHTML = '<div class="text-muted text-sm">Loading...</div>';
    modal.classList.remove('hidden');

    try {
      var url = type === 'group' ? '/api/panel/groups/' + id : '/api/panel/items/' + id + '/movements';
      var resp = await fetch(url);
      var data = await resp.json();

      var html = '';

      if (type === 'group') {
        var g = data.group;
        html += '<h2 class="text-lg font-semibold text-white mb-1">' + esc(g.item) + ' <span class="text-surge">×' + g.quantity + '</span></h2>';
        html += '<div class="text-xs text-muted mb-4">Fungible Group #' + g.id + ' · Fingerprint: <span class="font-mono">' + esc(g.fingerprint) + '</span></div>';
        html += '<div class="grid grid-cols-2 gap-2 mb-4 text-xs">';
        html += '<div><span class="text-muted">Location:</span> ' + _locationBadge(g.location_type, g.location_id, g.location_slot) + '</div>';
        html += '<div><span class="text-muted">Stack size:</span> ' + (g.stack_size || 1) + '</div>';
        html += '<div><span class="text-muted">First seen:</span> ' + (g.first_seen || '-') + '</div>';
        html += '<div><span class="text-muted">Last seen:</span> ' + (g.last_seen || '-') + '</div>';
        html += '</div>';
      } else {
        var inst = data.instance;
        var durPct = inst.max_dur > 0 ? Math.round((inst.durability / inst.max_dur) * 100) : (inst.durability > 0 ? Math.round(inst.durability * 100) : 0);
        html += '<h2 class="text-lg font-semibold text-white mb-1">' + esc(inst.item) + '</h2>';
        html += '<div class="text-xs text-muted mb-4">Instance #' + inst.id + ' · Fingerprint: <span class="font-mono">' + esc(inst.fingerprint) + '</span></div>';
        html += '<div class="grid grid-cols-2 gap-2 mb-4 text-xs">';
        html += '<div><span class="text-muted">Location:</span> ' + _locationBadge(inst.location_type, inst.location_id, inst.location_slot) + '</div>';
        html += '<div><span class="text-muted">Durability:</span> ' + durPct + '%</div>';
        if (inst.ammo) html += '<div><span class="text-muted">Ammo:</span> ' + inst.ammo + '</div>';
        html += '<div><span class="text-muted">Amount:</span> ' + (inst.amount || 1) + '</div>';
        html += '<div><span class="text-muted">First seen:</span> ' + (inst.first_seen || '-') + '</div>';
        html += '<div><span class="text-muted">Last seen:</span> ' + (inst.last_seen || '-') + '</div>';
        html += '</div>';
      }

      // Movement history
      var movements = data.movements || [];
      if (movements.length > 0) {
        html += '<h3 class="text-sm font-semibold text-white mb-2">Movement History (' + movements.length + ')</h3>';
        html += '<div class="space-y-1 max-h-80 overflow-y-auto">';
        for (var i = 0; i < movements.length; i++) {
          var m = movements[i];
          html += '<div class="flex items-center gap-2 text-xs py-1.5 border-b border-border/20">';
          html += '<span class="text-muted w-32 shrink-0 font-mono text-[10px]">' + esc(m.created_at || '') + '</span>';
          html += '<span class="text-white">' + (m.move_type || 'move') + '</span>';
          html += '<span class="text-muted">×' + (m.amount || 1) + '</span>';
          html += _locationBadge(m.from_type, m.from_id, m.from_slot);
          html += '<span class="text-muted">→</span>';
          html += _locationBadge(m.to_type, m.to_id, m.to_slot);
          if (m.attributed_name) html += '<span class="text-calm ml-auto">' + esc(m.attributed_name) + '</span>';
          html += '</div>';
        }
        html += '</div>';
      } else {
        html += '<div class="text-xs text-muted mt-4">No movement history recorded</div>';
      }

      content.innerHTML = html;
    } catch (err) {
      content.innerHTML = '<div class="text-horde text-sm">Failed to load details: ' + esc(err.message) + '</div>';
    }
  }

  // Items tab event listeners
  (function() {
    var searchInput = $('#items-search');
    if (searchInput) {
      var debounce = null;
      searchInput.addEventListener('input', function() {
        clearTimeout(debounce);
        debounce = setTimeout(function() { if (S.currentTab === 'items') loadItems(); }, 300);
      });
    }
    var viewSelect = $('#items-view');
    if (viewSelect) viewSelect.addEventListener('change', function() { if (S.currentTab === 'items') loadItems(); });
    var locFilter = $('#items-location-filter');
    if (locFilter) locFilter.addEventListener('change', function() { if (S.currentTab === 'items') loadItems(); });
    var closeBtn = $('#item-detail-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { $('#item-detail-modal').classList.add('hidden'); });
    var modal = $('#item-detail-modal');
    if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.add('hidden'); });
  })();

  // ══════════════════════════════════════════════════
  //  DATABASE — Comprehensive DB query interface
  // ══════════════════════════════════════════════════

  async function loadDatabase() {
    var container = $('#db-results');
    if (!container) return;
    var table = $('#db-table') ? $('#db-table').value : 'activity_log';
    var search = ($('#db-search') ? $('#db-search').value : '').trim();
    var limit = parseInt($('#db-limit') ? $('#db-limit').value : '50', 10);

    container.innerHTML = '<div class="feed-empty">Loading...</div>';

    try {
      var params = new URLSearchParams({ limit: String(limit) });
      if (search) params.set('search', search);
      var r = await fetch('/api/panel/db/' + table + '?' + params);
      if (!r.ok) {
        var err = {};
        try { err = await r.json(); } catch (e) { /* ignore */ }
        container.innerHTML = '<div class="feed-empty">Error: ' + esc(err.error || r.statusText) + '</div>';
        return;
      }
      var d = await r.json();
      var rows = d.rows || [];
      var columns = d.columns || [];
      if (!rows.length) { container.innerHTML = '<div class="feed-empty">No data found</div>'; return; }
      renderDbTable(container, rows, columns);
    } catch (e) {
      container.innerHTML = '<div class="feed-empty">Failed to load data: ' + esc(e.message) + '</div>';
    }
  }

  function renderDbTable(container, rows, columns) {
    if (!rows || !rows.length) { container.innerHTML = '<div class="feed-empty">No data</div>'; return; }
    var hasResolved = rows.some(function(r) { return r._resolved_name; });

    // Build a steam_id → name lookup from loaded players
    var steamToName = {};
    for (var pi = 0; pi < S.players.length; pi++) {
      if (S.players[pi].steamId) steamToName[S.players[pi].steamId] = S.players[pi].name;
    }

    // Columns that contain steam IDs
    var steamCols = {};
    for (var sc = 0; sc < columns.length; sc++) {
      var cn = columns[sc].toLowerCase();
      if (cn === 'steam_id' || cn === 'target_steam_id' || cn === 'steamid' || cn === 'owner_steam_id') steamCols[columns[sc]] = true;
    }

    // Columns that are foreign keys to other tables
    var fkMap = {
      'player_id': 'players', 'clan_id': 'clans', 'steam_id': 'activity_log',
      'target_steam_id': 'activity_log', 'owner_steam_id': 'players'
    };

    var table = el('table', 'db-table');
    var thead = el('thead');
    var headRow = el('tr');
    for (var ci = 0; ci < columns.length; ci++) {
      headRow.appendChild(el('th', '', humanizeSettingKey(columns[ci])));
    }
    if (hasResolved) headRow.appendChild(el('th', '', 'Player Name'));
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el('tbody');
    for (var ri = 0; ri < rows.length; ri++) {
      var row = rows[ri];
      var tr = el('tr');
      for (var ci2 = 0; ci2 < columns.length; ci2++) {
        var col = columns[ci2];
        var td = el('td');
        var val = row[col];
        if (val == null) val = '';
        else if (typeof val === 'object') val = JSON.stringify(val);
        if ((col === 'created_at' || col === 'updated_at' || col === 'first_seen' || col === 'last_seen' || col === 'timestamp') && val) {
          try { val = new Date(val).toLocaleString('en-US', { hour12: false }); } catch (e) { /* keep raw */ }
        }

        // Make steam ID columns clickable player links
        if (steamCols[col] && val && String(val).length > 10) {
          var resolved = steamToName[String(val)] || '';
          td.innerHTML = '<span class="player-link text-accent cursor-pointer" data-steam-id="' + esc(String(val)) + '">' + esc(resolved || String(val)) + '</span>';
          if (resolved) td.title = String(val);
          else td.title = String(val);
        }
        // Make foreign key IDs clickable to jump to that table
        else if (fkMap[col] && val && !steamCols[col]) {
          var linkEl = document.createElement('span');
          linkEl.className = 'db-link text-accent cursor-pointer hover:underline';
          linkEl.dataset.table = fkMap[col];
          linkEl.dataset.search = String(val);
          linkEl.textContent = String(val);
          td.appendChild(linkEl);
          td.title = 'Click to look up in ' + fkMap[col];
        }
        else if (typeof val === 'number' && val > 9999) td.textContent = fmtNum(val);
        else td.textContent = String(val);

        if (!td.title) td.title = String(row[col] != null ? row[col] : '');
        tr.appendChild(td);
      }
      if (hasResolved) {
        var nameTd = el('td');
        nameTd.textContent = row._resolved_name || '';
        nameTd.className = 'text-accent';
        tr.appendChild(nameTd);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  }

  // ══════════════════════════════════════════════════
  //  COPY IP
  // ══════════════════════════════════════════════════

  function setupCopyBtn(btnSel, textSel) {
    var btn = $(btnSel);
    var textEl = $(textSel);
    if (!btn || !textEl) return;
    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      var text = textEl.textContent.trim();
      if (!text || text === '-') return;
      try {
        await navigator.clipboard.writeText(text);
        showCopyFeedback(btn);
      } catch (err) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showCopyFeedback(btn); } catch (e2) { /* silent */ }
        document.body.removeChild(ta);
      }
    });
  }

  function showCopyFeedback(btn) {
    var svg = btn.querySelector('svg');
    if (svg) {
      var origHtml = svg.outerHTML;
      svg.outerHTML = '<svg class="w-4 h-4 text-calm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
      setTimeout(function() {
        var check = btn.querySelector('svg');
        if (check) check.outerHTML = origHtml;
      }, 1500);
    }
  }

  // ══════════════════════════════════════════════════
  //  CLICK-TO-PROFILE DELEGATION
  // ══════════════════════════════════════════════════

  document.addEventListener('click', function(e) {
    // Player link click → open player modal
    var link = e.target.closest('.player-link');
    if (link) {
      e.preventDefault();
      var steamId = link.dataset.steamId;
      var name = link.textContent;
      var player = S.players.find(function(p) {
        return (steamId && p.steamId === steamId) ||
          (name && p.name === name) ||
          (name && p.name && p.name.toLowerCase() === name.toLowerCase());
      });
      if (player) showPlayerModal(player);
      else if (steamId) fetchAndShowPlayer(steamId);
      return;
    }

    // Inventory item click → show item popup
    var slot = e.target.closest('.inv-clickable');
    if (slot) {
      e.preventDefault();
      showItemPopup(slot);
      return;
    }

    // DB cross-reference click → navigate to related data
    var dbLink = e.target.closest('.db-link');
    if (dbLink) {
      e.preventDefault();
      var table = dbLink.dataset.table;
      var search = dbLink.dataset.search;
      if (table) {
        var sel = $('#db-table');
        if (sel) { sel.value = table; }
        var srch = $('#db-search');
        if (srch) { srch.value = search || ''; }
        switchTab('database');
        setTimeout(loadDatabase, 100);
      }
      return;
    }

    // Close item popup on outside click
    var popup = document.querySelector('.item-popup');
    if (popup && !e.target.closest('.item-popup') && !e.target.closest('.inv-clickable')) {
      popup.remove();
    }
  });

  function showItemPopup(slot) {
    // Remove any existing popup
    var old = document.querySelector('.item-popup');
    if (old) old.remove();

    var name = slot.dataset.itemName || 'Unknown';
    var qty = slot.dataset.itemQty || '';
    var dur = slot.dataset.itemDur || '';

    // Count how many players have this item
    var owners = [];
    for (var i = 0; i < S.players.length; i++) {
      var p = S.players[i];
      var count = countItemInPlayer(p, name);
      if (count > 0) owners.push({ name: p.name, steamId: p.steamId, count: count });
    }
    owners.sort(function(a, b) { return b.count - a.count; });

    var popup = document.createElement('div');
    popup.className = 'item-popup';
    var html = '<div class="item-popup-header">' + esc(name) + '</div>';
    html += '<div class="item-popup-body">';
    if (qty) html += '<div class="text-xs"><span class="text-muted">Quantity:</span> ' + qty + '</div>';
    if (dur) html += '<div class="text-xs"><span class="text-muted">Durability:</span> ' + dur + '%</div>';
    if (owners.length > 0) {
      html += '<div class="text-xs text-muted mt-2 mb-1">Held by ' + owners.length + ' player' + (owners.length > 1 ? 's' : '') + ':</div>';
      html += '<div class="item-popup-owners">';
      for (var oi = 0; oi < Math.min(owners.length, 8); oi++) {
        html += '<div class="text-xs"><span class="player-link" data-steam-id="' + esc(owners[oi].steamId) + '">' + esc(owners[oi].name) + '</span> <span class="text-muted">\u00d7' + owners[oi].count + '</span></div>';
      }
      if (owners.length > 8) html += '<div class="text-[10px] text-muted">+' + (owners.length - 8) + ' more</div>';
      html += '</div>';
    }
    // DB cross-reference link
    html += '<div class="mt-2"><span class="db-link text-[10px] text-accent hover:underline cursor-pointer" data-table="activity_log" data-search="' + esc(name) + '">Search activity log \u2192</span></div>';
    html += '</div>';
    popup.innerHTML = html;

    // Position near the slot
    var rect = slot.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.left = Math.min(rect.right + 8, window.innerWidth - 260) + 'px';
    popup.style.top = Math.max(rect.top - 20, 8) + 'px';
    popup.style.zIndex = '10000';
    document.body.appendChild(popup);
  }

  function countItemInPlayer(player, itemName) {
    var count = 0;
    var bags = [player.equipment, player.quickSlots, player.inventory, player.backpackItems];
    for (var b = 0; b < bags.length; b++) {
      var bag = bags[b];
      if (!bag) continue;
      for (var i = 0; i < bag.length; i++) {
        var item = bag[i];
        if (!item) continue;
        var n = typeof item === 'string' ? item : (item.item || item.name || '');
        if (n === itemName) count += (typeof item === 'object' ? (item.amount || item.quantity || 1) : 1);
      }
    }
    return count;
  }

  async function fetchAndShowPlayer(steamId) {
    try {
      var r = await fetch('/api/players/' + steamId);
      if (r.ok) { var p = await r.json(); showPlayerModal(p); }
    } catch (e) { /* silent */ }
  }

  // ══════════════════════════════════════════════════
  //  UTILITIES
  // ══════════════════════════════════════════════════

  function esc(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function formatPlaytime(minutes) {
    if (!minutes) return '0m';
    if (minutes < 60) return minutes + 'm';
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
  }

  function fmtNum(n) {
    if (n == null) return '0';
    return Number(n).toLocaleString('en-US');
  }

  function humanizeSettingKey(key) {
    if (!key) return '';
    return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function debounce(fn, ms) {
    var timer;
    return function() {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(null, args); }, ms);
    };
  }

})();
