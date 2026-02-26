import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, CreditCard, Save, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

export const AdminProfile = () => {
    const { user, profile, signOut } = useAuth();
    const { showToast } = useToast();
    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        dni: profile?.dni || '',
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!form.full_name.trim()) e.full_name = 'El nombre es obligatorio';
        else if (form.full_name.trim().length < 3) e.full_name = 'Mínimo 3 caracteres';
        if (form.phone && !/^\d{7,15}$/.test(form.phone.replace(/[\s-]/g, ''))) e.phone = 'Teléfono inválido (7-15 dígitos)';
        if (form.dni && !/^\d{7,8}$/.test(form.dni.replace(/\./g, ''))) e.dni = 'DNI inválido (7-8 dígitos)';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update(form).eq('id', user.id);
            if (error) throw error;

            // Log the action
            await supabase.from('admin_audit_logs').insert({
                admin_id: user.id,
                action: 'update_profile',
                target_id: user.id,
                target_type: 'admin',
                details: { description: `El administrador actualizó su perfil personal` }
            });

            showToast('Perfil actualizado correctamente', 'success');
        } catch (err) {
            showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-primary to-orange-500 rounded-xl px-6 py-4">
                <h2 className="text-xl font-bold text-white">Mi Perfil Administrativo</h2>
                <p className="text-white/80 text-sm mt-1">Gesti&oacute;n de datos personales de tu cuenta</p>
            </div>

            <motion.div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-gray-100 pb-8 mb-8">
                    <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'Admin')}&background=EB1C24&color=fff`}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'Admin')}&background=EB1C24&color=fff`; }}
                        alt="Avatar" className="w-24 h-24 rounded-full border-4 border-primary/20 shadow-sm" />
                    <div className="text-center sm:text-left">
                        <h3 className="text-2xl font-bold text-gray-dark">{profile?.full_name || 'Administrador'}</h3>
                        <p className="text-gray-medium mb-3">{profile?.email}</p>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">Administrador de Sistema</span>
                    </div>
                </div>

                {/* Form Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Nombre completo</label>
                        <input value={form.full_name} onChange={e => { setForm({ ...form, full_name: e.target.value }); setErrors(prev => ({ ...prev, full_name: undefined })); }}
                            className={`w-full px-4 py-3 border ${errors.full_name ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                            placeholder="Tu nombre completo" />
                        {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Teléfono (Opcional)</label>
                        <input value={form.phone} onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors(prev => ({ ...prev, phone: undefined })); }}
                            className={`w-full px-4 py-3 border ${errors.phone ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                            placeholder="Ej. 1123456789" />
                        {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> DNI (Opcional)</label>
                        <input value={form.dni} onChange={e => { setForm({ ...form, dni: e.target.value }); setErrors(prev => ({ ...prev, dni: undefined })); }}
                            className={`w-full px-4 py-3 border ${errors.dni ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                            placeholder="Sin puntos ni comas" />
                        {errors.dni && <p className="text-xs text-red-500 mt-1">{errors.dni}</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> Correo electrónico</label>
                        <input value={profile?.email || ''} disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed" />
                        <p className="text-xs text-gray-400 mt-2">El correo electrónico está vinculado a tu cuenta de Google y no puede modificarse desde aquí.</p>
                    </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 bg-primary text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 transition-all">
                        <Save className="w-5 h-5" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>

                    <button onClick={signOut} className="py-3 px-6 border-2 border-gray-200 text-gray-medium rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 hover:text-gray-dark transition-all">
                        <LogOut className="w-5 h-5" /> Cerrar Sesión
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
