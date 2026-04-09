(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/hooks/useAuth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "apiFetch",
    ()=>apiFetch,
    "getAuthStore",
    ()=>getAuthStore,
    "getToken",
    ()=>getToken,
    "useAuthStore",
    ()=>useAuthStore
]);
'use client';
// Simple store using module-level state
let _store = null;
function createStore() {
    // Try to get token from localStorage on init
    let token = ("TURBOPACK compile-time truthy", 1) ? localStorage.getItem('access_token') : "TURBOPACK unreachable";
    let user = null;
    let initialized = false;
    try {
        const u = ("TURBOPACK compile-time truthy", 1) ? localStorage.getItem('auth_user') : "TURBOPACK unreachable";
        if (u) {
            const parsed = JSON.parse(u);
            if (parsed) {
                if (typeof parsed.rol === 'object' && parsed.rol !== null) {
                    parsed.rol = parsed.rol.nombre || 'usuario';
                }
                if (typeof parsed.empresa === 'object' && parsed.empresa !== null) {
                    parsed.empresa = parsed.empresa.nombre || 'Empresa';
                }
                user = parsed;
                initialized = true;
            }
        }
    } catch  {}
    const store = {
        token,
        user,
        initialized,
        setAuth (newToken, newUser) {
            if (newUser) {
                if (typeof newUser.rol === 'object' && newUser.rol !== null) {
                    newUser.rol = newUser.rol.nombre || 'usuario';
                }
                if (typeof newUser.empresa === 'object' && newUser.empresa !== null) {
                    newUser.empresa = newUser.empresa.nombre || 'Empresa';
                }
            }
            store.token = newToken;
            store.user = newUser;
            store.initialized = true;
            if ("TURBOPACK compile-time truthy", 1) {
                localStorage.setItem('access_token', newToken);
                localStorage.setItem('auth_user', JSON.stringify(newUser));
            }
        },
        clearAuth () {
            store.token = null;
            store.user = null;
            store.initialized = true;
            if ("TURBOPACK compile-time truthy", 1) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('auth_user');
                // Force clear cookies
                document.cookie = 'access_token=; Max-Age=0; path=/;';
                document.cookie = 'refresh_token=; Max-Age=0; path=/;';
            }
        },
        isAdmin () {
            return store.user?.rol === 'admin';
        },
        setInitialized (val) {
            store.initialized = val;
        },
        async forceLogout () {
            console.log('[Auth] Forcing full logout...');
            store.clearAuth();
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST'
                });
            } catch (e) {
                console.error('[Auth] Error clearing cookies during logout:', e);
            }
            if ("TURBOPACK compile-time truthy", 1) {
                window.location.href = '/login';
            }
        },
        async refreshSession () {
            try {
                const res = await apiFetch('/api/auth/me');
                if (res.ok) {
                    const { user: newUser } = await res.json();
                    store.user = newUser;
                    if ("TURBOPACK compile-time truthy", 1) {
                        localStorage.setItem('auth_user', JSON.stringify(newUser));
                    }
                } else {
                    if (res.status === 401) {
                        store.clearAuth();
                    }
                }
            } catch (error) {
                console.error('Error refreshing session:', error);
            } finally{
                store.initialized = true;
            }
        }
    };
    return store;
}
function useAuthStore(selector) {
    if (!_store) _store = createStore();
    return selector(_store);
}
function getAuthStore() {
    if (!_store) _store = createStore();
    return _store;
}
function getToken() {
    return getAuthStore().token;
}
async function apiFetch(url, options = {}) {
    const store = getAuthStore();
    const headers = new Headers(options.headers);
    if (store.token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${store.token}`);
    }
    const res = await fetch(url, {
        ...options,
        headers
    });
    if (res.status === 401) {
        console.log(`[apiFetch] 401 on ${url}, attempting refresh...`);
        const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST'
        });
        if (refreshRes.ok) {
            console.log(`[apiFetch] Refresh successful, retrying ${url}`);
            const { accessToken } = await refreshRes.json();
            store.setAuth(accessToken, store.user);
            const retryHeaders = new Headers(options.headers);
            retryHeaders.set('Authorization', `Bearer ${accessToken}`);
            return fetch(url, {
                ...options,
                headers: retryHeaders
            });
        } else {
            console.warn(`[apiFetch] Refresh failed, forcing logout`);
            await store.forceLogout();
            return new Response(null, {
                status: 401,
                statusText: 'Unauthorized - Refresh Failed'
            });
        }
    }
    return res;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/auth/AuthRefresh.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthRefresh",
    ()=>AuthRefresh
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useAuth.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function AuthRefresh() {
    _s();
    const refreshSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])({
        "AuthRefresh.useAuthStore[refreshSession]": (s)=>s.refreshSession
    }["AuthRefresh.useAuthStore[refreshSession]"]);
    const user = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])({
        "AuthRefresh.useAuthStore[user]": (s)=>s.user
    }["AuthRefresh.useAuthStore[user]"]);
    const initialized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"])({
        "AuthRefresh.useAuthStore[initialized]": (s)=>s.initialized
    }["AuthRefresh.useAuthStore[initialized]"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthRefresh.useEffect": ()=>{
            // Only refresh if we haven't initialized yet and don't have a user
            if (!user && !initialized) {
                refreshSession();
            }
        }
    }["AuthRefresh.useEffect"], [
        user,
        initialized,
        refreshSession
    ]);
    return null;
}
_s(AuthRefresh, "1/af5rf8MqzbLsElLTBe8uWHO+Q=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuthStore"]
    ];
});
_c = AuthRefresh;
var _c;
__turbopack_context__.k.register(_c, "AuthRefresh");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_04vbdam._.js.map