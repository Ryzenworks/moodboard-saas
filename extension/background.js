// ─── Moodboard Background Service Worker ────────────

// Resolved URL — set during init
var MOODBOARD_URL = 'https://moodboard-saas.vercel.app';

// ── Init gate: ensure URL is resolved before any upload ──
var _initDone = false;
var _initPromise = null;

function waitForInit() {
  if (_initDone) return Promise.resolve();
  if (_initPromise) return _initPromise;
  return Promise.resolve();
}

// ── Context Menu ──
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: 'save-image',
    title: 'Save to Moodboard',
    contexts: ['image'],
  });
});

// ── Clip Handler ──
chrome.contextMenus.onClicked.addListener(function (info) {
  if (info.menuItemId === 'save-image' && info.srcUrl) {
    clipImage(info.srcUrl);
  }
});

function clipImage(url) {
  if (url.startsWith('//')) url = 'https:' + url;
  var filename = makeName(url);

  // Badge: saving
  chrome.action.setBadgeText({ text: '...' });
  chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });

  waitForInit().then(function () {
    chrome.storage.local.get(['auth_token', 'user_id', 'default_board_id', 'default_board_name'], function (data) {
      if (!data.auth_token || !data.user_id) {
        console.log('[Moodboard] Not authenticated — saving to local queue');
        badgeError('Login');
        saveToLocalQueue(url, filename, 'Not connected — open popup to connect');
        return;
      }

      if (!data.default_board_id) {
        console.log('[Moodboard] No board selected');
        badgeError('Board');
        saveToLocalQueue(url, filename, 'no_board');
        return;
      }

      // Upload to cloud — this is a NEW upload, add to queue
      addToQueue({
        src: url,
        filename: filename,
        boardId: data.default_board_id,
        boardName: data.default_board_name || 'Board',
        timestamp: Date.now(),
        status: 'uploading',
      });
      uploadToCloud(url, filename, data.user_id, data.default_board_id, data.default_board_name || 'Board', 0);
    });
  });
}

// ── Cloud Upload (with automatic retry) ──
// NOTE: This function ONLY handles the network upload.
// Queue management (add/update) is done by the CALLER.
var MAX_RETRIES = 2;
var RETRY_DELAYS = [2000, 5000];

function uploadToCloud(imageUrl, filename, userId, boardId, boardName, attempt) {
  var apiUrl = MOODBOARD_URL + '/api/extension/upload';
  console.log('[Moodboard] Upload attempt ' + (attempt + 1) + ':', imageUrl.slice(0, 60));

  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userId,
      boardId: boardId,
      imageUrl: imageUrl,
      filename: filename,
    }),
  })
  .then(function (res) {
    return res.json().then(function (data) {
      return { ok: res.ok, status: res.status, data: data };
    });
  })
  .then(function (result) {
    if (result.ok && result.data.success) {
      console.log('[Moodboard] ✅ Upload success:', result.data.image?.id);
      // Remove from queue immediately — clean lifecycle
      removeQueueItem(imageUrl);
      badgeSuccess();
    } else {
      console.error('[Moodboard] ❌ Upload failed:', result.data.error || result.status);
      var errorMsg = result.data.error || 'Upload failed (HTTP ' + result.status + ')';

      // Plan limit reached — don't retry
      if (result.status === 403 && result.data.error === 'Upload limit reached') {
        errorMsg = 'Upload limit reached (' + result.data.current + '/' + result.data.limit + ')';
        updateQueueItem(imageUrl, 'failed', errorMsg);
        badgeError('Limit');
        return;
      }

      // Auto-retry for server errors
      if (attempt < MAX_RETRIES && result.status >= 500) {
        console.log('[Moodboard] ⏳ Retrying in ' + RETRY_DELAYS[attempt] + 'ms...');
        setTimeout(function () {
          uploadToCloud(imageUrl, filename, userId, boardId, boardName, attempt + 1);
        }, RETRY_DELAYS[attempt]);
        return;
      }

      updateQueueItem(imageUrl, 'failed', errorMsg);
      badgeError(errorMsg.slice(0, 10));
    }
  })
  .catch(function (err) {
    console.error('[Moodboard] ❌ Upload exception:', err);

    if (attempt < MAX_RETRIES) {
      console.log('[Moodboard] ⏳ Retrying in ' + RETRY_DELAYS[attempt] + 'ms...');
      setTimeout(function () {
        uploadToCloud(imageUrl, filename, userId, boardId, boardName, attempt + 1);
      }, RETRY_DELAYS[attempt]);
      return;
    }

    updateQueueItem(imageUrl, 'failed', err.message || 'Network error');
    badgeError('Error');
  });
}

