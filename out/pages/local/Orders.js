import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Clock, CheckCircle, Printer, Eye, FileText, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PrintManager } from "./PrintManager";
const STATUS_LABELS = {
  pendiente: { label: "Pendiente", color: "bg-amber-400 text-gray-dark", icon: Clock },
  en_proceso: { label: "Imprimiendo", color: "bg-secondary text-white", icon: Printer },
  listo: { label: "Listo", color: "bg-success text-white", icon: CheckCircle },
  entregado: { label: "Entregado", color: "bg-green-700 text-white", icon: Package }
};
const formatSize = (s) => ({ a4: "A4", a3: "A3", oficio: "Oficio (Legal)", "10x15": "10x15 cm", "13x18": "13x18 cm", foto_a4: "A4 (Foto)" })[s] || s;
export const LocalOrders = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [confirmDelivery, setConfirmDelivery] = useState(null);
  useEffect(() => {
    if (!profile?.location_id) return;
    const fetchOrders = async () => {
      const { data } = await supabase.from("print_orders").select("*, profiles!print_orders_customer_id_fkey(full_name, email)").eq("location_id", profile.location_id).order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();
    const channel = supabase.channel("local-orders-kanban").on(
      "postgres_changes",
      { event: "*", schema: "public", table: "print_orders", filter: `location_id=eq.${profile.location_id}` },
      (payload) => {
        if (payload.eventType === "INSERT") {
          setOrders((prev) => [payload.new, ...prev]);
          showToast(`\u{1F5A8}\uFE0F Nueva orden: ${payload.new.order_number}`, "info");
        } else if (payload.eventType === "UPDATE") {
          setOrders((prev) => prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } : o));
        }
      }
    ).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.location_id]);
  const changeStatus = async (orderId, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === "entregado") updates.completed_at = (/* @__PURE__ */ new Date()).toISOString();
      const { error } = await supabase.from("print_orders").update(updates).eq("id", orderId);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...updates } : o));
      showToast(`Orden \u2192 ${STATUS_LABELS[newStatus]?.label}`, "success");
      return true;
    } catch (err) {
      showToast("Error: " + err.message, "error");
      return false;
    }
  };
  const acceptAndPrint = async (order) => {
    const ok = await changeStatus(order.id, "en_proceso");
    if (ok) {
      setReviewOrder(null);
      setSelectedOrder({ ...order, status: "en_proceso" });
    }
  };
  const openReprint = (order) => {
    setSelectedOrder({ ...order, _reprintMode: true });
  };
  const grouped = {
    pendiente: orders.filter((o) => o.status === "pendiente"),
    en_proceso: orders.filter((o) => o.status === "en_proceso"),
    listo: orders.filter((o) => o.status === "listo"),
    entregado: orders.filter((o) => o.status === "entregado").slice(0, 10)
  };
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-4" }, [1, 2, 3].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "shimmer h-28 rounded-xl" })));
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-6 space-y-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-dark" }, "Gesti\xF3n de \xD3rdenes"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" }, Object.entries(grouped).map(([status, statusOrders]) => {
    const sl = STATUS_LABELS[status];
    return /* @__PURE__ */ React.createElement("div", { key: status, className: "bg-white rounded-xl shadow-lg p-4 min-h-[200px]" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark text-sm flex items-center gap-2" }, /* @__PURE__ */ React.createElement(sl.icon, { className: "w-4 h-4" }), " ", sl.label), /* @__PURE__ */ React.createElement("span", { className: `${sl.color} px-2 py-1 rounded-full text-xs font-bold` }, statusOrders.length)), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, statusOrders.map((order) => /* @__PURE__ */ React.createElement(
      motion.div,
      {
        key: order.id,
        className: `rounded-lg p-3 transition-all ${status === "en_proceso" ? "bg-secondary/5 border-2 border-secondary/30 shadow-md" : "bg-gray-50 hover:shadow-md"}`,
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        whileHover: { scale: 1.02 }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-between mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-xs text-primary" }, order.order_number), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-medium" }, format(new Date(order.created_at), "HH:mm"))),
      /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-dark font-medium mb-1" }, order.profiles?.full_name || "Cliente"),
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-[10px] text-gray-medium mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Eye, { className: "w-3 h-3" }), order.file_urls?.length || 0, " archivos"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-gray-dark" }, "$", order.total_amount)),
      order.notes && /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-secondary bg-secondary/10 rounded px-2 py-1 mb-2 line-clamp-2" }, "\u{1F4DD} ", order.notes),
      status === "pendiente" && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setReviewOrder(order),
          className: "w-full bg-gradient-to-r from-amber-400 to-amber-500 text-gray-dark py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5"
        },
        /* @__PURE__ */ React.createElement(FileText, { className: "w-3.5 h-3.5" }),
        " Revisar Pedido"
      ),
      status === "en_proceso" && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setSelectedOrder(order),
          className: "w-full bg-gradient-to-r from-primary to-red-500 text-white py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 animate-pulse"
        },
        /* @__PURE__ */ React.createElement(Printer, { className: "w-3.5 h-3.5" }),
        " Abrir para Imprimir"
      ),
      status === "listo" && /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setConfirmDelivery(order),
          className: "flex-1 bg-gradient-to-r from-success to-green-400 text-white py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-all"
        },
        "Entregar \u2192"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => openReprint(order),
          className: "px-2 bg-gray-200 text-gray-dark rounded-lg text-[10px] hover:bg-gray-300 transition flex items-center gap-1",
          title: "Reimprimir"
        },
        /* @__PURE__ */ React.createElement(RefreshCw, { className: "w-3 h-3" })
      ))
    )), statusOrders.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-xs text-center py-4" }, "Sin \xF3rdenes")));
  }))), /* @__PURE__ */ React.createElement(AnimatePresence, null, reviewOrder && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4", onClick: () => setReviewOrder(null) }, /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden",
      onClick: (e) => e.stopPropagation(),
      initial: { scale: 0.9, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.9, opacity: 0 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark text-lg" }, "\u{1F4CB} Revisar Pedido"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-dark/70" }, reviewOrder.order_number)),
    /* @__PURE__ */ React.createElement("div", { className: "p-5 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 bg-gray-50 rounded-xl p-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Package, { className: "w-5 h-5 text-secondary" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-sm text-gray-dark" }, reviewOrder.profiles?.full_name || "Cliente"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-medium" }, reviewOrder.profiles?.email))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-xl p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-medium uppercase font-bold" }, "Tama\xF1o"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-dark" }, reviewOrder.specifications?.size ? formatSize(reviewOrder.specifications.size) : "\u2014")), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-xl p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-medium uppercase font-bold" }, "Calidad"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-dark capitalize" }, reviewOrder.specifications?.quality || "\u2014")), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-xl p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-medium uppercase font-bold" }, "Copias"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-dark" }, reviewOrder.specifications?.copies || 1)), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-xl p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-medium uppercase font-bold" }, "Total"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-primary" }, "$", reviewOrder.total_amount))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-xl p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-medium uppercase font-bold mb-1" }, "Archivos (", reviewOrder.file_urls?.length || 0, ")"), (reviewOrder.file_urls || []).map((f, i) => /* @__PURE__ */ React.createElement("p", { key: i, className: "text-xs text-gray-dark truncate" }, "\u{1F4C4} ", f.split("/").pop()))), reviewOrder.notes && /* @__PURE__ */ React.createElement("div", { className: "bg-yellow-50 border-l-4 border-amber-400 rounded-r-xl p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-medium uppercase font-bold mb-1" }, "Instrucciones del cliente"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-dark" }, reviewOrder.notes)), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 pt-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setReviewOrder(null),
        className: "flex-1 bg-gray-100 text-gray-dark py-3 rounded-xl font-medium text-sm"
      },
      "Cerrar"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => acceptAndPrint(reviewOrder),
        className: "flex-1 bg-gradient-to-r from-primary to-red-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Printer, { className: "w-4 h-4" }),
      " Aceptar e Imprimir"
    )))
  ))), /* @__PURE__ */ React.createElement(AnimatePresence, null, confirmDelivery && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4", onClick: () => setConfirmDelivery(null) }, /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl",
      onClick: (e) => e.stopPropagation(),
      initial: { scale: 0.9, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 0.9, opacity: 0 }
    },
    /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark text-lg mb-2" }, "Confirmar entrega"),
    /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium mb-1" }, "\xBFEntregar ", /* @__PURE__ */ React.createElement("span", { className: "font-bold text-primary" }, confirmDelivery.order_number), " a ", confirmDelivery.profiles?.full_name || "el cliente", "?"),
    /* @__PURE__ */ React.createElement("p", { className: "text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mb-4 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(AlertTriangle, { className: "w-3.5 h-3.5 shrink-0" }), " Acredita puntos al cliente. No se puede deshacer."),
    /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setConfirmDelivery(null), className: "flex-1 bg-gray-100 text-gray-dark py-3 rounded-xl font-medium" }, "Cancelar"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          changeStatus(confirmDelivery.id, "entregado");
          setConfirmDelivery(null);
        },
        className: "flex-1 bg-success text-white py-3 rounded-xl font-bold"
      },
      "Confirmar \u2713"
    ))
  ))), /* @__PURE__ */ React.createElement(AnimatePresence, null, selectedOrder && /* @__PURE__ */ React.createElement(
    PrintManager,
    {
      order: selectedOrder,
      onClose: () => setSelectedOrder(null),
      onStatusChange: (orderId, newStatus) => {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
        setSelectedOrder(null);
      }
    }
  )));
};
