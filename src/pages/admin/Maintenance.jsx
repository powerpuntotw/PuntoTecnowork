import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, TrendingUp, AlertTriangle, Trash2, Database, ShieldCheck, Activity, Search, RefreshCw, ToggleLeft as Toggle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DEFAULT_PRICES = {
    a4_eco: 120, a4_high: 180,
    a3_eco: 200, a3_high: 250,
    oficio_eco: 130, oficio_high: 190,
    foto_10x15: 50, foto_13x18: 80, foto_a4: 250
};

export const AdminMaintenance = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [prices, setPrices] = useState(DEFAULT_PRICES);
    const [inflationPercent, setInflationPercent] = useState('');

    // Maintenance state
    const [maintSettings, setMaintSettings] = useState({ autoCleanup: false, lastCleanup: null });
    const [dbStatus, setDbStatus] = useState('unknown'); // 'unknown', 'checking', 'healthy', 'error'
    const [storageFiles, setStorageFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [fileSearch, setFileSearch] = useState('');
    const [deletingFile, setDeletingFile] = useState(null);

    useEffect(() => {
        loadSettings();
        checkDBHealth();
    }, []);

    const loadSettings = async () => {
        try {
            const [pricesRes, maintRes] = await Promise.all([
                supabase.from('app_settings').select('value').eq('id', 'print_prices').maybeSingle(),
                supabase.from('app_settings').select('value').eq('id', 'maintenance_settings').maybeSingle()
            ]);

            if (pricesRes.data?.value) setPrices(pricesRes.data.value);
            if (maintRes.data?.value) setMaintSettings(maintRes.data.value);

            // If auto-cleanup is enabled, check if 30 days passed
            if (maintRes.data?.value?.autoCleanup && maintRes.data?.value?.lastCleanup) {
                const last = new Date(maintRes.data.value.lastCleanup);
                const now = new Date();
                const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
                if (diffDays >= 30) {
                    showToast('Limpieza de 30 días sugerida. Podés ejecutarla desde la sección de Storage.', 'info');
                }
            }
        } catch (err) {
            showToast('Error cargando configuración: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const checkDBHealth = async () => {
        setDbStatus('checking');
        try {
            // Simple query to check if DB is responsive
            const { error } = await supabase.from('app_settings').select('id').limit(1);
            if (error) throw error;
            setDbStatus('healthy');
        } catch (err) {
            setDbStatus('error');
        }
    };

    const loadStorageFiles = async () => {
        setLoadingFiles(true);
        try {
            // Recursively list all files: bucket structure is user_id/order_id/filename (3 levels)
            const allFiles = [];

            // Level 1: list root folders (user IDs)
            const { data: level1, error: e1 } = await supabase.storage.from('print-files').list('', { limit: 200 });
            if (e1) throw e1;

            for (const folder1 of (level1 || [])) {
                if (folder1.id) {
                    // It's an actual file at root level
                    allFiles.push({ ...folder1, fullPath: folder1.name });
                    continue;
                }
                // folder1 is a folder (id is null) → traverse it (user_id folders)

                // Level 2: list order folders inside each user folder
                const { data: level2 } = await supabase.storage.from('print-files').list(folder1.name, { limit: 200 });
                for (const folder2 of (level2 || [])) {
                    if (folder2.id) {
                        // It's a file directly inside user_id/
                        allFiles.push({
                            ...folder2,
                            fullPath: `${folder1.name}/${folder2.name}`
                        });
                    } else {
                        // It's a subfolder (order_id) → Level 3: list actual files inside
                        const { data: level3 } = await supabase.storage.from('print-files').list(`${folder1.name}/${folder2.name}`, { limit: 200 });
                        for (const file of (level3 || [])) {
                            if (file.id) {
                                allFiles.push({
                                    ...file,
                                    fullPath: `${folder1.name}/${folder2.name}/${file.name}`
                                });
                            }
                        }
                    }
                }
            }

            // Sort by created_at desc
            allFiles.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            setStorageFiles(allFiles);
        } catch (err) {
            showToast('Error cargando archivos: ' + err.message, 'error');
        } finally {
            setLoadingFiles(false);
        }
    };

    const deleteFile = async (file) => {
        if (!confirm(`¿Borrar permanentemente ${file.name}?\nRuta: ${file.fullPath}\n\nEsta acción no se puede deshacer.`)) return;
        setDeletingFile(file.fullPath);
        try {
            const { error } = await supabase.storage.from('print-files').remove([file.fullPath]);
            if (error) throw error;
            showToast('Archivo eliminado', 'success');
            loadStorageFiles();
        } catch (err) {
            showToast('Error al borrar: ' + err.message, 'error');
        } finally {
            setDeletingFile(null);
        }
    };

    const runAutoCleanup = async () => {
        if (!confirm('¿Ejecutar limpieza de archivos mayores a 30 días?')) return;
        setLoading(true);
        try {
            // Since we can't do complex server-side filtering easily here, we'd list and filter
            // This is just a simulation/client-side trigger for now as per instructions
            showToast('Iniciando escaneo de archivos antiguos...', 'info');

            // Update last cleanup date
            const newSettings = { ...maintSettings, lastCleanup: new Date().toISOString() };
            await supabase.from('app_settings').upsert({ id: 'maintenance_settings', value: newSettings });
            setMaintSettings(newSettings);

            showToast('Limpieza completada (simulada). En producción esto requiere un Edge Function para recursividad masiva.', 'success');
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const saveMaintSettings = async (auto) => {
        try {
            const newSettings = { ...maintSettings, autoCleanup: auto };
            const { error } = await supabase.from('app_settings').upsert({ id: 'maintenance_settings', value: newSettings });
            if (error) throw error;
            setMaintSettings(newSettings);
            showToast(`Limpieza automática ${auto ? 'habilitada' : 'deshabilitada'}`, 'success');
        } catch (err) {
            showToast('Error al guardar: ' + err.message, 'error');
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: currentData } = await supabase.from('app_settings').select('value').eq('id', 'print_prices').maybeSingle();
            const oldPrices = currentData?.value || {};

            let changes = [];
            Object.keys(prices).forEach(key => {
                if (prices[key] !== oldPrices[key]) {
                    changes.push(`${key}: $${oldPrices[key] || 0} ➔ $${prices[key]}`);
                }
            });
            const dText = changes.length > 0 ? `Precios base (globales) listos. Cambios: ${changes.join(', ')}` : 'Precios base re-guardados sin alterar valores';

            const { error } = await supabase.from('app_settings').upsert({ id: 'print_prices', value: prices });
            if (error) throw error;
            await supabase.from('admin_audit_logs').insert({ admin_id: user.id, action: 'update_global_prices', target_id: null, target_type: 'app_settings', details: { description: dText } });
            showToast('Precios globales actualizados', 'success');
        } catch (err) {
            showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const applyInflation = () => {
        const percent = parseFloat(inflationPercent);
        if (isNaN(percent) || percent <= 0) {
            showToast('Ingresá un porcentaje válido', 'error');
            return;
        }
        if (!confirm(`¿Aplicar un aumento del ${percent}% a todos los precios globales?`)) return;

        const multiplier = 1 + (percent / 100);
        const newPrices = { ...prices };
        Object.keys(newPrices).forEach(key => {
            // Round to nearest 10
            newPrices[key] = Math.round((newPrices[key] * multiplier) / 10) * 10;
        });
        setPrices(newPrices);
        setInflationPercent('');
        showToast('Nuevos precios calculados. Recordá guardar los cambios.', 'info');
    };

    if (loading) return <div className="p-6"><div className="shimmer h-64 rounded-xl" /></div>;

    const InputGroup = ({ label, id }) => (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-dark">{label}</label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-medium font-bold">$</span>
                <input type="number" value={prices[id] || ''} onChange={e => setPrices({ ...prices, [id]: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold" />
            </div>
        </div>
    );

    return (
        <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-dark">Mantenimiento Global</h1>
                    <p className="text-gray-medium mt-1">Configuración general de la plataforma</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition shadow-brand disabled:opacity-50">
                    <Save className="w-5 h-5" />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Precios Base */}
                <div className="md:col-span-2 space-y-6">
                    <motion.div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg"><Settings className="w-5 h-5 text-primary" /></div>
                            <h2 className="text-lg font-bold text-gray-dark">Precios Globales de Impresión</h2>
                        </div>

                        <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg flex items-start gap-2 mb-6">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <p>Estos precios aplican a todos los locales que <strong>no</strong> tengan habilitado "Precios Personalizados".</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-gray-dark mb-3 border-b pb-2">Hojas A4</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Blanco y Negro" id="a4_eco" />
                                    <InputGroup label="Color" id="a4_high" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-dark mb-3 border-b pb-2">Hojas A3</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Blanco y Negro" id="a3_eco" />
                                    <InputGroup label="Color" id="a3_high" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-dark mb-3 border-b pb-2">Hojas Oficio (Legal)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Blanco y Negro" id="oficio_eco" />
                                    <InputGroup label="Color" id="oficio_high" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-dark mb-3 border-b pb-2">Fotografías (FotoYa)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <InputGroup label="Tamaño 10x15" id="foto_10x15" />
                                    <InputGroup label="Tamaño 13x18" id="foto_13x18" />
                                    <InputGroup label="Tamaño A4" id="foto_a4" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Utilidades */}
                <div className="space-y-6">
                    {/* Inflación */}
                    <motion.div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-accent/10 rounded-lg"><TrendingUp className="w-5 h-5 text-accent" /></div>
                            <h2 className="text-lg font-bold text-gray-dark">Ajuste por Inflación</h2>
                        </div>
                        <p className="text-sm text-gray-medium mb-4">
                            Aplicá un porcentaje de aumento a todos los precios globales.
                        </p>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input type="number" placeholder="Ej: 15" value={inflationPercent} onChange={e => setInflationPercent(e.target.value)}
                                    className="w-full pl-4 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none font-bold" />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-medium font-bold">%</span>
                            </div>
                            <button onClick={applyInflation} disabled={!inflationPercent} className="bg-accent text-gray-dark px-4 py-3 rounded-xl font-bold hover:bg-accent/90 transition disabled:opacity-50">
                                Aplicar
                            </button>
                        </div>
                    </motion.div>

                    {/* Salud DB */}
                    <motion.div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg"><Database className="w-5 h-5 text-blue-600" /></div>
                            <h2 className="text-lg font-bold text-gray-dark">Bases de Datos</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium">Estado conexión</span>
                                </div>
                                {dbStatus === 'checking' ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> :
                                    dbStatus === 'healthy' ? <span className="text-xs font-bold text-success flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Optimo</span> :
                                        <span className="text-xs font-bold text-secondary">Error</span>}
                            </div>
                            <button onClick={checkDBHealth} className="w-full py-2.5 text-xs font-bold text-primary border border-primary/20 hover:bg-primary/5 rounded-lg transition">
                                Re-verificar Salud
                            </button>
                        </div>
                    </motion.div>

                    {/* Limpieza de Storage */}
                    <motion.div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg"><Trash2 className="w-5 h-5 text-orange-600" /></div>
                            <h2 className="text-lg font-bold text-gray-dark">Limpieza (Bucket)</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Auto-limpieza (30d)</span>
                                <button onClick={() => saveMaintSettings(!maintSettings.autoCleanup)} className={`transition-colors ${maintSettings.autoCleanup ? 'text-primary' : 'text-gray-300'}`}>
                                    <Toggle className={`w-10 h-10 ${maintSettings.autoCleanup ? '' : 'rotate-180'}`} />
                                </button>
                            </div>
                            <button onClick={runAutoCleanup} className="w-full py-2.5 bg-orange-50 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-100 transition">
                                Ejecutar Limpieza Manual
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Borrado Quirúrgico */}
                <div className="md:col-span-3">
                    <motion.div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg"><Search className="w-5 h-5 text-primary" /></div>
                                <h2 className="text-lg font-bold text-gray-dark">Borrado Quirúrgico (print-files)</h2>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Buscar archivos..." value={fileSearch} onChange={e => setFileSearch(e.target.value)}
                                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary w-full md:w-64" />
                                <button onClick={loadStorageFiles} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                                    <RefreshCw className={`w-5 h-5 text-gray-medium ${loadingFiles ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {storageFiles.length === 0 ? (
                                <div className="p-12 text-center text-gray-medium">
                                    <p>Hacé clic en el botón de actualizar para listar archivos</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-dark font-bold sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3">Nombre / Ruta</th>
                                            <th className="px-6 py-3">Tamaño</th>
                                            <th className="px-6 py-3">Creado</th>
                                            <th className="px-6 py-3 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {storageFiles.filter(f => (f.fullPath || f.name).toLowerCase().includes(fileSearch.toLowerCase())).map(file => (
                                            <tr key={file.id || file.fullPath} className="hover:bg-gray-50 group">
                                                <td className="px-6 py-4 font-medium text-gray-dark truncate max-w-xs" title={file.fullPath}>{file.name}</td>
                                                <td className="px-6 py-4 text-gray-medium">{file.metadata?.size ? (file.metadata.size / 1024 / 1024).toFixed(2) + ' MB' : '—'}</td>
                                                <td className="px-6 py-4 text-gray-medium">{file.created_at ? format(new Date(file.created_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '—'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => deleteFile(file)} disabled={deletingFile === file.fullPath} className="p-2 text-secondary hover:bg-secondary/10 rounded-lg transition">
                                                        {deletingFile === file.fullPath ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                </div>

            </div>
        </div>
    );
};
