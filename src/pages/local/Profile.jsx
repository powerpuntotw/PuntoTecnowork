import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, CreditCard, Save, LogOut, MapPin, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

export const LocalProfile = () => {
    const { user, profile, signOut } = useAuth();
    const { showToast } = useToast();
    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        dni: profile?.dni || '',
    });
    const [location, setLocation] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile?.location_id) {
            supabase.from('printing_locations').select('*').eq('id', profile.location_id).maybeSingle()
                .then(({ data }) => setLocation(data));
        }
    }, [profile?.location_id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('profiles').update(form).eq('id', user.id);
            if (error) throw error;
            showToast('Perfil actualizado', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally { setSaving(false); }
    };

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-gray-dark mb-6">Mi Perfil</h2>

            <motion.div className="bg-white rounded-2xl shadow-lg p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                    <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=0093D8&color=fff`}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=0093D8&color=fff`; }}
                        alt="Avatar" className="w-16 h-16 rounded-full border-4 border-secondary/20" />
                    <div>
                        <p className="font-bold text-gray-dark">{profile?.full_name || 'Usuario'}</p>
                        <p className="text-sm text-gray-medium">{profile?.email}</p>
                        <span className="px-2 py-1 bg-secondary/10 text-secondary text-xs font-medium rounded-full">Local</span>
                    </div>
                </div>

                {/* Location Info */}
                {location && (
                    <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-4 mb-6">
                        <h3 className="font-bold text-secondary text-sm flex items-center gap-2 mb-2"><Building className="w-4 h-4" />Local Asignado</h3>
                        <p className="text-sm font-medium text-gray-dark">{location.name}</p>
                        <p className="text-xs text-gray-medium flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{location.address}</p>
                        {location.phone && <p className="text-xs text-gray-medium flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{location.phone}</p>}
                        <span className={`inline-block mt-2 px-2 py-1 rounded-full text-[10px] font-medium ${location.status === 'activo' ? 'bg-success/10 text-success' : 'bg-gray-200 text-gray-medium'}`}>
                            {location.status === 'activo' ? 'Abierto' : 'Cerrado'}
                        </span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><User className="w-4 h-4" />Nombre completo</label>
                        <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><Mail className="w-4 h-4" />Email</label>
                        <input value={profile?.email || ''} disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-medium" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><Phone className="w-4 h-4" />Teléfono</label>
                        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><CreditCard className="w-4 h-4" />DNI</label>
                        <input value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-secondary focus:border-transparent" />
                    </div>
                </div>

                <button onClick={handleSave} disabled={saving}
                    className="w-full mt-6 bg-secondary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-secondary/90 disabled:opacity-50 transition-all">
                    <Save className="w-5 h-5" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </motion.div>

            <button onClick={signOut} className="w-full mt-4 py-3 text-gray-medium text-sm flex items-center justify-center gap-2 hover:text-secondary transition-colors">
                <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
        </div>
    );
};
