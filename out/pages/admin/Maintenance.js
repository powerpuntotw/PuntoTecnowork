import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Save, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../contexts/AuthContext";
const DEFAULT_PRICES = {
  a4_eco: 120,
  a4_high: 180,
  a3_eco: 200,
  a3_high: 250,
  oficio_eco: 130,
  oficio_high: 190,
  foto_10x15: 50,
  foto_13x18: 80,
  foto_a4: 250
};
export const AdminMaintenance = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [inflationPercent, setInflationPercent] = useState("");
  useEffect(() => {
    loadSettings();
  }, []);
  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from("app_settings").select("value").eq("id", "print_prices").single();
      if (error && error.code !== "PGRST116") throw error;
      if (data?.value) setPrices(data.value);
    } catch (err) {
      showToast("Error cargando precios: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: currentData } = await supabase.from("app_settings").select("value").eq("id", "print_prices").single();
      const oldPrices = currentData?.value || {};
      let changes = [];
      Object.keys(prices).forEach((key) => {
        if (prices[key] !== oldPrices[key]) {
          changes.push(`${key}: $${oldPrices[key] || 0} \u2794 $${prices[key]}`);
        }
      });
      const dText = changes.length > 0 ? `Precios base (globales) listos. Cambios: ${changes.join(", ")}` : "Precios base re-guardados sin alterar valores";
      const { error } = await supabase.from("app_settings").upsert({ id: "print_prices", value: prices });
      if (error) throw error;
      await supabase.from("admin_audit_logs").insert({ admin_id: user.id, action: "update_global_prices", target_id: null, target_type: "app_settings", details: { description: dText } });
      showToast("Precios globales actualizados", "success");
    } catch (err) {
      showToast("Error al guardar: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };
  const applyInflation = () => {
    const percent = parseFloat(inflationPercent);
    if (isNaN(percent) || percent <= 0) {
      showToast("Ingres\xE1 un porcentaje v\xE1lido", "error");
      return;
    }
    if (!confirm(`\xBFAplicar un aumento del ${percent}% a todos los precios globales?`)) return;
    const multiplier = 1 + percent / 100;
    const newPrices = { ...prices };
    Object.keys(newPrices).forEach((key) => {
      newPrices[key] = Math.round(newPrices[key] * multiplier / 10) * 10;
    });
    setPrices(newPrices);
    setInflationPercent("");
    showToast("Nuevos precios calculados. Record\xE1 guardar los cambios.", "info");
  };
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "shimmer h-64 rounded-xl" }));
  const InputGroup = ({ label, id }) => /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-bold text-gray-dark" }, label), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-medium font-bold" }, "$"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: prices[id] || "",
      onChange: (e) => setPrices({ ...prices, [id]: Number(e.target.value) }),
      className: "w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold"
    }
  )));
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-8 max-w-4xl mx-auto space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-dark" }, "Mantenimiento Global"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium mt-1" }, "Configuraci\xF3n general de la plataforma")), /* @__PURE__ */ React.createElement("button", { onClick: handleSave, disabled: saving, className: "bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition shadow-brand disabled:opacity-50" }, /* @__PURE__ */ React.createElement(Save, { className: "w-5 h-5" }), saving ? "Guardando..." : "Guardar Cambios")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "md:col-span-2 space-y-6" }, /* @__PURE__ */ React.createElement(motion.div, { className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-6", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "p-2 bg-primary/10 rounded-lg" }, /* @__PURE__ */ React.createElement(Settings, { className: "w-5 h-5 text-primary" })), /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold text-gray-dark" }, "Precios Globales de Impresi\xF3n")), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 text-blue-800 text-sm p-3 rounded-lg flex items-start gap-2 mb-6" }, /* @__PURE__ */ React.createElement(AlertTriangle, { className: "w-5 h-5 shrink-0" }), /* @__PURE__ */ React.createElement("p", null, "Estos precios aplican a todos los locales que ", /* @__PURE__ */ React.createElement("strong", null, "no"), ' tengan habilitado "Precios Personalizados".')), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-3 border-b pb-2" }, "Hojas A4"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Est\xE1ndar", id: "a4_eco" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Premium", id: "a4_high" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-3 border-b pb-2" }, "Hojas A3"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Est\xE1ndar", id: "a3_eco" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Premium", id: "a3_high" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-3 border-b pb-2" }, "Hojas Oficio (Legal)"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Est\xE1ndar", id: "oficio_eco" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Premium", id: "oficio_high" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-3 border-b pb-2" }, "Fotograf\xEDas (FotoYa)"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement(InputGroup, { label: "Tama\xF1o 10x15", id: "foto_10x15" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Tama\xF1o 13x18", id: "foto_13x18" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Tama\xF1o A4", id: "foto_a4" })))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement(motion.div, { className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-6", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 } }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "p-2 bg-accent/10 rounded-lg" }, /* @__PURE__ */ React.createElement(TrendingUp, { className: "w-5 h-5 text-accent" })), /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold text-gray-dark" }, "Ajuste por Inflaci\xF3n")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium mb-4" }, "Aplic\xE1 un porcentaje de aumento a todos los precios globales. Los valores se redondear\xE1n a la decena m\xE1s cercana."), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      placeholder: "Ej: 15",
      value: inflationPercent,
      onChange: (e) => setInflationPercent(e.target.value),
      className: "w-full pl-4 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none font-bold"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-medium font-bold" }, "%")), /* @__PURE__ */ React.createElement("button", { onClick: applyInflation, disabled: !inflationPercent, className: "bg-accent text-gray-dark px-4 py-3 rounded-xl font-bold hover:bg-accent/90 transition disabled:opacity-50" }, "Aplicar"))))));
};
