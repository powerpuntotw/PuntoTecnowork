import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Star, Filter, X, FileText, Image, Clock, Check, Printer, Truck, AlertCircle, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_CONFIG = {
    pendiente: { label: 'Pendiente', color: 'bg-accent text-gray-dark' },
    en_proceso: { label: 'En Proceso', color: 'bg-secondary text-white' },
    paused: { label: 'Revisión Requerida', color: 'bg-red-100 text-red-600 border border-red-200' },
    listo: { label: 'Listo', color: 'bg-success text-white' },
    entregado: { label: 'Entregado', color: 'bg-green-700 text-white' },
    cancelado: { label: 'Cancelado', color: 'bg-primary text-white' },
};

const formatSize = (s) => ({ a4: 'A4', a3: 'A3', oficio: 'Oficio (Legal)', '10x15': '10x15 cm', '13x18': '13x18 cm', foto_a4: 'A4 (Foto)' }[s] || s);

export const Orders = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderTickets, setOrderTickets] = useState({}); // Map of orderId -> active ticket
    const [chatOrder, setChatOrder] = useState(null); // The order whose chat is open

    const fetchOrdersAndTickets = async () => {
        const { data: oData } = await supabase.from('print_orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false });
        setOrders(oData || []);

        if (oData?.length > 0) {
            const pausedOrdersIds = oData.filter(o => o.status === 'paused').map(o => o.id);
            if (pausedOrdersIds.length > 0) {
                const { data: tData } = await supabase
                    .from('support_tickets')
                    .select('*')
                    .in('order_id', pausedOrdersIds)
                    .eq('status', 'open');

                if (tData) {
                    const ticketMap = {};
                    tData.forEach(t => ticketMap[t.order_id] = t);
                    setOrderTickets(ticketMap);
                }
            }
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchOrdersAndTickets();

        // Unique channel name per mount to avoid stale channel reuse
        const channel = supabase.channel(`client-orders-${Date.now()}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'print_orders', filter: `customer_id=eq.${user.id}` },
                (payload) => setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o))
            ).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user.id]);

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    if (loading) return <div className="p-6 space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="shimmer h-20 rounded-xl" />)}</div>;

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold text-gray-dark mb-4">Mis Órdenes</h2>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4">
                {['all', ...Object.keys(STATUS_CONFIG)].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className={`px-3 py-2 rounded-full whitespace-nowrap text-xs font-medium transition-all ${filter === s ? 'bg-primary text-white' : 'bg-white text-gray-medium border border-gray-200'}`}>
                        {s === 'all' ? 'Todas' : STATUS_CONFIG[s].label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-medium mx-auto mb-3" />
                    <p className="text-gray-medium">No hay órdenes</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((order, i) => (
                        <motion.div key={order.id} className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedOrder(order)}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-primary">{order.order_number}</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[order.status]?.color}`}>{STATUS_CONFIG[order.status]?.label}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-medium">{format(new Date(order.created_at), "d 'de' MMM, HH:mm", { locale: es })}</span>
                                <span className="font-bold text-gray-dark">${order.total_amount}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2 text-xs">
                                <span className="text-gray-medium">{order.file_urls?.length || 0} archivos • {order.specifications?.copies || 1} copias</span>
                                {order.points_earned > 0 && (
                                    <span className="text-success font-bold flex items-center gap-1"><Star className="w-3 h-3 fill-current" />+{order.points_earned} pts</span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Order Detail Modal */}
            <AnimatePresence>
                {selectedOrder && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                        onClick={() => setSelectedOrder(null)}>
                        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                                <h3 className="font-bold text-gray-dark">Orden {selectedOrder.order_number}</h3>
                                <button onClick={() => setSelectedOrder(null)}><X className="w-5 h-5 text-gray-medium" /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                {/* Status */}
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedOrder.status]?.color}`}>{STATUS_CONFIG[selectedOrder.status]?.label}</span>
                                    <span className="text-xs text-gray-medium">{format(new Date(selectedOrder.created_at), "d 'de' MMM yyyy, HH:mm", { locale: es })}</span>
                                </div>

                                {/* Paused Issue Banner + Chat Button */}
                                {selectedOrder.status === 'paused' && orderTickets[selectedOrder.id] && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                            <h4 className="font-bold text-red-700">El local reportó un problema</h4>
                                        </div>
                                        <p className="text-sm font-bold text-gray-dark mb-1">Motivo: {orderTickets[selectedOrder.id].category}</p>
                                        <p className="text-sm text-gray-medium mb-3">{orderTickets[selectedOrder.id].description}</p>
                                        <button
                                            onClick={() => { setSelectedOrder(null); setChatOrder(selectedOrder); }}
                                            className="w-full bg-primary text-white flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition shadow-brand"
                                        >
                                            <MessageCircle className="w-4 h-4" /> Abrir Chat con el Local
                                        </button>
                                        <p className="text-[10px] text-gray-500 text-center mt-2 italic">Coordiná la solución directamente con el local.</p>
                                    </div>
                                )}

                                {/* Specs */}
                                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                    <h4 className="text-xs font-bold text-gray-dark uppercase">Especificaciones</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-gray-medium">Tamaño:</span> <span className="font-medium">{formatSize(selectedOrder.specifications?.size)}</span></div>
                                        <div><span className="text-gray-medium">Calidad:</span> <span className="font-medium capitalize">{selectedOrder.specifications?.quality}</span></div>
                                        <div><span className="text-gray-medium">Copias:</span> <span className="font-medium">{selectedOrder.specifications?.copies}</span></div>
                                        <div><span className="text-gray-medium">Archivos:</span> <span className="font-medium">{selectedOrder.file_urls?.length || 0}</span></div>
                                    </div>
                                </div>
                                {/* Notes */}
                                {selectedOrder.notes && (
                                    <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-4">
                                        <h4 className="text-xs font-bold text-secondary uppercase mb-1">Instrucciones</h4>
                                        <p className="text-sm text-gray-dark">{selectedOrder.notes}</p>
                                    </div>
                                )}
                                {/* Total */}
                                <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-4 flex items-center justify-between">
                                    <span className="text-white font-medium">Total</span>
                                    <span className="text-2xl font-bold text-white">${selectedOrder.total_amount}</span>
                                </div>
                                {selectedOrder.points_earned > 0 && (
                                    <div className="flex items-center justify-center gap-2 text-success font-bold">
                                        <Star className="w-5 h-5 fill-current" />+{selectedOrder.points_earned} puntos {selectedOrder.status === 'entregado' ? 'acreditados' : 'al retirar'}
                                    </div>
                                )}
                                {/* Status Timeline */}
                                <div className="border-t border-gray-100 pt-4">
                                    <h4 className="text-xs font-bold text-gray-dark uppercase mb-3">Estado del pedido</h4>
                                    <div className="space-y-3">
                                        {['pendiente', 'en_proceso', 'listo', 'entregado'].map((step, i) => {
                                            const stepLabels = { pendiente: 'Pendiente', en_proceso: 'En Proceso', listo: 'Listo para retirar', entregado: 'Entregado' };
                                            const stepIcons = { pendiente: Clock, en_proceso: Printer, listo: Check, entregado: Truck };
                                            const Icon = stepIcons[step];
                                            const isPastOrCurrent =
                                                selectedOrder.status === 'entregado' ||
                                                (selectedOrder.status === 'listo' && i <= 2) ||
                                                (selectedOrder.status === 'en_proceso' && i <= 1) ||
                                                (selectedOrder.status === 'pendiente' && i <= 0) ||
                                                (selectedOrder.status === 'paused' && i <= 1); // If paused, it was en proceso

                                            // Handle paused state display
                                            const isPausedNode = selectedOrder.status === 'paused' && step === 'en_proceso';
                                            const bgColor = isPausedNode ? 'bg-red-500' : isPastOrCurrent ? 'bg-primary' : 'bg-gray-100';
                                            const textColor = isPausedNode ? 'text-red-500' : isPastOrCurrent ? 'text-gray-dark' : 'text-gray-medium';
                                            return (
                                                <div key={step} className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}>
                                                        <Icon className={`w-4 h-4 ${isPastOrCurrent || isPausedNode ? 'text-white' : 'text-gray-medium'}`} />
                                                    </div>
                                                    <span className={`text-sm font-medium ${textColor}`}>
                                                        {isPausedNode ? 'Revisión Requerida' : stepLabels[step]}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Order Issue Chat Modal */}
            <AnimatePresence>
                {chatOrder && (
                    <OrderIssueChat
                        order={chatOrder}
                        onClose={() => { setChatOrder(null); fetchOrdersAndTickets(); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sub-component: Order Issue Chat for Clients ---
const OrderIssueChat = ({ order, onClose }) => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch ticket
    useEffect(() => {
        const fetchTicket = async () => {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('order_id', order.id)
                .in('status', ['open', 'resolved'])
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!error && data) setTicket(data);
            setLoading(false);
        };
        fetchTicket();
    }, [order.id]);

    // Fetch messages + realtime
    useEffect(() => {
        if (!ticket) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('ticket_messages')
                .select('*, sender:profiles(full_name, user_type)')
                .eq('ticket_id', ticket.id)
                .order('created_at', { ascending: true });

            if (!error && data) {
                setMessages(data);
                setTimeout(scrollToBottom, 100);
            }
        };

        fetchMessages();

        const subscription = supabase
            .channel(`ticket_client_${ticket.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticket.id}` }, () => {
                fetchMessages();
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, [ticket]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const { error } = await supabase.from('ticket_messages').insert({
                ticket_id: ticket.id,
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

    const handleDismiss = async () => {
        if (!confirm('¿Marcar este problema como resuelto? El local reanudará la impresión.')) return;
        try {
            const { error: ticketError } = await supabase
                .from('support_tickets')
                .update({ status: 'resolved', resolved_at: new Date().toISOString() })
                .eq('id', ticket.id);
            if (ticketError) throw ticketError;

            const { error: orderError } = await supabase
                .from('print_orders')
                .update({ status: 'en_proceso' })
                .eq('id', order.id);
            if (orderError) throw orderError;

            showToast('Problema resuelto. La impresión se reanudará.', 'success');
            onClose();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    if (loading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center">
                    <span className="shimmer w-10 h-10 rounded-full mb-4"></span>
                    <p className="text-gray-medium font-medium animate-pulse">Cargando chat...</p>
                </div>
            </motion.div>
        );
    }

    if (!ticket) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-sm" onClick={e => e.stopPropagation()}>
                    <Package className="w-12 h-12 text-gray-medium mx-auto mb-3 opacity-30" />
                    <p className="text-gray-medium font-medium">No hay un hilo activo para esta orden.</p>
                    <button onClick={onClose} className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm">Cerrar</button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={onClose}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
                className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shadow-sm z-10 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                                {order.order_number}
                            </span>
                            <h3 className="font-bold text-gray-dark text-sm">{ticket.category}</h3>
                        </div>
                        <p className="text-xs text-gray-medium">Chat con el local por un problema</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {ticket.status === 'open' && (
                            <button onClick={handleDismiss} className="px-3 py-1.5 bg-success text-white font-bold rounded-lg text-xs flex items-center gap-1 hover:bg-success/90 transition">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Resuelto
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 bg-gray-50 overflow-y-auto p-4 space-y-4">
                    {/* Original Description from Local */}
                    <div className="flex gap-3 max-w-xs">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <div className="text-xs font-bold text-indigo-700">L</div>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 shadow-sm w-full">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs text-indigo-900">Local <span className="text-indigo-500 font-normal">(Soporte)</span></span>
                                <span className="text-[10px] text-gray-medium">{format(new Date(ticket.created_at), "HH:mm", { locale: es })}</span>
                            </div>
                            <p className="text-sm text-indigo-900">{ticket.description}</p>
                        </div>
                    </div>

                    {/* Thread */}
                    {messages.map(msg => {
                        const isMe = msg.sender_id === user.id;
                        return (
                            <div key={msg.id} className={`flex gap-3 max-w-xs ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-primary/10' : 'bg-indigo-100'}`}>
                                    {isMe ? <div className="text-xs font-bold text-primary">T</div> : <div className="text-xs font-bold text-indigo-700">L</div>}
                                </div>
                                <div className={`${isMe ? 'bg-white border-gray-100' : 'bg-indigo-50 border-indigo-100'} border rounded-2xl p-3 shadow-sm w-full`}>
                                    <div className={`flex justify-between items-start mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <span className={`font-bold text-xs ${isMe ? 'text-gray-dark' : 'text-indigo-900'}`}>
                                            {isMe ? 'Vos' : msg.sender?.full_name || 'Local'}
                                        </span>
                                        <span className="text-[10px] text-gray-medium">{format(new Date(msg.created_at), "HH:mm", { locale: es })}</span>
                                    </div>
                                    <p className={`text-sm ${isMe ? 'text-gray-dark text-right' : 'text-indigo-900'}`}>{msg.message}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {ticket.status === 'open' ? (
                    <div className="bg-white p-3 border-t border-gray-100 shrink-0">
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
                    <div className="bg-gray-100 p-3 border-t border-gray-200 text-center text-gray-500 text-sm font-medium shrink-0 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" /> Problema resuelto
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

