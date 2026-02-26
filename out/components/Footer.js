import { DynamicLogo } from "./DynamicLogo";
export const Footer = () => {
  return /* @__PURE__ */ React.createElement("footer", { className: "py-4 px-6 border-t border-gray-200 bg-white" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row items-center justify-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-medium" }, "Powered by"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement(DynamicLogo, { type: "footer1", className: "h-8 object-contain" }), /* @__PURE__ */ React.createElement(DynamicLogo, { type: "footer2", className: "h-8 object-contain" }))));
};
