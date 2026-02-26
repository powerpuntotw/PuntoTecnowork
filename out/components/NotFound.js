import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { DynamicLogo } from "./DynamicLogo";
export const NotFound = () => {
  const { profile } = useAuth();
  const homeRoute = profile?.user_type === "admin" ? "/admin/dashboard" : profile?.user_type === "local" ? "/local/dashboard" : profile ? "/cliente/dashboard" : "/login";
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-light flex flex-col items-center justify-center p-6" }, /* @__PURE__ */ React.createElement(motion.div, { className: "text-center max-w-md", initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 } }, /* @__PURE__ */ React.createElement(DynamicLogo, { type: "principal", className: "h-12 mx-auto mb-8 object-contain" }), /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "text-9xl font-black text-primary/20 mb-4",
      animate: { scale: [1, 1.03, 1] },
      transition: { duration: 2, repeat: Infinity }
    },
    "404"
  ), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-dark mb-2" }, "P\xE1gina no encontrada"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium mb-8" }, "La p\xE1gina que busc\xE1s no existe o fue movida."), /* @__PURE__ */ React.createElement(Link, { to: homeRoute }, /* @__PURE__ */ React.createElement(
    motion.button,
    {
      whileHover: { scale: 1.05 },
      whileTap: { scale: 0.95 },
      className: "bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto shadow-brand"
    },
    /* @__PURE__ */ React.createElement(Home, { className: "w-5 h-5" }),
    "Volver al inicio"
  ))));
};
