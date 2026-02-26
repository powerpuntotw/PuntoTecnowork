import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, CreditCard, Save, LogOut, MapPin, Building } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
export const LocalProfile = () => {
  const { user, profile, signOut } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    dni: profile?.dni || ""
  });
  const [location, setLocation] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (profile?.location_id) {
      supabase.from("printing_locations").select("*").eq("id", profile.location_id).maybeSingle().then(({ data }) => setLocation(data));
    }
  }, [profile?.location_id]);
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (error) throw error;
      showToast("Perfil actualizado", "success");
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 max-w-lg mx-auto" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark mb-6" }, "Mi Perfil"), /* @__PURE__ */ React.createElement(motion.div, { className: "bg-white rounded-2xl shadow-lg p-6", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mb-6 pb-6 border-b border-gray-100" }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "U")}&background=0093D8&color=fff`,
      onError: (e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "U")}&background=0093D8&color=fff`;
      },
      alt: "Avatar",
      className: "w-16 h-16 rounded-full border-4 border-secondary/20"
    }
  ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-gray-dark" }, profile?.full_name || "Usuario"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium" }, profile?.email), /* @__PURE__ */ React.createElement("span", { className: "px-2 py-1 bg-secondary/10 text-secondary text-xs font-medium rounded-full" }, "Local"))), location && /* @__PURE__ */ React.createElement("div", { className: "bg-secondary/5 border border-secondary/20 rounded-xl p-4 mb-6" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-secondary text-sm flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(Building, { className: "w-4 h-4" }), "Local Asignado"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-gray-dark" }, location.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium flex items-center gap-1 mt-1" }, /* @__PURE__ */ React.createElement(MapPin, { className: "w-3 h-3" }), location.address), location.phone && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium flex items-center gap-1 mt-1" }, /* @__PURE__ */ React.createElement(Phone, { className: "w-3 h-3" }), location.phone), /* @__PURE__ */ React.createElement("span", { className: `inline-block mt-2 px-2 py-1 rounded-full text-[10px] font-medium ${location.status === "activo" ? "bg-success/10 text-success" : "bg-gray-200 text-gray-medium"}` }, location.status === "activo" ? "Abierto" : "Cerrado")), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark mb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(User, { className: "w-4 h-4" }), "Nombre completo"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: form.full_name,
      onChange: (e) => setForm({ ...form, full_name: e.target.value }),
      className: "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark mb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Mail, { className: "w-4 h-4" }), "Email"), /* @__PURE__ */ React.createElement("input", { value: profile?.email || "", disabled: true, className: "w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-medium" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark mb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Phone, { className: "w-4 h-4" }), "Tel\xE9fono"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: form.phone,
      onChange: (e) => setForm({ ...form, phone: e.target.value }),
      className: "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent"
    }
  )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark mb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(CreditCard, { className: "w-4 h-4" }), "DNI"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: form.dni,
      onChange: (e) => setForm({ ...form, dni: e.target.value }),
      className: "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent"
    }
  ))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSave,
      disabled: saving,
      className: "w-full mt-6 bg-secondary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-secondary/90 disabled:opacity-50 transition-all"
    },
    /* @__PURE__ */ React.createElement(Save, { className: "w-5 h-5" }),
    " ",
    saving ? "Guardando..." : "Guardar Cambios"
  )), /* @__PURE__ */ React.createElement("button", { onClick: signOut, className: "w-full mt-4 py-3 text-gray-medium text-sm flex items-center justify-center gap-2 hover:text-secondary transition-colors" }, /* @__PURE__ */ React.createElement(LogOut, { className: "w-4 h-4" }), " Cerrar sesi\xF3n"));
};
