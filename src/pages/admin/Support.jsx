import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, CheckCircle2, Clock, MapPin, User, AlertCircle, MessageSquare, Send, X, ArrowLeft, MessageSquarePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';

export const AdminSupport = () => {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('open'); // 'open', 'resolved', 'all'

    // New Chat state
    const [showNewForm, setShowNewForm] = useState(false);
    const [locations, setLocations] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [newForm, setNewForm] = useState({ location_id: '', category: 'Administración', description: '' });

    useEffect(() => {
        const fetchLocs = async () => {
            const { data } = await supabase.from('printing_locations').select('id, name').eq('status', 'activo').order('name');
            if (data) {
                setLocations(data);
                if (data.length > 0) setNewForm(prev => ({ ...prev, location_id: data[0].id }));
            }
        };
        fetchLocs();
    }, []);

    const handleCreateChat = async (e) => {
        e.preventDefault();
        if (!newForm.location_id || !newForm.description.trim()) return showToast('Completá todos los campos', 'error');
        setSubmitting(true);
        try {
            const { error, data } = await supabase.from('support_tickets').insert({
                location_id: newForm.location_id,
                creator_id: profile.id,
                ticket_type: 'system_report',
                category: newForm.category,
                description: newForm.description.trim()
            }).select('*, location:printing_locations(name, address), creator:profiles(full_name, email)').single();

            if (error) throw error;

            // Notify the local's assigned user about new admin chat
            const { data: locUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('location_id', newForm.location_id)
                .eq('user_type', 'local')
                .maybeSingle();
            if (locUser) {
                await supabase.from('notifications').insert({
                    user_id: locUser.id,
                    type: 'new_support_message',
                    title: '💬 Nuevo mensaje de Soporte',
                    message: `El administrador inició un chat: "${newForm.category}". Revisá Soporte.`,
                    link: '/local/support'
                });
            }

            showToast('Chat iniciado correctamente', 'success');
            setShowNewForm(false);
            setNewForm(prev => ({ ...prev, description: '' }));
            fetchTickets();
            if (data) setActiveTicket(data);
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

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
        try {
            let query = supabase
                .from('support_tickets')
                .select(`
                    *,
                    location:printing_locations(name, address),
                    creator:profiles(full_name, email)
                `)
                .in('ticket_type', ['system_report', 'order_issue']) // Admin can see both
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTickets(data || []);
        } catch (err) {
            showToast('Error al cargar reportes: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [filter]);

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

            // Notify the local's assigned user
            const { data: locUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('location_id', activeTicket.location_id)
                .eq('user_type', 'local')
                .maybeSingle();
            if (locUser) {
                await supabase.from('notifications').insert({
                    user_id: locUser.id,
                    type: 'new_support_message',
                    title: '💬 Nuevo mensaje de Soporte',
                    message: `Nuevo mensaje en el chat "${activeTicket.category}". Revisá Soporte.`,
                    link: '/local/support'
                });
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
        if (!confirm('¿Marcar este reporte como resuelto?')) return;
        try {
            const { error } = await supabase
                .from('support_tickets')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString()
                })
                .eq('id', ticketId);

            if (error) throw error;

            // Notify the local's assigned user by location_id (not creator_id,
            // because the admin might have created the ticket themselves).
            const notifRows = [];
            if (activeTicket.location_id) {
                const { data: locUser } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('location_id', activeTicket.location_id)
                    .eq('user_type', 'local')
                    .maybeSingle();
                if (locUser) {
                    notifRows.push({
                        user_id: locUser.id,
                        type: 'ticket_resolved',
                        title: '✅ Soporte Cerrado',
                        message: `El chat "${activeTicket.category}" fue marcado como resuelto por el administrador.`,
                        link: '/local/support'
                    });
                }
            }
            // Also notify the original creator if different from admin (e.g. client ticket)
            if (activeTicket.creator_id && activeTicket.creator_id !== profile.id) {
                notifRows.push({
                    user_id: activeTicket.creator_id,
                    type: 'ticket_resolved',
                    title: '✅ Consulta Resuelta',
                    message: `Tu consulta sobre "${activeTicket.category}" fue marcada como resuelta.`,
                    link: '/local/support'
                });
            }
            if (notifRows.length > 0) await supabase.from('notifications').insert(notifRows);

            showToast('Reporte marcado como resuelto', 'success');
            fetchTickets();
            if (activeTicket?.id === ticketId) {
                setActiveTicket({ ...activeTicket, status: 'resolved' });
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    // --- Thread View ---
    if (activeTicket) {
        return (
            <div className="h-[calc(100vh-80px)] p-4 flex flex-col">
                {/* Header */}
                <div className="bg-white rounded-t-2xl border-b border-gray-100 p-4 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveTicket(null)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-medium transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${activeTicket.ticket_type === 'system_report' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                    {activeTicket.ticket_type === 'system_report' ? 'Sistema' : 'Orden'}
                                </span>
                                <h2 className="font-bold text-gray-dark text-lg">{activeTicket.category}</h2>
                            </div>
                            <p className="text-sm text-gray-medium">{activeTicket.location?.name || 'Local'} • {activeTicket.creator?.full_name}</p>
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
                    <div className="flex gap-4 max-w-3xl">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm w-full">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-sm text-gray-dark">{activeTicket.creator?.full_name} <span className="text-gray-medium font-normal">(Local)</span></span>
                                <span className="text-xs text-gray-medium">{format(new Date(activeTicket.created_at), "HH:mm, d MMM yyyy", { locale: es })}</span>
                            </div>
                            <p className="text-gray-dark">{activeTicket.description}</p>
                        </div>
                    </div>

                    {/* Thread */}
                    {messages.map(msg => {
                        const isAdmin = msg.sender?.user_type === 'admin';
                        return (
                            <div key={msg.id} className={`flex gap-4 max-w-3xl ${isAdmin ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-blue-100' : 'bg-primary/10'}`}>
                                    {isAdmin ? <div className="text-xs font-bold text-blue-700">A</div> : <User className="w-4 h-4 text-primary" />}
                                </div>
                                <div className={`${isAdmin ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'} border rounded-2xl p-4 shadow-sm w-full`}>
                                    <div className={`flex justify-between items-start mb-2 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                        <span className={`font-bold text-sm ${isAdmin ? 'text-blue-900' : 'text-gray-dark'}`}>
                                            {msg.sender?.full_name} {isAdmin ? <span className="text-blue-500 font-normal">(Soporte)</span> : <span className="text-gray-medium font-normal">(Local)</span>}
                                        </span>
                                        <span className="text-xs text-gray-medium">{format(new Date(msg.created_at), "HH:mm, d MMM yyyy", { locale: es })}</span>
                                    </div>
                                    <p className={`${isAdmin ? 'text-blue-900 text-right' : 'text-gray-dark'}`}>{msg.message}</p>
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
                                placeholder="Escribe tu respuesta..."
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
        <div className="p-4 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-dark flex items-center gap-2">
                        <Inbox className="w-7 h-7 text-primary" /> Bandeja de Soporte
                    </h1>
                    <p className="text-gray-medium mt-1">Reportes de Locales y Problemas de Órdenes</p>
                </div>
                <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1">
                    {['open', 'resolved', 'all'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === f ? 'bg-primary text-white shadow-md' : 'text-gray-medium hover:bg-gray-50'
                                }`}
                        >
                            {f === 'open' ? 'Pendientes' : f === 'resolved' ? 'Resueltos' : 'Todos'}
                        </button>
                    ))}
                </div>
                {!showNewForm && (
                    <button onClick={() => setShowNewForm(true)} className="ml-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition shadow-sm shrink-0">
                        <MessageSquarePlus className="w-5 h-5" /> Iniciar Chat
                    </button>
                )}
            </div>

            <AnimatePresence>
                {showNewForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-dark text-lg">Nuevo Chat con Local</h3>
                                <button onClick={() => setShowNewForm(false)} className="p-2 hover:bg-gray-50 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-medium" /></button>
                            </div>

                            <form onSubmit={handleCreateChat} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-bold text-gray-dark mb-1 block">Local Destino</label>
                                        <select value={newForm.location_id} onChange={e => setNewForm({ ...newForm, location_id: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none">
                                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-dark mb-1 block">Motivo / Asunto</label>
                                        <input type="text" value={newForm.category} onChange={e => setNewForm({ ...newForm, category: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-dark mb-1 block">Primer Mensaje</label>
                                    <textarea value={newForm.description} onChange={e => setNewForm({ ...newForm, description: e.target.value })} placeholder="Escribe el mensaje inicial para el local..." rows="3" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none" />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button type="submit" disabled={submitting || !newForm.description.trim()} className="bg-primary text-white px-8 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2">
                                        {submitting ? 'Creando...' : 'Comenzar Chat'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="shimmer h-32 rounded-xl" />)}
                </div>
            ) : tickets.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-gray-medium/30 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-dark mb-2">Bandeja Vacía</h2>
                    <p className="text-gray-medium">No hay reportes que coincidan con este filtro.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence>
                        {tickets.map(ticket => (
                            <motion.div
                                key={ticket.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => setActiveTicket(ticket)}
                                className={`bg-white cursor-pointer rounded-2xl shadow-sm border ${ticket.status === 'open' ? 'border-primary/20 hover:border-primary/60 hover:shadow-md' : 'border-gray-100 hover:border-gray-300'} p-5 transition-all`}
                            >
                                <div className="flex flex-col lg:flex-row gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${ticket.status === 'open' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}`}>
                                                {ticket.status === 'open' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                {ticket.status === 'open' ? 'Pendiente' : 'Resuelto'}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ticket.ticket_type === 'system_report' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {ticket.ticket_type === 'system_report' ? 'Sistema' : 'Orden'}
                                            </span>
                                        </div>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-dark text-lg md:text-xl">{ticket.category}</h3>
                                                <p className="text-gray-dark line-clamp-2 md:text-lg mb-4 mt-1 opacity-80">{ticket.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 text-sm text-gray-medium mt-auto">
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                <MapPin className="w-4 h-4 text-primary" />
                                                <span className="font-medium text-gray-dark">{ticket.location?.name || 'Local Eliminado'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                <User className="w-4 h-4" />
                                                <span>{ticket.creator?.full_name || ticket.creator?.email}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                <Clock className="w-4 h-4" />
                                                <span>{formatDistanceToNow(new Date(ticket.created_at), { locale: es, addSuffix: true })}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-primary ml-auto font-bold">
                                                Ver detalles <ArrowLeft className="w-4 h-4 rotate-180" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
