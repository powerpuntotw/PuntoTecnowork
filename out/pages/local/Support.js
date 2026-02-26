import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquarePlus, LifeBuoy, AlertCircle, CheckCircle2, Clock, X, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
const SYSTEM_CATEGORIES = [
  "Falta de Insumos (Papel/T\xF3ner)",
  "Falla de Impresora o Hardware",
  "Error en la Plataforma",
  "Consulta Administrativa",
  "Otro"
];
export const LocalSupport = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: SYSTEM_CATEGORIES[0], description: "" });
  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase.from("support_tickets").select("*").eq("location_id", profile.location_id).eq("ticket_type", "system_report").order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };
  useEffect(() => {
    if (profile?.location_id) fetchTickets();
  }, [profile?.location_id]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return showToast("Agreg\xE1 una breve descripci\xF3n del problema", "error");
    setSubmitting(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        location_id: profile.location_id,
        creator_id: profile.id,
        ticket_type: "system_report",
        category: form.category,
        description: form.description.trim()
      });
      if (error) throw error;
      showToast("Reporte enviado correctamente. El administrador lo revisar\xE1 pronto.", "success");
      setForm({ category: SYSTEM_CATEGORIES[0], description: "" });
      setShowForm(false);
      fetchTickets();
    } catch (err) {
      showToast("Error al enviar reporte: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  const getStatusConfig = (status) => {
    switch (status) {
      case "open":
        return { color: "bg-primary/10 text-primary", icon: AlertCircle, label: "Abierto" };
      case "resolved":
        return { color: "bg-success/10 text-success", icon: CheckCircle2, label: "Resuelto" };
      case "closed":
        return { color: "bg-gray-200 text-gray-medium", icon: X, label: "Cerrado" };
      default:
        return { color: "bg-gray-100 text-gray-medium", icon: Clock, label: status };
    }
  };
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "shimmer h-64 rounded-xl" }));
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-8 max-w-4xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-dark flex items-center gap-2" }, /* @__PURE__ */ React.createElement(LifeBuoy, { className: "w-7 h-7 text-primary" }), " Soporte y Reportes"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium mt-1" }, "Comunicaci\xF3n estructurada con la Administraci\xF3n")), !showForm && /* @__PURE__ */ React.createElement("button", { onClick: () => setShowForm(true), className: "bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition shadow-brand" }, /* @__PURE__ */ React.createElement(MessageSquarePlus, { className: "w-5 h-5" }), " Nuevo Reporte")), /* @__PURE__ */ React.createElement(AnimatePresence, null, showForm && /* @__PURE__ */ React.createElement(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: "auto" }, exit: { opacity: 0, height: 0 }, className: "mb-8 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark text-lg" }, "Abrir Reporte de Sistema"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowForm(false), className: "p-2 hover:bg-gray-50 rounded-lg transition-colors" }, /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5 text-gray-medium" }))), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-bold text-gray-dark mb-1 block" }, "Motivo principal"), /* @__PURE__ */ React.createElement("select", { value: form.category, onChange: (e) => setForm({ ...form, category: e.target.value }), className: "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none" }, SYSTEM_CATEGORIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c)))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-bold text-gray-dark mb-1 block" }, "Detalles adicionales"), /* @__PURE__ */ React.createElement("textarea", { value: form.description, onChange: (e) => setForm({ ...form, description: e.target.value }), placeholder: "Explic\xE1 brevemente cu\xE1l es el inconveniente...", rows: "3", className: "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none" })), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end pt-2" }, /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: submitting || !form.description.trim(), className: "bg-primary text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2" }, submitting ? "Enviando..." : "Enviar Reporte")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "p-4 border-b border-gray-100 bg-gray-50" }, /* @__PURE__ */ React.createElement("h2", { className: "font-bold text-gray-dark text-sm" }, "Historial de Reportes")), tickets.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-12" }, /* @__PURE__ */ React.createElement(LifeBuoy, { className: "w-12 h-12 text-gray-medium mx-auto mb-3 opacity-30" }), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium font-medium" }, "No hay reportes recientes"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium opacity-80 mt-1" }, "El sistema est\xE1 funcionando correctamente")) : /* @__PURE__ */ React.createElement("div", { className: "divide-y divide-gray-50" }, tickets.map((ticket) => {
    const status = getStatusConfig(ticket.status);
    const StatusIcon = status.icon;
    return /* @__PURE__ */ React.createElement("div", { key: ticket.id, className: "p-5 hover:bg-gray-50 transition-colors" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row gap-4 items-start md:items-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.color}` }, /* @__PURE__ */ React.createElement(StatusIcon, { className: "w-3.5 h-3.5" }), status.label), /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark truncate" }, ticket.category)), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium mt-2" }, ticket.description)), /* @__PURE__ */ React.createElement("div", { className: "text-right shrink-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-gray-dark text-left md:text-right" }, "Hace ", formatDistanceToNow(new Date(ticket.created_at), { locale: es })), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-medium mt-0.5" }, format(new Date(ticket.created_at), "d MMM, HH:mm", { locale: es })))), ticket.resolved_at && /* @__PURE__ */ React.createElement("div", { className: "mt-3 bg-success/5 p-3 rounded-lg flex items-start gap-2 border border-success/10" }, /* @__PURE__ */ React.createElement(CheckCircle2, { className: "w-4 h-4 text-success shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-success" }, "Resuelto por Administraci\xF3n"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-success/80" }, format(new Date(ticket.resolved_at), "d MMM yyyy, HH:mm", { locale: es })))));
  }))));
};
