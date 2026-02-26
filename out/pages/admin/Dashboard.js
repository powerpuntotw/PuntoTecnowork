import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, Users, MapPin, DollarSign, TrendingUp, Star } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
const TIER_COLORS = { bronze: "#6B7280", silver: "#9CA3AF", gold: "#FFC905", diamond: "#0093D8" };
export const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, orders: 0, locations: 0, revenue: 0 });
  const [tierData, setTierData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchAll = async () => {
      const [usersRes, ordersRes, locsRes, pointsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("print_orders").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("printing_locations").select("id", { count: "exact", head: true }),
        supabase.from("points_accounts").select("tier_level")
      ]);
      const allOrders = ordersRes.data || [];
      const revenue = allOrders.reduce((s, o) => s + Number(o.total_amount), 0);
      setStats({ users: usersRes.count || 0, orders: allOrders.length, locations: locsRes.count || 0, revenue });
      setRecentOrders(allOrders);
      const tiers = (pointsRes.data || []).reduce((acc, p) => {
        acc[p.tier_level] = (acc[p.tier_level] || 0) + 1;
        return acc;
      }, {});
      setTierData(Object.entries(tiers).map(([tier, value]) => ({ name: tier, value })));
      setLoading(false);
    };
    fetchAll();
  }, []);
  const STATUS_COLORS = { pendiente: "#FFC905", en_proceso: "#0093D8", listo: "#A4CC39", entregado: "#2D7A2D", cancelado: "#EB1C24" };
  const kpis = [
    { label: "Usuarios", value: stats.users, icon: Users, gradient: "from-secondary to-cyan-400" },
    { label: "\xD3rdenes", value: stats.orders, icon: Package, gradient: "from-primary to-orange-400" },
    { label: "Locales", value: stats.locations, icon: MapPin, gradient: "from-success to-green-400" },
    { label: "Ingresos", value: `$${stats.revenue}`, icon: DollarSign, gradient: "from-accent to-yellow-400" }
  ];
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, [1, 2, 3].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "shimmer h-28 rounded-xl" })));
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" }, kpis.map((kpi, i) => /* @__PURE__ */ React.createElement(
    motion.div,
    {
      key: i,
      className: `bg-gradient-to-br ${kpi.gradient} rounded-xl p-6 text-white shadow-lg`,
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { delay: i * 0.1 },
      whileHover: { scale: 1.02 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm opacity-80" }, kpi.label), /* @__PURE__ */ React.createElement("p", { className: "text-3xl font-bold mt-1" }, kpi.value)), /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center" }, /* @__PURE__ */ React.createElement(kpi.icon, { className: "w-6 h-6" })))
  ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-4" }, "Distribuci\xF3n por Nivel"), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 250 }, /* @__PURE__ */ React.createElement(PieChart, null, /* @__PURE__ */ React.createElement(
    Pie,
    {
      data: tierData,
      cx: "50%",
      cy: "50%",
      innerRadius: 50,
      outerRadius: 80,
      paddingAngle: 5,
      dataKey: "value",
      label: ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`
    },
    tierData.map((entry, i) => /* @__PURE__ */ React.createElement(Cell, { key: i, fill: TIER_COLORS[entry.name] || "#6B7280" }))
  ), /* @__PURE__ */ React.createElement(Tooltip, null)))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-4" }, "\xD3rdenes Recientes"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 max-h-64 overflow-y-auto" }, recentOrders.map((order) => /* @__PURE__ */ React.createElement("div", { key: order.id, className: "flex items-center justify-between py-2 border-b border-gray-100" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-sm text-primary" }, order.order_number), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium" }, "$", order.total_amount)), /* @__PURE__ */ React.createElement(
    "span",
    {
      className: `px-2 py-1 rounded-full text-xs font-medium text-white`,
      style: { backgroundColor: STATUS_COLORS[order.status] }
    },
    order.status.replace("_", " ")
  )))))));
};
