import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Download, Calendar, Filter } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
const COLORS = ["#EB1C24", "#FFC905", "#A4CC39", "#0093D8", "#6B7280"];
const STATUS_LABELS = { pendiente: "Pendiente", en_proceso: "En Proceso", listo: "Listo", entregado: "Entregado", cancelado: "Cancelado" };
export const AdminReports = () => {
  const [orders, setOrders] = useState([]);
  const [locations, setLocations] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [revenueByLocation, setRevenueByLocation] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(subDays(/* @__PURE__ */ new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(/* @__PURE__ */ new Date(), "yyyy-MM-dd"));
  const [locationFilter, setLocationFilter] = useState("");
  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from("print_orders").select("id, status, total_amount, location_id, created_at").gte("created_at", startOfDay(/* @__PURE__ */ new Date(dateFrom + "T00:00:00")).toISOString()).lte("created_at", endOfDay(/* @__PURE__ */ new Date(dateTo + "T00:00:00")).toISOString());
      if (locationFilter) query = query.eq("location_id", locationFilter);
      const [ordersRes, locsRes] = await Promise.all([
        query,
        supabase.from("printing_locations").select("id, name")
      ]);
      if (ordersRes.error) console.error("Orders query error:", ordersRes.error);
      if (locsRes.error) console.error("Locations query error:", locsRes.error);
      const data = ordersRes.data || [];
      const locs = locsRes.data || [];
      setOrders(data);
      setLocations(locs);
      const locMap = locs.reduce((m, l) => {
        m[l.id] = l.name;
        return m;
      }, {});
      const statusCount = data.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});
      setOrdersByStatus(Object.entries(statusCount).map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value })));
      const revByLoc = data.reduce((acc, o) => {
        const locName = locMap[o.location_id] || "Sin asignar";
        acc[locName] = (acc[locName] || 0) + Number(o.total_amount);
        return acc;
      }, {});
      setRevenueByLocation(Object.entries(revByLoc).map(([name, total]) => ({ name, total: Math.round(total) })));
      const byDay = data.reduce((acc, o) => {
        const day = format(new Date(o.created_at), "dd/MM");
        if (!acc[day]) acc[day] = { day, orders: 0, revenue: 0 };
        acc[day].orders++;
        acc[day].revenue += Number(o.total_amount);
        return acc;
      }, {});
      setTimeline(Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)));
    } catch (err) {
      console.error("Reports fetch error:", err);
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, locationFilter]);
  const exportCSV = () => {
    const header = "Estado,Monto Total,Local,Fecha\n";
    const rows = orders.map(
      (o) => `${o.status},${o.total_amount},${o.printing_locations?.name || "N/A"},${format(new Date(o.created_at), "yyyy-MM-dd HH:mm")}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_${dateFrom}_${dateTo}.csv`;
    link.click();
  };
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, [1, 2, 3].map((i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "shimmer h-48 rounded-xl" })));
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-dark" }, "Reportes y Estad\xEDsticas"), /* @__PURE__ */ React.createElement("button", { onClick: exportCSV, className: "bg-success text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm hover:bg-success/90 transition" }, /* @__PURE__ */ React.createElement(Download, { className: "w-4 h-4" }), "Exportar CSV")), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row gap-4 items-end" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-medium text-gray-dark mb-1 block" }, "Desde"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: dateFrom,
      onChange: (e) => setDateFrom(e.target.value),
      className: "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-medium text-gray-dark mb-1 block" }, "Hasta"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "date",
      value: dateTo,
      onChange: (e) => setDateTo(e.target.value),
      className: "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: "text-xs font-medium text-gray-dark mb-1 block" }, "Local"), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: locationFilter,
      onChange: (e) => setLocationFilter(e.target.value),
      className: "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Todos"),
    locations.map((l) => /* @__PURE__ */ React.createElement("option", { key: l.id, value: l.id }, l.name))
  ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow p-4 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-primary" }, totalOrders), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium" }, "\xD3rdenes")), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow p-4 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-success" }, "$", totalRevenue.toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium" }, "Ingresos")), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow p-4 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-secondary" }, "$", avgOrderValue), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium" }, "Promedio"))), timeline.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-4" }, "Evoluci\xF3n diaria"), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 250 }, /* @__PURE__ */ React.createElement(LineChart, { data: timeline }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "day", tick: { fontSize: 11 } }), /* @__PURE__ */ React.createElement(YAxis, { yAxisId: "left", tick: { fontSize: 11 } }), /* @__PURE__ */ React.createElement(YAxis, { yAxisId: "right", orientation: "right", tick: { fontSize: 11 } }), /* @__PURE__ */ React.createElement(Tooltip, null), /* @__PURE__ */ React.createElement(Legend, null), /* @__PURE__ */ React.createElement(Line, { yAxisId: "left", type: "monotone", dataKey: "orders", name: "\xD3rdenes", stroke: "#0093D8", strokeWidth: 2, dot: { r: 3 } }), /* @__PURE__ */ React.createElement(Line, { yAxisId: "right", type: "monotone", dataKey: "revenue", name: "Ingresos ($)", stroke: "#EB1C24", strokeWidth: 2, dot: { r: 3 } })))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-4" }, "\xD3rdenes por Estado"), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 300 }, /* @__PURE__ */ React.createElement(PieChart, null, /* @__PURE__ */ React.createElement(Pie, { data: ordersByStatus, cx: "50%", cy: "50%", innerRadius: 60, outerRadius: 100, paddingAngle: 5, dataKey: "value", label: ({ name, value }) => `${name}: ${value}` }, ordersByStatus.map((_, i) => /* @__PURE__ */ React.createElement(Cell, { key: i, fill: COLORS[i % COLORS.length] }))), /* @__PURE__ */ React.createElement(Tooltip, null), /* @__PURE__ */ React.createElement(Legend, null)))), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg p-6" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark mb-4" }, "Ingresos por Local"), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 300 }, /* @__PURE__ */ React.createElement(BarChart, { data: revenueByLocation }, /* @__PURE__ */ React.createElement(CartesianGrid, { strokeDasharray: "3 3" }), /* @__PURE__ */ React.createElement(XAxis, { dataKey: "name", tick: { fontSize: 12 } }), /* @__PURE__ */ React.createElement(YAxis, null), /* @__PURE__ */ React.createElement(Tooltip, { formatter: (v) => `$${v}` }), /* @__PURE__ */ React.createElement(Bar, { dataKey: "total", fill: "#EB1C24", radius: [8, 8, 0, 0] }))))));
};