// ── Queue Management ──
function addToQueue(item) {
  chrome.storage.local.get('moodboard_queue', function (data) {
    var q = data.moodboard_queue || [];

    // Deduplicate: don't add if same src is already uploading/queued
    var exists = q.some(function (existing) {
      return existing.src === item.src &&
        (existing.status === 'uploading' || existing.status === 'queued');
    });
    if (exists) {
      console.log('[Moodboard] Skipping duplicate queue entry:', item.src.slice(0, 60));
      return;
    }

    q.push(item);
    if (q.length > 50) q = q.slice(-50);
    chrome.storage.local.set({ moodboard_queue: q });
  });
}

function updateQueueItem(imageUrl, status, error) {
  chrome.storage.local.get('moodboard_queue', function (data) {
    var q = data.moodboard_queue || [];
    for (var i = q.length - 1; i >= 0; i--) {
      if (q[i].src === imageUrl && (q[i].status === 'uploading' || q[i].status === 'queued')) {
        q[i].status = status;
        if (error) q[i].error = error;
        if (status === 'synced') q[i].synced = true;
        break;
      }
    }
    chrome.storage.local.set({ moodboard_queue: q });
  });
}

function removeQueueItem(imageUrl) {
  chrome.storage.local.get('moodboard_queue', function (data) {
    var q = (data.moodboard_queue || []).filter(function (item) {
      return item.src !== imageUrl;
    });
    chrome.storage.local.set({ moodboard_queue: q });
  });
}

// ── Local Queue Fallback (offline / unauthenticated) ──
function saveToLocalQueue(url, filename, reason) {
  addToQueue({
    src: url,
    filename: filename,
    timestamp: Date.now(),
    status: 'queued',
    synced: false,
    error: reason || null,
  });
  badgeQueued();
}

// ── Process Queued & Failed Uploads ──
// Guard against concurrent calls
var _processing = false;

function processQueue() {
  if (_processing) {
    console.log('[Moodboard] processQueue already running — skipping');
    return;
  }
  _processing = true;

  chrome.storage.local.get(['moodboard_queue', 'auth_token', 'user_id', 'default_board_id', 'default_board_name'], function (data) {
    var q = data.moodboard_queue || [];
    var retryable = q.filter(function (item) {
      return item.status === 'failed' || item.status === 'queued';
    });

    if (retryable.length === 0) {
      console.log('[Moodboard] No items to process');
      _processing = false;
      return;
    }

    if (!data.auth_token || !data.user_id) {
      console.log('[Moodboard] Cannot process queue — not authenticated');
      _processing = false;
      return;
    }

    if (!data.default_board_id) {
      console.log('[Moodboard] Cannot process queue — no board selected');
      _processing = false;
      return;
    }

    console.log('[Moodboard] Processing', retryable.length, 'queued/failed uploads');
    retryable.forEach(function (item) {
      item.status = 'uploading';
      item.error = null;
      uploadToCloud(item.src, item.filename, data.user_id, data.default_board_id, data.default_board_name || 'Board', 0);
    });

    chrome.storage.local.set({ moodboard_queue: q }, function () {
      _processing = false;
    });
  });
}

