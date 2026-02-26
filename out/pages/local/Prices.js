import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
export const LocalPrices = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [globalPrices, setGlobalPrices] = useState({});
  const [customPrices, setCustomPrices] = useState({
    a4_eco: "",
    a4_high: "",
    a3_eco: "",
    a3_high: "",
    oficio_eco: "",
    oficio_high: "",
    foto_10x15: "",
    foto_13x18: "",
    foto_a4: ""
  });
  useEffect(() => {
    if (profile?.location_id) {
      loadPrices(profile.location_id);
    } else {
      setLoading(false);
    }
  }, [profile]);
  const loadPrices = async (locationId) => {
    try {
      const { data: locData, error: locError } = await supabase.from("printing_locations").select("allow_custom_prices, custom_prices").eq("id", locationId).single();
      if (locError) throw locError;
      setAllowed(locData.allow_custom_prices);
      const { data: globalData } = await supabase.from("app_settings").select("value").eq("id", "print_prices").single();
      if (globalData?.value) {
        setGlobalPrices(globalData.value);
      }
      if (locData.custom_prices) {
        setCustomPrices({ ...customPrices, ...locData.custom_prices });
      }
    } catch (err) {
      showToast("Error cargando precios: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanedPrices = {};
      Object.keys(customPrices).forEach((key) => {
        if (customPrices[key] !== "" && customPrices[key] !== null) {
          cleanedPrices[key] = Number(customPrices[key]);
        }
      });
      const payloadToSave = Object.keys(cleanedPrices).length > 0 ? cleanedPrices : null;
      const { error } = await supabase.from("printing_locations").update({ custom_prices: payloadToSave }).eq("id", profile.location_id);
      if (error) throw error;
      const overridesCount = Object.keys(cleanedPrices).length;
      const dText = overridesCount > 0 ? `Local configur\xF3 ${overridesCount} precios personalizados: ${Object.entries(cleanedPrices).map(([k, v]) => `${k}=$${v}`).join(", ")}` : "Local restableci\xF3 sus precios para usar los globales";
      await supabase.from("admin_audit_logs").insert({ admin_id: profile.id, action: "update_local_prices", target_id: profile.location_id, target_type: "location_prices", details: { description: dText } });
      showToast("Tus precios se guardaron correctamente", "success");
    } catch (err) {
      showToast("Error al guardar: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "shimmer h-64 rounded-xl" }));
  if (!allowed) {
    return /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-8 max-w-3xl mx-auto text-center mt-12" }, /* @__PURE__ */ React.createElement("div", { className: "w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6" }, /* @__PURE__ */ React.createElement(AlertTriangle, { className: "w-10 h-10 text-gray-medium" })), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-dark mb-2" }, "No autorizado"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium" }, 'El administrador no ha habilitado "Precios Personalizados" para este local. Tus clientes ver\xE1n los precios globales de la plataforma.'));
  }
  const InputGroup = ({ label, id }) => /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-bold text-gray-dark" }, label), /* @__PURE__ */ React.createElement("div", { className: "relative flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "relative flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-medium font-bold" }, "$"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "number",
      value: customPrices[id] || "",
      onChange: (e) => setCustomPrices({ ...customPrices, [id]: e.target.value }),
      placeholder: `Global: $${globalPrices[id] || 0}`,
      className: `w-full pl-8 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none font-bold ${customPrices[id] ? "border-accent/50 bg-accent/5 text-accent" : "border-gray-200"}`
    }
  )), !customPrices[id] && /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-gray-medium bg-gray-200 px-2 py-1 rounded" }, "Global")));
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-8 max-w-4xl mx-auto space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-dark" }, "Precios del Local"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium mt-1" }, "Configur\xE1 precios espec\xEDficos para tu sucursal")), /* @__PURE__ */ React.createElement("button", { onClick: handleSave, disabled: saving, className: "bg-accent text-gray-dark px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition shadow-brand disabled:opacity-50 w-full sm:w-auto" }, /* @__PURE__ */ React.createElement(Save, { className: "w-5 h-5" }), saving ? "Guardando..." : "Guardar Precios")), /* @__PURE__ */ React.createElement(motion.div, { className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-6", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }, /* @__PURE__ */ React.createElement("div", { className: "bg-accent/10 text-accent-800 text-sm font-medium p-4 rounded-xl flex items-start gap-3 mb-8" }, /* @__PURE__ */ React.createElement(AlertTriangle, { className: "w-5 h-5 shrink-0 text-accent" }), /* @__PURE__ */ React.createElement("p", null, "Dej\xE1 el campo ", /* @__PURE__ */ React.createElement("strong", null, "vac\xEDo"), " si quer\xE9s usar el ", /* @__PURE__ */ React.createElement("strong", { className: "text-accent underline" }, "precio global sugerido"), ". Los precios que ingreses aqu\xED sobreescribir\xE1n los de la plataforma s\xF3lo para los clientes que elijan tu local.")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-8" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100" }, "Hojas A4"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Est\xE1ndar", id: "a4_eco" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Premium", id: "a4_high" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100" }, "Hojas Oficio (Legal)"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Est\xE1ndar", id: "oficio_eco" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Premium", id: "oficio_high" }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100" }, "Hojas A3"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Est\xE1ndar", id: "a3_eco" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Calidad Premium", id: "a3_high" })))), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100 flex items-center justify-between" }, "Fotograf\xEDas (FotoYa)", /* @__PURE__ */ React.createElement("span", { className: "bg-primary/10 text-primary text-[10px] uppercase tracking-wider py-1 px-2 rounded-full" }, "Autom\xE1tico")), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(InputGroup, { label: "Tama\xF1o 10x15", id: "foto_10x15" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Tama\xF1o 13x18", id: "foto_13x18" }), /* @__PURE__ */ React.createElement(InputGroup, { label: "Tama\xF1o A4", id: "foto_a4" }))), /* @__PURE__ */ React.createElement("div", { className: "p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 mt-8 shadow-sm" }, /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-gray-dark mb-2 flex items-center gap-2" }, "\xBFC\xF3mo lo ve el cliente?"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium mb-3" }, "Si pon\xE9s $150 en A4 Estandar, el cliente pagar\xE1 eso en vez de los $", globalPrices.a4_eco || 120, " globales de la red."), /* @__PURE__ */ React.createElement("div", { className: "flex items-center text-xs font-bold text-accent gap-1" }, "Global ", /* @__PURE__ */ React.createElement(ArrowRight, { className: "w-3 h-3" }), " Tu Precio ", /* @__PURE__ */ React.createElement(ArrowRight, { className: "w-3 h-3" }), " Cobro Final"))))));
};
