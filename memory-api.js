/* Anonymous memory credentials belong to one API service and never enter URLs. */
(function () {
    'use strict';
    window.createMemoryClient = function (candidates, normalizeBase) {
        const bases = [...new Set(candidates.map(normalizeBase).filter(Boolean))];
        const storageKey = base => 'lp_memory_session_v1:' + new URL(base, location.href).href;
        let sessionPromise = null;

        async function requestJson(base, path, options = {}) {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 10000);
            try {
                const response = await fetch(base + path, { ...options, signal: controller.signal });
                if (!response.ok) {
                    const error = new Error('HTTP ' + response.status);
                    error.status = response.status;
                    throw error;
                }
                return await response.json();
            } finally {
                window.clearTimeout(timer);
            }
        }

        async function establishSession() {
            // A saved credential pins the service even when it is temporarily unavailable.
            for (const base of bases) {
                let saved;
                try { saved = JSON.parse(localStorage.getItem(storageKey(base))); } catch (_) {}
                if (saved && /^[A-Za-z0-9_-]{43}$/.test(saved.sessionToken || '')) {
                    return { base, sessionToken: saved.sessionToken };
                }
            }
            let lastError;
            for (const base of bases) {
                try {
                    const session = await requestJson(base, '/session', { method: 'POST' });
                    if (session.authVersion !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(session.sessionToken || '')) {
                        throw new Error('memory service does not support authenticated sessions');
                    }
                    // Only store the credential, not server identity fields or old visitor IDs.
                    const saved = { sessionToken: session.sessionToken };
                    try { localStorage.setItem(storageKey(base), JSON.stringify(saved)); } catch (_) {}
                    return { base, ...saved };
                } catch (error) { lastError = error; }
            }
            throw lastError || new Error('memory service unavailable');
        }

        return {
            async request(path, options = {}) {
                if (!sessionPromise) {
                    sessionPromise = establishSession().catch(error => { sessionPromise = null; throw error; });
                }
                const session = await sessionPromise;
                const headers = new Headers(options.headers);
                headers.set('Authorization', 'Bearer ' + session.sessionToken);
                // No fallback after authentication: another API must never receive this token.
                return requestJson(session.base, path, { ...options, headers });
            }
        };
    };
})();