// ── Internal Message Handler ──
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'GET_AUTH') {
    chrome.storage.local.get(['auth_token', 'user_email', 'user_id', 'default_board_id', 'default_board_name'], function (data) {
      sendResponse({
        authenticated: !!data.auth_token,
        email: data.user_email || null,
        userId: data.user_id || null,
        boardId: data.default_board_id || null,
        boardName: data.default_board_name || null,
      });
    });
    return true;
  }

  if (msg.type === 'SET_BOARD') {
    console.log('[Moodboard] Board set:', msg.boardName);
    chrome.storage.local.set({
      default_board_id: msg.boardId,
      default_board_name: msg.boardName,
    }, function () {
      sendResponse({ ok: true });
      // Auto-process any queued items now that a board is selected
      setTimeout(processQueue, 200);
    });
    return true;
  }

  if (msg.type === 'DISCONNECT') {
    chrome.storage.local.remove(['auth_token', 'user_email', 'user_id', 'default_board_id', 'default_board_name'], function () {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'RETRY_FAILED') {
    processQueue();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === 'CLEAR_SYNCED') {
    chrome.storage.local.get('moodboard_queue', function (data) {
      var q = (data.moodboard_queue || []).filter(function (item) {
        return item.status !== 'synced';
      });
      chrome.storage.local.set({ moodboard_queue: q }, function () {
        sendResponse({ ok: true, remaining: q.length });
      });
    });
    return true;
  }

  if (msg.type === 'GET_QUEUE_STATS') {
    chrome.storage.local.get('moodboard_queue', function (data) {
      var q = data.moodboard_queue || [];
      var stats = { total: q.length, uploading: 0, synced: 0, failed: 0, queued: 0 };
      q.forEach(function (item) {
        if (item.status === 'uploading') stats.uploading++;
        else if (item.status === 'synced' || item.synced) stats.synced++;
        else if (item.status === 'failed') stats.failed++;
        else stats.queued++;
      });
      sendResponse(stats);
    });
    return true;
  }

  if (msg.type === 'CLEAR_ALL') {
    chrome.storage.local.set({ moodboard_queue: [] }, function () {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.type === 'REMOVE_ITEM') {
    chrome.storage.local.get('moodboard_queue', function (data) {
      var q = data.moodboard_queue || [];
      var idx = q.findIndex(function (item) { return item.timestamp === msg.timestamp; });
      if (idx !== -1) q.splice(idx, 1);
      chrome.storage.local.set({ moodboard_queue: q }, function () {
        sendResponse({ ok: true, remaining: q.length });
      });
    });
    return true;
  }
});

// ── Badge Helpers ──
function badgeSuccess() {
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  setTimeout(function () { chrome.action.setBadgeText({ text: '' }); }, 2500);
}

function badgeError(text) {
  chrome.action.setBadgeText({ text: text || '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  setTimeout(function () { chrome.action.setBadgeText({ text: '' }); }, 3000);
}

function badgeQueued() {
  chrome.action.setBadgeText({ text: '⏳' });
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
  setTimeout(function () { chrome.action.setBadgeText({ text: '' }); }, 2000);
}

// ── Filename Generator ──
function makeName(u) {
  try {
    if (u.includes('ytimg.com')) {
      var m = u.match(/vi\/([^/]+)/);
      return 'yt-' + (m ? m[1] : Date.now()) + '.jpg';
    }
    if (u.includes('cdninstagram') || u.includes('instagram')) return 'ig-' + Date.now() + '.jpg';
    if (u.includes('twimg.com')) return 'x-' + Date.now() + '.jpg';
    var p = new URL(u).pathname.split('/').pop();
    if (p && p.includes('.') && p.length < 50) return p;
  } catch (e) {}
  return 'img-' + Date.now() + '.png';
}

// ── Init: detect environment + diagnostics ──
// IMPORTANT: Fetch /api/extension/boards (raw Response, no Next.js pipeline)
// instead of / (HTML page with font preload Link headers).
_initPromise = (async function init() {
  var bootStart = Date.now();
  console.log('[Moodboard BG] Service worker booting...');

  try {
    var manifest = chrome.runtime.getManifest();
    console.log('[Moodboard BG] Version:', manifest.version);
    var matches = (manifest.content_scripts && manifest.content_scripts[0] && manifest.content_scripts[0].matches) || [];
    var hasLocalhost = matches.some(function(m) { return m.includes('localhost'); });
    if (hasLocalhost) {
      try {
        await fetch('http://localhost:3000/api/extension/boards', { method: 'HEAD', mode: 'no-cors' });
        MOODBOARD_URL = 'http://localhost:3000';
        console.log('[Moodboard BG] Dev mode → ' + MOODBOARD_URL);
      } catch(e) {
        console.log('[Moodboard BG] Localhost unreachable → production');
      }
    }
  } catch(e) {}

  // Diagnostics
  chrome.storage.local.get(['auth_token', 'user_id', 'default_board_id', 'moodboard_queue'], function(data) {
    console.log('[Moodboard BG] Auth:', !!data.auth_token ? 'yes' : 'no');
    console.log('[Moodboard BG] User:', data.user_id ? data.user_id.slice(0, 8) + '...' : 'none');
    console.log('[Moodboard BG] Board:', data.default_board_id ? data.default_board_id.slice(0, 8) + '...' : 'none');
    console.log('[Moodboard BG] Queue:', (data.moodboard_queue || []).length, 'items');
  });

  _initDone = true;
  console.log('[Moodboard BG] Init complete in ' + (Date.now() - bootStart) + 'ms. URL:', MOODBOARD_URL);
})();
