import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Users, MapPin, DollarSign, TrendingUp, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const TIER_COLORS = { bronze: '#6B7280', silver: '#9CA3AF', gold: '#FFC905', diamond: '#0093D8' };

export const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, orders: 0, locations: 0, revenue: 0 });
    const [tierData, setTierData] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [usersRes, ordersRes, locsRes, pointsRes] = await Promise.all([
                    supabase.from('profiles').select('id', { count: 'exact', head: true }),
                    supabase.from('print_orders').select('*').order('created_at', { ascending: false }).limit(10),
                    supabase.from('printing_locations').select('id, name, is_open, last_active_at, status'),
                    supabase.from('points_accounts').select('tier_level, lifetime_points'),
                ]);
                const allOrders = ordersRes.data || [];
                const allLocs = locsRes.data || [];
                const activeLocs = allLocs.filter(l => l.status === 'activo');
                const revenue = allOrders.reduce((s, o) => s + Number(o.total_amount), 0);
                const totalPoints = (pointsRes.data || []).reduce((s, p) => s + Number(p.lifetime_points || 0), 0);

                setStats({
                    users: usersRes.count || 0,
                    orders: allOrders.length,
                    locations: activeLocs.length,
                    revenue,
                    totalPoints,
                    locationDetails: activeLocs
                });
                setRecentOrders(allOrders);

                // Tier distribution
                const tiers = (pointsRes.data || []).reduce((acc, p) => {
                    acc[p.tier_level] = (acc[p.tier_level] || 0) + 1;
                    return acc;
                }, {});
                setTierData(Object.entries(tiers).map(([tier, value]) => ({ name: tier, value })));
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const STATUS_COLORS = { pendiente: '#FFC905', en_proceso: '#0093D8', listo: '#A4CC39', entregado: '#2D7A2D', cancelado: '#EB1C24' };

    const kpis = [
        { label: 'Usuarios', value: stats.users, icon: Users, gradient: 'from-secondary to-cyan-400' },
        { label: 'Órdenes', value: stats.orders, icon: Package, gradient: 'from-primary to-orange-400' },
        { label: 'Puntos Emitidos', value: `✦ ${stats.totalPoints}`, icon: Star, gradient: 'from-accent to-yellow-500' },
        { label: 'Locales', value: stats.locations, icon: MapPin, gradient: 'from-success to-green-400' },
        { label: 'Ingresos', value: `$${stats.revenue}`, icon: DollarSign, gradient: 'from-gray-700 to-gray-900' },
    ];

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="shimmer h-28 rounded-xl" />)}</div>;

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {kpis.map((kpi, i) => (
                    <motion.div key={i} className={`bg-gradient-to-br ${kpi.gradient} rounded-xl p-6 text-white shadow-lg`}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.02 }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-80">{kpi.label}</p>
                                <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                <kpi.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tier Distribution */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-bold text-gray-dark mb-4">Distribución por Nivel</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={tierData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {tierData.map((entry, i) => <Cell key={i} fill={TIER_COLORS[entry.name] || '#6B7280'} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Recent Orders */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-bold text-gray-dark mb-4">Órdenes Recientes</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                        {recentOrders.map(order => (
                            <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div>
                                    <p className="font-bold text-sm text-primary">{order.order_number}</p>
                                    <p className="text-xs text-gray-medium">${order.total_amount}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium text-white`}
                                    style={{ backgroundColor: STATUS_COLORS[order.status] }}>
                                    {order.status.replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Location Status Network */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-dark flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-success" /> Red Operativa (Tiempo Real)
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {(stats.locationDetails || []).map(loc => {
                            const isOnline = loc.last_active_at && (new Date() - new Date(loc.last_active_at)) < (5 * 60 * 1000);
                            const actuallyOpen = loc.is_open && isOnline;

                            return (
                                <div key={loc.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between">
                                    <span className="font-bold text-sm text-gray-dark truncate mr-3">{loc.name}</span>
                                    <div className="flex gap-2 shrink-0">
                                        <div className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold ${isOnline ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-blue-600 animate-pulse' : 'bg-gray-400'}`} />
                                            {isOnline ? 'Online' : 'Offline'}
                                        </div>
                                        <div className={`text-[10px] px-2 py-1 rounded-full font-bold ${loc.is_open ? 'bg-success/20 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                            {loc.is_open ? 'Abierto' : 'Cerrado'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
