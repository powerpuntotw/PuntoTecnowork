import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertTriangle, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

export const LocalPrices = () => {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allowed, setAllowed] = useState(false);

    const [globalPrices, setGlobalPrices] = useState({});
    const [customPrices, setCustomPrices] = useState({
        a4_eco: '', a4_high: '',
        a3_eco: '', a3_high: '',
        oficio_eco: '', oficio_high: '',
        foto_10x15: '', foto_13x18: '', foto_a4: ''
    });

    useEffect(() => {
        if (profile?.location_id) {
            loadPrices(profile.location_id);
        } else {
            setLoading(false);
        }
    }, [profile]);

    const loadPrices = async (locationId) => {
        try {
            // Get local config
            const { data: locData, error: locError } = await supabase
                .from('printing_locations')
                .select('allow_custom_prices, custom_prices')
                .eq('id', locationId)
                .single();

            if (locError) throw locError;
            setAllowed(locData.allow_custom_prices);

            // Get global prices for fallback/comparison
            const { data: globalData } = await supabase
                .from('app_settings')
                .select('value')
                .eq('id', 'print_prices')
                .single();

            if (globalData?.value) {
                setGlobalPrices(globalData.value);
            }

            if (locData.custom_prices) {
                setCustomPrices({ ...customPrices, ...locData.custom_prices });
            }

        } catch (err) {
            showToast('Error cargando precios: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Clean empty values to fallback to global
            const cleanedPrices = {};
            Object.keys(customPrices).forEach(key => {
                if (customPrices[key] !== '' && customPrices[key] !== null) {
                    cleanedPrices[key] = Number(customPrices[key]);
                }
            });

            // If completely empty, save null to use globals
            const payloadToSave = Object.keys(cleanedPrices).length > 0 ? cleanedPrices : null;

            const { error } = await supabase
                .from('printing_locations')
                .update({ custom_prices: payloadToSave })
                .eq('id', profile.location_id);

            if (error) throw error;

            const overridesCount = Object.keys(cleanedPrices).length;
            const dText = overridesCount > 0
                ? `Local configuró ${overridesCount} precios personalizados: ${Object.entries(cleanedPrices).map(([k, v]) => `${k}=$${v}`).join(', ')}`
                : 'Local restableció sus precios para usar los globales';

            await supabase.from('admin_audit_logs').insert({ admin_id: profile.id, action: 'update_local_prices', target_id: profile.location_id, target_type: 'location_prices', details: { description: dText } });
            showToast('Tus precios se guardaron correctamente', 'success');
        } catch (err) {
            showToast('Error al guardar: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6"><div className="shimmer h-64 rounded-xl" /></div>;

    if (!allowed && !loading) {
        return (
            <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-dark">Precios del Local</h1>
                    <p className="text-gray-medium mt-1">Lista de precios globales proporcionados por el administrador.</p>
                </div>
                <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl flex items-start gap-3 mb-6">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-blue-600" />
                    <p>
                        Tu local actualmente <strong>no tiene habilitados los precios personalizados</strong>. Tus clientes verán estos precios globales al realizar sus pedidos.
                    </p>
                </div>

                <motion.div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100">Hojas A4</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><span className="font-bold text-sm text-gray-dark">Blanco y Negro</span> <span className="font-bold text-primary">${globalPrices.a4_eco || 0}</span></div>
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><span className="font-bold text-sm text-gray-dark">Color</span> <span className="font-bold text-primary">${globalPrices.a4_high || 0}</span></div>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100">Hojas Oficio (Legal)</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><span className="font-bold text-sm text-gray-dark">Blanco y Negro</span> <span className="font-bold text-primary">${globalPrices.oficio_eco || 0}</span></div>
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><span className="font-bold text-sm text-gray-dark">Color</span> <span className="font-bold text-primary">${globalPrices.oficio_high || 0}</span></div>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100">Hojas A3</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><span className="font-bold text-sm text-gray-dark">Blanco y Negro</span> <span className="font-bold text-primary">${globalPrices.a3_eco || 0}</span></div>
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><span className="font-bold text-sm text-gray-dark">Color</span> <span className="font-bold text-primary">${globalPrices.a3_high || 0}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100">Fotografías (FotoYa)</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><span className="font-bold text-sm text-gray-dark">Tamaño 10x15</span> <span className="font-bold text-primary">${globalPrices.foto_10x15 || 0}</span></div>
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><span className="font-bold text-sm text-gray-dark">Tamaño 13x18</span> <span className="font-bold text-primary">${globalPrices.foto_13x18 || 0}</span></div>
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"><span className="font-bold text-sm text-gray-dark">Tamaño A4</span> <span className="font-bold text-primary">${globalPrices.foto_a4 || 0}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    const InputGroup = ({ label, id }) => (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-gray-dark">{label}</label>
            <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-medium font-bold">$</span>
                    <input type="number"
                        value={customPrices[id] || ''}
                        onChange={e => setCustomPrices({ ...customPrices, [id]: e.target.value })}
                        placeholder={`Global: $${globalPrices[id] || 0}`}
                        className={`w-full pl-8 pr-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none font-bold ${customPrices[id] ? 'border-accent/50 bg-accent/5 text-accent' : 'border-gray-200'}`}
                    />
                </div>
                {!customPrices[id] && (
                    <span className="text-xs font-bold text-gray-medium bg-gray-200 px-2 py-1 rounded">Global</span>
                )}
            </div>
        </div>
    );

    return (
        <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-dark">Precios del Local</h1>
                    <p className="text-gray-medium mt-1">Configurá precios específicos para tu sucursal</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="bg-accent text-gray-dark px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition shadow-brand disabled:opacity-50 w-full sm:w-auto">
                    <Save className="w-5 h-5" />
                    {saving ? 'Guardando...' : 'Guardar Precios'}
                </button>
            </div>

            <motion.div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-accent/10 text-accent-800 text-sm font-medium p-4 rounded-xl flex items-start gap-3 mb-8">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-accent" />
                    <p>
                        Dejá el campo <strong>vacío</strong> si querés usar el <strong className="text-accent underline">precio global sugerido</strong>.
                        Los precios que ingreses aquí sobreescribirán los de la plataforma sólo para los clientes que elijan tu local.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100">Hojas A4</h3>
                            <div className="space-y-4">
                                <InputGroup label="Blanco y Negro" id="a4_eco" />
                                <InputGroup label="Color" id="a4_high" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100">Hojas Oficio (Legal)</h3>
                            <div className="space-y-4">
                                <InputGroup label="Blanco y Negro" id="oficio_eco" />
                                <InputGroup label="Color" id="oficio_high" />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100">Hojas A3</h3>
                            <div className="space-y-4">
                                <InputGroup label="Blanco y Negro" id="a3_eco" />
                                <InputGroup label="Color" id="a3_high" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-lg text-gray-dark mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                                Fotografías (FotoYa)
                                <span className="bg-primary/10 text-primary text-[10px] uppercase tracking-wider py-1 px-2 rounded-full">Automático</span>
                            </h3>
                            <div className="space-y-4">
                                <InputGroup label="Tamaño 10x15" id="foto_10x15" />
                                <InputGroup label="Tamaño 13x18" id="foto_13x18" />
                                <InputGroup label="Tamaño A4" id="foto_a4" />
                            </div>
                        </div>

                        <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 mt-8 shadow-sm">
                            <h4 className="font-bold text-gray-dark mb-2 flex items-center gap-2">¿Cómo lo ve el cliente?</h4>
                            <p className="text-sm text-gray-medium mb-3">Si ponés $150 en A4 Estandar, el cliente pagará eso en vez de los ${globalPrices.a4_eco || 120} globales de la red.</p>
                            <div className="flex items-center text-xs font-bold text-accent gap-1">Global <ArrowRight className="w-3 h-3" /> Tu Precio <ArrowRight className="w-3 h-3" /> Cobro Final</div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
