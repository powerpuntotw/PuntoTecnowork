import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Star, Filter, X, FileText, Image, Clock, Check, Printer, Truck, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
const STATUS_CONFIG = {
  pendiente: { label: "Pendiente", color: "bg-accent text-gray-dark" },
  en_proceso: { label: "En Proceso", color: "bg-secondary text-white" },
  paused: { label: "Revisi\xF3n Requerida", color: "bg-red-100 text-red-600 border border-red-200" },
  listo: { label: "Listo", color: "bg-success text-white" },
  entregado: { label: "Entregado", color: "bg-green-700 text-white" },
  cancelado: { label: "Cancelado", color: "bg-primary text-white" }
};
export const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderTickets, setOrderTickets] = useState({});
  const fetchOrdersAndTickets = async () => {
    const { data: oData } = await supabase.from("print_orders").select("*").eq("customer_id", user.id).order("created_at", { ascending: false });
    setOrders(oData || []);
    if (oData?.length > 0) {
      const pausedOrdersIds = oData.filter((o) => o.status === "paused").map((o) => o.id);
      if (pausedOrdersIds.length > 0) {
        const { data: tData } = await supabase.from("support_tickets").select("*").in("order_id", pausedOrdersIds).eq("status", "open");
        if (tData) {
          const ticketMap = {};
          tData.forEach((t) => ticketMap[t.order_id] = t);
          setOrderTickets(ticketMap);
        }
      }
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchOrdersAndTickets();
    const channel = supabase.channel("client-orders").on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "print_orders", filter: `customer_id=eq.${user.id}` },
      (payload) => setOrders((prev) => prev.map((o) => o.id === payload.new.id ? payload.new : o))
    ).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-3" }, [1, 2, 3, 4].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "shimmer h-20 rounded-xl" })));
  return /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark mb-4" }, "Mis \xD3rdenes"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4" }, ["all", ...Object.keys(STATUS_CONFIG)].map((s) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: s,
      onClick: () => setFilter(s),
      className: `px-3 py-2 rounded-full whitespace-nowrap text-xs font-medium transition-all ${filter === s ? "bg-primary text-white" : "bg-white text-gray-medium border border-gray-200"}`
    },
    s === "all" ? "Todas" : STATUS_CONFIG[s].label
  ))), filtered.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-12" }, /* @__PURE__ */ React.createElement(Package, { className: "w-12 h-12 text-gray-medium mx-auto mb-3" }), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium" }, "No hay \xF3rdenes")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, filtered.map((order, i) => /* @__PURE__ */ React.createElement(
    motion.div,
    {
      key: order.id,
      className: "bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition-shadow",
      onClick: () => setSelectedOrder(order),
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { delay: i * 0.05 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-primary" }, order.order_number), /* @__PURE__ */ React.createElement("span", { className: `px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[order.status]?.color}` }, STATUS_CONFIG[order.status]?.label)),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium" }, format(new Date(order.created_at), "d 'de' MMM, HH:mm", { locale: es })), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-gray-dark" }, "$", order.total_amount)),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mt-2 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium" }, order.file_urls?.length || 0, " archivos \u2022 ", order.specifications?.copies || 1, " copias"), order.points_earned > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-success font-bold flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Star, { className: "w-3 h-3 fill-current" }), "+", order.points_earned, " pts"))
  ))), /* @__PURE__ */ React.createElement(AnimatePresence, null, selectedOrder && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      className: "fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4",
      onClick: () => setSelectedOrder(null)
    },
    /* @__PURE__ */ React.createElement(
      motion.div,
      {
        initial: { y: 100 },
        animate: { y: 0 },
        exit: { y: 100 },
        className: "bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark" }, "Orden ", selectedOrder.order_number), /* @__PURE__ */ React.createElement("button", { onClick: () => setSelectedOrder(null) }, /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5 text-gray-medium" }))),
      /* @__PURE__ */ React.createElement("div", { className: "p-4 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: `px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedOrder.status]?.color}` }, STATUS_CONFIG[selectedOrder.status]?.label), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-medium" }, format(new Date(selectedOrder.created_at), "d 'de' MMM yyyy, HH:mm", { locale: es }))), selectedOrder.status === "paused" && orderTickets[selectedOrder.id] && /* @__PURE__ */ React.createElement("div", { className: "bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm animate-pulse-soft" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(AlertCircle, { className: "w-5 h-5 text-red-500" }), /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-red-700" }, "El local report\xF3 un problema")), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-dark mb-1" }, "Motivo: ", orderTickets[selectedOrder.id].category), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium mb-3" }, orderTickets[selectedOrder.id].description), /* @__PURE__ */ React.createElement("button", { className: "w-full bg-white border border-gray-200 text-gray-dark hover:bg-gray-50 flex justify-center py-2 rounded-lg text-sm font-bold transition" }, "Cancelar orden y reembolsar"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-500 text-center mt-2 italic" }, "Si necesit\xE1s reenviar el archivo, cancel\xE1 la orden y cre\xE1 una nueva.")), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-xl p-4 space-y-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-bold text-gray-dark uppercase" }, "Especificaciones"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2 text-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium" }, "Tama\xF1o:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, formatSize(selectedOrder.specifications?.size))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium" }, "Calidad:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-medium capitalize" }, selectedOrder.specifications?.quality)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium" }, "Copias:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, selectedOrder.specifications?.copies)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium" }, "Archivos:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, selectedOrder.file_urls?.length || 0)))), selectedOrder.notes && /* @__PURE__ */ React.createElement("div", { className: "bg-secondary/5 border border-secondary/20 rounded-xl p-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-bold text-secondary uppercase mb-1" }, "Instrucciones"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-dark" }, selectedOrder.notes)), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-r from-primary to-accent rounded-xl p-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-white font-medium" }, "Total"), /* @__PURE__ */ React.createElement("span", { className: "text-2xl font-bold text-white" }, "$", selectedOrder.total_amount)), selectedOrder.points_earned > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-2 text-success font-bold" }, /* @__PURE__ */ React.createElement(Star, { className: "w-5 h-5 fill-current" }), "+", selectedOrder.points_earned, " puntos ", selectedOrder.status === "entregado" ? "acreditados" : "al retirar"), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-100 pt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-bold text-gray-dark uppercase mb-3" }, "Estado del pedido"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, ["pendiente", "en_proceso", "listo", "entregado"].map((step, i) => {
        const stepLabels = { pendiente: "Pendiente", en_proceso: "En Proceso", listo: "Listo para retirar", entregado: "Entregado" };
        const stepIcons = { pendiente: Clock, en_proceso: Printer, listo: Check, entregado: Truck };
        const Icon = stepIcons[step];
        const isPastOrCurrent = selectedOrder.status === "entregado" || selectedOrder.status === "listo" && i <= 2 || selectedOrder.status === "en_proceso" && i <= 1 || selectedOrder.status === "pendiente" && i <= 0 || selectedOrder.status === "paused" && i <= 1;
        const isPausedNode = selectedOrder.status === "paused" && step === "en_proceso";
        const bgColor = isPausedNode ? "bg-red-500" : isPastOrCurrent ? "bg-primary" : "bg-gray-100";
        const textColor = isPausedNode ? "text-red-500" : isPastOrCurrent ? "text-gray-dark" : "text-gray-medium";
        return /* @__PURE__ */ React.createElement("div", { key: step, className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: `w-8 h-8 rounded-full flex items-center justify-center ${bgColor}` }, /* @__PURE__ */ React.createElement(Icon, { className: `w-4 h-4 ${isPastOrCurrent || isPausedNode ? "text-white" : "text-gray-medium"}` })), /* @__PURE__ */ React.createElement("span", { className: `text-sm font-medium ${textColor}` }, isPausedNode ? "Revisi\xF3n Requerida" : stepLabels[step]));
      }))))
    )
  )));
};
