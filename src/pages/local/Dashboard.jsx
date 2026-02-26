import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, DollarSign, Clock, CheckCircle, TrendingUp, Printer, CalendarDays, Power, Wifi } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';

export const LocalDashboard = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ today: 0, revenue: 0, pending: 0, printing: 0, ready: 0, completed: 0, weekRevenue: 0, pointsAwardedToday: 0, pointsAwardedTotal: 0 });
    const [isOpen, setIsOpen] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        if (!profile?.location_id) return;

        const fetchInitData = async () => {
            try {
                // Fetch location status
                const { data: locData } = await supabase
                    .from('printing_locations')
                    .select('is_open')
                    .eq('id', profile.location_id)
                    .single();
                if (locData) {
                    setIsOpen(locData.is_open !== false); // Default to true if null
                }

                // Fetch stats — include points_earned in select
                const { data } = await supabase.from('print_orders')
                    .select('id, order_number, status, total_amount, points_earned, created_at, profiles!print_orders_customer_id_fkey(full_name)')
                    .eq('location_id', profile.location_id)
                    .order('created_at', { ascending: false });
                const allOrders = data || [];
                setOrders(allOrders);

                const today = new Date().toISOString().split('T')[0];
                const todayOrders = allOrders.filter(o => o.created_at.startsWith(today));
                const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
                const weekOrders = allOrders.filter(o => o.created_at >= weekAgo);
                const deliveredOrders = allOrders.filter(o => o.status === 'entregado');
                const deliveredToday = todayOrders.filter(o => o.status === 'entregado');

                setStats({
                    today: todayOrders.length,
                    revenue: todayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
                    pending: allOrders.filter(o => o.status === 'pendiente').length,
                    printing: allOrders.filter(o => o.status === 'en_proceso').length,
                    ready: allOrders.filter(o => o.status === 'listo').length,
                    completed: deliveredOrders.length,
                    weekRevenue: weekOrders.reduce((s, o) => s + Number(o.total_amount), 0),
                    pointsAwardedToday: deliveredToday.reduce((s, o) => s + Number(o.points_earned || 0), 0),
                    pointsAwardedTotal: deliveredOrders.reduce((s, o) => s + Number(o.points_earned || 0), 0),
                });
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitData();

        // Heartbeat interval to update last_active_at every 3 minutes
        const sendHeartbeat = async () => {
            await supabase.from('printing_locations')
                .update({ last_active_at: new Date().toISOString() })
                .eq('id', profile.location_id);
        };
        const intervalId = setInterval(sendHeartbeat, 3 * 60 * 1000);
        sendHeartbeat(); // initial ping

        return () => clearInterval(intervalId);

    }, [profile?.location_id]);

    const toggleOpenStatus = async () => {
        if (!profile?.location_id) return;
        setUpdatingStatus(true);
        const newStatus = !isOpen;
        try {
            const { error } = await supabase
                .from('printing_locations')
                .update({ is_open: newStatus })
                .eq('id', profile.location_id);
            if (error) throw error;
            setIsOpen(newStatus);
            showToast(`Local marcado como ${newStatus ? 'ABIERTO' : 'CERRADO'}`, 'success');
        } catch (err) {
            showToast('Error al actualizar estado: ' + err.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    if (loading) return <div className="p-6 space-y-4">{[1, 2, 3].map(i => <div key={i} className="shimmer h-28 rounded-xl" />)}</div>;

    const recentOrders = orders.slice(0, 8);
    const actionNeeded = orders.filter(o => o.status === 'pendiente' || o.status === 'en_proceso');

    return (
        <div className="p-4 lg:p-6 space-y-6">
            {/* Status Control */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-5 sm:p-6 shadow-sm border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${isOpen ? 'bg-gradient-to-r from-success/10 to-transparent border-success/20' : 'bg-gradient-to-r from-red-50 to-transparent border-red-200'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${isOpen ? 'bg-success text-white' : 'bg-red-500 text-white'}`}>
                        {isOpen ? <Wifi className="w-6 h-6 animate-pulse" /> : <Power className="w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-dark">
                            Estado: <span className={isOpen ? 'text-success' : 'text-red-500'}>{isOpen ? 'ABIERTO' : 'CERRADO'}</span>
                        </h2>
                        <p className="text-sm text-gray-medium">
                            {isOpen ? 'Los clientes pueden ver el local como disponible.' : 'El local aparece cerrado para los clientes.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggleOpenStatus}
                    disabled={updatingStatus}
                    className={`px-6 py-3 rounded-xl font-bold shadow-sm transition-all text-white w-full sm:w-auto disabled:opacity-50
                        ${isOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-success hover:bg-success/90'}`}
                >
                    {updatingStatus ? 'Actualizando...' : (isOpen ? 'Marcar como CERRADO' : 'Marcar como ABIERTO')}
                </button>
            </motion.div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Órdenes hoy', value: stats.today, icon: Package, color: 'from-secondary to-cyan-400' },
                    { label: 'Pts hoy / total', value: `+${stats.pointsAwardedToday}`, subtitle: `${stats.pointsAwardedTotal} pts histórico`, icon: TrendingUp, color: 'from-accent to-amber-500' },
                    { label: 'Ingresos hoy', value: `$${stats.revenue}`, icon: DollarSign, color: 'from-success to-green-400' },
                    { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'from-gray-500 to-gray-700', alert: stats.pending > 0 },
                    { label: 'Imprimiendo', value: stats.printing, icon: Printer, color: 'from-primary to-red-400', alert: stats.printing > 0 },
                ].map((stat, i) => (
                    <motion.div key={i} className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 text-white shadow-lg relative overflow-hidden`}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        {stat.alert && <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-ping" />}
                        <stat.icon className="w-6 h-6 mb-2 opacity-80" />
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs opacity-80">{stat.label}</p>
                        {stat.subtitle && <p className="text-[10px] opacity-60 mt-0.5">{stat.subtitle}</p>}
                    </motion.div>
                ))}
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Listas para retirar', value: stats.ready, icon: CheckCircle, bg: 'bg-success/10 text-success' },
                    { label: 'Entregadas (total)', value: stats.completed, icon: Package, bg: 'bg-green-100 text-green-700' },
                    { label: 'Ingresos 7 días', value: `$${stats.weekRevenue}`, icon: TrendingUp, bg: 'bg-secondary/10 text-secondary' },
                ].map((stat, i) => (
                    <div key={i} className={`${stat.bg} rounded-xl p-4 flex items-center gap-3`}>
                        <stat.icon className="w-8 h-8 opacity-70" />
                        <div>
                            <p className="text-xl font-bold">{stat.value}</p>
                            <p className="text-[10px] opacity-70">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action needed alert */}
            {actionNeeded.length > 0 && (
                <motion.div className="bg-primary/10 border-l-4 border-primary rounded-xl p-4 cursor-pointer hover:bg-primary/15 transition-colors"
                    onClick={() => navigate('/local/orders')}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-primary text-sm flex items-center gap-2">
                                <Printer className="w-4 h-4 animate-pulse" /> {actionNeeded.length} órdenes requieren atención
                            </h3>
                            <p className="text-xs text-gray-medium mt-1">
                                {stats.pending > 0 && `${stats.pending} pendientes`}
                                {stats.pending > 0 && stats.printing > 0 && ' • '}
                                {stats.printing > 0 && `${stats.printing} imprimiendo`}
                            </p>
                        </div>
                        <span className="text-primary text-sm font-bold">Ir a Órdenes →</span>
                    </div>
                </motion.div>
            )}

            {/* Recent orders */}
            <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-dark flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> Actividad Reciente
                    </h3>
                    <button onClick={() => navigate('/local/orders')} className="text-secondary text-xs font-medium hover:underline">Ver todas →</button>
                </div>
                <div className="space-y-2">
                    {recentOrders.map(order => {
                        const statusConfig = {
                            pendiente: { label: 'Pendiente', bg: 'bg-amber-100 text-amber-700' },
                            en_proceso: { label: 'Imprimiendo', bg: 'bg-blue-100 text-blue-700' },
                            listo: { label: 'Listo', bg: 'bg-green-100 text-green-700' },
                            entregado: { label: 'Entregado', bg: 'bg-gray-100 text-gray-500' },
                        };
                        const sc = statusConfig[order.status] || statusConfig.pendiente;
                        return (
                            <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-xs text-primary">{order.order_number}</span>
                                    <span className="text-xs text-gray-dark">{order.profiles?.full_name || 'Cliente'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-gray-dark">${order.total_amount}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sc.bg}`}>{sc.label}</span>
                                    <span className="text-[10px] text-gray-medium">{format(new Date(order.created_at), 'dd/MM HH:mm')}</span>
                                </div>
                            </div>
                        );
                    })}
                    {recentOrders.length === 0 && <p className="text-gray-medium text-sm text-center py-4">Sin órdenes recientes</p>}
                </div>
            </div>
        </div>
    );
};
