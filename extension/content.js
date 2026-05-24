// ─── Moodboard Content Script ───────────────────────
// Runs at document_start — no DOM needed, only postMessage.
// Purpose: (1) extension detection, (2) auth relay, (3) real-time state sync

(function () {
  console.log('[MoodboardExt] Content script loaded on:', window.location.href);

  // Mark extension as present
  window.__MOODBOARD_EXT__ = true;

  // Dispatch ready event
  window.dispatchEvent(new CustomEvent('moodboard-ext-ready'));

  // ── Listen for messages from the website ──
  window.addEventListener('message', function (e) {
    if (e.source !== window) return;
    if (!e.data || e.data.source !== 'moodboard-web') return;

    var type = e.data.type;
    console.log('[MoodboardExt] Received:', type);

    // PING — website checking if extension is installed
    if (type === 'PING') {
      chrome.storage.local.get(['auth_token', 'user_email'], function (data) {
        console.log('[MoodboardExt] PING → auth:', !!data.auth_token, 'email:', data.user_email || 'none');
        window.postMessage({
          source: 'moodboard-ext',
          type: 'PONG',
          installed: true,
          authenticated: !!data.auth_token,
          email: data.user_email || null,
        }, '*');
      });
    }

    // AUTH_TOKEN — website sending auth credentials
    if (type === 'AUTH_TOKEN') {
      console.log('[MoodboardExt] Storing auth token...');
      chrome.storage.local.set({
        auth_token: e.data.token,
        user_email: e.data.email,
        user_id: e.data.userId,
      }, function () {
        console.log('[MoodboardExt] Token stored → AUTH_SUCCESS');
        window.postMessage({ source: 'moodboard-ext', type: 'AUTH_SUCCESS' }, '*');
      });
    }

    // DISCONNECT
    if (type === 'DISCONNECT') {
      console.log('[MoodboardExt] Disconnecting...');
      chrome.storage.local.remove(['auth_token', 'user_email', 'user_id', 'default_board_id', 'default_board_name'], function () {
        console.log('[MoodboardExt] Disconnected');
        window.postMessage({ source: 'moodboard-ext', type: 'DISCONNECTED' }, '*');
      });
    }
  });

  // ── Real-time auth state sync ──
  // When auth_token changes in storage (from ANY tab/popup), broadcast to the website.
  // This means: user connects in /extension-auth tab → /welcome tab updates instantly.
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    if (!changes.auth_token) return;

    var newToken = changes.auth_token.newValue;
    var wasConnected = !!changes.auth_token.oldValue;
    var isConnected = !!newToken;

    console.log('[MoodboardExt] Auth state changed:', wasConnected, '→', isConnected);

    // Read full state to get email
    chrome.storage.local.get(['user_email'], function (data) {
      window.postMessage({
        source: 'moodboard-ext',
        type: 'AUTH_STATE_CHANGED',
        authenticated: isConnected,
        email: data.user_email || null,
      }, '*');
    });
  });
})();
