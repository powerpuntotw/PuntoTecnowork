import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCw, Printer, ChevronLeft, ChevronRight, Maximize2, User, FileText, Image, File, CheckCircle, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ISSUES_CATEGORIES = [
    'Archivo dañado o ilegible',
    'Formato incorrecto / No soportado',
    'Falta de pago / Comprobante inválido',
    'Calidad de imagen muy baja para imprimir',
    'Otro problema'
];

const STATUS_LABELS = {
    pendiente: { label: 'Pendiente', color: 'bg-amber-400 text-gray-dark' },
    en_proceso: { label: 'Imprimiendo', color: 'bg-secondary text-white' },
    listo: { label: 'Listo', color: 'bg-success text-white' },
    entregado: { label: 'Entregado', color: 'bg-green-700 text-white' },
};

const formatSize = (s) => ({ a4: 'A4', a3: 'A3', oficio: 'Oficio (Legal)', '10x15': '10x15 cm', '13x18': '13x18 cm', foto_a4: 'A4 (Foto)' }[s] || s);

const getFileType = (url) => {
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'other';
};

const getFileName = (url) => {
    try { return decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'archivo'); }
    catch { return url.split('/').pop()?.split('?')[0] || 'archivo'; }
};

export const PrintManager = ({ order, onClose, onStatusChange }) => {
    const { showToast } = useToast();
    const files = order?.file_urls || [];
    const [activeIndex, setActiveIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [resolvedUrls, setResolvedUrls] = useState({});
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [hasPrinted, setHasPrinted] = useState(false);
    const [markingListo, setMarkingListo] = useState(false);

    // Issue Reporting State
    const [showIssueModal, setShowIssueModal] = useState(false);

    const activeFile = files[activeIndex];
    const fileType = activeFile ? getFileType(activeFile) : 'other';
    const sl = STATUS_LABELS[order?.status] || STATUS_LABELS.pendiente;

    // Is this a reprint (order already in 'listo')? No status changes allowed.
    const isReprint = order?.status === 'listo' || !!order?._reprintMode;
    // Is this the printing state where we should show "Marcar Listo"?
    const isPrintingState = order?.status === 'en_proceso' && !order?._reprintMode;

    // Download files as blobs
    useEffect(() => {
        const downloadFiles = async () => {
            setLoadingFiles(true);
            const urls = {};
            for (const fileUrl of files) {
                if (fileUrl.startsWith('http')) {
                    urls[fileUrl] = fileUrl;
                } else {
                    try {
                        const { data, error } = await supabase.storage.from('print-files').download(fileUrl);
                        if (error) throw error;
                        urls[fileUrl] = URL.createObjectURL(data);
                    } catch (err) {
                        console.error('Download error:', fileUrl, err);
                    }
                }
            }
            setResolvedUrls(urls);
            setLoadingFiles(false);
        };
        if (files.length > 0) downloadFiles();
        return () => {
            Object.values(resolvedUrls).forEach(url => {
                if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
            });
        };
    }, []);

    const getUrl = (file) => resolvedUrls[file] || '';

    // Keyboard navigation
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'ArrowLeft') setActiveIndex(i => Math.max(0, i - 1));
            else if (e.key === 'ArrowRight') setActiveIndex(i => Math.min(files.length - 1, i + 1));
            else if (e.key === 'Escape') onClose();
            else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(3, z + 0.25));
            else if (e.key === '-') setZoom(z => Math.max(0.25, z - 0.25));
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [files.length, onClose]);

    // Reset zoom/rotation when changing files
    useEffect(() => { setZoom(1); setRotation(0); }, [activeIndex]);

    // === PRINT ===
    const handlePrint = () => {
        const url = getUrl(activeFile);
        if (!url) return;

        if (fileType === 'pdf') {
            const printWindow = window.open(url, '_blank');
            if (printWindow) {
                printWindow.addEventListener('load', () => { printWindow.print(); });
            }
        } else if (fileType === 'image') {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <html><head><title>Imprimir - ${order.order_number}</title>
                <style>@page{margin:10mm}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}</style>
                </head><body><img src="${url}" onload="window.print();window.close();" /></body></html>
            `);
            doc.close();
            setTimeout(() => { try { document.body.removeChild(iframe); } catch { } }, 10000);
        }
        setHasPrinted(true);
        showToast('Enviado a la cola de impresión', 'info');
    };

    // === MARK AS LISTO (only in printing state) ===
    const handleMarkListo = async () => {
        if (!isPrintingState || markingListo) return;
        setMarkingListo(true);
        try {
            const { error } = await supabase.from('print_orders')
                .update({ status: 'listo' })
                .eq('id', order.id);
            if (error) throw error;
            showToast('Orden marcada como Lista ✓', 'success');
            // Close PrintManager and update parent state
            if (onStatusChange) {
                onStatusChange(order.id, 'listo');
            } else {
                onClose();
            }
        } catch (err) {
            showToast('Error al actualizar: ' + err.message, 'error');
            setMarkingListo(false);
        }
    };

    // === BACK TO PENDIENTE ===
    const handleBackToPending = async () => {
        if (!isPrintingState || markingListo) return;
        setMarkingListo(true);
        try {
            const { error } = await supabase.from('print_orders')
                .update({ status: 'pendiente' })
                .eq('id', order.id);
            if (error) throw error;
            showToast('Orden devuelta a Pendiente', 'info');
            if (onStatusChange) {
                onStatusChange(order.id, 'pendiente');
            } else {
                onClose();
            }
        } catch (err) {
            showToast('Error al actualizar: ' + err.message, 'error');
            setMarkingListo(false);
        }
    };

    if (!order) return null;

    return (
        <motion.div className="fixed inset-0 bg-gray-900 z-50 flex flex-col"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Header */}
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition text-gray-300 bg-gray-700/50 hover:bg-gray-600 hover:text-white border border-gray-600">
                        <X className="w-4 h-4" />
                        <span>Cerrar</span>
                    </button>
                    <span className="font-bold text-white">{order.order_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sl.color}`}>
                        {isReprint ? '🔄 Reimpresión' : sl.label}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Back to Pendiente - ONLY in printing state */}
                    {isPrintingState && (
                        <button onClick={handleBackToPending} disabled={markingListo}
                            className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition text-gray-400 bg-gray-700/50 hover:bg-gray-700 hover:text-white border border-gray-600">
                            <RotateCw className="w-4 h-4" /> Volver a Pendiente
                        </button>
                    )}

                    {/* Report Issue - ONLY in printing state */}
                    {isPrintingState && (
                        <button onClick={() => setShowIssueModal(true)} disabled={markingListo}
                            className="px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-500/20">
                            <AlertCircle className="w-4 h-4" /> Reportar Problema
                        </button>
                    )}

                    {/* Mark as Listo — ONLY in printing state */}
                    {isPrintingState && (
                        <button onClick={handleMarkListo} disabled={markingListo}
                            className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition bg-success text-white hover:bg-success/90`}>
                            <CheckCircle className="w-4 h-4" />
                            {markingListo ? 'Guardando...' : '✓ Marcar Listo'}
                        </button>
                    )}

                    {/* Print — only in printing state or reprint mode */}
                    {(isPrintingState || isReprint) && (
                        <button onClick={handlePrint} disabled={!getUrl(activeFile) || loadingFiles}
                            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition disabled:opacity-50">
                            <Printer className="w-4 h-4" />{isReprint ? 'Reimprimir' : 'Imprimir'}
                        </button>
                    )}
                </div>
            </div>

            {/* Printing hint banner (only in printing state) */}
            {isPrintingState && (
                <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center shrink-0">
                    <p className="text-amber-300 text-xs font-medium">
                        🖨️ Seleccioná un archivo y presioná <strong>"Imprimir"</strong>. Al terminar de imprimir todo, marcá la orden como <strong>"✓ Listo"</strong>.
                    </p>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">

                {/* Thumbnail strip */}
                <div className="w-20 sm:w-24 bg-gray-800/50 border-r border-gray-700 overflow-y-auto shrink-0 p-2 space-y-2">
                    {files.map((file, i) => {
                        const type = getFileType(file);
                        const isActive = i === activeIndex;
                        return (
                            <button key={i} onClick={() => setActiveIndex(i)}
                                className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${isActive ? 'border-primary ring-2 ring-primary/30' : 'border-gray-600 hover:border-gray-400'}`}>
                                {type === 'image' ? (
                                    <img src={getUrl(file)} alt={`File ${i + 1}`} className="w-full h-full object-cover" />
                                ) : type === 'pdf' ? (
                                    <div className="w-full h-full bg-red-900/30 flex flex-col items-center justify-center">
                                        <FileText className="w-6 h-6 text-red-400" />
                                        <span className="text-[8px] text-red-300 mt-1">PDF</span>
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-gray-700 flex flex-col items-center justify-center">
                                        <File className="w-6 h-6 text-gray-400" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Main viewer */}
                <div className="flex-1 flex items-center justify-center bg-gray-900 relative overflow-hidden">
                    {loadingFiles && (
                        <div className="text-center text-gray-400">
                            <div className="w-10 h-10 border-2 border-gray-600 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm">Cargando archivos...</p>
                        </div>
                    )}
                    {!loadingFiles && activeFile && fileType === 'image' && getUrl(activeFile) && (
                        <img src={getUrl(activeFile)} alt={getFileName(activeFile)}
                            className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
                            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} draggable={false} />
                    )}
                    {!loadingFiles && activeFile && fileType === 'pdf' && getUrl(activeFile) && (
                        <iframe src={getUrl(activeFile)} title={getFileName(activeFile)} className="w-full h-full border-0" />
                    )}
                    {!loadingFiles && activeFile && fileType === 'other' && (
                        <div className="text-center text-gray-400">
                            <File className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">{getFileName(activeFile)}</p>
                            <p className="text-sm mt-2">Vista previa no disponible</p>
                        </div>
                    )}
                    {!loadingFiles && files.length === 0 && (
                        <div className="text-center text-gray-500">
                            <Image className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p>Sin archivos</p>
                        </div>
                    )}
                </div>

                {/* Right panel - Order info */}
                <div className="w-64 bg-gray-800/50 border-l border-gray-700 overflow-y-auto shrink-0 p-4 space-y-4 hidden md:block">
                    <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Archivo actual</h4>
                        <p className="text-sm text-white font-medium truncate">{activeFile ? getFileName(activeFile) : '—'}</p>
                        <p className="text-xs text-gray-400 mt-1">{activeIndex + 1} de {files.length} archivos</p>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Especificaciones</h4>
                        <div className="space-y-2 text-sm">
                            {[
                                ['Tamaño', formatSize(order.specifications?.size)],
                                ['Copias', order.specifications?.copies || 1],
                            ].map(([label, val]) => (
                                <div key={label} className="flex justify-between">
                                    <span className="text-gray-400">{label}</span>
                                    <span className="text-white font-medium capitalize">{val || '—'}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Modo</span>
                                <span className={`font-bold text-sm px-2 py-0.5 rounded ${order.specifications?.color
                                        ? 'bg-yellow-500/20 text-yellow-300'
                                        : 'bg-gray-700 text-gray-300'
                                    }`}>
                                    {order.specifications?.color ? '🎨 COLOR' : '⚫ B&N'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total</span>
                                <span className="text-primary font-bold">${order.total_amount}</span>
                            </div>
                        </div>
                    </div>
                    {order.notes && (
                        <div className="border-t border-gray-700 pt-4">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Instrucciones</h4>
                            <p className="text-sm text-yellow-300 bg-yellow-900/20 rounded-lg p-3">{order.notes}</p>
                        </div>
                    )}
                    <div className="border-t border-gray-700 pt-4">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Cliente</h4>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-secondary" />
                            </div>
                            <div>
                                <p className="text-sm text-white font-medium">{order.profiles?.full_name || 'Cliente'}</p>
                                <p className="text-[10px] text-gray-400">{order.profiles?.email}</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 pt-4">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Fecha</h4>
                        <p className="text-sm text-gray-300">
                            {format(new Date(order.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer controls */}
            <div className="bg-gray-800 px-4 py-2 flex items-center justify-between shrink-0 border-t border-gray-700">
                <div className="flex items-center gap-2">
                    <button onClick={() => setActiveIndex(i => Math.max(0, i - 1))} disabled={activeIndex === 0}
                        className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-300 min-w-[80px] text-center">{activeIndex + 1} de {files.length}</span>
                    <button onClick={() => setActiveIndex(i => Math.min(files.length - 1, i + 1))} disabled={activeIndex >= files.length - 1}
                        className="p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {fileType === 'image' && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-2 text-gray-400 hover:text-white transition-colors"><ZoomOut className="w-5 h-5" /></button>
                        <span className="text-xs text-gray-400 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-2 text-gray-400 hover:text-white transition-colors"><ZoomIn className="w-5 h-5" /></button>
                        <button onClick={() => setRotation(r => r + 90)} className="p-2 text-gray-400 hover:text-white transition-colors"><RotateCw className="w-5 h-5" /></button>
                        <button onClick={() => { setZoom(1); setRotation(0); }} className="p-2 text-gray-400 hover:text-white transition-colors"><Maximize2 className="w-5 h-5" /></button>
                    </div>
                )}

                {/* Footer print button — only in print/reprint modes */}
                {(isPrintingState || isReprint) && (
                    <button onClick={handlePrint} disabled={!getUrl(activeFile) || loadingFiles}
                        className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition shadow-brand disabled:opacity-50">
                        <Printer className="w-4 h-4" />{isReprint ? 'Reimprimir' : 'Imprimir archivo'}
                    </button>
                )}

                {/* If not in print mode, show a read-only label */}
                {!isPrintingState && !isReprint && (
                    <span className="text-gray-500 text-xs italic">Solo vista previa</span>
                )}
            </div>

            {/* Issue Reporting / Chat Modal */}
            {showIssueModal && (
                <IssueChatModal
                    order={order}
                    onClose={() => setShowIssueModal(false)}
                    onStatusChange={onStatusChange}
                />
            )}
        </motion.div>
    );
};

// --- Sub-component for the Issue Chat Modal ---
const IssueChatModal = ({ order, onClose, onStatusChange }) => {
    const { showToast } = useToast();
    const { profile } = useAuth();

    // Ticket State
    const [ticket, setTicket] = useState(null);
    const [loadingTicket, setLoadingTicket] = useState(true);

    // Create Mode State
    const [issueCategory, setIssueCategory] = useState(ISSUES_CATEGORIES[0]);
    const [issueNotes, setIssueNotes] = useState('');
    const [submittingIssue, setSubmittingIssue] = useState(false);

    // Chat State
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 1. Fetch existing open ticket for this order
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

            if (!error && data) {
                setTicket(data);
            }
            setLoadingTicket(false);
        };
        fetchTicket();
    }, [order.id]);

    // 2. Fetch messages if ticket exists
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
            .channel(`ticket_${ticket.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticket.id}` }, payload => {
                fetchMessages(); // Re-fetch to get relations
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, [ticket]);

    const handleCreateIssue = async () => {
        if (submittingIssue) return;
        setSubmittingIssue(true);
        try {
            // 1. Create the ticket
            const { data: newTicket, error: ticketError } = await supabase.from('support_tickets').insert({
                location_id: profile.location_id,
                order_id: order.id,
                creator_id: profile.id,
                ticket_type: 'order_issue',
                category: issueCategory,
                description: issueNotes.trim() || 'El local pausó esta orden y requiere que la revises.',
                status: 'open'
            }).select().single();

            if (ticketError) throw ticketError;

            // 2. Pause the order
            const { error: orderError } = await supabase.from('print_orders')
                .update({ status: 'paused' })
                .eq('id', order.id);
            if (orderError) throw orderError;

            showToast('Problema reportado al cliente y orden pausada', 'success');
            setTicket(newTicket); // Switches to chat view
            if (onStatusChange) onStatusChange(order.id, 'paused');
        } catch (err) {
            showToast('Error al reportar problema: ' + err.message, 'error');
        } finally {
            setSubmittingIssue(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        try {
            const { error } = await supabase.from('ticket_messages').insert({
                ticket_id: ticket.id,
                sender_id: profile.id,
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

    const handleResolve = async () => {
        if (!confirm('¿Marcar este problema como resuelto y reanudar la impresión?')) return;
        try {
            // 1. Resolve ticket
            const { error: ticketError } = await supabase
                .from('support_tickets')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString()
                })
                .eq('id', ticket.id);
            if (ticketError) throw ticketError;

            // 2. Unpause order
            const { error: orderError } = await supabase.from('print_orders')
                .update({ status: 'en_proceso' })
                .eq('id', order.id);
            if (orderError) throw orderError;

            showToast('Problema resuelto, orden reanudada', 'success');
            if (onStatusChange) onStatusChange(order.id, 'en_proceso');
            onClose();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    };

    if (loadingTicket) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center">
                    <span className="shimmer w-10 h-10 rounded-full mb-4"></span>
                    <p className="text-gray-medium font-medium animate-pulse">Cargando...</p>
                </div>
            </div>
        );
    }

    // --- Create Mode ---
    if (!ticket) {
        return (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-dark flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500" /> Reportar Problema al Cliente
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-dark"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-gray-medium">La orden se pausará y el cliente recibirá una notificación estructurada para que actúe. Se abrirá un hilo de chat ligado a la orden.</p>

                        <div>
                            <label className="text-sm font-bold text-gray-dark mb-1 block">Motivo de la pausa</label>
                            <select
                                value={issueCategory}
                                onChange={e => setIssueCategory(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                            >
                                {ISSUES_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-dark mb-1 block">Mensaje inicial (Opcional)</label>
                            <textarea
                                value={issueNotes}
                                onChange={e => setIssueNotes(e.target.value)}
                                placeholder="Ej. El PDF 3 tiene contraseña, necesito que lo mandes desprotegido..."
                                rows="3"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                            />
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-gray-dark font-medium hover:bg-gray-200 rounded-xl transition">Cancelar</button>
                        <button onClick={handleCreateIssue} disabled={submittingIssue} className="px-5 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2">
                            {submittingIssue ? 'Pausando...' : <><AlertCircle className="w-4 h-4" /> Pausar y Notificar</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- Chat Mode ---
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shadow-sm z-10 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                                ORDEN PAUSADA
                            </span>
                            <h3 className="font-bold text-gray-dark">{ticket.category}</h3>
                        </div>
                        <p className="text-xs text-gray-medium">Resolviendo inconveniente con el cliente</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {ticket.status === 'open' && (
                            <button onClick={handleResolve} className="px-4 py-2 bg-success text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-success/90 transition shadow-sm">
                                <CheckCircle2 className="w-4 h-4" /> Problema Resuelto
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 bg-gray-50 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Original Description */}
                    <div className="flex gap-4 max-w-lg ml-auto flex-row-reverse">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm w-full">
                            <div className="flex justify-between items-start mb-2 flex-row-reverse">
                                <span className="font-bold text-sm text-gray-dark">Local</span>
                                <span className="text-xs text-gray-medium">{format(new Date(ticket.created_at), "HH:mm, d MMM", { locale: es })}</span>
                            </div>
                            <p className="text-gray-dark text-right">{ticket.description}</p>
                        </div>
                    </div>

                    {/* Thread */}
                    {messages.map(msg => {
                        const isMe = msg.sender_id === profile.id;
                        return (
                            <div key={msg.id} className={`flex gap-4 max-w-lg ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-primary/10' : 'bg-orange-100'}`}>
                                    {isMe ? <User className="w-4 h-4 text-primary" /> : <div className="text-xs font-bold text-orange-700">C</div>}
                                </div>
                                <div className={`${isMe ? 'bg-white border-gray-100' : 'bg-orange-50 border-orange-100'} border rounded-2xl p-4 shadow-sm w-full`}>
                                    <div className={`flex justify-between items-start mb-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <span className={`font-bold text-sm ${isMe ? 'text-gray-dark' : 'text-orange-900'}`}>
                                            {isMe ? 'Local' : msg.sender?.full_name} {isMe ? '' : <span className="text-orange-600 font-normal">(Cliente)</span>}
                                        </span>
                                        <span className="text-xs text-gray-medium">{format(new Date(msg.created_at), "HH:mm, d MMM", { locale: es })}</span>
                                    </div>
                                    <p className={`${isMe ? 'text-gray-dark text-right' : 'text-orange-900'}`}>{msg.message}</p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {ticket.status === 'open' ? (
                    <div className="bg-white p-4 border-t border-gray-100 shrink-0">
                        <form onSubmit={handleSendMessage} className="flex gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Responder al cliente..."
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
                ) : (
                    <div className="bg-gray-100 p-4 border-t border-gray-200 text-center text-gray-500 text-sm font-medium shrink-0 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-success" /> Este problema fue resuelto.
                    </div>
                )}
            </div>
        </div>
    );
};
