import { useBranding } from "../hooks/useBranding";
export const DynamicLogo = ({ type = "principal", className = "", alt = "" }) => {
  const { branding, loading } = useBranding();
  const urlMap = {
    principal: branding?.logo_principal_url,
    footer1: branding?.logo_footer_1_url,
    footer2: branding?.logo_footer_2_url
  };
  const logoUrl = urlMap[type];
  if (loading) {
    return /* @__PURE__ */ React.createElement("div", { className: `bg-gray-light rounded animate-pulse ${className}` });
  }
  if (!logoUrl) {
    return /* @__PURE__ */ React.createElement("div", { className: `flex items-center justify-center bg-gray-light rounded ${className}` }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium text-xs" }, "\u2014"));
  }
  return /* @__PURE__ */ React.createElement(
    "img",
    {
      src: logoUrl,
      alt: alt || branding?.app_name || "Logo",
      className,
      onError: (e) => {
        e.target.style.display = "none";
      }
    }
  );
};
