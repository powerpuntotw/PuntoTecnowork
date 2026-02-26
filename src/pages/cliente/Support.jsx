import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, LifeBuoy, AlertCircle, CheckCircle2, Clock, X, ChevronRight, Send, ArrowLeft, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const CLIENT_CATEGORIES = [
    'Problema con mi orden',
    'Error en el cobro / facturación',
    'No recibí mis puntos',
    'Consulta general',
    'Sugerencia o feedback',
    'Otro'
];

export const ClienteSupport = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ category: CLIENT_CATEGORIES[0], description: '' });

    // Chat state
    const [activeTicket, setActiveTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTickets = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('creator_id', user.id)
            .order('created_at', { ascending: false });

        setTickets(data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (user?.id) fetchTickets();
    }, [user?.id]);

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
            .channel(`ticket_client_${activeTicket.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${activeTicket.id}` }, () => {
                fetchMessages();
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, [activeTicket]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.description.trim()) return showToast('Escribí una descripción del problema', 'error');

        setSubmitting(true);
        try {
            const { error } = await supabase.from('support_tickets').insert({
                creator_id: user.id,
                ticket_type: 'client_general',
                category: form.category,
                description: form.description.trim()
            });

            if (error) throw error;
            showToast('Consulta enviada correctamente', 'success');
            setForm({ category: CLIENT_CATEGORIES[0], description: '' });
            setShowForm(false);
            fetchTickets();
        } catch (err) {
            showToast('Error al enviar: ' + err.message, 'error');
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
                sender_id: user.id,
                message: newMessage.trim()
            });

            if (error) throw error;
            setNewMessage('');
        } catch (err) {
            showToast('Error al enviar mensaje: ' + err.message, 'error');
        } finally {
            setSending(false);
        }
    };

    const handleResolve = async (ticketId, e) => {
        if (e) e.stopPropagation();
        if (!confirm('¿Marcar esta consulta como resuelta?')) return;
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({ status: 'resolved', resolved_at: new Date().toISOString() })
                .eq('id', ticketId);

            if (error) throw error;

            // Notify admins
            const { data: admins } = await supabase.from('profiles').select('id').eq('user_type', 'admin');
            if (admins) {
                const notifications = admins.map(admin => ({
                    user_id: admin.id,
                    type: 'ticket_resolved',
                    title: 'Consulta resuelta por cliente',
                    message: `El cliente ${user.email} marcó como resuelta su consulta: ${activeTicket.category}.`,
                    link: '/admin/support'
                }));
                await supabase.from('notifications').insert(notifications);
            }

            showToast('Consulta marcada como resuelta', 'success');
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
            <div className="h-[calc(100vh-160px)] p-4 flex flex-col max-w-2xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-t-2xl border-b border-gray-100 p-4 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveTicket(null)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-medium transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="font-bold text-gray-dark text-sm">{activeTicket.category}</h2>
                            <p className="text-[10px] text-gray-medium">{format(new Date(activeTicket.created_at), "d MMM yyyy, HH:mm", { locale: es })}</p>
                        </div>
                    </div>
                    {activeTicket.status === 'open' ? (
                        <button onClick={(e) => handleResolve(activeTicket.id, e)} className="px-3 py-1.5 bg-success text-white font-bold rounded-lg text-xs flex items-center gap-1.5 hover:bg-success/90 transition">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resuelto
                        </button>
                    ) : (
                        <span className="px-2.5 py-1 bg-success/10 text-success text-xs font-bold rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resuelto
                        </span>
                    )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 bg-gray-50 overflow-y-auto p-4 space-y-4">
                    {/* Original Description */}
                    <div className="flex gap-3 max-w-xs ml-auto flex-row-reverse">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm w-full">
                            <div className="flex justify-between items-start mb-1 flex-row-reverse">
                                <span className="font-bold text-xs text-gray-dark">Vos</span>
                                <span className="text-[10px] text-gray-medium">{format(new Date(activeTicket.created_at), "HH:mm", { locale: es })}</span>
                            </div>
                            <p className="text-sm text-gray-dark text-right">{activeTicket.description}</p>
                        </div>
                    </div>

                    {/* Thread */}
                    {messages.map(msg => {
                        const isMe = msg.sender_id === user.id;
                        return (
                            <div key={msg.id} className={`flex gap-3 max-w-xs ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-primary/10' : 'bg-blue-100'}`}>
                                    {isMe ? <User className="w-3.5 h-3.5 text-primary" /> : <div className="text-[10px] font-bold text-blue-700">S</div>}
                                </div>
                                <div className={`${isMe ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'} border rounded-2xl p-3 shadow-sm w-full`}>
                                    <div className={`flex justify-between items-start mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <span className={`font-bold text-xs ${isMe ? 'text-gray-dark' : 'text-blue-900'}`}>
                                            {isMe ? 'Vos' : msg.sender?.full_name || 'Soporte'}
                                        </span>
                                        <span className="text-[10px] text-gray-medium">{format(new Date(msg.created_at), "HH:mm", { locale: es })}</span>
                                    </div>
                                    <p className={`text-sm ${isMe ? 'text-gray-dark text-right' : 'text-blue-900'}`}>{msg.message}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {activeTicket.status === 'open' ? (
                    <div className="bg-white rounded-b-2xl border-t border-gray-100 p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] z-10">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Tu mensaje..."
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || sending}
                                className="bg-primary text-white rounded-xl px-5 font-bold flex items-center gap-2 hover:bg-primary/90 transition disabled:opacity-50 text-sm"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-gray-100 rounded-b-2xl p-3 border-t border-gray-200 text-center text-gray-500 text-xs font-medium flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" /> Consulta resuelta
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                    <h1 className="text-xl font-bold text-gray-dark flex items-center gap-2">
                        <LifeBuoy className="w-6 h-6 text-primary" /> Soporte
                    </h1>
                    <p className="text-gray-medium text-sm mt-0.5">¿Tenés algún inconveniente? Escribinos.</p>
                </div>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition shadow-brand">
                        <MessageSquarePlus className="w-4 h-4" /> Nueva
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-gray-dark">Nueva consulta</h3>
                                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-medium" /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-dark mb-1 block">Motivo</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm">
                                        {CLIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-dark mb-1 block">Detalle</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Contanos qué pasó..." rows="3" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm" />
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" disabled={submitting || !form.description.trim()} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
                                        {submitting ? 'Enviando...' : 'Enviar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <h2 className="font-bold text-gray-dark text-xs">Mis consultas</h2>
                </div>

                {tickets.length === 0 ? (
                    <div className="text-center py-10">
                        <LifeBuoy className="w-10 h-10 text-gray-medium mx-auto mb-2 opacity-30" />
                        <p className="text-gray-medium font-medium text-sm">Sin consultas activas</p>
                        <p className="text-xs text-gray-medium opacity-80 mt-1">Creá una nueva si necesitás ayuda</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {tickets.map(ticket => {
                            const status = getStatusConfig(ticket.status);
                            const StatusIcon = status.icon;

                            return (
                                <div key={ticket.id} onClick={() => setActiveTicket(ticket)} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label}
                                                </span>
                                                <h3 className="font-bold text-gray-dark text-sm truncate group-hover:text-primary transition-colors">{ticket.category}</h3>
                                            </div>
                                            <p className="text-xs text-gray-medium line-clamp-1">{ticket.description}</p>
                                        </div>
                                        <div className="text-right shrink-0 flex items-center gap-3">
                                            <span className="text-[10px] text-gray-medium">
                                                {formatDistanceToNow(new Date(ticket.created_at), { locale: es, addSuffix: true })}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-gray-medium group-hover:text-primary transition-colors" />
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
