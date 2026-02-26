import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Edit2, Trash2, Save, X, User, Camera, DollarSign, Palette, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';

export const AdminLocations = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [locations, setLocations] = useState([]);
    const [localUsers, setLocalUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({
        name: '', address: '', phone: '', email: '', status: 'activo', assigned_user_id: '',
        has_fotoya: false, allow_custom_prices: false,
        has_color_printing: false, max_color_size: 'A4', max_bw_size: 'A4'
    });

    const fetchLocations = async () => {
        const { data } = await supabase.from('printing_locations').select('*').order('created_at');
        const { data: users } = await supabase.from('profiles').select('id, full_name, email, location_id').eq('user_type', 'local');

        const enrichedLocations = (data || []).map(loc => ({
            ...loc,
            assigned_user: users?.find(u => u.location_id === loc.id)
        }));
        setLocations(enrichedLocations);
        setLocalUsers(users || []);
        setLoading(false);
    };
    useEffect(() => { fetchLocations(); }, []);

    const handleSave = async () => {
        if (!form.assigned_user_id) {
            showToast('Debe asignar un usuario Local obligatoriamente', 'error');
            return;
        }
        try {
            const locData = {
                name: form.name, address: form.address, phone: form.phone, email: form.email, status: form.status,
                has_fotoya: form.has_fotoya, allow_custom_prices: form.allow_custom_prices,
                has_color_printing: form.has_color_printing,
                max_color_size: form.max_color_size,
                max_bw_size: form.max_bw_size
            };
            let currentLocId = editId;

            if (editId) {
                const original = locations.find(l => l.id === editId);
                let changes = [];
                if (original) {
                    if (original.has_fotoya !== form.has_fotoya) changes.push(`FotoYa: ${form.has_fotoya ? 'Activado' : 'Desactivado'}`);
                    if (original.allow_custom_prices !== form.allow_custom_prices) changes.push(`Precios Pers.: ${form.allow_custom_prices ? 'Permitido' : 'Denegado'}`);
                    if (original.assigned_user?.id !== form.assigned_user_id) {
                        const newUser = localUsers.find(u => u.id === form.assigned_user_id);
                        changes.push(`Encargado: ${newUser ? newUser.full_name || newUser.email : 'Ninguno'}`);
                    }
                    if (original.status !== form.status) changes.push(`Estado: ${form.status}`);
                    if (original.name !== form.name) changes.push(`Nombre: ${form.name}`);
                }
                const dText = changes.length > 0 ? `Local actualizado. Cambios: ${changes.join(', ')}` : `Local "${form.name}" actualizado sin cambios relevantes`;

                const { error } = await supabase.from('printing_locations').update(locData).eq('id', editId);
                if (error) throw error;
                await supabase.from('admin_audit_logs').insert({ admin_id: user.id, action: 'update_location', target_id: editId, target_type: 'location', details: { description: dText } });
                showToast('Local actualizado', 'success');
            } else {
                const { data, error } = await supabase.from('printing_locations').insert(locData).select().single();
                if (error) throw error;
                currentLocId = data.id;

                const newUser = localUsers.find(u => u.id === form.assigned_user_id);
                const assignedName = newUser ? newUser.full_name || newUser.email : 'Ninguno';
                const dText = `Local "${form.name}" creado. Encargado: ${assignedName} | FotoYa: ${form.has_fotoya ? 'Sí' : 'No'} | Precios Pers: ${form.allow_custom_prices ? 'Sí' : 'No'}`;

                await supabase.from('admin_audit_logs').insert({ admin_id: user.id, action: 'create_location', target_id: currentLocId, target_type: 'location', details: { description: dText } });
                showToast('Local creado', 'success');
            }

            // Sync user assignment
            const oldUser = localUsers.find(u => u.location_id === currentLocId);
            if (oldUser && oldUser.id !== form.assigned_user_id) {
                await supabase.from('profiles').update({ location_id: null }).eq('id', oldUser.id);
            }
            if (form.assigned_user_id && (!oldUser || oldUser.id !== form.assigned_user_id)) {
                await supabase.from('profiles').update({ location_id: currentLocId }).eq('id', form.assigned_user_id);
            }

            resetForm();
            fetchLocations();
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
    };

    const handleEdit = (loc) => {
        setForm({
            name: loc.name, address: loc.address, phone: loc.phone || '', email: loc.email || '', status: loc.status,
            assigned_user_id: loc.assigned_user?.id || '',
            has_fotoya: loc.has_fotoya || false, allow_custom_prices: loc.allow_custom_prices || false,
            has_color_printing: loc.has_color_printing || false,
            max_color_size: loc.max_color_size || 'A4',
            max_bw_size: loc.max_bw_size || 'A4'
        });
        setEditId(loc.id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este local?')) return;
        const { error } = await supabase.from('printing_locations').delete().eq('id', id);
        if (error) showToast('Error al eliminar: ' + error.message, 'error');
        else { showToast('Local eliminado', 'success'); fetchLocations(); }
    };

    const resetForm = () => {
        setForm({ name: '', address: '', phone: '', email: '', status: 'activo', assigned_user_id: '', has_fotoya: false, allow_custom_prices: false, has_color_printing: false, max_color_size: 'A4', max_bw_size: 'A4' });
        setEditId(null);
        setShowForm(false);
    };

    if (loading) return <div className="p-6"><div className="shimmer h-64 rounded-xl" /></div>;

    return (
        <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-dark">Gestión de Locales</h2>
                    <p className="text-sm text-gray-medium">Administrá sucursales y sus permisos</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-brand">
                    <Plus className="w-5 h-5" /> Nuevo Local
                </button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100"
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>

                        <div className="flex justify-between mb-6">
                            <h3 className="font-bold text-gray-dark text-lg">{editId ? 'Editar' : 'Nuevo'} Local</h3>
                            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-medium" /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre del Local" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Dirección completa" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />
                            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none" />

                            {/* User Assignment */}
                            <div>
                                <select value={form.assigned_user_id} onChange={e => setForm({ ...form, assigned_user_id: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none">
                                    <option value="">👤 Asignar Encargado (Requerido)...</option>
                                    {localUsers.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name || u.email} {u.location_id && u.location_id !== editId ? '(Ya en otro local)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-primary transition-colors">
                                <div className="mt-0.5">
                                    <input type="checkbox" checked={form.has_fotoya} onChange={e => setForm({ ...form, has_fotoya: e.target.checked })}
                                        className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 font-bold text-gray-dark mb-1"><Camera className="w-4 h-4 text-primary" /> Habilitar FotoYa</div>
                                    <p className="text-xs text-gray-medium leading-tight">Muestra este local como opción para impresión rápida de fotografías en el panel cliente.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-accent transition-colors">
                                <div className="mt-0.5">
                                    <input type="checkbox" checked={form.allow_custom_prices} onChange={e => setForm({ ...form, allow_custom_prices: e.target.checked })}
                                        className="w-5 h-5 rounded text-accent focus:ring-accent border-gray-300" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 font-bold text-gray-dark mb-1"><DollarSign className="w-4 h-4 text-accent" /> Precios Personalizados</div>
                                    <p className="text-xs text-gray-medium leading-tight">Permite al encargado del local definir sus propios precios de impresión en su panel.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-yellow-400 transition-colors col-span-full md:col-span-1">
                                <div className="mt-0.5">
                                    <input type="checkbox" checked={form.has_color_printing} onChange={e => setForm({ ...form, has_color_printing: e.target.checked })}
                                        className="w-5 h-5 rounded text-yellow-500 focus:ring-yellow-400 border-gray-300" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 font-bold text-gray-dark mb-1"><Palette className="w-4 h-4 text-yellow-500" /> Impresión a Color</div>
                                    <p className="text-xs text-gray-medium leading-tight">El local puede imprimir folletos, documentos y archivos en color (no solo fotografías).</p>
                                </div>
                            </label>
                        </div>

                        {/* Print size capabilities */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div>
                                <label className="block text-xs font-bold text-gray-medium uppercase mb-2 flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Tamaño máximo B&N</label>
                                <div className="flex gap-2">
                                    {['A4', 'A3'].map(size => (
                                        <button key={size} type="button" onClick={() => setForm({ ...form, max_bw_size: size })}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${form.max_bw_size === size ? 'border-secondary bg-secondary/10 text-secondary' : 'border-gray-200 text-gray-medium hover:border-secondary/50'
                                                }`}>{size}</button>
                                    ))}
                                </div>
                            </div>
                            {form.has_color_printing && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-medium uppercase mb-2 flex items-center gap-1"><Palette className="w-3.5 h-3.5 text-yellow-500" /> Tamaño máximo Color</label>
                                    <div className="flex gap-2">
                                        {['A4', 'A3'].map(size => (
                                            <button key={size} type="button" onClick={() => setForm({ ...form, max_color_size: size })}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${form.max_color_size === size ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-200 text-gray-medium hover:border-yellow-300'
                                                    }`}>{size}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button onClick={resetForm} className="px-6 py-2.5 text-gray-medium font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                            <button onClick={handleSave} disabled={!form.name || !form.address || !form.assigned_user_id}
                                className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition shadow-brand">
                                <Save className="w-5 h-5" />Guardar Local
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {locations.map(loc => (
                    <motion.div key={loc.id} className="bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 p-5 transition-all" whileHover={{ y: -2 }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-dark text-lg leading-tight">{loc.name}</h3>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {loc.has_fotoya && <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Camera className="w-3 h-3" /> FotoYa</span>}
                                    {loc.allow_custom_prices && <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><DollarSign className="w-3 h-3" /> Precios Propios</span>}
                                    {loc.has_color_printing && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Palette className="w-3 h-3" /> Color{loc.max_color_size === 'A3' ? ' A3' : ''}</span>}
                                    {loc.max_bw_size === 'A3' && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Printer className="w-3 h-3" /> B&N A3</span>}
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${loc.status === 'activo' ? 'bg-success/15 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{loc.status}</span>
                        </div>

                        <div className="space-y-2 mb-4">
                            <p className="text-sm text-gray-medium flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /> <span className="truncate">{loc.address}</span></p>
                            <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-2">
                                <User className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-xs font-bold text-gray-dark truncate">
                                    Encargado: <span className="font-medium text-gray-medium">{loc.assigned_user?.full_name || loc.assigned_user?.email || 'Sin Asignar'}</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-gray-100">
                            <button onClick={() => handleEdit(loc)} className="flex-1 bg-gray-50 text-gray-dark text-sm font-bold flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-gray-100 transition"><Edit2 className="w-4 h-4" />Editar</button>
                            <button onClick={() => handleDelete(loc.id)} className="flex-1 bg-red-50 text-red-600 text-sm font-bold flex items-center justify-center gap-2 py-2.5 rounded-xl hover:bg-red-100 transition"><Trash2 className="w-4 h-4" />Eliminar</button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
