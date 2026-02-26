import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, CheckCircle2, Clock, MapPin, User, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
export const AdminSupport = () => {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = supabase.from("support_tickets").select(`
                    *,
                    location:printing_locations(name, address),
                    creator:profiles(full_name, email)
                `).eq("ticket_type", "system_report").order("created_at", { ascending: false });
      if (filter !== "all") {
        query = query.eq("status", filter);
      }
      const { data, error } = await query;
      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      showToast("Error al cargar reportes: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTickets();
  }, [filter]);
  const handleResolve = async (ticketId) => {
    if (!confirm("\xBFMarcar este reporte como resuelto?")) return;
    try {
      const { error } = await supabase.from("support_tickets").update({
        status: "resolved",
        resolved_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", ticketId);
      if (error) throw error;
      showToast("Reporte marcado como resuelto", "success");
      fetchTickets();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-dark flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Inbox, { className: "w-7 h-7 text-primary" }), " Bandeja de Soporte"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium mt-1" }, "Reportes del sistema enviados por los Locales")), /* @__PURE__ */ React.createElement("div", { className: "flex bg-white rounded-xl shadow-sm border border-gray-100 p-1" }, ["open", "resolved", "all"].map((f) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: f,
      onClick: () => setFilter(f),
      className: `px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f ? "bg-primary text-white shadow-md" : "text-gray-medium hover:bg-gray-50"}`
    },
    f === "open" ? "Pendientes" : f === "resolved" ? "Resueltos" : "Todos"
  )))), loading ? /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, [1, 2, 3].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "shimmer h-32 rounded-xl" }))) : tickets.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center" }, /* @__PURE__ */ React.createElement(CheckCircle2, { className: "w-16 h-16 text-gray-medium/30 mx-auto mb-4" }), /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-dark mb-2" }, "Bandeja Vac\xEDa"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium" }, "No hay reportes que coincidan con este filtro.")) : /* @__PURE__ */ React.createElement("div", { className: "grid gap-4" }, /* @__PURE__ */ React.createElement(AnimatePresence, null, tickets.map((ticket) => /* @__PURE__ */ React.createElement(
    motion.div,
    {
      key: ticket.id,
      layout: true,
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95 },
      className: `bg-white rounded-2xl shadow-sm border ${ticket.status === "open" ? "border-primary/20 hover:border-primary/40" : "border-gray-100"} p-5 transition-all`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex flex-col lg:flex-row gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: `px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${ticket.status === "open" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}` }, ticket.status === "open" ? /* @__PURE__ */ React.createElement(AlertCircle, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ React.createElement(CheckCircle2, { className: "w-3.5 h-3.5" }), ticket.status === "open" ? "Pendiente" : "Resuelto"), /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark text-lg" }, ticket.category)), /* @__PURE__ */ React.createElement("p", { className: "text-gray-dark md:text-lg mb-4" }, ticket.description), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-4 text-sm text-gray-medium" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100" }, /* @__PURE__ */ React.createElement(MapPin, { className: "w-4 h-4 text-primary" }), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-dark" }, ticket.location?.name || "Local Eliminado")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100" }, /* @__PURE__ */ React.createElement(User, { className: "w-4 h-4" }), /* @__PURE__ */ React.createElement("span", null, ticket.creator?.full_name || ticket.creator?.email)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100" }, /* @__PURE__ */ React.createElement(Clock, { className: "w-4 h-4" }), /* @__PURE__ */ React.createElement("span", null, formatDistanceToNow(new Date(ticket.created_at), { locale: es, addSuffix: true }))))), /* @__PURE__ */ React.createElement("div", { className: "lg:w-48 lg:border-l lg:border-gray-100 lg:pl-6 flex flex-col justify-center gap-2" }, ticket.status === "open" ? /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleResolve(ticket.id),
        className: "w-full bg-success text-white py-2.5 px-4 rounded-xl font-bold hover:bg-success/90 transition shadow-sm flex justify-center items-center gap-2"
      },
      /* @__PURE__ */ React.createElement(CheckCircle2, { className: "w-5 h-5" }),
      " Resolver"
    ) : /* @__PURE__ */ React.createElement("div", { className: "bg-success/5 border border-success/10 rounded-xl p-3 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-bold text-success mb-1" }, "Resuelto el"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-success/80" }, format(new Date(ticket.resolved_at), "d MMM, HH:mm", { locale: es })))))
  )))));
};
