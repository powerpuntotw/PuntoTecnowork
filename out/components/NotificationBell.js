import { useState, useEffect, useRef } from "react";
import { Bell, Package, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setNotifications(data || []);
    };
    fetchNotifications();
    const channel = supabase.channel("user-notifications").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
      setNotifications((prev) => [payload.new, ...prev]);
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const markAsRead = async (id) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const clearAll = async () => {
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
    setOpen(false);
  };
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 6e4);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };
  const typeIcon = (type) => {
    if (type === "order_update") return /* @__PURE__ */ React.createElement(Package, { className: "w-4 h-4 text-secondary" });
    if (type === "success") return /* @__PURE__ */ React.createElement(Check, { className: "w-4 h-4 text-success" });
    return /* @__PURE__ */ React.createElement(Bell, { className: "w-4 h-4 text-accent" });
  };
  return /* @__PURE__ */ React.createElement("div", { ref, className: "relative" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setOpen(!open), className: "relative text-white/80 hover:text-white transition-colors" }, /* @__PURE__ */ React.createElement(Bell, { className: "w-5 h-5" }), unreadCount > 0 && /* @__PURE__ */ React.createElement(
    motion.span,
    {
      initial: { scale: 0 },
      animate: { scale: 1 },
      className: "absolute -top-1 -right-1 w-4 h-4 bg-accent text-[10px] font-bold text-gray-dark rounded-full flex items-center justify-center"
    },
    unreadCount > 9 ? "9+" : unreadCount
  )), /* @__PURE__ */ React.createElement(AnimatePresence, null, open && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      initial: { opacity: 0, y: -10 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
      className: "absolute right-0 mt-2 w-80 max-h-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] overflow-hidden"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-4 py-3 border-b border-gray-100" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark text-sm" }, "Notificaciones"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, unreadCount > 0 && /* @__PURE__ */ React.createElement("button", { onClick: markAllAsRead, className: "text-[10px] text-secondary font-medium hover:underline" }, "Marcar todo le\xEDdo"), notifications.length > 0 && /* @__PURE__ */ React.createElement("button", { onClick: clearAll, className: "text-[10px] text-gray-medium hover:text-primary" }, "Limpiar"))),
    /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto max-h-72" }, notifications.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-8 text-gray-medium text-sm" }, /* @__PURE__ */ React.createElement(Bell, { className: "w-8 h-8 mx-auto mb-2 opacity-30" }), "Sin notificaciones") : notifications.map((n) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: n.id,
        onClick: () => markAsRead(n.id),
        className: `flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? "bg-secondary/5" : ""}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "mt-0.5 p-1.5 rounded-full bg-gray-100" }, typeIcon(n.type)),
      /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: `text-xs ${!n.read ? "font-bold text-gray-dark" : "font-medium text-gray-medium"}` }, n.title), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-gray-medium mt-0.5 line-clamp-2" }, n.message)),
      /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-medium whitespace-nowrap mt-0.5" }, timeAgo(n.created_at))
    )))
  )));
};
