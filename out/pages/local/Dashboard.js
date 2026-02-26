import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, DollarSign, Clock, CheckCircle, TrendingUp, Printer, CalendarDays } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
export const LocalDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, revenue: 0, pending: 0, printing: 0, ready: 0, completed: 0, weekRevenue: 0 });
  useEffect(() => {
    if (!profile?.location_id) return;
    const fetchStats = async () => {
      const { data } = await supabase.from("print_orders").select("id, order_number, status, total_amount, created_at, profiles!print_orders_customer_id_fkey(full_name)").eq("location_id", profile.location_id).order("created_at", { ascending: false });
      const allOrders = data || [];
      setOrders(allOrders);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const todayOrders = allOrders.filter((o) => o.created_at.startsWith(today));
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const weekOrders = allOrders.filter((o) => o.created_at >= weekAgo);
      setStats({
        today: todayOrders.length,
        revenue: todayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
        pending: allOrders.filter((o) => o.status === "pendiente").length,
        printing: allOrders.filter((o) => o.status === "en_proceso").length,
        ready: allOrders.filter((o) => o.status === "listo").length,
        completed: allOrders.filter((o) => o.status === "entregado").length,
        weekRevenue: weekOrders.reduce((s, o) => s + Number(o.total_amount), 0)
      });
      setLoading(false);
    };
    fetchStats();
  }, [profile?.location_id]);
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-4" }, [1, 2, 3].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "shimmer h-28 rounded-xl" })));
  const recentOrders = orders.slice(0, 8);
  const actionNeeded = orders.filter((o) => o.status === "pendiente" || o.status === "en_proceso");
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-6 space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4" }, [
    { label: "\xD3rdenes hoy", value: stats.today, icon: Package, color: "from-secondary to-cyan-400" },
    { label: "Ingresos hoy", value: `$${stats.revenue}`, icon: DollarSign, color: "from-success to-green-400" },
    { label: "Pendientes", value: stats.pending, icon: Clock, color: "from-accent to-yellow-400", alert: stats.pending > 0 },
    { label: "Imprimiendo", value: stats.printing, icon: Printer, color: "from-primary to-red-400", alert: stats.printing > 0 }
  ].map((stat, i) => /* @__PURE__ */ React.createElement(
    motion.div,
    {
      key: i,
      className: `bg-gradient-to-br ${stat.color} rounded-xl p-4 text-white shadow-lg relative overflow-hidden`,
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { delay: i * 0.1 }
    },
    stat.alert && /* @__PURE__ */ React.createElement("div", { className: "absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-ping" }),
    /* @__PURE__ */ React.createElement(stat.icon, { className: "w-6 h-6 mb-2 opacity-80" }),
    /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold" }, stat.value),
    /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-80" }, stat.label)
  ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-4" }, [
    { label: "Listas para retirar", value: stats.ready, icon: CheckCircle, bg: "bg-success/10 text-success" },
    { label: "Entregadas (total)", value: stats.completed, icon: Package, bg: "bg-green-100 text-green-700" },
    { label: "Ingresos 7 d\xEDas", value: `$${stats.weekRevenue}`, icon: TrendingUp, bg: "bg-secondary/10 text-secondary" }
  ].map((stat, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `${stat.bg} rounded-xl p-4 flex items-center gap-3` }, /* @__PURE__ */ React.createElement(stat.icon, { className: "w-8 h-8 opacity-70" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xl font-bold" }, stat.value), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] opacity-70" }, stat.label))))), actionNeeded.length > 0 && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "bg-primary/10 border-l-4 border-primary rounded-xl p-4 cursor-pointer hover:bg-primary/15 transition-colors",
      onClick: () => navigate("/local/orders"),
      initial: { opacity: 0 },
      animate: { opacity: 1 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-primary text-sm flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Printer, { className: "w-4 h-4 animate-pulse" }), " ", actionNeeded.length, " \xF3rdenes requieren atenci\xF3n"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium mt-1" }, stats.pending > 0 && `${stats.pending} pendientes`, stats.pending > 0 && stats.printing > 0 && " \u2022 ", stats.printing > 0 && `${stats.printing} imprimiendo`)), /* @__PURE__ */ React.createElement("span", { className: "text-primary text-sm font-bold" }, "Ir a \xD3rdenes \u2192"))
  ), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark flex items-center gap-2" }, /* @__PURE__ */ React.createElement(CalendarDays, { className: "w-4 h-4" }), " Actividad Reciente"), /* @__PURE__ */ React.createElement("button", { onClick: () => navigate("/local/orders"), className: "text-secondary text-xs font-medium hover:underline" }, "Ver todas \u2192")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, recentOrders.map((order) => {
    const statusConfig = {
      pendiente: { label: "Pendiente", bg: "bg-amber-100 text-amber-700" },
      en_proceso: { label: "Imprimiendo", bg: "bg-blue-100 text-blue-700" },
      listo: { label: "Listo", bg: "bg-green-100 text-green-700" },
      entregado: { label: "Entregado", bg: "bg-gray-100 text-gray-500" }
    };
    const sc = statusConfig[order.status] || statusConfig.pendiente;
    return /* @__PURE__ */ React.createElement("div", { key: order.id, className: "flex items-center justify-between py-2 border-b border-gray-50 last:border-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-xs text-primary" }, order.order_number), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-dark" }, order.profiles?.full_name || "Cliente")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-gray-dark" }, "$", order.total_amount), /* @__PURE__ */ React.createElement("span", { className: `text-[10px] px-2 py-0.5 rounded-full font-medium ${sc.bg}` }, sc.label), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-medium" }, format(new Date(order.created_at), "dd/MM HH:mm"))));
  }), recentOrders.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-sm text-center py-4" }, "Sin \xF3rdenes recientes"))));
};
