import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Upload, Gift, Package, User, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { DynamicLogo } from "../components/DynamicLogo";
import { Footer } from "../components/Footer";
import { NotificationBell } from "../components/NotificationBell";
import { ThemeToggle } from "../components/ThemeToggle";
const navItems = [
  { path: "/cliente/dashboard", icon: Home, label: "Inicio" },
  { path: "/cliente/upload", icon: Upload, label: "Subir" },
  { path: "/cliente/rewards", icon: Gift, label: "Premios" },
  { path: "/cliente/orders", icon: Package, label: "\xD3rdenes" },
  { path: "/cliente/profile", icon: User, label: "Perfil" }
];
export const ClienteLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-light flex flex-col" }, /* @__PURE__ */ React.createElement("header", { className: "hero-gradient px-4 py-3 flex items-center justify-between safe-top" }, /* @__PURE__ */ React.createElement(DynamicLogo, { type: "principal", className: "h-8 object-contain drop-shadow-md" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ThemeToggle, { className: "text-white/80 hover:text-white" }), /* @__PURE__ */ React.createElement(NotificationBell, null), /* @__PURE__ */ React.createElement("button", { onClick: handleSignOut, className: "text-white/80 hover:text-white transition-colors" }, /* @__PURE__ */ React.createElement(LogOut, { className: "w-5 h-5" })))), /* @__PURE__ */ React.createElement("main", { className: "flex-1 pb-20 overflow-y-auto" }, /* @__PURE__ */ React.createElement(Outlet, null)), /* @__PURE__ */ React.createElement(Footer, null), /* @__PURE__ */ React.createElement("nav", { className: "fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-bottom z-50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-around py-2" }, navItems.map(({ path, icon: Icon, label }) => /* @__PURE__ */ React.createElement(
    NavLink,
    {
      key: path,
      to: path,
      className: ({ isActive }) => `flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors min-w-[60px] ${isActive ? "text-primary" : "text-gray-medium hover:text-primary"}`
    },
    ({ isActive }) => /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Icon, { className: "w-5 h-5", strokeWidth: isActive ? 2.5 : 2 }), /* @__PURE__ */ React.createElement("span", { className: `text-[10px] ${isActive ? "font-bold" : "font-medium"}` }, label))
  )))));
};
