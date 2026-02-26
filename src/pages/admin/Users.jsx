import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, Edit2, Trash2, Shield, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_COLORS = { admin: 'bg-primary', local: 'bg-secondary', client: 'bg-success' };

export const AdminUsers = () => {
    const { showToast } = useToast();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [editUser, setEditUser] = useState(null);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 20;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase.from('profiles').select('*, points_accounts(current_points, tier_level)', { count: 'exact' }).order('created_at', { ascending: false });
            if (roleFilter) query = query.eq('user_type', roleFilter);
            if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
            query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
            const { data, count } = await query;
            setUsers(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            console.error('Users fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setPage(0); }, [search, roleFilter]);
    useEffect(() => { fetchUsers(); }, [page, search, roleFilter]);

    const updateRole = async (userObj, newRole) => {
        const userId = userObj.id;
        const userName = userObj.full_name || userObj.email || 'Sin nombre';
        try {
            const { error } = await supabase.from('profiles').update({ user_type: newRole }).eq('id', userId);
            if (error) throw error;
            await supabase.from('admin_audit_logs').insert({ admin_id: currentUser.id, action: 'update_role', target_id: userId, target_type: 'user', details: { description: `Rol de ${userName} cambiado a ${newRole}` } });
            showToast(`Rol actualizado a ${newRole}`, 'success');
            fetchUsers();
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
    };

    const deleteUser = async (userObj) => {
        const userId = userObj.id;
        const userName = userObj.full_name || userObj.email || 'Sin nombre';
        if (!confirm(`¿Eliminar al usuario ${userName}? Se borrarán todos sus datos permanentemente.`)) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ user_id: userId })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Error al eliminar');
            showToast('Usuario eliminado completamente', 'success');
            await supabase.from('admin_audit_logs').insert({ admin_id: currentUser.id, action: 'delete_user', target_id: userId, target_type: 'user', details: { description: `Usuario ${userName} eliminado completamente` } });
            fetchUsers();
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
    };

    return (
        <div>
            <div className="bg-gradient-to-r from-primary to-secondary rounded-xl px-6 py-4 mb-6">
                <h2 className="text-xl font-bold text-white">Gestión de Usuarios</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-medium" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre o email..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary" />
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary">
                    <option value="">Todos los roles</option>
                    <option value="admin">Admin</option>
                    <option value="local">Local</option>
                    <option value="client">Cliente</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase">Puntos</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-dark uppercase">Nivel</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-dark uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'U')}&background=EB1C24&color=fff`}
                                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || 'U')}&background=EB1C24&color=fff`; }}
                                                className="w-9 h-9 rounded-full mr-3" alt="" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-dark">{u.full_name || 'Sin nombre'}</p>
                                                <p className="text-xs text-gray-medium">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select value={u.user_type} onChange={e => updateRole(u, e.target.value)}
                                            className={`px-3 py-1 text-xs font-semibold rounded-full text-white ${ROLE_COLORS[u.user_type]} border-0 cursor-pointer`}>
                                            <option value="admin">Admin</option>
                                            <option value="local">Local</option>
                                            <option value="client">Cliente</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-dark">{u.points_accounts?.current_points || 0} pts</td>
                                    <td className="px-6 py-4 text-sm text-gray-dark capitalize font-medium">{u.points_accounts?.tier_level || 'bronze'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => deleteUser(u)} className="text-gray-medium hover:text-primary transition-colors" title="Eliminar">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.length === 0 && <p className="text-gray-medium text-center py-8">No hay usuarios</p>}

                {/* Pagination */}
                {totalCount > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                        <span className="text-xs text-gray-medium">Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}</span>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-30 flex items-center gap-1">
                                <ChevronLeft className="w-4 h-4" />Anterior
                            </button>
                            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalCount}
                                className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-30 flex items-center gap-1">
                                Siguiente<ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
