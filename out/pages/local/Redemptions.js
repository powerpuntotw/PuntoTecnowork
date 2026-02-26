import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
import { Search, CheckCircle, Package } from "lucide-react";
import { motion } from "framer-motion";
export const LocalRedemptions = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [searchCode, setSearchCode] = useState("");
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchRedemptions = async () => {
      const { data } = await supabase.from("reward_redemptions").select("*, profiles!reward_redemptions_user_id_fkey(full_name), rewards_catalog!reward_redemptions_reward_id_fkey(name)").eq("location_id", profile?.location_id).order("created_at", { ascending: false });
      setRedemptions(data || []);
      setLoading(false);
    };
    if (profile?.location_id) fetchRedemptions();
  }, [profile?.location_id]);
  const markAsRetirado = async (id) => {
    try {
      const { error } = await supabase.from("reward_redemptions").update({ status: "retirado", completed_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
      if (error) throw error;
      setRedemptions((prev) => prev.map((r) => r.id === id ? { ...r, status: "retirado" } : r));
      showToast("Canje marcado como retirado", "success");
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };
  const filtered = searchCode ? redemptions.filter((r) => r.redemption_code.toLowerCase().includes(searchCode.toLowerCase())) : redemptions;
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark mb-4" }, "Canjes de Premios"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 relative" }, /* @__PURE__ */ React.createElement(Search, { className: "absolute left-3 top-3 w-5 h-5 text-gray-medium" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: searchCode,
      onChange: (e) => setSearchCode(e.target.value),
      placeholder: "Buscar por c\xF3digo RDM-...",
      className: "w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary"
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, filtered.map((r) => /* @__PURE__ */ React.createElement(
    motion.div,
    {
      key: r.id,
      className: "bg-white rounded-xl shadow p-4 flex items-center justify-between",
      initial: { opacity: 0 },
      animate: { opacity: 1 }
    },
    /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-bold text-primary text-sm" }, r.redemption_code), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-dark" }, r.profiles?.full_name, " \u2014 ", r.rewards_catalog?.name), /* @__PURE__ */ React.createElement("span", { className: `text-xs font-medium px-2 py-1 rounded-full ${r.status === "pendiente" ? "bg-accent/20 text-amber-700" : "bg-success/20 text-green-700"}` }, r.status)),
    r.status === "pendiente" && /* @__PURE__ */ React.createElement("button", { onClick: () => markAsRetirado(r.id), className: "bg-success text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1" }, /* @__PURE__ */ React.createElement(CheckCircle, { className: "w-4 h-4" }), " Entregar")
  )), filtered.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-center py-8" }, "No hay canjes")));
};
export const LocalClients = () => {
  const { profile } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase.from("print_orders").select("customer_id, profiles!print_orders_customer_id_fkey(full_name, email, avatar_url)").eq("location_id", profile?.location_id);
      const unique = [...new Map((data || []).map((d) => [d.customer_id, d.profiles])).entries()].map(([id, p]) => ({ id, ...p }));
      setClients(unique);
      setLoading(false);
    };
    if (profile?.location_id) fetchClients();
  }, [profile?.location_id]);
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark mb-4" }, "Clientes del Local"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, clients.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.id, className: "bg-white rounded-xl shadow p-4 flex items-center gap-4" }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.full_name || "C")}&background=0093D8&color=fff`,
      onError: (e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.full_name || "C")}&background=0093D8&color=fff`;
      },
      className: "w-10 h-10 rounded-full",
      alt: ""
    }
  ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-gray-dark text-sm" }, c.full_name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium" }, c.email)))), clients.length === 0 && !loading && /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-center py-8" }, "Sin clientes registrados")));
};
