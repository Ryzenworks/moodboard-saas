'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type ExtensionStatus = 'loading' | 'not_installed' | 'installed' | 'connected';

interface ExtensionState {
  status: ExtensionStatus;
  email: string | null;
  recheck: () => void;
}

/**
 * Detects the Moodboard Chrome extension via content script postMessage.
 * Also listens for real-time AUTH_STATE_CHANGED broadcasts from the content script
 * when auth_token changes in chrome.storage (enables cross-tab sync).
 */
export function useExtension(): ExtensionState {
  const [status, setStatus] = useState<ExtensionStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // ── Persistent listener for real-time auth state changes ──
  useEffect(() => {
    function onAuthChange(e: MessageEvent) {
      if (e.data?.source !== 'moodboard-ext') return;

      // Real-time auth broadcast (from storage.onChanged in content script)
      if (e.data.type === 'AUTH_STATE_CHANGED') {
        console.log('[ExtDetect] AUTH_STATE_CHANGED:', e.data);
        if (e.data.authenticated) {
          setStatus('connected');
          setEmail(e.data.email || null);
        } else {
          setStatus('installed'); // Extension present but disconnected
          setEmail(null);
        }
      }

      // Also catch AUTH_SUCCESS from connect flow
      if (e.data.type === 'AUTH_SUCCESS') {
        console.log('[ExtDetect] AUTH_SUCCESS received — marking connected');
        setStatus('connected');
      }

      // DISCONNECTED
      if (e.data.type === 'DISCONNECTED') {
        console.log('[ExtDetect] DISCONNECTED — marking installed');
        setStatus('installed');
        setEmail(null);
      }
    }

    window.addEventListener('message', onAuthChange);
    return () => window.removeEventListener('message', onAuthChange);
  }, []);

  // ── Initial detection via PING/PONG ──
  const check = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Clean up previous check
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    setStatus('loading');
    console.log('[ExtDetect] Starting detection...');

    let resolved = false;

    function onPong(e: MessageEvent) {
      if (e.data?.source !== 'moodboard-ext' || e.data?.type !== 'PONG') return;
      if (resolved) return;
      resolved = true;
      console.log('[ExtDetect] PONG:', JSON.stringify(e.data));

      if (e.data.authenticated) {
        setStatus('connected');
        setEmail(e.data.email || null);
      } else {
        setStatus('installed');
        setEmail(null);
      }
    }

    window.addEventListener('message', onPong);

    function sendPing() {
      if (resolved) return;
      window.postMessage({ source: 'moodboard-web', type: 'PING' }, '*');
    }

    // Multiple attempts to handle timing
    sendPing();
    const t1 = setTimeout(sendPing, 200);
    const t2 = setTimeout(sendPing, 600);
    const t3 = setTimeout(sendPing, 1200);

    // Listen for late content script injection
    function onReady() {
      console.log('[ExtDetect] moodboard-ext-ready event');
      sendPing();
    }
    window.addEventListener('moodboard-ext-ready', onReady);

    // Fallback timeout
    const fallback = setTimeout(() => {
      if (!resolved) {
        console.log('[ExtDetect] No PONG → not_installed');
        resolved = true;
        setStatus('not_installed');
      }
    }, 2500);

    cleanupRef.current = () => {
      window.removeEventListener('message', onPong);
      window.removeEventListener('moodboard-ext-ready', onReady);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(fallback);
      resolved = true;
    };
  }, []);

  useEffect(() => {
    check();
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, [check]);

  const recheck = useCallback(() => {
    console.log('[ExtDetect] Manual recheck');
    check();
  }, [check]);

  return { status, email, recheck };
}
