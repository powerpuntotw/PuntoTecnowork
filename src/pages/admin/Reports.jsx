import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Download, Calendar, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#EB1C24', '#FFC905', '#A4CC39', '#0093D8', '#6B7280'];
const STATUS_LABELS = { pendiente: 'Pendiente', en_proceso: 'En Proceso', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' };

export const AdminReports = () => {
    const [orders, setOrders] = useState([]);
    const [locations, setLocations] = useState([]);
    const [ordersByStatus, setOrdersByStatus] = useState([]);
    const [revenueByLocation, setRevenueByLocation] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [locationFilter, setLocationFilter] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            let query = supabase.from('print_orders')
                .select('id, status, total_amount, location_id, created_at')
                .gte('created_at', startOfDay(new Date(dateFrom + 'T00:00:00')).toISOString())
                .lte('created_at', endOfDay(new Date(dateTo + 'T00:00:00')).toISOString());
            if (locationFilter) query = query.eq('location_id', locationFilter);

            const [ordersRes, locsRes] = await Promise.all([
                query,
                supabase.from('printing_locations').select('id, name'),
            ]);

            if (ordersRes.error) console.error('Orders query error:', ordersRes.error);
            if (locsRes.error) console.error('Locations query error:', locsRes.error);

            const data = ordersRes.data || [];
            const locs = locsRes.data || [];
            setOrders(data);
            setLocations(locs);

            // Build location name map
            const locMap = locs.reduce((m, l) => { m[l.id] = l.name; return m; }, {});

            // Orders by status
            const statusCount = data.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
            setOrdersByStatus(Object.entries(statusCount).map(([name, value]) => ({ name: STATUS_LABELS[name] || name, value })));

            // Revenue by location
            const revByLoc = data.reduce((acc, o) => {
                const locName = locMap[o.location_id] || 'Sin asignar';
                acc[locName] = (acc[locName] || 0) + Number(o.total_amount);
                return acc;
            }, {});
            setRevenueByLocation(Object.entries(revByLoc).map(([name, total]) => ({ name, total: Math.round(total) })));

            // Timeline (group by day)
            const byDay = data.reduce((acc, o) => {
                const day = format(new Date(o.created_at), 'dd/MM');
                if (!acc[day]) acc[day] = { day, orders: 0, revenue: 0 };
                acc[day].orders++;
                acc[day].revenue += Number(o.total_amount);
                return acc;
            }, {});
            setTimeline(Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day)));
        } catch (err) {
            console.error('Reports fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [dateFrom, dateTo, locationFilter]);

    // CSV Export
    const exportCSV = () => {
        const header = 'Estado,Monto Total,Local,Fecha\n';
        const rows = orders.map(o =>
            `${o.status},${o.total_amount},${o.printing_locations?.name || 'N/A'},${format(new Date(o.created_at), 'yyyy-MM-dd HH:mm')}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reporte_${dateFrom}_${dateTo}.csv`;
        link.click();
    };

    // Summary stats
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    if (loading) return <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="shimmer h-48 rounded-xl" />)}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-dark">Reportes y Estadísticas</h2>
                <button onClick={exportCSV} className="bg-success text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 text-sm hover:bg-success/90 transition">
                    <Download className="w-4 h-4" />Exportar CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                    <label className="text-xs font-medium text-gray-dark mb-1 block">Desde</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                    <label className="text-xs font-medium text-gray-dark mb-1 block">Hasta</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                    <label className="text-xs font-medium text-gray-dark mb-1 block">Local</label>
                    <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">Todos</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{totalOrders}</p>
                    <p className="text-xs text-gray-medium">Órdenes</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4 text-center">
                    <p className="text-2xl font-bold text-success">${totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-medium">Ingresos</p>
                </div>
                <div className="bg-white rounded-xl shadow p-4 text-center">
                    <p className="text-2xl font-bold text-secondary">${avgOrderValue}</p>
                    <p className="text-xs text-gray-medium">Promedio</p>
                </div>
            </div>

            {/* Timeline Chart */}
            {timeline.length > 1 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-bold text-gray-dark mb-4">Evolución diaria</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={timeline}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="orders" name="Órdenes" stroke="#0093D8" strokeWidth={2} dot={{ r: 3 }} />
                            <Line yAxisId="right" type="monotone" dataKey="revenue" name="Ingresos ($)" stroke="#EB1C24" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-bold text-gray-dark mb-4">Órdenes por Estado</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart><Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                            {ordersByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="font-bold text-gray-dark mb-4">Ingresos por Local</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueByLocation}>
                            <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis /><Tooltip formatter={(v) => `$${v}`} />
                            <Bar dataKey="total" fill="#EB1C24" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
