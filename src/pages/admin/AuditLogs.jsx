import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_COLORS = {
    delete_user: 'bg-primary/10 text-primary',
    update_role: 'bg-secondary/10 text-secondary',
    create_reward: 'bg-success/10 text-success',
    update_reward: 'bg-accent/10 text-accent',
    delete_reward: 'bg-primary/10 text-primary',
    create_location: 'bg-success/10 text-success',
    update_location: 'bg-secondary/10 text-secondary',
    update_profile: 'bg-primary/10 text-primary',
};

export const AdminAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [total, setTotal] = useState(0);
    const PAGE_SIZE = 25;

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const { data, count } = await supabase
                    .from('admin_audit_logs')
                    .select('*, profiles!admin_audit_logs_admin_id_fkey(full_name, email)', { count: 'exact' })
                    .order('created_at', { ascending: false })
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
                setLogs(data || []);
                setTotal(count || 0);
            } catch (err) {
                console.error('AuditLogs fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [page]);

    if (loading) return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="shimmer h-14 rounded-xl" />)}</div>;

    return (
        <div>
            <div className="bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl px-6 py-4 mb-6 flex items-center gap-3">
                <Shield className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Registro de Auditoría</h2>
            </div>

            {logs.length === 0 ? (
                <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-gray-medium mx-auto mb-3 opacity-30" />
                    <p className="text-gray-medium">Sin registros de auditoría</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {logs.map((log, i) => (
                            <motion.div key={log.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap mt-0.5 ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-medium'}`}>
                                    {log.action?.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-dark">
                                        <span className="font-medium">{log.profiles?.full_name || log.profiles?.email || 'Admin'}</span>
                                        {log.details?.description && <span className="text-gray-medium"> — {log.details.description}</span>}
                                    </p>
                                    {log.target_type && (
                                        <p className="text-[11px] text-gray-medium mt-0.5">
                                            Recurso: {log.target_type} {log.target_id ? `(${log.target_id.slice(0, 8)}...)` : ''}
                                        </p>
                                    )}
                                </div>
                                <span className="text-[10px] text-gray-medium whitespace-nowrap">
                                    {format(new Date(log.created_at), "d MMM HH:mm", { locale: es })}
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {total > PAGE_SIZE && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                            <span className="text-xs text-gray-medium">{page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} de {total}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                    className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-30 flex items-center gap-1">
                                    <ChevronLeft className="w-4 h-4" />Ant.
                                </button>
                                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
                                    className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-30 flex items-center gap-1">
                                    Sig.<ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
