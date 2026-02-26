import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
const AuthContext = createContext({});
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const fetchProfile = useCallback(async (userId, attempt = 1) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      const result = data ?? null;
      if (result) setProfile(result);
      return result;
    } catch (err) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1e3));
        return fetchProfile(userId, attempt + 1);
      }
      console.error("fetchProfile fall\xF3 definitivamente:", err);
      return null;
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && !cancelled) {
          const fetchedProfile = await fetchProfile(session.user.id);
          if (!cancelled) {
            setUser(session.user);
            setProfile(fetchedProfile);
          }
        }
      } catch (err) {
        console.error("Error en initialize auth:", err);
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
        if (event === "SIGNED_IN" && session?.user) {
          if (!cancelled) setUser(session.user);
          const fetched = await fetchProfile(session.user.id);
        } else if (event === "SIGNED_OUT" || event === "USER_DELETED") {
          if (!cancelled) {
            setUser(null);
            setProfile(null);
          }
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          if (!cancelled) setUser(session.user);
          await fetchProfile(session.user.id);
        }
      }
    );
    const authChannel = new BroadcastChannel("auth_channel");
    authChannel.onmessage = (event) => {
      if (event.data?.type === "SIGN_OUT") {
        setUser(null);
        setProfile(null);
        window.location.href = "/login";
      }
      if (event.data?.type === "SIGN_IN") {
        window.location.reload();
      }
    };
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
      authChannel.close();
    };
  }, [fetchProfile]);
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account", access_type: "offline" }
      }
    });
    if (error) throw error;
  };
  const signOut = async () => {
    const authChannel = new BroadcastChannel("auth_channel");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    authChannel.postMessage({ type: "SIGN_OUT" });
    authChannel.close();
    setUser(null);
    setProfile(null);
  };
  return /* @__PURE__ */ React.createElement(AuthContext.Provider, { value: { user, profile, loading, signInWithGoogle, signOut, fetchProfile } }, children);
};
export const useAuth = () => useContext(AuthContext);
