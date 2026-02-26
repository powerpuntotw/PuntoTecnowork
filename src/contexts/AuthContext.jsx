import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const initializedRef = useRef(false);
    const intentionalSignOutRef = useRef(false);
    const lastActiveRef = useRef(Date.now());
    const recoveringRef = useRef(false);

    const fetchProfile = useCallback(async (userId, attempt = 1) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
            if (error) throw error;
            const result = data ?? null;
            if (result) setProfile(result);
            return result;
        } catch (err) {
            if (attempt < 3) {
                await new Promise(r => setTimeout(r, 1000));
                return fetchProfile(userId, attempt + 1);
            }
            console.error('fetchProfile falló definitivamente:', err);
            return null;
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const initialize = async () => {
            try {
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 10000));
                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

                if (session?.user && !cancelled) {
                    const profilePromise = fetchProfile(session.user.id);
                    const fetchedProfile = await Promise.race([profilePromise, timeoutPromise]);
                    if (!cancelled) {
                        setUser(session.user);
                        setProfile(fetchedProfile);
                    }
                }
            } catch (err) {
                console.warn('Error/Timeout en initialize auth:', err);
            } finally {
                if (!cancelled) {
                    initializedRef.current = true;
                    setLoading(false);
                }
            }
        };

        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!initializedRef.current) return;

                if (event === 'SIGNED_IN' && session?.user) {
                    if (!cancelled) setUser(session.user);
                    await fetchProfile(session.user.id);
                } else if ((event === 'SIGNED_OUT' || event === 'USER_DELETED') && intentionalSignOutRef.current) {
                    intentionalSignOutRef.current = false;
                    if (!cancelled) { setUser(null); setProfile(null); }
                } else if (event === 'SIGNED_OUT' && !intentionalSignOutRef.current) {
                    // Transient SIGNED_OUT — DON'T clear state, recover silently
                    console.warn('Transient SIGNED_OUT detected, recovering silently...');
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user && !cancelled) {
                            setUser(session.user);
                            fetchProfile(session.user.id);
                        }
                        // If no session, DON'T clear user/profile — user might be mid-work
                    } catch (_) { /* silent */ }
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    if (!cancelled) setUser(session.user);
                    await fetchProfile(session.user.id);
                }
            }
        );

        const authChannel = new BroadcastChannel('auth_channel');
        authChannel.onmessage = (event) => {
            if (event.data?.type === 'SIGN_OUT') {
                setUser(null); setProfile(null);
                window.location.href = '/login';
            }
            if (event.data?.type === 'SIGN_IN') window.location.reload();
        };

        return () => { cancelled = true; subscription?.unsubscribe(); authChannel.close(); };
    }, [fetchProfile]);

    // === Silent recovery — NEVER reloads, NEVER clears UI state ===
    useEffect(() => {
        const recoverSession = async () => {
            if (recoveringRef.current) return;
            recoveringRef.current = true;

            try {
                const timeout = (ms) => new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), ms));

                // Step 1: refreshSession — gets fresh token, unblocks Supabase internals
                try {
                    const { data, error } = await Promise.race([
                        supabase.auth.refreshSession(), timeout(5000)
                    ]);
                    if (!error && data?.session?.user) {
                        console.log('[Auth Recovery] Session refreshed silently');
                        setUser(data.session.user);
                        fetchProfile(data.session.user.id);
                        return;
                    }
                } catch (_) { /* timeout or error, try fallback */ }

                // Step 2: getSession fallback
                try {
                    const { data: { session } } = await Promise.race([
                        supabase.auth.getSession(), timeout(5000)
                    ]);
                    if (session?.user) {
                        console.log('[Auth Recovery] Session recovered via getSession');
                        setUser(session.user);
                        fetchProfile(session.user.id);
                        return;
                    }
                } catch (_) { /* also failed */ }

                // Step 3: Both failed — preserve UI state anyway.
                // User might be filling a form. Their work matters more than auth state.
                // Next actual API call will fail naturally and show an error.
                console.warn('[Auth Recovery] Could not recover session, preserving UI state.');

            } finally {
                recoveringRef.current = false;
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState !== 'visible') {
                lastActiveRef.current = Date.now();
                return;
            }
            const elapsed = Date.now() - lastActiveRef.current;
            lastActiveRef.current = Date.now();

            if (elapsed > 30000 && user?.id) {
                console.log(`[Auth Recovery] Tab resumed after ${Math.round(elapsed / 1000)}s`);
                recoverSession();
            }
        };

        const handleResume = () => {
            const elapsed = Date.now() - lastActiveRef.current;
            lastActiveRef.current = Date.now();
            if (elapsed > 30000 && user?.id) {
                console.log(`[Auth Recovery] Resume event after ${Math.round(elapsed / 1000)}s`);
                recoverSession();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        document.addEventListener('resume', handleResume);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            document.removeEventListener('resume', handleResume);
        };
    }, [user?.id, fetchProfile]);

    // Keep-alive ping every 90s
    useEffect(() => {
        if (!user?.id) return;
        const keepAlive = setInterval(async () => {
            try {
                lastActiveRef.current = Date.now();
                await supabase.from('app_settings').select('id').limit(1);
            } catch (_) { /* silent */ }
        }, 90 * 1000);
        return () => clearInterval(keepAlive);
    }, [user?.id]);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: { prompt: 'select_account', access_type: 'offline' }
            }
        });
        if (error) throw error;
    };

    const signOut = async () => {
        const authChannel = new BroadcastChannel('auth_channel');
        intentionalSignOutRef.current = true;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        authChannel.postMessage({ type: 'SIGN_OUT' });
        authChannel.close();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, fetchProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
