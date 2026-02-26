import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, CheckCircle, Star, MapPin, Loader, ArrowLeft, ArrowRight, FileText, Camera, DollarSign } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../components/Toast";
import confetti from "canvas-confetti";
const SIZES = [
  { id: "10x15", name: "10x15 cm", dimensions: "Fotograf\xEDa", type: "foto" },
  { id: "13x18", name: "13x18 cm", dimensions: "Fotograf\xEDa", type: "foto" },
  { id: "foto_a4", name: "A4", dimensions: "Fotograf\xEDa", type: "foto" },
  { id: "a4", name: "A4", dimensions: "21x29.7 cm", type: "doc" },
  { id: "oficio", name: "Oficio (Legal)", dimensions: "21.5x35.5 cm", type: "doc" },
  { id: "a3", name: "A3", dimensions: "29.7x42 cm", type: "doc" }
];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const UploadFiles = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [globalPrices, setGlobalPrices] = useState({});
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quality, setQuality] = useState("standard");
  const [copies, setCopies] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    const [locsRes, pricesRes] = await Promise.all([
      supabase.from("printing_locations").select("*").eq("status", "activo").order("name"),
      supabase.from("app_settings").select("value").eq("id", "print_prices").single()
    ]);
    setLocations(locsRes.data || []);
    if (pricesRes.data?.value) {
      setGlobalPrices(pricesRes.data.value);
    }
  };
  const handleFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        showToast(`${f.name}: M\xE1ximo 10MB`, "error");
        return false;
      }
      if (!ALLOWED_TYPES.includes(f.type)) {
        showToast(`${f.name}: Tipo no permitido`, "error");
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid.map((f) => ({ file: f, name: f.name, preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null }))]);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const getUnitPrice = (sizeId, q = "standard") => {
    const loc = locations.find((l) => l.id === selectedLocation);
    let priceKey = "";
    if (sizeId.startsWith("foto")) {
      priceKey = `foto_${sizeId}`;
    } else {
      priceKey = `${sizeId}_${q === "premium" ? "high" : "eco"}`;
    }
    if (loc?.allow_custom_prices && loc?.custom_prices && loc.custom_prices[priceKey]) {
      return loc.custom_prices[priceKey];
    }
    return globalPrices[priceKey] || 0;
  };
  const calculateTotal = () => {
    if (!selectedSize || !selectedLocation) return 0;
    const unit = getUnitPrice(selectedSize, quality);
    return unit * files.length * copies;
  };
  const calculatePoints = () => Math.floor(calculateTotal() * 0.1);
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const tempOrderId = crypto.randomUUID();
      const uploadPromises = files.map(async ({ file }) => {
        const filePath = `${user.id}/${tempOrderId}/${file.name}`;
        const { error: error2 } = await supabase.storage.from("print-files").upload(filePath, file);
        if (error2) throw error2;
        return filePath;
      });
      const uploadedFiles = await Promise.all(uploadPromises);
      const total = calculateTotal();
      const pts = calculatePoints();
      const { data: order, error } = await supabase.from("print_orders").insert({
        customer_id: user.id,
        location_id: selectedLocation,
        file_urls: uploadedFiles,
        specifications: { size: selectedSize, quality, copies },
        total_amount: total,
        points_earned: pts,
        status: "pendiente",
        notes: notes.trim() || null
      }).select().single();
      if (error) throw error;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#EB1C24", "#FFC905", "#A4CC39", "#0093D8"] });
      setOrderResult(order);
      setStep(5);
    } catch (err) {
      showToast("Error al crear la orden: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  const selectedLocObj = locations.find((l) => l.id === selectedLocation);
  const availableSizes = SIZES.filter((s) => {
    if (s.type === "foto" && (!selectedLocObj || !selectedLocObj.has_fotoya)) return false;
    return true;
  });
  return /* @__PURE__ */ React.createElement("div", { className: "p-4 max-w-2xl mx-auto pb-24" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-8" }, [1, 2, 3, 4].map((s) => /* @__PURE__ */ React.createElement("div", { key: s, className: "flex items-center flex-1 last:flex-none" }, /* @__PURE__ */ React.createElement("div", { className: `w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm z-10 ${step >= s ? "bg-primary text-white scale-110" : "bg-gray-200 text-gray-medium"}` }, s), s < 4 && /* @__PURE__ */ React.createElement("div", { className: `flex-1 h-1.5 mx-2 rounded-full transition-all ${step > s ? "bg-primary" : "bg-gray-200"}` })))), /* @__PURE__ */ React.createElement(AnimatePresence, { mode: "wait" }, step === 1 && /* @__PURE__ */ React.createElement(motion.div, { key: "step1", initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark mb-6" }, "1. Sub\xED tus Archivos"), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `border-3 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"}`,
      onDragOver: (e) => {
        e.preventDefault();
        setIsDragging(true);
      },
      onDragLeave: () => setIsDragging(false),
      onDrop: handleDrop
    },
    /* @__PURE__ */ React.createElement(Upload, { className: "w-12 h-12 mx-auto mb-4 text-primary" }),
    /* @__PURE__ */ React.createElement("p", { className: "text-gray-dark font-medium mb-2" }, "Arrastr\xE1 tus archivos aqu\xED"),
    /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium text-sm mb-4" }, "o hac\xE9 clic para seleccionar"),
    /* @__PURE__ */ React.createElement("button", { onClick: () => fileInputRef.current.click(), className: "bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-brand" }, "Seleccionar Archivos"),
    /* @__PURE__ */ React.createElement("button", { onClick: () => cameraInputRef.current.click(), className: "mt-3 bg-secondary text-white px-6 py-3 rounded-xl font-bold hover:bg-secondary/90 transition shadow-brand flex items-center gap-2 mx-auto" }, /* @__PURE__ */ React.createElement(Camera, { className: "w-5 h-5" }), "Tomar Foto"),
    /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-medium mt-4" }, "JPG, PNG, PDF, DOCX \u2022 M\xE1x: 10MB cada uno"),
    /* @__PURE__ */ React.createElement("input", { ref: fileInputRef, type: "file", multiple: true, accept: ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx", className: "hidden", onChange: (e) => handleFiles(e.target.files) }),
    /* @__PURE__ */ React.createElement("input", { ref: cameraInputRef, type: "file", accept: "image/*", capture: "environment", className: "hidden", onChange: (e) => handleFiles(e.target.files) })
  ), files.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3" }, files.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "relative group rounded-xl overflow-hidden border border-gray-200" }, f.preview ? /* @__PURE__ */ React.createElement("img", { src: f.preview, alt: f.name, className: "w-full h-24 object-cover" }) : /* @__PURE__ */ React.createElement("div", { className: "w-full h-24 bg-gray-50 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(FileText, { className: "w-8 h-8 text-secondary" })), /* @__PURE__ */ React.createElement("button", { onClick: () => removeFile(i), className: "absolute top-1 right-1 bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" })), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] bg-white text-gray-dark font-medium p-1.5 truncate border-t" }, f.name)))), /* @__PURE__ */ React.createElement("button", { disabled: files.length === 0, onClick: () => setStep(2), className: "w-full mt-8 bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition shadow-brand disabled:opacity-50 flex items-center justify-center gap-2 text-lg" }, "Continuar ", /* @__PURE__ */ React.createElement(ArrowRight, { className: "w-5 h-5" }))), step === 2 && /* @__PURE__ */ React.createElement(motion.div, { key: "step2", initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark mb-2" }, "2. Seleccion\xE1 un Local"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium mb-6" }, "\xBFD\xF3nde quer\xE9s retirar tus impresiones?"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, locations.map((loc) => /* @__PURE__ */ React.createElement(
    motion.div,
    {
      key: loc.id,
      whileHover: { scale: 1.01 },
      whileTap: { scale: 0.99 },
      onClick: () => setSelectedLocation(loc.id),
      className: `p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedLocation === loc.id ? "border-primary bg-primary/5 shadow-md" : "border-gray-200 hover:border-primary/50"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-gray-dark text-lg" }, loc.name), loc.has_fotoya && /* @__PURE__ */ React.createElement("span", { className: "bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Camera, { className: "w-3 h-3" }), " FotoYa")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-medium flex items-center mb-2" }, /* @__PURE__ */ React.createElement(MapPin, { className: "w-4 h-4 mr-1 text-primary/70" }), loc.address), /* @__PURE__ */ React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold bg-success/10 text-green-700" }, "\u{1F7E2} Abierto")), selectedLocation === loc.id && /* @__PURE__ */ React.createElement(CheckCircle, { className: "w-6 h-6 text-primary" }))
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 mt-8" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep(1), className: "bg-gray-100 text-gray-dark px-6 py-4 rounded-xl font-bold hover:bg-gray-200 transition" }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement("button", { disabled: !selectedLocation, onClick: () => {
    if (selectedSize && SIZES.find((s) => s.id === selectedSize)?.type === "foto" && !selectedLocObj?.has_fotoya) {
      setSelectedSize(null);
    }
    setStep(3);
  }, className: "flex-1 bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-brand text-lg" }, "Continuar ", /* @__PURE__ */ React.createElement(ArrowRight, { className: "w-5 h-5" })))), step === 3 && /* @__PURE__ */ React.createElement(motion.div, { key: "step3", initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-start mb-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark" }, "3. Configuraci\xF3n"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium" }, "Eleg\xED el formato y cantidad")), /* @__PURE__ */ React.createElement("div", { className: "bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1" }, /* @__PURE__ */ React.createElement(DollarSign, { className: "w-4 h-4" }), selectedLocObj?.allow_custom_prices ? "Precios del Local" : "Precios Globales")), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white p-5 rounded-2xl shadow-sm border border-gray-100" }, /* @__PURE__ */ React.createElement("label", { className: "block text-gray-dark font-bold mb-3" }, "Formato de Impresi\xF3n"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, availableSizes.map((size) => {
    const unitPrice = getUnitPrice(size.id, quality);
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: size.id,
        onClick: () => setSelectedSize(size.id),
        className: `p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden ${selectedSize === size.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-primary/50"}`
      },
      selectedSize === size.id && /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 right-0 w-8 h-8 bg-primary rounded-bl-xl flex items-center justify-center" }, /* @__PURE__ */ React.createElement(CheckCircle, { className: "w-4 h-4 text-white" })),
      /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-dark text-lg" }, size.name),
      /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-medium mb-2" }, size.dimensions),
      /* @__PURE__ */ React.createElement("div", { className: "text-primary font-bold bg-white inline-block px-2 py-1 rounded border border-primary/20 shadow-sm" }, "$", unitPrice, "/u")
    );
  })), availableSizes.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-secondary bg-red-50 p-3 rounded-lg mt-3" }, "No hay tama\xF1os disponibles en este local.")), selectedSize && SIZES.find((s) => s.id === selectedSize)?.type === "doc" && /* @__PURE__ */ React.createElement("div", { className: "bg-white p-5 rounded-2xl shadow-sm border border-gray-100" }, /* @__PURE__ */ React.createElement("label", { className: "block text-gray-dark font-bold mb-3" }, "Calidad"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setQuality("standard"), className: `p-4 rounded-xl border-2 text-left transition-all ${quality === "standard" ? "border-secondary bg-secondary/5" : "border-gray-200 hover:border-secondary/50"}` }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-dark text-lg" }, "Est\xE1ndar"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-medium mb-1" }, "Blanco y Negro / Uso general"), /* @__PURE__ */ React.createElement("div", { className: "text-secondary font-bold text-sm" }, "$", getUnitPrice(selectedSize, "standard"), "/u")), /* @__PURE__ */ React.createElement("button", { onClick: () => setQuality("premium"), className: `p-4 rounded-xl border-2 text-left transition-all ${quality === "premium" ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/50"}` }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-dark text-lg flex items-center gap-1" }, "Color ", /* @__PURE__ */ React.createElement(Star, { className: "w-4 h-4 text-accent fill-current" })), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-medium mb-1" }, "Alta calidad fotogr\xE1fica"), /* @__PURE__ */ React.createElement("div", { className: "text-accent font-bold text-sm" }, "$", getUnitPrice(selectedSize, "premium"), "/u")))), /* @__PURE__ */ React.createElement("div", { className: "bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-gray-dark font-bold" }, "Cantidad de Copias"), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-medium" }, "De cada archivo subido")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 bg-gray-50 rounded-xl p-2 border border-gray-200" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setCopies(Math.max(1, copies - 1)), className: "w-10 h-10 rounded-lg hover:bg-white hover:shadow transition-all font-bold text-gray-dark" }, "-"), /* @__PURE__ */ React.createElement("span", { className: "text-2xl font-bold text-gray-dark w-10 text-center" }, copies), /* @__PURE__ */ React.createElement("button", { onClick: () => setCopies(copies + 1), className: "w-10 h-10 rounded-lg hover:bg-white hover:shadow transition-all font-bold text-primary" }, "+")))), selectedSize && /* @__PURE__ */ React.createElement(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "bg-gradient-to-r from-success/90 to-primary/90 text-white rounded-2xl p-6 mt-6 shadow-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-end mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium opacity-90" }, "Total estimado"), /* @__PURE__ */ React.createElement("span", { className: "text-4xl font-bold" }, "$", calculateTotal())), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center bg-white/20 p-3 rounded-xl mt-4" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-sm" }, "Puntos que ganar\xE1s"), /* @__PURE__ */ React.createElement("span", { className: "text-lg font-bold flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Star, { className: "w-5 h-5 fill-current" }), "+", calculatePoints()))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 mt-6" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep(2), className: "bg-gray-100 text-gray-dark px-6 py-4 rounded-xl font-bold hover:bg-gray-200 transition" }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement("button", { disabled: !selectedSize, onClick: () => setStep(4), className: "flex-1 bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-brand text-lg" }, "Continuar ", /* @__PURE__ */ React.createElement(ArrowRight, { className: "w-5 h-5" })))), step === 4 && /* @__PURE__ */ React.createElement(motion.div, { key: "step4", initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }, /* @__PURE__ */ React.createElement("h2", { className: "text-2xl font-bold text-gray-dark mb-6" }, "4. Resumen Final"), /* @__PURE__ */ React.createElement("div", { className: "bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "p-6 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center pb-4 border-b border-gray-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium font-medium" }, "Archivos"), /* @__PURE__ */ React.createElement("span", { className: "font-bold flex items-center gap-2" }, /* @__PURE__ */ React.createElement(FileText, { className: "w-4 h-4 text-primary" }), " ", files.length, " adjuntos")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center pb-4 border-b border-gray-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium font-medium" }, "Local a retirar"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-right pl-4" }, selectedLocObj?.name)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center pb-4 border-b border-gray-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium font-medium" }, "Formato"), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, SIZES.find((s) => s.id === selectedSize)?.name), SIZES.find((s) => s.id === selectedSize)?.type === "doc" && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-medium block capitalize" }, quality === "premium" ? "Color" : "Blanco y Negro"))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center pb-4 border-b border-gray-100" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-medium font-medium" }, "Copias totales"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-lg" }, files.length * copies, " ", /* @__PURE__ */ React.createElement("span", { className: "text-sm font-normal text-gray-medium" }, "(", copies, " por archivo)")))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 p-6 border-t border-gray-100" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-dark font-bold text-lg" }, "Total a Pagar"), /* @__PURE__ */ React.createElement("span", { className: "text-3xl font-black text-gray-dark" }, "$", calculateTotal())), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end mt-1" }, /* @__PURE__ */ React.createElement("span", { className: "bg-accent/15 text-accent-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" }, "Recompensa: +", calculatePoints(), " pts")))), /* @__PURE__ */ React.createElement("div", { className: "mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100" }, /* @__PURE__ */ React.createElement("label", { className: "block text-gray-dark font-bold mb-2" }, "Instrucciones especiales para el local (opcional)"), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: notes,
      onChange: (e) => setNotes(e.target.value),
      placeholder: "Ej: Imprimir en alta calidad, sin m\xE1rgenes, anillar si es posible...",
      className: "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary outline-none",
      rows: "3",
      maxLength: 500
    }
  ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-medium text-right mt-1" }, notes.length, "/500")), /* @__PURE__ */ React.createElement("label", { className: "flex items-start mb-8 cursor-pointer p-4 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: acceptedTerms, onChange: (e) => setAcceptedTerms(e.target.checked), className: "mt-1 mr-3 w-5 h-5 accent-primary rounded cursor-pointer" }), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-dark font-medium leading-tight" }, "He verificado que mis archivos est\xE1n correctos y acepto el compromiso de pago al momento de retirar mis impresiones en el local seleccionado.")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => setStep(3), className: "bg-gray-100 text-gray-dark px-6 py-4 rounded-xl font-bold hover:bg-gray-200 transition" }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement(
    "button",
    {
      disabled: !acceptedTerms || isSubmitting,
      onClick: handleSubmit,
      className: "flex-1 bg-primary text-white py-4 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-brand text-lg"
    },
    isSubmitting ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Loader, { className: "w-5 h-5 animate-spin" }), " Procesando Pedido...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CheckCircle, { className: "w-5 h-5" }), " Confirmar Pedido")
  ))), step === 5 && orderResult && /* @__PURE__ */ React.createElement(motion.div, { key: "step5", initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, className: "text-center py-12" }, /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6",
      initial: { scale: 0, rotate: -180 },
      animate: { scale: 1, rotate: 0 },
      transition: { delay: 0.1, type: "spring", stiffness: 200, damping: 15 }
    },
    /* @__PURE__ */ React.createElement(CheckCircle, { className: "w-12 h-12 text-success" })
  ), /* @__PURE__ */ React.createElement("h2", { className: "text-3xl font-black text-gray-dark mb-3" }, "\xA1Pedido Confirmado!"), /* @__PURE__ */ React.createElement("p", { className: "text-gray-medium mb-8 text-lg" }, "Tu orden ha sido enviada al local exitosamente."), /* @__PURE__ */ React.createElement("div", { className: "bg-white border-2 border-gray-100 rounded-2xl p-6 mb-8 max-w-sm mx-auto shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-medium font-medium mb-2 uppercase tracking-wider" }, "N\xFAmero de orden"), /* @__PURE__ */ React.createElement("div", { className: "text-4xl font-black text-primary mb-4" }, orderResult.order_number), /* @__PURE__ */ React.createElement("div", { className: "text-lg font-bold text-success flex items-center justify-center gap-2 bg-success/10 py-3 rounded-xl" }, /* @__PURE__ */ React.createElement(Star, { className: "w-5 h-5 fill-current" }), "+", orderResult.points_earned, " puntos al retirar")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row gap-3 max-w-sm mx-auto" }, /* @__PURE__ */ React.createElement("button", { onClick: () => navigate("/cliente/orders"), className: "flex-1 bg-primary text-white py-4 rounded-xl font-bold shadow-brand hover:bg-primary/90 transition text-lg" }, "Mis \xD3rdenes"), /* @__PURE__ */ React.createElement("button", { onClick: () => navigate("/cliente/dashboard"), className: "flex-1 bg-gray-100 text-gray-dark py-4 rounded-xl font-bold hover:bg-gray-200 transition text-lg" }, "Volver al Inicio")))));
};
