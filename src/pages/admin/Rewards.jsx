import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Gift, Plus, Edit2, Trash2, Save, X, Star, Upload as UploadIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';

export const AdminRewards = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [rewards, setRewards] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', points_required: '', category: '', stock_quantity: '', active: true });
    const [editId, setEditId] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const imageRef = useRef(null);

    const fetchRewards = async () => { const { data } = await supabase.from('rewards_catalog').select('*').order('points_required'); setRewards(data || []); };
    useEffect(() => { fetchRewards(); }, []);

    const handleSave = async () => {
        const payload = { ...form, points_required: Number(form.points_required), stock_quantity: Number(form.stock_quantity) };
        try {
            // Upload image if selected
            if (imageFile) {
                const ext = imageFile.name.split('.').pop();
                const filePath = `rewards/${Date.now()}.${ext}`;
                const { error: uploadErr } = await supabase.storage.from('brand-assets').upload(filePath, imageFile, { upsert: true });
                if (uploadErr) throw uploadErr;
                const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(filePath);
                payload.image_url = publicUrl;
            }
            if (editId) {
                const { error } = await supabase.from('rewards_catalog').update(payload).eq('id', editId);
                if (error) throw error;
                await supabase.from('admin_audit_logs').insert({ admin_id: user.id, action: 'update_reward', target_id: editId, target_type: 'reward', details: { description: `Premio ${payload.name} actualizado` } });
                showToast('Premio actualizado', 'success');
            } else {
                const { data, error } = await supabase.from('rewards_catalog').insert(payload).select().single();
                if (error) throw error;
                await supabase.from('admin_audit_logs').insert({ admin_id: user.id, action: 'create_reward', target_id: data.id, target_type: 'reward', details: { description: `Premio ${payload.name} creado` } });
                showToast('Premio creado', 'success');
            }
            resetForm(); fetchRewards();
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
    };

    const handleEdit = (r) => { setForm({ name: r.name, description: r.description || '', points_required: r.points_required, category: r.category || '', stock_quantity: r.stock_quantity || 0, active: r.active }); setEditId(r.id); setImagePreview(r.image_url || null); setImageFile(null); setShowForm(true); };
    const handleDelete = async (id, name) => {
        if (!confirm('¿Eliminar?')) return;
        await supabase.from('rewards_catalog').delete().eq('id', id);
        await supabase.from('admin_audit_logs').insert({ admin_id: user.id, action: 'delete_reward', target_id: id, target_type: 'reward', details: { description: `Premio ${name} eliminado` } });
        showToast('Eliminado', 'success');
        fetchRewards();
    };
    const resetForm = () => { setForm({ name: '', description: '', points_required: '', category: '', stock_quantity: '', active: true }); setEditId(null); setShowForm(false); setImageFile(null); setImagePreview(null); };

    return (
        <div>
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-gray-dark">Gestión de Premios</h2>
                <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-primary text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"><Plus className="w-5 h-5" />Nuevo Premio</button>
            </div>

            {showForm && (
                <motion.div className="bg-white rounded-xl shadow-lg p-6 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex justify-between mb-4"><h3 className="font-bold text-gray-dark">{editId ? 'Editar' : 'Nuevo'} Premio</h3><button onClick={resetForm}><X className="w-5 h-5 text-gray-medium" /></button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="px-4 py-3 border border-gray-200 rounded-xl" />
                        <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Categoría" className="px-4 py-3 border border-gray-200 rounded-xl" />
                        <input type="number" value={form.points_required} onChange={e => setForm({ ...form, points_required: e.target.value })} placeholder="Puntos requeridos" className="px-4 py-3 border border-gray-200 rounded-xl" />
                        <input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} placeholder="Stock" className="px-4 py-3 border border-gray-200 rounded-xl" />
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción" className="px-4 py-3 border border-gray-200 rounded-xl md:col-span-2" rows="2" />
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-dark mb-1 block">Imagen del premio</label>
                            <div className="flex items-center gap-4">
                                {(imagePreview || imageFile) && (
                                    <img src={imageFile ? URL.createObjectURL(imageFile) : imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border" />
                                )}
                                <button type="button" onClick={() => imageRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-lg text-sm font-medium hover:bg-secondary/20 transition">
                                    <UploadIcon className="w-4 h-4" />{imageFile ? 'Cambiar' : 'Subir imagen'}
                                </button>
                                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) { setImageFile(e.target.files[0]); setImagePreview(null); } }} />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="accent-primary w-4 h-4" />Activo</label>
                        <div className="flex gap-3"><button onClick={resetForm} className="px-4 py-2 text-gray-medium">Cancelar</button><button onClick={handleSave} disabled={!form.name || !form.points_required} className="bg-primary text-white px-6 py-2 rounded-xl font-medium disabled:opacity-50"><Save className="w-4 h-4 inline mr-1" />Guardar</button></div>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards.map(r => (
                    <motion.div key={r.id} className={`bg-white rounded-xl shadow-lg overflow-hidden ${!r.active ? 'opacity-50' : ''}`} whileHover={{ scale: 1.02 }}>
                        {r.image_url && <img src={r.image_url} alt={r.name} className="w-full h-36 object-cover" />}
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-gray-dark">{r.name}</h3><span className={`px-2 py-1 rounded-full text-xs font-medium ${r.active ? 'bg-success/10 text-green-700' : 'bg-gray-200 text-gray-medium'}`}>{r.active ? 'Activo' : 'Inactivo'}</span></div>
                            <p className="text-xs text-gray-medium mb-2">{r.description}</p>
                            <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-accent fill-current" /><span className="font-bold text-gray-dark">{r.points_required} pts</span><span className="text-xs text-gray-medium ml-auto">Stock: {r.stock_quantity}</span></div>
                            <div className="flex gap-2 pt-3 border-t border-gray-100"><button onClick={() => handleEdit(r)} className="flex-1 text-secondary text-sm font-medium py-2 rounded-lg hover:bg-secondary/5 flex items-center justify-center gap-1"><Edit2 className="w-4 h-4" />Editar</button>
                                <button onClick={() => handleDelete(r.id, r.name)} className="flex-1 text-primary text-sm font-medium py-2 rounded-lg hover:bg-primary/5 flex items-center justify-center gap-1"><Trash2 className="w-4 h-4" />Eliminar</button></div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
