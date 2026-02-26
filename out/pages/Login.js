import { useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { DynamicLogo } from "../components/DynamicLogo";
const ERROR_MESSAGES = {
  "auth_failed": "Hubo un problema al iniciar sesi\xF3n. Intent\xE1 de nuevo.",
  "session_expired": "Tu sesi\xF3n expir\xF3. Por favor, ingres\xE1 nuevamente.",
  "access_denied": "Acceso denegado. Verific\xE1 que tu cuenta tiene permisos.",
  "default": "Error inesperado. Por favor, intent\xE1 de nuevo."
};
export const Login = () => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const errorParam = new URLSearchParams(location.search).get("error");
  const errorMessage = errorParam ? ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES["default"] : null;
  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gradient-to-br from-primary/5 via-white to-secondary/5 flex flex-col items-center justify-center px-4" }, /* @__PURE__ */ React.createElement(DynamicLogo, { type: "principal", className: "h-16 mb-10 object-contain" }), /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "w-full max-w-sm bg-white rounded-2xl shadow-brand-lg p-8",
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4 }
    },
    /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-dark text-center mb-2" }, "Bienvenido"),
    /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-center text-sm mb-8" }, "Inici\xE1 sesi\xF3n para continuar"),
    errorMessage && /* @__PURE__ */ React.createElement("div", { className: "mb-6 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary text-center" }, errorMessage),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleLogin,
        disabled: isLoading,
        className: "w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border-2 border-gray-light hover:border-primary hover:shadow-brand transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
      },
      isLoading ? /* @__PURE__ */ React.createElement(
        motion.div,
        {
          className: "w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full",
          animate: { rotate: 360 },
          transition: { duration: 0.8, repeat: Infinity, ease: "linear" }
        }
      ) : /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), /* @__PURE__ */ React.createElement("path", { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), /* @__PURE__ */ React.createElement("path", { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" }), /* @__PURE__ */ React.createElement("path", { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" })),
      /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-dark group-hover:text-primary transition-colors" }, isLoading ? "Redirigiendo..." : "Continuar con Google")
    )
  ), /* @__PURE__ */ React.createElement("div", { className: "mt-8 flex flex-col items-center gap-2 opacity-60" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-medium" }, "Powered by"), /* @__PURE__ */ React.createElement(DynamicLogo, { type: "footer1", className: "h-6 object-contain" }), /* @__PURE__ */ React.createElement(DynamicLogo, { type: "footer2", className: "h-6 object-contain" })), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-medium font-medium mt-2" }, "v", __APP_VERSION__)));
};
