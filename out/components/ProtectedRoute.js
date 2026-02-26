import { useState, useRef, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingScreen } from "./LoadingScreen";
import { DynamicLogo } from "./DynamicLogo";
import { supabase } from "../lib/supabase";
const CompleteProfileScreen = () => {
  const { fetchProfile, user, profile, signOut } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    dni: profile?.dni || ""
  });
  const [saving, setSaving] = useState(false);
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error: updateError } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (updateError) throw updateError;
      await fetchProfile(user.id);
      window.location.reload();
    } catch (err) {
      console.error("Error guardando perfil:", err);
      alert("Error al guardar, intentalo de nuevo");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-gray-light py-12" }, /* @__PURE__ */ React.createElement(DynamicLogo, { type: "principal", className: "h-12 object-contain mb-4" }), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-xl p-8 max-w-md w-full" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark text-center mb-2" }, "Complet\xE1 tu Perfil"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-sm text-center mb-6" }, "Para continuar utilizando la aplicaci\xF3n, necesitamos algunos datos b\xE1sicos adicionales."), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSave, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-dark mb-1" }, "Nombre y Apellido"), /* @__PURE__ */ React.createElement("input", { value: form.full_name, onChange: (e) => setForm({ ...form, full_name: e.target.value }), required: true, className: "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary", placeholder: "Ej. Juan P\xE9rez" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-dark mb-1" }, "Tel\xE9fono"), /* @__PURE__ */ React.createElement("input", { value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }), required: true, type: "tel", className: "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary", placeholder: "Ej. 11 1234 5678" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-dark mb-1" }, "DNI"), /* @__PURE__ */ React.createElement("input", { value: form.dni, onChange: (e) => setForm({ ...form, dni: e.target.value }), required: true, className: "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary", placeholder: "Ingres\xE1 tu n\xFAmero de DNI" })), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: saving || !form.full_name || !form.phone || !form.dni, className: "w-full mt-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all" }, saving ? "Guardando..." : "Comenzar"))), /* @__PURE__ */ React.createElement("button", { onClick: signOut, className: "mt-4 text-xs text-gray-medium underline" }, "Cerrar sesi\xF3n"));
};
const ProfileErrorScreen = () => {
  const { fetchProfile, user, signOut } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const retriesRef = useRef(0);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (retriesRef.current >= 5) {
        clearInterval(interval);
        return;
      }
      retriesRef.current += 1;
      const result = await fetchProfile(user.id);
      if (result) {
        clearInterval(interval);
        window.location.reload();
      }
    }, 2e3);
    return () => clearInterval(interval);
  }, [fetchProfile, user.id]);
  const handleRetry = async () => {
    setRetrying(true);
    const result = await fetchProfile(user.id);
    if (result) {
      window.location.reload();
    }
    setRetrying(false);
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-gray-light" }, /* @__PURE__ */ React.createElement(DynamicLogo, { type: "principal", className: "h-12 object-contain mb-4" }), /* @__PURE__ */ React.createElement("p", { className: "text-gray-dark font-semibold text-center" }, "Cargando tu perfil..."), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-sm text-center max-w-xs" }, "Estamos preparando tu cuenta. Si tarda demasiado, prob\xE1 recargar la p\xE1gina."), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 mt-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleRetry,
      disabled: retrying,
      className: "px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
    },
    retrying ? "Reintentando..." : "Reintentar"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => window.location.reload(),
      className: "px-5 py-2 border border-gray-light rounded-xl text-sm text-gray-medium"
    },
    "Recargar p\xE1gina"
  )), /* @__PURE__ */ React.createElement("button", { onClick: signOut, className: "mt-4 text-xs text-gray-medium underline" }, "Cerrar sesi\xF3n"));
};
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return /* @__PURE__ */ React.createElement(LoadingScreen, null);
  if (!user) return /* @__PURE__ */ React.createElement(Navigate, { to: "/login", state: { from: location.pathname }, replace: true });
  if (!profile) return /* @__PURE__ */ React.createElement(ProfileErrorScreen, null);
  const isProfileComplete = Boolean(profile.full_name && profile.phone && profile.dni);
  if (!isProfileComplete) return /* @__PURE__ */ React.createElement(CompleteProfileScreen, null);
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.user_type)) {
    const ROLE_DASHBOARDS = {
      admin: "/admin/dashboard",
      local: "/local/dashboard",
      client: "/cliente/dashboard"
    };
    return /* @__PURE__ */ React.createElement(Navigate, { to: ROLE_DASHBOARDS[profile.user_type] ?? "/login", replace: true });
  }
  return children;
};
