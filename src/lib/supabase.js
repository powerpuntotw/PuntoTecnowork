import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variables de entorno de Supabase no configuradas. Revisar .env.local');
}

if (supabaseAnonKey.includes('service_role')) {
    throw new Error('CRÍTICO: No usar service_role_key en el frontend');
}

const customFetch = async (url, options) => {
    const isStorage = typeof url === 'string' && url.includes('/storage/v1/object/');
    const timeoutMs = isStorage ? 300000 : 15000;

    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error(`[Supabase Fetch Timeout] URL: ${url}`);
            throw new Error(isStorage
                ? 'La operación tardó demasiado. Comprobá tu conexión a internet.'
                : 'La conexión expiró por inactividad. Por favor, recargá la página (F5).');
        }
        throw err;
    } finally {
        clearTimeout(timerId);
    }
};

// Bypass Web Locks completely — they cause deadlocks with Chrome Memory Saver.
// Multi-tab sync is handled by BroadcastChannel in AuthContext.
const customLock = async (name, acquireTimeout, fn) => {
    return await fn();
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'puntotwag_auth',
        storage: window.localStorage,
        lock: customLock,
    },
    global: {
        fetch: customFetch
    }
});
