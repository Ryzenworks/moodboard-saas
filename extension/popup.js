// ─── Moodboard Popup ────────────────────────────────

var MOODBOARD_URL = 'https://moodboard-saas.vercel.app';
var content = document.getElementById('content');
var statusPill = document.getElementById('statusPill');

// ── Load popup data ──
async function load() {
  var auth = await sendMsg({ type: 'GET_AUTH' });
  var queue = await getQueue();
  console.log('[Popup] Auth:', JSON.stringify(auth));

  if (!auth || !auth.authenticated) {
    renderUnauthenticated(queue);
  } else {
    renderAuthenticated(auth, queue);
  }
}

// ── Unauthenticated ──
function renderUnauthenticated(queue) {
  statusPill.textContent = 'Not connected';
  statusPill.className = 'status off';

  var html = '';
  html += '<div class="hero">';
  html += '<img src="icon-32.png" class="hero-icon" alt="">';
  html += '<p class="hero-title">Connect your account</p>';
  html += '<p class="hero-sub">Save images from any website directly to your boards.</p>';
  html += '<button class="btn primary" id="connectBtn">Connect to Moodboard</button>';
  html += '</div>';

  var queued = queue.filter(function(q) { return !q.synced; });
  if (queued.length > 0) {
    html += '<div class="divider"></div>';
    html += '<div class="section">';
    html += '<div class="section-label">' + queued.length + ' queued locally</div>';
    html += '<div class="queue">' + renderThumbnails(queued.slice(-8)) + '</div>';
    html += '</div>';
  }

  html += '<div class="tip">Right-click any image → "Save to Moodboard"</div>';
  content.innerHTML = html;

  bind('connectBtn', function () {
    chrome.tabs.create({ url: MOODBOARD_URL + '/extension-auth' });
    window.close();
  });
}

// ── Authenticated ──
async function renderAuthenticated(auth, queue) {
  statusPill.textContent = 'Connected';
  statusPill.className = 'status on';

  var initial = (auth.email || '?')[0].toUpperCase();
  var html = '';

  // User row
  html += '<div class="user-row">';
  html += '<div class="avatar">' + initial + '</div>';
  html += '<div class="user-info">';
  html += '<span class="user-email">' + (auth.email || 'Connected') + '</span>';
  html += '</div>';
  html += '</div>';

  // Board selector
  var needsBoard = !auth.boardId && queue.some(function(q) { return q.error === 'no_board'; });
  html += '<div class="board-row" id="boardRow">';
  html += '<span class="board-label">Board</span>';
  html += '<select class="board-select' + (needsBoard || !auth.boardId ? ' needs-board' : '') + '" id="boardSelect">';
  html += '<option value="" disabled selected>Loading...</option>';
  html += '</select>';
  html += '</div>';

  // Board required alert
  if (needsBoard) {
    html += '<div class="board-alert" id="boardAlert">';
    html += '<span class="board-alert-icon">↑</span>';
    html += '<span>Select a board to start saving</span>';
    html += '</div>';
  }

  // Queue stats
  var stats = categorizeQueue(queue);
  if (queue.length > 0) {
    html += '<div class="section">';

    // Stats bar
    var parts = [];
    if (stats.uploading > 0) parts.push('<span class="stat-uploading">' + stats.uploading + ' uploading</span>');
    if (stats.synced > 0) parts.push('<span class="stat-synced">' + stats.synced + ' saved</span>');
    if (stats.failed > 0) parts.push('<span class="stat-failed">' + stats.failed + ' failed</span>');
    if (stats.queued > 0) parts.push('<span class="stat-queued">' + stats.queued + ' queued</span>');

    html += '<div class="section-label">' + (parts.length ? parts.join(' · ') : queue.length + ' items') + '</div>';

    // Recent thumbnails with status indicators
    html += '<div class="queue">';
    var recent = queue.slice(-12);
    for (var i = 0; i < recent.length; i++) {
      var item = recent[i];
      var statusClass = item.status === 'synced' || item.synced ? 'thumb-synced'
        : item.status === 'uploading' ? 'thumb-uploading'
        : item.status === 'failed' ? 'thumb-failed'
        : 'thumb-queued';
      // Use thumbnail for data URIs, placeholder for URLs
      var thumbSrc = item.src && item.src.startsWith('data:') ? item.src : '';
      if (thumbSrc) {
        html += '<div class="thumb-wrap ' + statusClass + '"><img src="' + thumbSrc + '" title="' + escapeHtml(item.filename || '') + '"></div>';
      } else {
        html += '<div class="thumb-wrap ' + statusClass + '"><div class="thumb-placeholder" title="' + escapeHtml(item.filename || '') + '">📷</div></div>';
      }
    }
    html += '</div>';

    // Action buttons
    html += '<div class="queue-actions">';
    if (stats.failed > 0) {
      html += '<button class="btn outline sm" id="retryBtn">Retry ' + stats.failed + '</button>';
    }
    if (stats.synced > 0) {
      html += '<button class="btn ghost sm" id="clearSyncedBtn">Clear saved</button>';
    }
    html += '<button class="btn ghost sm" id="clearAllBtn">Clear all</button>';
    html += '</div>';
    html += '</div>';
  } else {
    html += '<div class="empty-state">Right-click any image to save it here</div>';
  }

  html += '<div class="divider"></div>';
  html += '<button class="btn primary" id="openBtn">Open Moodboard</button>';
  html += '<button class="btn ghost sm" id="disconnectBtn">Disconnect</button>';

  // Debug info
  html += '<div id="debugInfo" class="debug-info"></div>';

  content.innerHTML = html;

  // Bind buttons
  bind('openBtn', function () {
    var url = auth.boardId ? MOODBOARD_URL + '/boards/' + auth.boardId : MOODBOARD_URL + '/boards';
    chrome.tabs.create({ url: url });
    window.close();
  });

  bind('disconnectBtn', async function () {
    await sendMsg({ type: 'DISCONNECT' });
    load();
  });

  bind('retryBtn', async function () {
    await sendMsg({ type: 'RETRY_FAILED' });
    setTimeout(load, 500);
  });

  bind('clearSyncedBtn', async function () {
    await sendMsg({ type: 'CLEAR_SYNCED' });
    load();
  });

  bind('clearAllBtn', async function () {
    await sendMsg({ type: 'CLEAR_ALL' });
    load();
  });

  // ── Fetch boards ──
  var select = document.getElementById('boardSelect');
  var debugEl = document.getElementById('debugInfo');

  function setDebug(text) {
    if (debugEl) debugEl.textContent = text;
  }

  if (!auth.userId) {
    select.innerHTML = '<option value="" disabled selected>No userId — reconnect</option>';
    setDebug('ERROR: No userId');
    return;
  }

  try {
    var apiUrl = MOODBOARD_URL + '/api/extension/boards?userId=' + encodeURIComponent(auth.userId);
    setDebug('Loading boards...');
    var res = await fetch(apiUrl);
    var data = await res.json();

    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);

    var boards = data.boards || [];

    if (boards.length === 0) {
      var msg = data.warning ? '⚠ Set SUPABASE_SERVICE_ROLE_KEY' : 'No boards — create one first';
      select.innerHTML = '<option value="" disabled selected>' + msg + '</option>';
      setDebug(data.warning || 'No boards found');
    } else {
      var opts = '';
      var hasMatch = false;
      for (var j = 0; j < boards.length; j++) {
        var b = boards[j];
        var isSel = auth.boardId === b.id;
        if (isSel) hasMatch = true;
        opts += '<option value="' + b.id + '"' + (isSel ? ' selected' : '') + '>' + escapeHtml(b.name) + '</option>';
      }
      if (!hasMatch) opts = '<option value="" disabled selected>Select a board</option>' + opts;
      select.innerHTML = opts;
      setDebug(boards.length + ' boards loaded');
    }
  } catch (err) {
    select.innerHTML = '<option value="" disabled selected>Failed to load</option>';
    setDebug('Error: ' + (err.message || err));
  }

  // Board selection change
  if (select) {
    select.onchange = async function () {
      var opt = select.options[select.selectedIndex];
      if (opt.value) {
        await sendMsg({ type: 'SET_BOARD', boardId: opt.value, boardName: opt.textContent });
        setDebug('Board: ' + opt.textContent);

        // Dismiss board alert and highlight
        select.classList.remove('needs-board');
        var alert = document.getElementById('boardAlert');
        if (alert) alert.remove();

        // SET_BOARD auto-triggers processQueue in background.js
        // Refresh popup after a short delay to show upload progress
        setTimeout(load, 600);
      }
    };
  }
}

