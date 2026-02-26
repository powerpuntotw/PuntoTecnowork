import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, TrendingUp, TrendingDown, Gift, Zap, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
const TYPE_CONFIG = {
  earn: { label: "Ganados", icon: TrendingUp, color: "text-success", bg: "bg-success/10", sign: "+" },
  redeem: { label: "Canjeados", icon: Gift, color: "text-primary", bg: "bg-primary/10", sign: "-" },
  adjustment: { label: "Ajuste", icon: Zap, color: "text-secondary", bg: "bg-secondary/10", sign: "" },
  bonus: { label: "Bonus", icon: Star, color: "text-accent", bg: "bg-accent/10", sign: "+" }
};
export const PointsHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState({ current: 0, lifetime: 0, tier: "bronze" });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    const fetchData = async () => {
      const [txRes, pointsRes] = await Promise.all([
        supabase.from("points_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("points_accounts").select("current_points, lifetime_points, tier_level").eq("user_id", user.id).maybeSingle()
      ]);
      setTransactions(txRes.data || []);
      if (pointsRes.data) {
        setBalance({
          current: pointsRes.data.current_points,
          lifetime: pointsRes.data.lifetime_points,
          tier: pointsRes.data.tier_level
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [user.id]);
  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.transaction_type === filter);
  const TIER_EMOJI = { bronze: "\u{1F949}", silver: "\u{1F948}", gold: "\u{1F947}", diamond: "\u{1F48E}" };
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-3" }, [1, 2, 3, 4].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "shimmer h-16 rounded-xl" })));
  return /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "bg-gradient-to-br from-secondary to-cyan-400 rounded-2xl p-6 text-white mb-6 shadow-lg",
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm opacity-80" }, "Tu Balance"), /* @__PURE__ */ React.createElement("span", { className: "text-lg" }, TIER_EMOJI[balance.tier], " ", balance.tier.charAt(0).toUpperCase() + balance.tier.slice(1))),
    /* @__PURE__ */ React.createElement("p", { className: "text-4xl font-bold mb-1" }, balance.current.toLocaleString(), " pts"),
    /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-70" }, "Puntos de por vida: ", balance.lifetime.toLocaleString())
  ), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4" }, ["all", ...Object.keys(TYPE_CONFIG)].map((f) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: f,
      onClick: () => setFilter(f),
      className: `px-3 py-2 rounded-full whitespace-nowrap text-xs font-medium transition-all ${filter === f ? "bg-secondary text-white" : "bg-white text-gray-medium border border-gray-200"}`
    },
    f === "all" ? "Todos" : TYPE_CONFIG[f].label
  ))), filtered.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-12" }, /* @__PURE__ */ React.createElement(Star, { className: "w-12 h-12 text-gray-medium mx-auto mb-3 opacity-30" }), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium" }, "Sin movimientos")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, filtered.map((tx, i) => {
    const config = TYPE_CONFIG[tx.transaction_type] || TYPE_CONFIG.adjustment;
    const Icon = config.icon;
    return /* @__PURE__ */ React.createElement(
      motion.div,
      {
        key: tx.id,
        className: "bg-white rounded-xl shadow-sm p-4 flex items-center gap-3",
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: i * 0.03 }
      },
      /* @__PURE__ */ React.createElement("div", { className: `w-10 h-10 rounded-full flex items-center justify-center ${config.bg}` }, /* @__PURE__ */ React.createElement(Icon, { className: `w-5 h-5 ${config.color}` })),
      /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-gray-dark truncate" }, tx.description || config.label), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-gray-medium" }, format(new Date(tx.created_at), "d 'de' MMM, HH:mm", { locale: es }))),
      /* @__PURE__ */ React.createElement("span", { className: `font-bold text-sm ${config.color}` }, config.sign, Math.abs(tx.points_amount), " pts")
    );
  })));
};
