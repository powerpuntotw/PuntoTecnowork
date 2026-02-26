import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Gift, Star, Package, TrendingUp, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
const TIER_CONFIG = {
  bronze: { label: "\u{1F949} BRONCE", gradient: "from-amber-700 to-amber-500", next: "Silver", nextPoints: 1e3 },
  silver: { label: "\u{1F948} PLATA", gradient: "from-gray-400 to-gray-300", next: "Gold", nextPoints: 2e3 },
  gold: { label: "\u2728 GOLD \u2728", gradient: "from-yellow-500 to-amber-400", next: "Diamond", nextPoints: 3e3 },
  diamond: { label: "\u{1F48E} DIAMOND", gradient: "from-cyan-400 to-blue-500", next: null, nextPoints: null }
};
export const ClienteDashboard = () => {
  const { user, profile } = useAuth();
  const [pointsData, setPointsData] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pointsRes, ordersRes] = await Promise.all([
          supabase.from("points_accounts").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("print_orders").select("*").eq("customer_id", user.id).order("created_at", { ascending: false }).limit(5)
        ]);
        setPointsData(pointsRes.data);
        setRecentOrders(ordersRes.data || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.id]);
  const tier = TIER_CONFIG[pointsData?.tier_level || "bronze"];
  const points = pointsData?.current_points || 0;
  const lifetimePoints = pointsData?.lifetime_points || 0;
  const progressPercent = tier.nextPoints ? Math.min(100, Math.round(lifetimePoints / tier.nextPoints * 100)) : 100;
  const pointsToNext = tier.nextPoints ? Math.max(0, tier.nextPoints - lifetimePoints) : 0;
  const STATUS_COLORS = {
    pendiente: "bg-accent text-gray-dark",
    en_proceso: "bg-secondary text-white",
    listo: "bg-success text-white",
    entregado: "bg-green-700 text-white",
    cancelado: "bg-primary text-white"
  };
  if (loading) {
    return /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-4" }, [1, 2, 3].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "shimmer h-32 rounded-2xl" })));
  }
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 space-y-6" }, /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: `relative overflow-hidden rounded-2xl shadow-brand-lg p-6 bg-gradient-to-br ${tier.gradient}`,
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 }
    },
    /* @__PURE__ */ React.createElement(
      motion.div,
      {
        className: "flex items-center justify-center mb-4",
        animate: { scale: [1, 1.05, 1] },
        transition: { duration: 2, repeat: Infinity, repeatDelay: 3 }
      },
      /* @__PURE__ */ React.createElement("div", { className: "bg-white/30 backdrop-blur-sm rounded-full px-6 py-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-white font-bold text-lg" }, tier.label))
    ),
    /* @__PURE__ */ React.createElement("div", { className: "text-center mb-6" }, /* @__PURE__ */ React.createElement(motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, transition: { type: "spring", duration: 0.6 } }, /* @__PURE__ */ React.createElement("div", { className: "text-6xl font-bold text-white mb-1" }, points), /* @__PURE__ */ React.createElement("div", { className: "text-white text-xl font-medium opacity-90" }, "PUNTOS"))),
    tier.next && /* @__PURE__ */ React.createElement("div", { className: "bg-white/20 backdrop-blur-sm rounded-xl p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-white text-sm mb-2" }, "Progreso al siguiente nivel:"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 h-3 bg-white/30 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(motion.div, { className: "h-full bg-white rounded-full", initial: { width: 0 }, animate: { width: `${progressPercent}%` }, transition: { duration: 1, delay: 0.3 } })), /* @__PURE__ */ React.createElement("span", { className: "text-white font-bold text-sm" }, progressPercent, "%")), /* @__PURE__ */ React.createElement("p", { className: "text-white text-xs mt-2 opacity-90" }, pointsToNext, " pts m\xE1s para ", tier.next)),
    /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" }),
    /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12" }),
    /* @__PURE__ */ React.createElement(Link, { to: "/cliente/points-history", className: "block text-center mt-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-white/80 text-xs underline hover:text-white transition-colors" }, "Ver historial de puntos \u2192"))
  ), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement(Link, { to: "/cliente/upload" }, /* @__PURE__ */ React.createElement(
    motion.div,
    {
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.97 },
      className: "bg-primary rounded-xl p-5 text-white shadow-brand cursor-pointer"
    },
    /* @__PURE__ */ React.createElement(Upload, { className: "w-8 h-8 mb-2" }),
    /* @__PURE__ */ React.createElement("p", { className: "font-bold" }, "Subir Archivos"),
    /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-80 mt-1" }, "Fotos y documentos")
  )), /* @__PURE__ */ React.createElement(Link, { to: "/cliente/rewards" }, /* @__PURE__ */ React.createElement(
    motion.div,
    {
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.97 },
      className: "bg-success rounded-xl p-5 text-white shadow-lg cursor-pointer"
    },
    /* @__PURE__ */ React.createElement(Gift, { className: "w-8 h-8 mb-2" }),
    /* @__PURE__ */ React.createElement("p", { className: "font-bold" }, "Premios"),
    /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-80 mt-1" }, "Canje\xE1 tus puntos")
  ))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Package, { className: "w-5 h-5 text-secondary" }), " \xD3rdenes Recientes"), /* @__PURE__ */ React.createElement(Link, { to: "/cliente/orders", className: "text-primary text-sm font-medium flex items-center gap-1" }, "Ver todas ", /* @__PURE__ */ React.createElement(ArrowRight, { className: "w-4 h-4" }))), recentOrders.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-sm text-center py-6" }, "No tienes \xF3rdenes a\xFAn") : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, recentOrders.map((order) => /* @__PURE__ */ React.createElement(
    motion.div,
    {
      key: order.id,
      className: "flex items-center justify-between py-2 border-b border-gray-100 last:border-0",
      initial: { opacity: 0, x: -10 },
      animate: { opacity: 1, x: 0 }
    },
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-sm text-gray-dark" }, order.order_number), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium" }, "$", order.total_amount)),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}` }, order.status.replace("_", " ")), order.points_earned > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-success text-xs font-bold flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Star, { className: "w-3 h-3 fill-current" }), "+", order.points_earned))
  )))), /* @__PURE__ */ React.createElement(Link, { to: "/cliente/upload" }, /* @__PURE__ */ React.createElement(
    motion.button,
    {
      className: "fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary text-white rounded-full shadow-brand-lg flex items-center justify-center",
      initial: { scale: 0 },
      animate: { scale: 1 },
      transition: { delay: 0.5, type: "spring" },
      whileHover: { scale: 1.1 },
      whileTap: { scale: 0.9 }
    },
    /* @__PURE__ */ React.createElement(Upload, { className: "w-6 h-6" })
  )));
};
