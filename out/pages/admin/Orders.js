import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, Search, Eye, Filter } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
const STATUS_COLORS = { pendiente: "#FFC905", en_proceso: "#0093D8", listo: "#A4CC39", entregado: "#2D7A2D", cancelado: "#EB1C24" };
const STATUS_LABELS = { pendiente: "Pendiente", en_proceso: "En Proceso", listo: "Listo", entregado: "Entregado", cancelado: "Cancelado" };
export const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchOrders = async () => {
      let query = supabase.from("print_orders").select("*, profiles!print_orders_customer_id_fkey(full_name, email), printing_locations!print_orders_location_id_fkey(name)").order("created_at", { ascending: false });
      if (filter) query = query.eq("status", filter);
      const { data } = await query;
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();
  }, [filter]);
  const filtered = search ? orders.filter((o) => o.order_number.toLowerCase().includes(search.toLowerCase()) || o.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())) : orders;
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-dark mb-6" }, "Todas las \xD3rdenes"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 relative" }, /* @__PURE__ */ React.createElement(Search, { className: "absolute left-3 top-3 w-5 h-5 text-gray-medium" }), /* @__PURE__ */ React.createElement("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar orden o cliente...", className: "w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl" })), /* @__PURE__ */ React.createElement("select", { value: filter, onChange: (e) => setFilter(e.target.value), className: "px-4 py-3 border border-gray-200 rounded-xl" }, /* @__PURE__ */ React.createElement("option", { value: "" }, "Todos los estados"), Object.entries(STATUS_LABELS).map(([k, v]) => /* @__PURE__ */ React.createElement("option", { key: k, value: k }, v)))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Orden"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Cliente"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Local"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Estado"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Total"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Fecha"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-gray-100" }, filtered.map((o) => /* @__PURE__ */ React.createElement("tr", { key: o.id, className: "hover:bg-gray-50" }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 font-bold text-primary text-sm" }, o.order_number), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-sm" }, o.profiles?.full_name || "N/A"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-sm text-gray-medium" }, o.printing_locations?.name || "N/A"), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: "px-2 py-1 rounded-full text-xs text-white font-medium", style: { backgroundColor: STATUS_COLORS[o.status] } }, STATUS_LABELS[o.status])), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 font-bold text-sm" }, "$", o.total_amount), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-xs text-gray-medium" }, format(new Date(o.created_at), "dd/MM/yyyy HH:mm"))))))), filtered.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-center py-8" }, "Sin \xF3rdenes")));
};
