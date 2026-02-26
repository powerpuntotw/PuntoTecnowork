import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, LifeBuoy, AlertCircle, CheckCircle2, Clock, X, ChevronRight, Send, ArrowLeft, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const SYSTEM_CATEGORIES = [
    'Falta de Insumos (Papel/Tóner)',
    'Falla de Impresora o Hardware',
    'Error en la Plataforma',
    'Consulta Administrativa',
    'Otro'
];

export const LocalSupport = () => {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ category: SYSTEM_CATEGORIES[0], description: '' });

    // Chat state
    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const [unreadTicketIds, setUnreadTicketIds] = useState(new Set());

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTickets = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('support_tickets')
            .select('*, creator:profiles(full_name, user_type)')
            .eq('location_id', profile.location_id)
            .eq('ticket_type', 'system_report')
            .order('created_at', { ascending: false });

        setTickets(data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (profile?.location_id) fetchTickets();
    }, [profile?.location_id]);

    // === Realtime: detect new tickets and new messages for this location ===
    useEffect(() => {
        if (!profile?.location_id) return;

        // New ticket created by admin for this location
        const ticketChannel = supabase
            .channel(`local-support-tickets-${Date.now()}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'support_tickets',
                filter: `location_id=eq.${profile.location_id}`
            }, (payload) => {
                if (payload.new.creator_id !== profile.id) {
                    // It's a ticket from admin
                    fetchTickets();
                    setUnreadTicketIds(prev => new Set([...prev, payload.new.id]));
                    showToast('💬 Soporte: el administrador inició un nuevo chat', 'info');
                }
            })
            .subscribe();

        return () => supabase.removeChannel(ticketChannel);
    }, [profile?.location_id]);

    // Realtime on messages for ALL open tickets of this location
    useEffect(() => {
        if (!profile?.location_id || !tickets.length) return;

        const openIds = tickets.filter(t => t.status === 'open').map(t => t.id);
        if (!openIds.length) return;

        // Supabase Realtime only supports one filter value, so subscribe per ticket.
        // Re-subscribe whenever ticket list changes.
        const channels = openIds.map(ticketId => {
            return supabase
                .channel(`local-msgs-${ticketId}-${Date.now()}`)
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'ticket_messages',
                    filter: `ticket_id=eq.${ticketId}`
                }, (payload) => {
                    if (payload.new.sender_id !== profile.id) {
                        // Message from admin in a background ticket
                        if (!activeTicket || activeTicket.id !== ticketId) {
                            setUnreadTicketIds(prev => new Set([...prev, ticketId]));
                            showToast('💬 Soporte: nuevo mensaje del administrador', 'info');
                        }
                    }
                })
                .subscribe();
        });

        return () => channels.forEach(ch => supabase.removeChannel(ch));
    }, [tickets, profile?.location_id, activeTicket]);

    useEffect(() => {
        if (!activeTicket) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('ticket_messages')
                .select('*, sender:profiles(full_name, user_type)')
                .eq('ticket_id', activeTicket.id)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setMessages(data);
                setTimeout(scrollToBottom, 100);
            }
        };

        fetchMessages();

        const subscription = supabase
            .channel(`ticket_${activeTicket.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${activeTicket.id}` }, payload => {
                fetchMessages(); // Re-fetch to get relations
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, [activeTicket]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.description.trim()) return showToast('Agregá una breve descripción del problema', 'error');

        setSubmitting(true);
        try {
            const { error } = await supabase.from('support_tickets').insert({
                location_id: profile.location_id,
                creator_id: profile.id,
                ticket_type: 'system_report',
                category: form.category,
                description: form.description.trim()
            });

            if (error) throw error;
            showToast('Reporte enviado correctamente. El administrador lo revisará pronto.', 'success');
            setForm({ category: SYSTEM_CATEGORIES[0], description: '' });
            setShowForm(false);
            fetchTickets();
        } catch (err) {
            showToast('Error al enviar reporte: ' + err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const { error } = await supabase.from('ticket_messages').insert({
                ticket_id: activeTicket.id,
                sender_id: profile.id,
                message: newMessage.trim()
            });

            if (error) throw error;

            // Notify admins
            const { data: admins } = await supabase.from('profiles').select('id').eq('user_type', 'admin');
            if (admins) {
                await supabase.from('notifications').insert(
                    admins.map(a => ({
                        user_id: a.id,
                        type: 'new_support_message',
                        title: '💬 Respuesta de Local',
                        message: `Nuevo mensaje en "${activeTicket.category}" del local.`,
                        link: '/admin/support'
                    }))
                );
            }
            setNewMessage('');
        } catch (err) {
            showToast('Error al enviar mensaje: ' + err.message, 'error');
        } finally {
            setSending(false);
        }
    };

    const handleResolve = async (ticketId, e) => {
        if (e) e.stopPropagation();
        if (!confirm('¿Marcar este problema como resuelto?')) return;
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString()
                })
                .eq('id', ticketId);

            if (error) throw error;

            // Notify ALL admins that the local resolved the ticket
            const { data: admins } = await supabase.from('profiles').select('id').eq('user_type', 'admin');
            if (admins?.length) {
                await supabase.from('notifications').insert(
                    admins.map(admin => ({
                        user_id: admin.id,
                        type: 'ticket_resolved',
                        title: '✅ Ticket Cerrado por Local',
                        message: `El local cerró el chat "${activeTicket.category}". Podés revisarlo en Soporte.`,
                        link: '/admin/support'
                    }))
                );
            }

            showToast('Reporte marcado como resuelto', 'success');
            fetchTickets();
            if (activeTicket?.id === ticketId) {
                setActiveTicket({ ...activeTicket, status: 'resolved' });
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'open': return { color: 'bg-primary/10 text-primary', icon: AlertCircle, label: 'Abierto' };
            case 'resolved': return { color: 'bg-success/10 text-success', icon: CheckCircle2, label: 'Resuelto' };
            case 'closed': return { color: 'bg-gray-200 text-gray-medium', icon: X, label: 'Cerrado' };
            default: return { color: 'bg-gray-100 text-gray-medium', icon: Clock, label: status };
        }
    };

    if (loading && !tickets.length) return <div className="p-6"><div className="shimmer h-64 rounded-xl" /></div>;

    // --- Thread View ---
    if (activeTicket) {
        return (
            <div className="h-[calc(100vh-140px)] p-4 flex flex-col max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-t-2xl border-b border-gray-100 p-4 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveTicket(null)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-medium transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700`}>
                                    Soporte de Sistema
                                </span>
                                <h2 className="font-bold text-gray-dark text-lg">{activeTicket.category}</h2>
                            </div>
                        </div>
                    </div>
                    {activeTicket.status === 'open' ? (
                        <button onClick={(e) => handleResolve(activeTicket.id, e)} className="px-4 py-2 bg-success text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-success/90 transition shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> Marcar Resuelto
                        </button>
                    ) : (
                        <span className="px-3 py-1 bg-success/10 text-success text-sm font-bold rounded-lg flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Resuelto
                        </span>
                    )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 bg-gray-50 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Original Description */}
                    {(() => {
                        const isCreatorMe = activeTicket.creator_id === profile.id;
                        const isAdmin = activeTicket.creator?.user_type === 'admin';
                        return (
                            <div className={`flex gap-4 max-w-2xl ${isCreatorMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCreatorMe ? 'bg-primary/10' : 'bg-blue-100'}`}>
                                    {isCreatorMe ? <User className="w-4 h-4 text-primary" /> : <div className="text-xs font-bold text-blue-700">A</div>}
                                </div>
                                <div className={`${isCreatorMe ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'} border rounded-2xl p-4 shadow-sm w-full`}>
                                    <div className={`flex justify-between items-start mb-2 ${isCreatorMe ? 'flex-row-reverse' : ''}`}>
                                        <span className={`font-bold text-sm ${isCreatorMe ? 'text-gray-dark' : 'text-blue-900'}`}>
                                            {isCreatorMe ? 'Vos' : activeTicket.creator?.full_name}
                                            {isCreatorMe ? <span className="text-gray-medium font-normal"> (Local)</span> : <span className="text-blue-500 font-normal"> (Soporte)</span>}
                                        </span>
                                        <span className="text-xs text-gray-medium">{format(new Date(activeTicket.created_at), "HH:mm, d MMM yyyy", { locale: es })}</span>
                                    </div>
                                    <p className={`${isCreatorMe ? 'text-gray-dark text-right' : 'text-blue-900'}`}>{activeTicket.description}</p>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Thread */}
                    {messages.map(msg => {
                        const isMe = msg.sender_id === profile.id;
                        return (
                            <div key={msg.id} className={`flex gap-4 max-w-2xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-primary/10' : 'bg-blue-100'}`}>
                                    {isMe ? <User className="w-4 h-4 text-primary" /> : <div className="text-xs font-bold text-blue-700">A</div>}
                                </div>
                                <div className={`${isMe ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'} border rounded-2xl p-4 shadow-sm w-full`}>
                                    <div className={`flex justify-between items-start mb-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <span className={`font-bold text-sm ${isMe ? 'text-gray-dark' : 'text-blue-900'}`}>
                                            {isMe ? 'Vos' : msg.sender?.full_name} {isMe ? <span className="text-gray-medium font-normal">(Local)</span> : <span className="text-blue-500 font-normal">(Soporte)</span>}
                                        </span>
                                        <span className="text-xs text-gray-medium">{format(new Date(msg.created_at), "HH:mm, d MMM yyyy", { locale: es })}</span>
                                    </div>
                                    <p className={`${isMe ? 'text-gray-dark text-right' : 'text-blue-900'}`}>{msg.message}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {activeTicket.status === 'open' && (
                    <div className="bg-white rounded-b-2xl border-t border-gray-100 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10">
                        <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Escribe tu mensaje..."
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || sending}
                                className="bg-primary text-white rounded-xl px-6 font-bold flex items-center gap-2 hover:bg-primary/90 transition disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" /> <span className="hidden sm:inline">Enviar</span>
                            </button>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-dark flex items-center gap-2">
                        <LifeBuoy className="w-7 h-7 text-primary" /> Soporte y Reportes
                    </h1>
                    <p className="text-gray-medium mt-1">Comunicación estructurada con la Administración</p>
                </div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition shadow-brand">
                        <MessageSquarePlus className="w-5 h-5" /> Nuevo Reporte
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-dark text-lg">Abrir Reporte de Sistema</h3>
                                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-50 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-medium" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-dark mb-1 block">Motivo principal</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                                        {SYSTEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-dark mb-1 block">Detalles adicionales</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Explicá brevemente cuál es el inconveniente..." rows="3" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none" />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button type="submit" disabled={submitting || !form.description.trim()} className="bg-primary text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2">
                                        {submitting ? 'Enviando...' : 'Enviar Reporte'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-bold text-gray-dark text-sm">Historial de Reportes</h2>
                </div>

                {tickets.length === 0 ? (
                    <div className="text-center py-12">
                        <LifeBuoy className="w-12 h-12 text-gray-medium mx-auto mb-3 opacity-30" />
                        <p className="text-gray-medium font-medium">No hay reportes recientes</p>
                        <p className="text-sm text-gray-medium opacity-80 mt-1">El sistema está funcionando correctamente</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {tickets.map(ticket => {
                            const status = getStatusConfig(ticket.status);
                            const StatusIcon = status.icon;
                            const hasUnread = unreadTicketIds.has(ticket.id);

                            return (
                                <div key={ticket.id} onClick={() => {
                                    setActiveTicket(ticket);
                                    // Clear unread
                                    setUnreadTicketIds(prev => { const s = new Set(prev); s.delete(ticket.id); return s; });
                                }} className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {status.label}
                                                </span>
                                                {hasUnread && (
                                                    <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">Nuevo mensaje</span>
                                                )}
                                                <h3 className={`font-bold truncate group-hover:text-primary transition-colors ${hasUnread ? 'text-primary' : 'text-gray-dark'}`}>{ticket.category}</h3>
                                            </div>
                                            <p className="text-sm text-gray-medium mt-2 line-clamp-1">{ticket.description}</p>
                                        </div>
                                        <div className="text-right shrink-0 flex items-center gap-4">
                                            <div>
                                                <p className="text-xs font-medium text-gray-dark text-left md:text-right">
                                                    Hace {formatDistanceToNow(new Date(ticket.created_at), { locale: es })}
                                                </p>
                                                <p className="text-[10px] text-gray-medium mt-0.5">
                                                    {format(new Date(ticket.created_at), "d MMM, HH:mm", { locale: es })}
                                                </p>
                                            </div>
                                            <ChevronRight className={`w-5 h-5 transition-colors ${hasUnread ? 'text-primary' : 'text-gray-medium group-hover:text-primary'}`} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
