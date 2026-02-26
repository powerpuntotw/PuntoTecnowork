import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, CreditCard, Save, LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
export const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    dni: profile?.dni || ""
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "El nombre es obligatorio";
    else if (form.full_name.trim().length < 3) e.full_name = "M\xEDnimo 3 caracteres";
    if (form.phone && !/^\d{7,15}$/.test(form.phone.replace(/\s|-/g, ""))) e.phone = "Tel\xE9fono inv\xE1lido (7-15 d\xEDgitos)";
    if (form.dni && !/^\d{7,8}$/.test(form.dni.replace(/\./g, ""))) e.dni = "DNI inv\xE1lido (7-8 d\xEDgitos)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (error) throw error;
      showToast("Perfil actualizado", "success");
    } catch (err) {
      showToast("Error al guardar: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 max-w-lg mx-auto" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark mb-6" }, "Mi Perfil"), /* @__PURE__ */ React.createElement(motion.div, { className: "bg-white rounded-2xl shadow-lg p-6", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mb-6 pb-6 border-b border-gray-100" }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "U")}&background=EB1C24&color=fff`,
      onError: (e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "U")}&background=EB1C24&color=fff`;
      },
      alt: "Avatar",
      className: "w-16 h-16 rounded-full border-4 border-primary/20"
    }
  ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-gray-dark" }, profile?.full_name || "Usuario"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium" }, profile?.email), /* @__PURE__ */ React.createElement("span", { className: "px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full capitalize" }, profile?.user_type))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark mb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(User, { className: "w-4 h-4" }), "Nombre completo"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: form.full_name,
      onChange: (e) => {
        setForm({ ...form, full_name: e.target.value });
        setErrors((prev) => ({ ...prev, full_name: void 0 }));
      },
      className: `w-full px-4 py-3 border ${errors.full_name ? "border-primary" : "border-gray-200"} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent`
    }
  ), errors.full_name && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-primary mt-1" }, errors.full_name)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark mb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Mail, { className: "w-4 h-4" }), "Email"), /* @__PURE__ */ React.createElement("input", { value: profile?.email || "", disabled: true, className: "w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-medium" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium mt-1" }, "El email no se puede cambiar (viene de Google)")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark mb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Phone, { className: "w-4 h-4" }), "Tel\xE9fono"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: form.phone,
      onChange: (e) => {
        setForm({ ...form, phone: e.target.value });
        setErrors((prev) => ({ ...prev, phone: void 0 }));
      },
      className: `w-full px-4 py-3 border ${errors.phone ? "border-primary" : "border-gray-200"} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent`
    }
  ), errors.phone && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-primary mt-1" }, errors.phone)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark mb-1 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(CreditCard, { className: "w-4 h-4" }), "DNI"), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: form.dni,
      onChange: (e) => {
        setForm({ ...form, dni: e.target.value });
        setErrors((prev) => ({ ...prev, dni: void 0 }));
      },
      className: `w-full px-4 py-3 border ${errors.dni ? "border-primary" : "border-gray-200"} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent`
    }
  ), errors.dni && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-primary mt-1" }, errors.dni))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSave,
      disabled: saving,
      className: "w-full mt-6 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all"
    },
    /* @__PURE__ */ React.createElement(Save, { className: "w-5 h-5" }),
    " ",
    saving ? "Guardando..." : "Guardar Cambios"
  )), /* @__PURE__ */ React.createElement("button", { onClick: signOut, className: "w-full mt-4 py-3 text-gray-medium text-sm flex items-center justify-center gap-2 hover:text-primary transition-colors" }, /* @__PURE__ */ React.createElement(LogOut, { className: "w-4 h-4" }), " Cerrar sesi\xF3n"));
};
