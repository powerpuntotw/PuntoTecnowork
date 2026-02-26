import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Edit2, Trash2, Save, X, User, Camera, DollarSign } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../contexts/AuthContext";
export const AdminLocations = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [locations, setLocations] = useState([]);
  const [localUsers, setLocalUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    status: "activo",
    assigned_user_id: "",
    has_fotoya: false,
    allow_custom_prices: false
  });
  const fetchLocations = async () => {
    const { data } = await supabase.from("printing_locations").select("*").order("created_at");
    const { data: users } = await supabase.from("profiles").select("id, full_name, email, location_id").eq("user_type", "local");
    const enrichedLocations = (data || []).map((loc) => ({
      ...loc,
      assigned_user: users?.find((u) => u.location_id === loc.id)
    }));
    setLocations(enrichedLocations);
    setLocalUsers(users || []);
    setLoading(false);
  };
  useEffect(() => {
    fetchLocations();
  }, []);
  const handleSave = async () => {
    if (!form.assigned_user_id) {
      showToast("Debe asignar un usuario Local obligatoriamente", "error");
      return;
    }
    try {
      const locData = {
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email,
        status: form.status,
        has_fotoya: form.has_fotoya,
        allow_custom_prices: form.allow_custom_prices
      };
      let currentLocId = editId;
      if (editId) {
        const original = locations.find((l) => l.id === editId);
        let changes = [];
        if (original) {
          if (original.has_fotoya !== form.has_fotoya) changes.push(`FotoYa: ${form.has_fotoya ? "Activado" : "Desactivado"}`);
          if (original.allow_custom_prices !== form.allow_custom_prices) changes.push(`Precios Pers.: ${form.allow_custom_prices ? "Permitido" : "Denegado"}`);
          if (original.assigned_user?.id !== form.assigned_user_id) {
            const newUser = localUsers.find((u) => u.id === form.assigned_user_id);
            changes.push(`Encargado: ${newUser ? newUser.full_name || newUser.email : "Ninguno"}`);
          }
          if (original.status !== form.status) changes.push(`Estado: ${form.status}`);
          if (original.name !== form.name) changes.push(`Nombre: ${form.name}`);
        }
        const dText = changes.length > 0 ? `Local actualizado. Cambios: ${changes.join(", ")}` : `Local "${form.name}" actualizado sin cambios relevantes`;
        const { error } = await supabase.from("printing_locations").update(locData).eq("id", editId);
        if (error) throw error;
        await supabase.from("admin_audit_logs").insert({ admin_id: user.id, action: "update_location", target_id: editId, target_type: "location", details: { description: dText } });
        showToast("Local actualizado", "success");
      } else {
        const { data, error } = await supabase.from("printing_locations").insert(locData).select().single();
        if (error) throw error;
        currentLocId = data.id;
        const newUser = localUsers.find((u) => u.id === form.assigned_user_id);
        const assignedName = newUser ? newUser.full_name || newUser.email : "Ninguno";
        const dText = `Local "${form.name}" creado. Encargado: ${assignedName} | FotoYa: ${form.has_fotoya ? "S\xED" : "No"} | Precios Pers: ${form.allow_custom_prices ? "S\xED" : "No"}`;
        await supabase.from("admin_audit_logs").insert({ admin_id: user.id, action: "create_location", target_id: currentLocId, target_type: "location", details: { description: dText } });
        showToast("Local creado", "success");
      }
      const oldUser = localUsers.find((u) => u.location_id === currentLocId);
      if (oldUser && oldUser.id !== form.assigned_user_id) {
        await supabase.from("profiles").update({ location_id: null }).eq("id", oldUser.id);
      }
      if (form.assigned_user_id && (!oldUser || oldUser.id !== form.assigned_user_id)) {
        await supabase.from("profiles").update({ location_id: currentLocId }).eq("id", form.assigned_user_id);
      }
      resetForm();
      fetchLocations();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };
  const handleEdit = (loc) => {
    setForm({
      name: loc.name,
      address: loc.address,
      phone: loc.phone || "",
      email: loc.email || "",
      status: loc.status,
      assigned_user_id: loc.assigned_user?.id || "",
      has_fotoya: loc.has_fotoya || false,
      allow_custom_prices: loc.allow_custom_prices || false
    });
    setEditId(loc.id);
    setShowForm(true);
  };
  const handleDelete = async (id) => {
    if (!confirm("\xBFEliminar este local?")) return;
    const { error } = await supabase.from("printing_locations").delete().eq("id", id);
    if (error) showToast("Error al eliminar: " + error.message, "error");
    else {
      showToast("Local eliminado", "success");
      fetchLocations();
    }
  };
  const resetForm = () => {
    setForm({ name: "", address: "", phone: "", email: "", status: "activo", assigned_user_id: "", has_fotoya: false, allow_custom_prices: false });
    setEditId(null);
    setShowForm(false);
  };
  if (loading) return /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "shimmer h-64 rounded-xl" }));
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 lg:p-6 max-w-7xl mx-auto space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-dark" }, "Gesti\xF3n de Locales"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium" }, "Administr\xE1 sucursales y sus permisos")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    resetForm();
    setShowForm(true);
  }, className: "bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-brand" }, /* @__PURE__ */ React.createElement(Plus, { className: "w-5 h-5" }), " Nuevo Local")), /* @__PURE__ */ React.createElement(AnimatePresence, null, showForm && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100",
      initial: { opacity: 0, height: 0 },
      animate: { opacity: 1, height: "auto" },
      exit: { opacity: 0, height: 0 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-between mb-6" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark text-lg" }, editId ? "Editar" : "Nuevo", " Local"), /* @__PURE__ */ React.createElement("button", { onClick: resetForm, className: "p-1 hover:bg-gray-100 rounded-full transition-colors" }, /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5 text-gray-medium" }))),
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5 mb-6" }, /* @__PURE__ */ React.createElement("input", { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: "Nombre del Local", className: "px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" }), /* @__PURE__ */ React.createElement("input", { value: form.address, onChange: (e) => setForm({ ...form, address: e.target.value }), placeholder: "Direcci\xF3n completa", className: "px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" }), /* @__PURE__ */ React.createElement("input", { value: form.phone, onChange: (e) => setForm({ ...form, phone: e.target.value }), placeholder: "Tel\xE9fono", className: "px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
      "select",
      {
        value: form.assigned_user_id,
        onChange: (e) => setForm({ ...form, assigned_user_id: e.target.value }),
        className: "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "\u{1F464} Asignar Encargado (Requerido)..."),
      localUsers.map((u) => /* @__PURE__ */ React.createElement("option", { key: u.id, value: u.id }, u.full_name || u.email, " ", u.location_id && u.location_id !== editId ? "(Ya en otro local)" : ""))
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-primary transition-colors" }, /* @__PURE__ */ React.createElement("div", { className: "mt-0.5" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: form.has_fotoya,
        onChange: (e) => setForm({ ...form, has_fotoya: e.target.checked }),
        className: "w-5 h-5 rounded text-primary focus:ring-primary border-gray-300"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 font-bold text-gray-dark mb-1" }, /* @__PURE__ */ React.createElement(Camera, { className: "w-4 h-4 text-primary" }), " Habilitar FotoYa"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium leading-tight" }, "Muestra este local como opci\xF3n para impresi\xF3n r\xE1pida de fotograf\xEDas en el panel cliente."))), /* @__PURE__ */ React.createElement("label", { className: "flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-accent transition-colors" }, /* @__PURE__ */ React.createElement("div", { className: "mt-0.5" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: form.allow_custom_prices,
        onChange: (e) => setForm({ ...form, allow_custom_prices: e.target.checked }),
        className: "w-5 h-5 rounded text-accent focus:ring-accent border-gray-300"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 font-bold text-gray-dark mb-1" }, /* @__PURE__ */ React.createElement(DollarSign, { className: "w-4 h-4 text-accent" }), " Precios Personalizados"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium leading-tight" }, "Permite al encargado del local definir sus propios precios de impresi\xF3n en su panel.")))),
    /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 pt-4 border-t border-gray-100" }, /* @__PURE__ */ React.createElement("button", { onClick: resetForm, className: "px-6 py-2.5 text-gray-medium font-bold hover:bg-gray-100 rounded-xl transition" }, "Cancelar"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleSave,
        disabled: !form.name || !form.address || !form.assigned_user_id,
        className: "bg-primary text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition shadow-brand"
      },
      /* @__PURE__ */ React.createElement(Save, { className: "w-5 h-5" }),
      "Guardar Local"
    ))
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" }, locations.map((loc) => /* @__PURE__ */ React.createElement(motion.div, { key: loc.id, className: "bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 p-5 transition-all", whileHover: { y: -2 } }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark text-lg leading-tight" }, loc.name), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 mt-2" }, loc.has_fotoya && /* @__PURE__ */ React.createElement("span", { className: "bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Camera, { className: "w-3 h-3" }), " FotoYa"), loc.allow_custom_prices && /* @__PURE__ */ React.createElement("span", { className: "bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1" }, /* @__PURE__ */ React.createElement(DollarSign, { className: "w-3 h-3" }), " Precios Propios"))), /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 rounded-full text-xs font-bold ${loc.status === "activo" ? "bg-success/15 text-green-700" : "bg-gray-200 text-gray-500"}` }, loc.status)), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium flex items-center gap-2" }, /* @__PURE__ */ React.createElement(MapPin, { className: "w-4 h-4 shrink-0" }), " ", /* @__PURE__ */ React.createElement("span", { className: "truncate" }, loc.address)), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 rounded-lg p-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(User, { className: "w-4 h-4 text-primary shrink-0" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-bold text-gray-dark truncate" }, "Encargado: ", /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-medium" }, loc.assigned_user?.full_name || loc.assigned_user?.email || "Sin Asignar")))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 pt-4 border-t border-gray-100" }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleEdit(loc), className: "flex-1 bg-gray-50 text-gray-dark text-sm font-bold flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-gray-100 transition" }, /* @__PURE__ */ React.createElement(Edit2, { className: "w-4 h-4" }), "Editar"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleDelete(loc.id), className: "flex-1 bg-red-50 text-red-600 text-sm font-bold flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-red-100 transition" }, /* @__PURE__ */ React.createElement(Trash2, { className: "w-4 h-4" }), "Eliminar"))))));
};
