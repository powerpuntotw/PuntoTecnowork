import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { LoadingScreen } from "../components/LoadingScreen";
import { useAuth } from "../contexts/AuthContext";
const VALID_REDIRECT_PREFIXES = ["/admin", "/local", "/cliente"];
const getSafeRedirect = (from) => {
  if (!from || typeof from !== "string") return null;
  return VALID_REDIRECT_PREFIXES.some((prefix) => from.startsWith(prefix)) ? from : null;
};
export const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchProfile } = useAuth();
  const processingRef = useRef(false);
  useEffect(() => {
    const handleCallback = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      try {
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get("error");
        if (oauthError) {
          navigate(`/login?error=${encodeURIComponent(oauthError)}`);
          return;
        }
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session) {
          navigate("/login");
          return;
        }
        const tokenExpiry = session.expires_at ? new Date(session.expires_at * 1e3) : null;
        if (tokenExpiry && tokenExpiry < /* @__PURE__ */ new Date()) {
          await supabase.auth.signOut();
          navigate("/login?error=session_expired");
          return;
        }
        const { data: profile, error: profileError } = await supabase.from("profiles").select("user_type, id").eq("id", session.user.id).maybeSingle();
        if (profileError) throw profileError;
        if (!profile) {
          const { error: insertError } = await supabase.from("profiles").insert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || "",
            avatar_url: session.user.user_metadata?.avatar_url || "",
            user_type: "client"
          });
          if (insertError) throw insertError;
          await supabase.from("points_accounts").insert({
            user_id: session.user.id,
            current_points: 0,
            lifetime_points: 0,
            tier_level: "bronze"
          });
          await fetchProfile(session.user.id);
          navigate("/cliente/dashboard");
        } else {
          const ALLOWED_ROUTES = {
            admin: "/admin/dashboard",
            local: "/local/dashboard",
            client: "/cliente/dashboard"
          };
          const intendedPath = getSafeRedirect(location.state?.from);
          navigate(intendedPath ?? ALLOWED_ROUTES[profile.user_type] ?? "/login", { replace: true });
        }
      } catch (error) {
        console.error("Error en callback OAuth:", error);
        navigate("/login?error=auth_failed");
      } finally {
        sessionStorage.removeItem("oauth_csrf_token");
      }
    };
    handleCallback();
  }, [navigate, location]);
  return /* @__PURE__ */ React.createElement(LoadingScreen, null);
};
