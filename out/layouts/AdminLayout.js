import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Users, MapPin, Package, Gift, BarChart3, Settings, LogOut, Bell, Menu, X, Image, Shield, Inbox } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { DynamicLogo } from "../components/DynamicLogo";
import { Footer } from "../components/Footer";
import { ThemeToggle } from "../components/ThemeToggle";
const sidebarItems = [
  { path: "/admin/dashboard", icon: Home, label: "Dashboard" },
  { path: "/admin/users", icon: Users, label: "Usuarios" },
  { path: "/admin/locations", icon: MapPin, label: "Locales" },
  { path: "/admin/orders", icon: Package, label: "\xD3rdenes" },
  { path: "/admin/rewards", icon: Gift, label: "Premios" },
  { path: "/admin/reports", icon: BarChart3, label: "Reportes" },
  { path: "/admin/maintenance", icon: Settings, label: "Mantenimiento" },
  { path: "/admin/support", icon: Inbox, label: "Soporte" },
  { path: "/admin/branding", icon: Image, label: "Branding" },
  { path: "/admin/audit", icon: Shield, label: "Auditor\xEDa" }
];
export const AdminLayout = () => {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-light flex" }, /* @__PURE__ */ React.createElement(AnimatePresence, null, sidebarOpen && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "fixed inset-0 bg-black/50 z-40 lg:hidden",
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      onClick: () => setSidebarOpen(false)
    }
  )), /* @__PURE__ */ React.createElement("aside", { className: `fixed inset-y-0 left-0 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 transition-transform duration-300 w-64 bg-white shadow-lg z-50 flex flex-col` }, /* @__PURE__ */ React.createElement("div", { className: "p-6 border-b border-gray-200" }, /* @__PURE__ */ React.createElement(DynamicLogo, { type: "principal", className: "h-10 object-contain" })), /* @__PURE__ */ React.createElement("nav", { className: "flex-1 py-4 overflow-y-auto" }, sidebarItems.map(({ path, icon: Icon, label }) => /* @__PURE__ */ React.createElement(
    NavLink,
    {
      key: path,
      to: path,
      onClick: () => setSidebarOpen(false),
      className: ({ isActive }) => `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all ${isActive ? "text-primary bg-primary/5 border-r-4 border-primary" : "text-gray-medium hover:text-primary hover:bg-primary/5"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { className: "w-5 h-5" }),
    label
  ))), /* @__PURE__ */ React.createElement("div", { className: "p-4 border-t border-gray-200" }, /* @__PURE__ */ React.createElement(DynamicLogo, { type: "footer1", className: "h-6 object-contain mx-auto opacity-50" }))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 lg:ml-64 flex flex-col min-h-screen" }, /* @__PURE__ */ React.createElement("header", { className: "bg-gradient-to-r from-primary to-orange-500 px-6 py-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setSidebarOpen(true),
      className: "lg:hidden text-white"
    },
    /* @__PURE__ */ React.createElement(Menu, { className: "w-6 h-6" })
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-white font-semibold text-sm" }, "Panel de Administraci\xF3n")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(ThemeToggle, { className: "text-white/80 hover:text-white" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: profile?.avatar_url || "https://ui-avatars.com/api/?name=Admin&background=EB1C24&color=fff",
      onError: (e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = "https://ui-avatars.com/api/?name=Admin&background=EB1C24&color=fff";
      },
      alt: profile?.full_name,
      className: "w-8 h-8 rounded-full border-2 border-white/30"
    }
  ), /* @__PURE__ */ React.createElement("span", { className: "text-white text-sm font-medium hidden sm:inline" }, profile?.full_name)), /* @__PURE__ */ React.createElement("button", { onClick: handleSignOut, className: "text-white/80 hover:text-white transition-colors" }, /* @__PURE__ */ React.createElement(LogOut, { className: "w-5 h-5" })))), /* @__PURE__ */ React.createElement("main", { className: "flex-1 p-6 overflow-y-auto" }, /* @__PURE__ */ React.createElement(Outlet, null)), /* @__PURE__ */ React.createElement(Footer, null)));
};
