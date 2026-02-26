import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Image, Upload, Save, Trash2, Eye } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
export const AdminBranding = () => {
  const { showToast } = useToast();
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appName, setAppName] = useState("");
  const [tagline, setTagline] = useState("");
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("app_branding").select("*").single();
      if (data) {
        setBranding(data);
        setAppName(data.app_name || "");
        setTagline(data.tagline || "");
      }
      setLoading(false);
    };
    fetch();
  }, []);
  const uploadLogo = async (file, field) => {
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${field}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("brand-assets").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("brand-assets").getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("app_branding").update({ [field]: publicUrl }).eq("id", branding.id);
      if (updateError) throw updateError;
      setBranding((prev) => ({ ...prev, [field]: publicUrl }));
      showToast("Logo actualizado", "success");
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };
  const removeLogo = async (field) => {
    const { error } = await supabase.from("app_branding").update({ [field]: null }).eq("id", branding.id);
    if (error) showToast("Error: " + error.message, "error");
    else {
      setBranding((prev) => ({ ...prev, [field]: null }));
      showToast("Logo eliminado", "success");
    }
  };
  const saveText = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("app_branding").update({ app_name: appName, tagline }).eq("id", branding.id);
      if (error) throw error;
      showToast("Guardado", "success");
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const LogoUploader = ({ label, field }) => {
    const ref = useRef(null);
    const url = branding?.[field];
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-4" }, label), /* @__PURE__ */ React.createElement("div", { className: "w-full h-40 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 mb-4" }, url ? /* @__PURE__ */ React.createElement("img", { src: url, alt: label, className: "max-h-full max-w-full object-contain p-2" }) : /* @__PURE__ */ React.createElement(Image, { className: "w-12 h-12 text-gray-medium" })), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("button", { onClick: () => ref.current?.click(), className: "flex-1 bg-secondary text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1" }, /* @__PURE__ */ React.createElement(Upload, { className: "w-4 h-4" }), "Subir"), url && /* @__PURE__ */ React.createElement("button", { onClick: () => removeLogo(field), className: "bg-primary/10 text-primary py-2 px-4 rounded-lg text-sm font-medium" }, /* @__PURE__ */ React.createElement(Trash2, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("input", { ref, type: "file", accept: "image/*", className: "hidden", onChange: (e) => {
      if (e.target.files[0]) uploadLogo(e.target.files[0], field);
    } }));
  };
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, [1, 2, 3].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "shimmer h-48 rounded-xl" })));
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-dark" }, "Gesti\xF3n de Branding"), /* @__PURE__ */ React.createElement(motion.div, { className: "bg-white rounded-xl shadow-lg p-6", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-4" }, "Configuraci\xF3n General"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark" }, "Nombre de la App"), /* @__PURE__ */ React.createElement("input", { value: appName, onChange: (e) => setAppName(e.target.value), className: "w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-dark" }, "Tagline"), /* @__PURE__ */ React.createElement("input", { value: tagline, onChange: (e) => setTagline(e.target.value), className: "w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl" }))), /* @__PURE__ */ React.createElement("button", { onClick: saveText, disabled: saving, className: "mt-4 bg-primary text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50" }, /* @__PURE__ */ React.createElement(Save, { className: "w-4 h-4" }), saving ? "Guardando..." : "Guardar")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6" }, /* @__PURE__ */ React.createElement(LogoUploader, { label: "Logo Principal", field: "logo_principal_url" }), /* @__PURE__ */ React.createElement(LogoUploader, { label: "Logo Footer 1", field: "logo_footer_1_url" }), /* @__PURE__ */ React.createElement(LogoUploader, { label: "Logo Footer 2", field: "logo_footer_2_url" })));
};
