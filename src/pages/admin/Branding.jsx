import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, Upload, Save, Trash2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';

export const AdminBranding = () => {
    const { showToast } = useToast();
    const [branding, setBranding] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [appName, setAppName] = useState('');
    const [tagline, setTagline] = useState('');

    useEffect(() => {
        const fetch = async () => {
            try {
                const { data } = await supabase.from('app_branding').select('*').single();
                if (data) { setBranding(data); setAppName(data.app_name || ''); setTagline(data.tagline || ''); }
            } catch (err) {
                console.error("Branding fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const uploadLogo = async (file, field) => {
        try {
            const ext = file.name.split('.').pop();
            const filePath = `${field}_${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('brand-assets').upload(filePath, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(filePath);
            const { error: updateError } = await supabase.from('app_branding').update({ [field]: publicUrl }).eq('id', branding.id);
            if (updateError) throw updateError;
            setBranding(prev => ({ ...prev, [field]: publicUrl }));
            showToast('Logo actualizado', 'success');
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
    };

    const removeLogo = async (field) => {
        const { error } = await supabase.from('app_branding').update({ [field]: null }).eq('id', branding.id);
        if (error) showToast('Error: ' + error.message, 'error');
        else { setBranding(prev => ({ ...prev, [field]: null })); showToast('Logo eliminado', 'success'); }
    };

    const saveText = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('app_branding').update({ app_name: appName, tagline }).eq('id', branding.id);
            if (error) throw error;
            showToast('Guardado', 'success');
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
        finally { setSaving(false); }
    };

    const LogoUploader = ({ label, field }) => {
        const ref = useRef(null);
        const url = branding?.[field];
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-dark mb-4">{label}</h3>
                <div className="w-full h-40 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 mb-4">
                    {url ? <img src={url} alt={label} className="max-h-full max-w-full object-contain p-2" /> : <Image className="w-12 h-12 text-gray-medium" />}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => ref.current?.click()} className="flex-1 bg-secondary text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1"><Upload className="w-4 h-4" />Subir</button>
                    {url && <button onClick={() => removeLogo(field)} className="bg-primary/10 text-primary py-2 px-4 rounded-lg text-sm font-medium"><Trash2 className="w-4 h-4" /></button>}
                </div>
                <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) uploadLogo(e.target.files[0], field); }} />
            </div>
        );
    };

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="shimmer h-48 rounded-xl" />)}</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-dark">Gestión de Branding</h2>

            {/* Text settings */}
            <motion.div className="bg-white rounded-xl shadow-lg p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h3 className="font-bold text-gray-dark mb-4">Configuración General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium text-gray-dark">Nombre de la App</label><input value={appName} onChange={e => setAppName(e.target.value)} className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl" /></div>
                    <div><label className="text-sm font-medium text-gray-dark">Tagline</label><input value={tagline} onChange={e => setTagline(e.target.value)} className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl" /></div>
                </div>
                <button onClick={saveText} disabled={saving} className="mt-4 bg-primary text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar'}</button>
            </motion.div>

            {/* Logo uploaders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <LogoUploader label="Logo Principal" field="logo_principal_url" />
                <LogoUploader label="Logo Footer 1" field="logo_footer_1_url" />
                <LogoUploader label="Logo Footer 2" field="logo_footer_2_url" />
            </div>
        </div>
    );
};
