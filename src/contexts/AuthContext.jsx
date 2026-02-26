import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const initializedRef = useRef(false);
    const intentionalSignOutRef = useRef(false);

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
                // Wrap getSession in a manually enforced timeout because Supabase auth calls
                // might not perfectly respect the custom fetch timeout when checking indexedDB
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
                console.warn('Error/Timeout en initialize auth (podría estar offline/dormido):', err);
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
                    // fetchProfile will call setProfile internally
                    // For new users, profile may not exist yet (AuthCallback creates it)
                    // so we only update if we actually got a profile
                    const fetched = await fetchProfile(session.user.id);
                    // fetchProfile already called setProfile, no extra action needed
                } else if ((event === 'SIGNED_OUT' || event === 'USER_DELETED') && intentionalSignOutRef.current) {
                    intentionalSignOutRef.current = false;
                    if (!cancelled) {
                        setUser(null);
                        setProfile(null);
                    }
                } else if (event === 'SIGNED_OUT' && !intentionalSignOutRef.current) {
                    // Transient SIGNED_OUT from background token refresh – ignore to prevent blank panels
                    // The visibilitychange listener will recover the session
                    console.warn('Transient SIGNED_OUT detected, recovering...');
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session?.user && !cancelled) {
                            setUser(session.user);
                            fetchProfile(session.user.id);
                        }
                    } catch (_) { /* silent */ }
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    if (!cancelled) setUser(session.user);
                    await fetchProfile(session.user.id);
                }
            }
        );

        // Cross-tab logout sync
        const authChannel = new BroadcastChannel('auth_channel');
        authChannel.onmessage = (event) => {
            if (event.data?.type === 'SIGN_OUT') {
                setUser(null);
                setProfile(null);
                window.location.href = '/login';
            }
            if (event.data?.type === 'SIGN_IN') {
                window.location.reload();
            }
        };

        return () => {
            cancelled = true;
            subscription?.unsubscribe();
            authChannel.close();
        };
    }, [fetchProfile]);

    // Recover session when tab becomes visible again after backgrounding
    useEffect(() => {
        if (!user?.id) return;

        const handleVisibility = async () => {
            // Tab became visible again
            if (document.visibilityState === 'visible') {
                try {
                    // Force auth context to check itself, with timeout so it doesn't hang.
                    // The custom web lock in supabase.js will intercept deadlocks seamlessly.
                    const sessionPromise = supabase.auth.getSession();
                    const timeout = new Promise((_, r) => setTimeout(() => r(new Error('Timeout')), 5000));
                    const { data: { session } } = await Promise.race([sessionPromise, timeout]);

                    if (session?.user) fetchProfile(session.user.id);
                } catch (_) { /* silent */ }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [user?.id, fetchProfile]);

    // Keep-alive: ping DB every 90 seconds while logged in
    useEffect(() => {
        if (!user?.id) return;
        const keepAlive = setInterval(async () => {
            try {
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
