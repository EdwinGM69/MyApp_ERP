module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/hooks/useAuth.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
    let token = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : null;
    let user = null;
    let initialized = false;
    try {
        const u = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : null;
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
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
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
        },
        clearAuth () {
            store.token = null;
            store.user = null;
            store.initialized = true;
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
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
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
        },
        async refreshSession () {
            try {
                const res = await apiFetch('/api/auth/me');
                if (res.ok) {
                    const { user: newUser } = await res.json();
                    store.user = newUser;
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
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
}),
"[project]/src/components/auth/AuthRefresh.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthRefresh",
    ()=>AuthRefresh
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useAuth.ts [app-ssr] (ecmascript)");
'use client';
;
;
function AuthRefresh() {
    const refreshSession = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuthStore"])((s)=>s.refreshSession);
    const user = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuthStore"])((s)=>s.user);
    const initialized = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useAuth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuthStore"])((s)=>s.initialized);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        // Only refresh if we haven't initialized yet and don't have a user
        if (!user && !initialized) {
            refreshSession();
        }
    }, [
        user,
        initialized,
        refreshSession
    ]);
    return null;
}
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/dynamic-access-async-storage.external.js [external] (next/dist/server/app-render/dynamic-access-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/dynamic-access-async-storage.external.js", () => require("next/dist/server/app-render/dynamic-access-async-storage.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0qms288._.js.map