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
    // Determine if request is a Storage operation (uploads/downloads can take much longer)
    const isStorage = typeof url === 'string' && url.includes('/storage/v1/object/');
    const timeoutMs = isStorage ? 300000 : 15000; // 5 mins for storage, 15s for DB/Auth

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

// Custom Web Lock implementation to prevent infinite hanging when browser 
// background tabs (Memory Saver) deadlock the Supabase internal mutex.
const customLock = async (name, acquireTimeout, fn) => {
    if (typeof navigator === 'undefined' || !navigator.locks) {
        return await fn();
    }

    // Web Locks can hang infinitely if their owner tab was suspended/throttled.
    // If the lock isn't acquired within 2000ms, we assume a deadlock and bypass it.
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 2000);

    try {
        return await navigator.locks.request(name, { signal: controller.signal }, async () => {
            clearTimeout(timerId);
            return await fn();
        });
    } catch (e) {
        clearTimeout(timerId);
        console.warn(`[Supabase Antifreeze] Candado bloqueado en '${name}'. Robando el lock del proceso fantasma...`);
        // steal:true libera el lock del tab suspendido (fantasma) y lo adquiere correctamente,
        // para que todas las operaciones de auth futuras funcionen sin nuevo deadlock.
        try {
            return await navigator.locks.request(name, { steal: true }, fn);
        } catch {
            // Fallback: si steal no está soportado, ejecutar sin lock
            console.warn(`[Supabase Antifreeze] Robo no soportado, ejecutando sin lock.`);
            return await fn();
        }
    }
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
