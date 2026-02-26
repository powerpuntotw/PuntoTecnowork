import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, Eye, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_COLORS = { pendiente: '#FFC905', en_proceso: '#0093D8', listo: '#A4CC39', entregado: '#2D7A2D', cancelado: '#EB1C24' };
const STATUS_LABELS = { pendiente: 'Pendiente', en_proceso: 'En Proceso', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado' };

export const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                let query = supabase.from('print_orders').select('*, profiles!print_orders_customer_id_fkey(full_name, email), printing_locations!print_orders_location_id_fkey(name)').order('created_at', { ascending: false });
                if (filter) query = query.eq('status', filter);
                const { data } = await query;
                setOrders(data || []);
            } catch (err) {
                console.error('Orders fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [filter]);

    const filtered = search ? orders.filter(o => o.order_number.toLowerCase().includes(search.toLowerCase()) || o.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())) : orders;

    return (
        <div>
            <h2 className="text-xl font-bold text-gray-dark mb-6">Todas las Órdenes</h2>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative"><Search className="absolute left-3 top-3 w-5 h-5 text-gray-medium" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar orden o cliente..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl" /></div>
                <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-3 border border-gray-200 rounded-xl">
                    <option value="">Todos los estados</option>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]"><thead className="bg-gray-50"><tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase">Orden</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase">Local</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase">Total</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-dark uppercase">Fecha</th>
                    </tr></thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(o => (
                                <tr key={o.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-bold text-primary text-sm">{o.order_number}</td>
                                    <td className="px-4 py-3 text-sm">{o.profiles?.full_name || 'N/A'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-medium">{o.printing_locations?.name || 'N/A'}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs text-white font-medium" style={{ backgroundColor: STATUS_COLORS[o.status] }}>{STATUS_LABELS[o.status]}</span></td>
                                    <td className="px-4 py-3 font-bold text-sm">${o.total_amount}</td>
                                    <td className="px-4 py-3 text-xs text-gray-medium">{format(new Date(o.created_at), "dd/MM/yyyy HH:mm")}</td>
                                </tr>
                            ))}
                        </tbody></table>
                </div>
                {filtered.length === 0 && <p className="text-gray-medium text-center py-8">Sin órdenes</p>}
            </div>
        </div>
    );
};
