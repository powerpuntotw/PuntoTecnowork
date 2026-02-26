import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, Edit2, Trash2, Shield, MapPin, User, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../contexts/AuthContext";
const ROLE_COLORS = { admin: "bg-primary", local: "bg-secondary", client: "bg-success" };
export const AdminUsers = () => {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;
  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from("profiles").select("*, points_accounts(current_points, tier_level)", { count: "exact" }).order("created_at", { ascending: false });
    if (roleFilter) query = query.eq("user_type", roleFilter);
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, count } = await query;
    setUsers(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  };
  useEffect(() => {
    setPage(0);
  }, [search, roleFilter]);
  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);
  const updateRole = async (userObj, newRole) => {
    const userId = userObj.id;
    const userName = userObj.full_name || userObj.email || "Sin nombre";
    try {
      const { error } = await supabase.from("profiles").update({ user_type: newRole }).eq("id", userId);
      if (error) throw error;
      await supabase.from("admin_audit_logs").insert({ admin_id: currentUser.id, action: "update_role", target_id: userId, target_type: "user", details: { description: `Rol de ${userName} cambiado a ${newRole}` } });
      showToast(`Rol actualizado a ${newRole}`, "success");
      fetchUsers();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };
  const deleteUser = async (userObj) => {
    const userId = userObj.id;
    const userName = userObj.full_name || userObj.email || "Sin nombre";
    if (!confirm(`\xBFEliminar al usuario ${userName}? Se borrar\xE1n todos sus datos permanentemente.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ user_id: userId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al eliminar");
      showToast("Usuario eliminado completamente", "success");
      await supabase.from("admin_audit_logs").insert({ admin_id: currentUser.id, action: "delete_user", target_id: userId, target_type: "user", details: { description: `Usuario ${userName} eliminado completamente` } });
      fetchUsers();
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-r from-primary to-secondary rounded-xl px-6 py-4 mb-6" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-white" }, "Gesti\xF3n de Usuarios")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col md:flex-row gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 relative" }, /* @__PURE__ */ React.createElement(Search, { className: "absolute left-3 top-3 w-5 h-5 text-gray-medium" }), /* @__PURE__ */ React.createElement(
    "input",
    {
      value: search,
      onChange: (e) => setSearch(e.target.value),
      placeholder: "Buscar nombre o email...",
      className: "w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary"
    }
  )), /* @__PURE__ */ React.createElement(
    "select",
    {
      value: roleFilter,
      onChange: (e) => setRoleFilter(e.target.value),
      className: "px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary"
    },
    /* @__PURE__ */ React.createElement("option", { value: "" }, "Todos los roles"),
    /* @__PURE__ */ React.createElement("option", { value: "admin" }, "Admin"),
    /* @__PURE__ */ React.createElement("option", { value: "local" }, "Local"),
    /* @__PURE__ */ React.createElement("option", { value: "client" }, "Cliente")
  )), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-xl shadow-lg overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Usuario"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Rol"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Puntos"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase" }, "Nivel"), /* @__PURE__ */ React.createElement("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-dark uppercase" }, "Acciones"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-gray-100" }, users.map((u) => /* @__PURE__ */ React.createElement("tr", { key: u.id, className: "hover:bg-gray-50 transition-colors" }, /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center" }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || "U")}&background=EB1C24&color=fff`,
      onError: (e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || "U")}&background=EB1C24&color=fff`;
      },
      className: "w-9 h-9 rounded-full mr-3",
      alt: ""
    }
  ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-gray-dark" }, u.full_name || "Sin nombre"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium" }, u.email)))), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4" }, /* @__PURE__ */ React.createElement(
    "select",
    {
      value: u.user_type,
      onChange: (e) => updateRole(u, e.target.value),
      className: `px-3 py-1 text-xs font-semibold rounded-full text-white ${ROLE_COLORS[u.user_type]} border-0 cursor-pointer`
    },
    /* @__PURE__ */ React.createElement("option", { value: "admin" }, "Admin"),
    /* @__PURE__ */ React.createElement("option", { value: "local" }, "Local"),
    /* @__PURE__ */ React.createElement("option", { value: "client" }, "Cliente")
  )), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-sm text-gray-dark" }, u.points_accounts?.[0]?.current_points || 0, " pts"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-sm text-gray-dark capitalize" }, u.points_accounts?.[0]?.tier_level || "bronze"), /* @__PURE__ */ React.createElement("td", { className: "px-6 py-4 text-right" }, /* @__PURE__ */ React.createElement("button", { onClick: () => deleteUser(u), className: "text-gray-medium hover:text-primary transition-colors", title: "Eliminar" }, /* @__PURE__ */ React.createElement(Trash2, { className: "w-4 h-4" })))))))), users.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-center py-8" }, "No hay usuarios"), totalCount > PAGE_SIZE && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-6 py-3 border-t border-gray-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-medium" }, "Mostrando ", page * PAGE_SIZE + 1, "-", Math.min((page + 1) * PAGE_SIZE, totalCount), " de ", totalCount), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPage((p) => Math.max(0, p - 1)),
      disabled: page === 0,
      className: "px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-30 flex items-center gap-1"
    },
    /* @__PURE__ */ React.createElement(ChevronLeft, { className: "w-4 h-4" }),
    "Anterior"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPage((p) => p + 1),
      disabled: (page + 1) * PAGE_SIZE >= totalCount,
      className: "px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-30 flex items-center gap-1"
    },
    "Siguiente",
    /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-4 h-4" })
  )))));
};
