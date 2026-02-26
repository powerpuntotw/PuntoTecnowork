import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCw, Printer, ChevronLeft, ChevronRight, Maximize2, User, FileText, Image, File, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatSize } from "../../utils/formatSize";
const ISSUES_CATEGORIES = [
  "Archivo da\xF1ado o ilegible",
  "Formato incorrecto / No soportado",
  "Falta de pago / Comprobante inv\xE1lido",
  "Calidad de imagen muy baja para imprimir",
  "Otro problema"
];
const STATUS_LABELS = {
  pendiente: { label: "Pendiente", color: "bg-amber-400 text-gray-dark" },
  en_proceso: { label: "Imprimiendo", color: "bg-secondary text-white" },
  listo: { label: "Listo", color: "bg-success text-white" },
  entregado: { label: "Entregado", color: "bg-green-700 text-white" }
};
const getFileType = (url) => {
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
};
const getFileName = (url) => {
  try {
    return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "archivo");
  } catch {
    return url.split("/").pop()?.split("?")[0] || "archivo";
  }
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
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueCategory, setIssueCategory] = useState(ISSUES_CATEGORIES[0]);
  const [issueNotes, setIssueNotes] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);
  const activeFile = files[activeIndex];
  const fileType = activeFile ? getFileType(activeFile) : "other";
  const sl = STATUS_LABELS[order?.status] || STATUS_LABELS.pendiente;
  const isReprint = order?.status === "listo" || !!order?._reprintMode;
  const isPrintingState = order?.status === "en_proceso" && !order?._reprintMode;
  useEffect(() => {
    const downloadFiles = async () => {
      setLoadingFiles(true);
      const urls = {};
      for (const fileUrl of files) {
        if (fileUrl.startsWith("http")) {
          urls[fileUrl] = fileUrl;
        } else {
          try {
            const { data, error } = await supabase.storage.from("print-files").download(fileUrl);
            if (error) throw error;
            urls[fileUrl] = URL.createObjectURL(data);
          } catch (err) {
            console.error("Download error:", fileUrl, err);
          }
        }
      }
      setResolvedUrls(urls);
      setLoadingFiles(false);
    };
    if (files.length > 0) downloadFiles();
    return () => {
      Object.values(resolvedUrls).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);
  const getUrl = (file) => resolvedUrls[file] || "";
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") setActiveIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setActiveIndex((i) => Math.min(files.length - 1, i + 1));
      else if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(3, z + 0.25));
      else if (e.key === "-") setZoom((z) => Math.max(0.25, z - 0.25));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [files.length, onClose]);
  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [activeIndex]);
  const handlePrint = () => {
    const url = getUrl(activeFile);
    if (!url) return;
    if (fileType === "pdf") {
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.addEventListener("load", () => {
          printWindow.print();
        });
      }
    } else if (fileType === "image") {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(`
                <html><head><title>Imprimir - ${order.order_number}</title>
                <style>@page{margin:10mm}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}</style>
                </head><body><img src="${url}" onload="window.print();window.close();" /></body></html>
            `);
      doc.close();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {
        }
      }, 1e4);
    }
    setHasPrinted(true);
    showToast("Enviado a la cola de impresi\xF3n", "info");
  };
  const handleMarkListo = async () => {
    if (!isPrintingState || markingListo) return;
    setMarkingListo(true);
    try {
      const { error } = await supabase.from("print_orders").update({ status: "listo" }).eq("id", order.id);
      if (error) throw error;
      showToast("Orden marcada como Lista \u2713", "success");
      if (onStatusChange) {
        onStatusChange(order.id, "listo");
      } else {
        onClose();
      }
    } catch (err) {
      showToast("Error al actualizar: " + err.message, "error");
      setMarkingListo(false);
    }
  };
  const handleReportIssue = async () => {
    if (submittingIssue) return;
    setSubmittingIssue(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: ticketError } = await supabase.from("support_tickets").insert({
        order_id: order.id,
        creator_id: user.id,
        ticket_type: "order_issue",
        category: issueCategory,
        description: issueNotes.trim() || "El local requiere tu atenci\xF3n para continuar.",
        status: "open"
      });
      if (ticketError) throw ticketError;
      const { error: orderError } = await supabase.from("print_orders").update({ status: "paused" }).eq("id", order.id);
      if (orderError) throw orderError;
      showToast("Problema reportado al cliente y orden pausada", "success");
      if (onStatusChange) onStatusChange(order.id, "paused");
      else onClose();
    } catch (err) {
      showToast("Error al reportar problema: " + err.message, "error");
    } finally {
      setSubmittingIssue(false);
    }
  };
  if (!order) return null;
  return /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "fixed inset-0 bg-gray-900 z-50 flex flex-col",
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-gray-800 px-4 py-3 flex items-center justify-between shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "text-gray-400 hover:text-white transition-colors flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5" }), isReprint && /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium" }, "Volver a \xD3rdenes")), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-white" }, order.order_number), /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded-full text-[10px] font-bold ${sl.color}` }, isReprint ? "\u{1F504} Reimpresi\xF3n" : sl.label)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, isPrintingState && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowIssueModal(true),
        disabled: markingListo,
        className: "px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-500/20"
      },
      /* @__PURE__ */ React.createElement(AlertCircle, { className: "w-4 h-4" }),
      " Reportar Problema"
    ), isPrintingState && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleMarkListo,
        disabled: markingListo,
        className: `px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition ${hasPrinted ? "bg-success text-white hover:bg-success/90 animate-none" : "bg-gray-600 text-gray-300 hover:bg-gray-500"}`
      },
      /* @__PURE__ */ React.createElement(CheckCircle, { className: "w-4 h-4" }),
      markingListo ? "Guardando..." : "\u2713 Marcar Listo"
    ), (isPrintingState || isReprint) && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handlePrint,
        disabled: !getUrl(activeFile) || loadingFiles,
        className: "bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition disabled:opacity-50"
      },
      /* @__PURE__ */ React.createElement(Printer, { className: "w-4 h-4" }),
      isReprint ? "Reimprimir" : "Imprimir"
    ))),
    isPrintingState && !hasPrinted && /* @__PURE__ */ React.createElement("div", { className: "bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center shrink-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-amber-300 text-xs font-medium" }, "\u{1F5A8}\uFE0F Seleccion\xE1 un archivo y presion\xE1 ", /* @__PURE__ */ React.createElement("strong", null, '"Imprimir"'), ". Despu\xE9s marc\xE1 como ", /* @__PURE__ */ React.createElement("strong", null, '"\u2713 Listo"'), " cuando termines.")),
    isPrintingState && hasPrinted && /* @__PURE__ */ React.createElement("div", { className: "bg-success/20 border-b border-success/30 px-4 py-2 text-center shrink-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-green-300 text-xs font-medium" }, "\u2705 Archivo enviado a imprimir. Presion\xE1 ", /* @__PURE__ */ React.createElement("strong", null, '"\u2713 Marcar Listo"'), " cuando hayas terminado de imprimir todos los archivos.")),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "w-20 sm:w-24 bg-gray-800/50 border-r border-gray-700 overflow-y-auto shrink-0 p-2 space-y-2" }, files.map((file, i) => {
      const type = getFileType(file);
      const isActive = i === activeIndex;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: i,
          onClick: () => setActiveIndex(i),
          className: `w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${isActive ? "border-primary ring-2 ring-primary/30" : "border-gray-600 hover:border-gray-400"}`
        },
        type === "image" ? /* @__PURE__ */ React.createElement("img", { src: getUrl(file), alt: `File ${i + 1}`, className: "w-full h-full object-cover" }) : type === "pdf" ? /* @__PURE__ */ React.createElement("div", { className: "w-full h-full bg-red-900/30 flex flex-col items-center justify-center" }, /* @__PURE__ */ React.createElement(FileText, { className: "w-6 h-6 text-red-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-[8px] text-red-300 mt-1" }, "PDF")) : /* @__PURE__ */ React.createElement("div", { className: "w-full h-full bg-gray-700 flex flex-col items-center justify-center" }, /* @__PURE__ */ React.createElement(File, { className: "w-6 h-6 text-gray-400" }))
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center justify-center bg-gray-900 relative overflow-hidden" }, loadingFiles && /* @__PURE__ */ React.createElement("div", { className: "text-center text-gray-400" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 border-2 border-gray-600 border-t-primary rounded-full animate-spin mx-auto mb-3" }), /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, "Cargando archivos...")), !loadingFiles && activeFile && fileType === "image" && getUrl(activeFile) && /* @__PURE__ */ React.createElement(
      "img",
      {
        src: getUrl(activeFile),
        alt: getFileName(activeFile),
        className: "max-w-full max-h-full object-contain transition-transform duration-200 select-none",
        style: { transform: `scale(${zoom}) rotate(${rotation}deg)` },
        draggable: false
      }
    ), !loadingFiles && activeFile && fileType === "pdf" && getUrl(activeFile) && /* @__PURE__ */ React.createElement("iframe", { src: getUrl(activeFile), title: getFileName(activeFile), className: "w-full h-full border-0" }), !loadingFiles && activeFile && fileType === "other" && /* @__PURE__ */ React.createElement("div", { className: "text-center text-gray-400" }, /* @__PURE__ */ React.createElement(File, { className: "w-16 h-16 mx-auto mb-4 opacity-50" }), /* @__PURE__ */ React.createElement("p", { className: "font-medium" }, getFileName(activeFile)), /* @__PURE__ */ React.createElement("p", { className: "text-sm mt-2" }, "Vista previa no disponible")), !loadingFiles && files.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center text-gray-500" }, /* @__PURE__ */ React.createElement(Image, { className: "w-16 h-16 mx-auto mb-4 opacity-30" }), /* @__PURE__ */ React.createElement("p", null, "Sin archivos"))), /* @__PURE__ */ React.createElement("div", { className: "w-64 bg-gray-800/50 border-l border-gray-700 overflow-y-auto shrink-0 p-4 space-y-4 hidden md:block" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-bold text-gray-400 uppercase mb-2" }, "Archivo actual"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-white font-medium truncate" }, activeFile ? getFileName(activeFile) : "\u2014"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 mt-1" }, activeIndex + 1, " de ", files.length, " archivos")), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-700 pt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-bold text-gray-400 uppercase mb-2" }, "Especificaciones"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-sm" }, [
      ["Tama\xF1o", formatSize(order.specifications?.size)],
      ["Calidad", order.specifications?.quality],
      ["Copias", order.specifications?.copies || 1]
    ].map(([label, val]) => /* @__PURE__ */ React.createElement("div", { key: label, className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, label), /* @__PURE__ */ React.createElement("span", { className: "text-white font-medium capitalize" }, val || "\u2014"))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "Total"), /* @__PURE__ */ React.createElement("span", { className: "text-primary font-bold" }, "$", order.total_amount)))), order.notes && /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-700 pt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-bold text-gray-400 uppercase mb-2" }, "Instrucciones"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-yellow-300 bg-yellow-900/20 rounded-lg p-3" }, order.notes)), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-700 pt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-bold text-gray-400 uppercase mb-2" }, "Cliente"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center" }, /* @__PURE__ */ React.createElement(User, { className: "w-4 h-4 text-secondary" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-white font-medium" }, order.profiles?.full_name || "Cliente"), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-400" }, order.profiles?.email)))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-700 pt-4" }, /* @__PURE__ */ React.createElement("h4", { className: "text-[10px] font-bold text-gray-400 uppercase mb-2" }, "Fecha"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-300" }, format(new Date(order.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es }))))),
    /* @__PURE__ */ React.createElement("div", { className: "bg-gray-800 px-4 py-2 flex items-center justify-between shrink-0 border-t border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setActiveIndex((i) => Math.max(0, i - 1)),
        disabled: activeIndex === 0,
        className: "p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
      },
      /* @__PURE__ */ React.createElement(ChevronLeft, { className: "w-5 h-5" })
    ), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-300 min-w-[80px] text-center" }, activeIndex + 1, " de ", files.length), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setActiveIndex((i) => Math.min(files.length - 1, i + 1)),
        disabled: activeIndex >= files.length - 1,
        className: "p-2 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
      },
      /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-5 h-5" })
    )), fileType === "image" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setZoom((z) => Math.max(0.25, z - 0.25)), className: "p-2 text-gray-400 hover:text-white transition-colors" }, /* @__PURE__ */ React.createElement(ZoomOut, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 min-w-[50px] text-center" }, Math.round(zoom * 100), "%"), /* @__PURE__ */ React.createElement("button", { onClick: () => setZoom((z) => Math.min(3, z + 0.25)), className: "p-2 text-gray-400 hover:text-white transition-colors" }, /* @__PURE__ */ React.createElement(ZoomIn, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement("button", { onClick: () => setRotation((r) => r + 90), className: "p-2 text-gray-400 hover:text-white transition-colors" }, /* @__PURE__ */ React.createElement(RotateCw, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      setZoom(1);
      setRotation(0);
    }, className: "p-2 text-gray-400 hover:text-white transition-colors" }, /* @__PURE__ */ React.createElement(Maximize2, { className: "w-5 h-5" }))), (isPrintingState || isReprint) && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handlePrint,
        disabled: !getUrl(activeFile) || loadingFiles,
        className: "bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition shadow-brand disabled:opacity-50"
      },
      /* @__PURE__ */ React.createElement(Printer, { className: "w-4 h-4" }),
      isReprint ? "Reimprimir" : "Imprimir archivo"
    ), !isPrintingState && !isReprint && /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 text-xs italic" }, "Solo vista previa")),
    showIssueModal && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl" }, /* @__PURE__ */ React.createElement("div", { className: "p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark flex items-center gap-2" }, /* @__PURE__ */ React.createElement(AlertCircle, { className: "w-5 h-5 text-red-500" }), " Reportar Problema al Cliente"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowIssueModal(false), className: "text-gray-400 hover:text-gray-dark" }, /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5" }))), /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium" }, "La orden se pausar\xE1 y el cliente recibir\xE1 una notificaci\xF3n estructurada para que act\xFAe."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-bold text-gray-dark mb-1 block" }, "Motivo de la pausa"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: issueCategory,
        onChange: (e) => setIssueCategory(e.target.value),
        className: "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
      },
      ISSUES_CATEGORIES.map((c) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, c))
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-bold text-gray-dark mb-1 block" }, "Mensaje de apoyo (Opcional)"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: issueNotes,
        onChange: (e) => setIssueNotes(e.target.value),
        placeholder: "Ej. Falta transferir $1000 adicionales...",
        rows: "2",
        className: "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setShowIssueModal(false), className: "px-5 py-2.5 text-gray-dark font-medium hover:bg-gray-200 rounded-xl transition" }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { onClick: handleReportIssue, disabled: submittingIssue, className: "px-5 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition disabled:opacity-50" }, submittingIssue ? "Enviando..." : "Pausar y Notificar"))))
  );
};