// ── Helpers ──
function categorizeQueue(queue) {
  var stats = { uploading: 0, synced: 0, failed: 0, queued: 0 };
  queue.forEach(function (item) {
    if (item.status === 'uploading') stats.uploading++;
    else if (item.status === 'synced' || item.synced) stats.synced++;
    else if (item.status === 'failed') stats.failed++;
    else stats.queued++;
  });
  return stats;
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderThumbnails(items) {
  return items.map(function (img) {
    var src = img.src && img.src.startsWith('data:') ? img.src : '';
    if (src) return '<img src="' + src + '" title="' + escapeHtml(img.filename) + '">';
    return '<div class="thumb-placeholder">📷</div>';
  }).join('');
}

async function getQueue() {
  var data = await chrome.storage.local.get('moodboard_queue');
  return data.moodboard_queue || [];
}

function sendMsg(msg) {
  return new Promise(function (resolve) {
    chrome.runtime.sendMessage(msg, function (response) {
      resolve(response || {});
    });
  });
}

function bind(id, fn) {
  var el = document.getElementById(id);
  if (el) el.onclick = fn;
}

// ── Init ──
// IMPORTANT: Fetch /api/extension/boards (raw Response) instead of / (HTML page)
// to prevent Next.js font preload Link headers from polluting popup context.
(async function init() {
  try {
    var manifest = chrome.runtime.getManifest();
    var matches = (manifest.content_scripts && manifest.content_scripts[0] && manifest.content_scripts[0].matches) || [];
    var hasLocalhost = matches.some(function(m) { return m.includes('localhost'); });
    if (hasLocalhost) {
      try {
        await fetch('http://localhost:3000/api/extension/boards', { method: 'HEAD', mode: 'no-cors' });
        MOODBOARD_URL = 'http://localhost:3000';
      } catch(e) {}
    }
  } catch(e) {}
  console.log('[Popup] URL:', MOODBOARD_URL);
  load();
})();
