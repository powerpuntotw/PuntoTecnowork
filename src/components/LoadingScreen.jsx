import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

export const LoadingScreen = () => {
    const { signOut } = useAuth();
    const [showRetry, setShowRetry] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowRetry(true), 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleRetry = async () => {
        await signOut();
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex flex-col items-center justify-center">
            <motion.div
                className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="mt-6 text-gray-medium text-sm">Cargando tu sesión...</p>
            <AnimatePresence>
                {showRetry && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 text-center"
                    >
                        <p className="text-gray-medium text-xs mb-3">¿Está tardando demasiado?</p>
                        <button
                            onClick={handleRetry}
                            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-all"
                        >
                            Reintentar / Volver al login
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
