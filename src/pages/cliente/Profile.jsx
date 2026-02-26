import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, CreditCard, Save, LogOut, Trash2, AlertTriangle, X, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

export const Profile = () => {
    const { user, profile, signOut } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        dni: profile?.dni || '',
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Delete account states
    const [deleteStep, setDeleteStep] = useState('idle'); // idle | checking | blocked | confirm | deleting
    const [blockReasons, setBlockReasons] = useState([]);
    const [confirmText, setConfirmText] = useState('');

    const validate = () => {
        const e = {};
        if (!form.full_name.trim()) e.full_name = 'El nombre es obligatorio';
        else if (form.full_name.trim().length < 3) e.full_name = 'Mínimo 3 caracteres';
        if (form.phone && !/^\d{7,15}$/.test(form.phone.replace(/\s|-/g, ''))) e.phone = 'Teléfono inválido (7-15 dígitos)';
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
            showToast('Perfil actualizado', 'success');
        } catch (err) {
            showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Account deletion ──────────────────────────────────────────────────────

    const handleRequestDelete = async () => {
        setDeleteStep('checking');
        setBlockReasons([]);
        try {
            const reasons = [];

            // Check pending print_orders
            const { data: orders, error: oErr } = await supabase
                .from('print_orders')
                .select('id')
                .eq('customer_id', user.id)
                .in('status', ['pendiente', 'en_proceso', 'listo']);
            if (oErr) throw oErr;
            if (orders?.length > 0) {
                reasons.push(`Tenés ${orders.length} pedido${orders.length > 1 ? 's' : ''} de impresión pendiente${orders.length > 1 ? 's' : ''}.`);
            }

            // Check pending reward_redemptions
            const { data: redemptions, error: rErr } = await supabase
                .from('reward_redemptions')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'pendiente');
            if (rErr) throw rErr;
            if (redemptions?.length > 0) {
                reasons.push(`Tenés ${redemptions.length} canje${redemptions.length > 1 ? 's' : ''} de premio pendiente${redemptions.length > 1 ? 's' : ''}.`);
            }

            if (reasons.length > 0) {
                setBlockReasons(reasons);
                setDeleteStep('blocked');
            } else {
                setDeleteStep('confirm');
            }
        } catch (err) {
            showToast('Error al verificar la cuenta: ' + err.message, 'error');
            setDeleteStep('idle');
        }
    };

    const handleConfirmDelete = async () => {
        if (confirmText !== 'ELIMINAR') return;
        setDeleteStep('deleting');
        try {
            const { error } = await supabase.functions.invoke('delete-account');
            if (error) throw error;
            showToast('Cuenta eliminada correctamente. ¡Hasta luego!', 'success');
            await signOut();
            navigate('/login');
        } catch (err) {
            showToast('Error al eliminar la cuenta: ' + err.message, 'error');
            setDeleteStep('idle');
        }
    };

    const resetDelete = () => {
        setDeleteStep('idle');
        setBlockReasons([]);
        setConfirmText('');
    };

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-gray-dark mb-6">Mi Perfil</h2>

            <motion.div className="bg-white rounded-2xl shadow-lg p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                    <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=EB1C24&color=fff`}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'U')}&background=EB1C24&color=fff`; }}
                        alt="Avatar" className="w-16 h-16 rounded-full border-4 border-primary/20" />
                    <div>
                        <p className="font-bold text-gray-dark">{profile?.full_name || 'Usuario'}</p>
                        <p className="text-sm text-gray-medium">{profile?.email}</p>
                        <span className="px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full capitalize">{profile?.user_type}</span>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><User className="w-4 h-4" />Nombre completo</label>
                        <input value={form.full_name} onChange={e => { setForm({ ...form, full_name: e.target.value }); setErrors(prev => ({ ...prev, full_name: undefined })); }}
                            className={`w-full px-4 py-3 border ${errors.full_name ? 'border-primary' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent`} />
                        {errors.full_name && <p className="text-xs text-primary mt-1">{errors.full_name}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><Mail className="w-4 h-4" />Email</label>
                        <input value={profile?.email || ''} disabled className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-medium" />
                        <p className="text-xs text-gray-medium mt-1">El email no se puede cambiar (viene de Google)</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><Phone className="w-4 h-4" />Teléfono</label>
                        <input value={form.phone} onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors(prev => ({ ...prev, phone: undefined })); }}
                            className={`w-full px-4 py-3 border ${errors.phone ? 'border-primary' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent`} />
                        {errors.phone && <p className="text-xs text-primary mt-1">{errors.phone}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-dark mb-1 flex items-center gap-2"><CreditCard className="w-4 h-4" />DNI</label>
                        <input value={form.dni} onChange={e => { setForm({ ...form, dni: e.target.value }); setErrors(prev => ({ ...prev, dni: undefined })); }}
                            className={`w-full px-4 py-3 border ${errors.dni ? 'border-primary' : 'border-gray-200'} rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent`} />
                        {errors.dni && <p className="text-xs text-primary mt-1">{errors.dni}</p>}
                    </div>
                </div>

                <button onClick={handleSave} disabled={saving}
                    className="w-full mt-6 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-all">
                    <Save className="w-5 h-5" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </motion.div>

            <button onClick={signOut} className="w-full mt-4 py-3 text-gray-medium text-sm flex items-center justify-center gap-2 hover:text-primary transition-colors">
                <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>

            {/* ── Danger Zone ─────────────────────────────────────────────── */}
            <motion.div
                className="mt-6 border-2 border-red-200 rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <div className="bg-red-50 px-5 py-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                        <p className="font-bold text-red-700 text-sm">Zona de peligro</p>
                        <p className="text-xs text-red-500">Acciones irreversibles</p>
                    </div>
                </div>

                <div className="p-5 bg-white">
                    <p className="text-sm text-gray-medium mb-4 leading-relaxed">
                        Al eliminar tu cuenta se borrarán permanentemente tus datos personales.
                        <strong className="text-gray-dark"> No podrás recuperarla.</strong>{' '}
                        Solo podés darte de baja si no tenés pedidos ni canjes pendientes.
                    </p>

                    {/* IDLE state */}
                    {deleteStep === 'idle' && (
                        <button
                            onClick={handleRequestDelete}
                            className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-300 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 hover:border-red-400 transition-all"
                        >
                            <Trash2 className="w-4 h-4" /> Eliminar mi cuenta
                        </button>
                    )}

                    {/* CHECKING state */}
                    {deleteStep === 'checking' && (
                        <div className="flex items-center gap-2 text-sm text-gray-medium">
                            <Loader className="w-4 h-4 animate-spin text-primary" />
                            Verificando tu cuenta...
                        </div>
                    )}

                    {/* BLOCKED state */}
                    <AnimatePresence>
                        {deleteStep === 'blocked' && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-amber-50 border border-amber-200 rounded-xl p-4"
                            >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <p className="text-sm font-semibold text-amber-800">No podés eliminar tu cuenta todavía</p>
                                    <button onClick={resetDelete} className="text-amber-500 hover:text-amber-700">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <ul className="space-y-1.5">
                                    {blockReasons.map((r, i) => (
                                        <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                                            <span className="text-amber-400 mt-0.5">•</span> {r}
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-xs text-amber-600 mt-3">
                                    Resolvé estas situaciones y volvé a intentarlo.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* CONFIRM state */}
                    <AnimatePresence>
                        {deleteStep === 'confirm' && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3"
                            >
                                <p className="text-sm text-gray-dark font-medium">
                                    Para confirmar, escribí <span className="font-mono bg-red-100 text-red-600 px-1.5 py-0.5 rounded">ELIMINAR</span> en el campo de abajo:
                                </p>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    placeholder="Escribí ELIMINAR"
                                    className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-red-300 text-sm font-mono outline-none transition-all"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleConfirmDelete}
                                        disabled={confirmText !== 'ELIMINAR'}
                                        className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Confirmar eliminación
                                    </button>
                                    <button
                                        onClick={resetDelete}
                                        className="px-4 py-2.5 border border-gray-200 text-gray-medium rounded-xl text-sm hover:bg-gray-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* DELETING state */}
                    {deleteStep === 'deleting' && (
                        <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                            <Loader className="w-4 h-4 animate-spin" />
                            Eliminando cuenta...
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
