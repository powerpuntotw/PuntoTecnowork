import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Home, Package, Users, Gift, LogOut, User, DollarSign, LifeBuoy } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { DynamicLogo } from "../components/DynamicLogo";
import { Footer } from "../components/Footer";
import { ThemeToggle } from "../components/ThemeToggle";
const navItems = [
  { path: "/local/dashboard", icon: Home, label: "Dashboard" },
  { path: "/local/orders", icon: Package, label: "\xD3rdenes" },
  { path: "/local/clients", icon: Users, label: "Clientes" },
  { path: "/local/prices", icon: DollarSign, label: "Precios" },
  { path: "/local/redemptions", icon: Gift, label: "Canjes" },
  { path: "/local/support", icon: LifeBuoy, label: "Soporte" },
  { path: "/local/profile", icon: User, label: "Perfil" }
];
export const LocalLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-light flex flex-col" }, /* @__PURE__ */ React.createElement("header", { className: "bg-gradient-to-r from-secondary to-cyan-500 px-6 py-4 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(DynamicLogo, { type: "principal", className: "h-8 object-contain drop-shadow-md" }), /* @__PURE__ */ React.createElement("span", { className: "text-white font-semibold text-sm hidden sm:inline" }, "|"), /* @__PURE__ */ React.createElement("span", { className: "text-white/90 text-sm hidden sm:inline" }, profile?.full_name)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ThemeToggle, { className: "text-white/80 hover:text-white" }), /* @__PURE__ */ React.createElement("button", { onClick: handleSignOut, className: "text-white/80 hover:text-white transition-colors" }, /* @__PURE__ */ React.createElement(LogOut, { className: "w-5 h-5" })))), /* @__PURE__ */ React.createElement("nav", { className: "bg-white border-b border-gray-200 px-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 overflow-x-auto" }, navItems.map(({ path, icon: Icon, label }) => /* @__PURE__ */ React.createElement(
    NavLink,
    {
      key: path,
      to: path,
      className: ({ isActive }) => `flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors text-sm font-medium ${isActive ? "border-secondary text-secondary" : "border-transparent text-gray-medium hover:text-secondary hover:border-secondary/30"}`
    },
    /* @__PURE__ */ React.createElement(Icon, { className: "w-4 h-4" }),
    label
  )))), /* @__PURE__ */ React.createElement("main", { className: "flex-1 overflow-y-auto" }, /* @__PURE__ */ React.createElement(Outlet, null)), /* @__PURE__ */ React.createElement(Footer, null));
};
