import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Upload, Gift, Package, User, LogOut, LifeBuoy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DynamicLogo } from '../components/DynamicLogo';
import { Footer } from '../components/Footer';
import { NotificationBell } from '../components/NotificationBell';
import { ThemeToggle } from '../components/ThemeToggle';
import { useSupportBadge } from '../hooks/useSupportBadge';

const navItems = [
    { path: '/cliente/dashboard', icon: Home, label: 'Inicio' },
    { path: '/cliente/upload', icon: Upload, label: 'Subir' },
    { path: '/cliente/rewards', icon: Gift, label: 'Premios' },
    { path: '/cliente/orders', icon: Package, label: 'Órdenes' },
    { path: '/cliente/support', icon: LifeBuoy, label: 'Soporte' },
    { path: '/cliente/profile', icon: User, label: 'Perfil' },
];

export const ClienteLayout = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount, resetCount } = useSupportBadge();

    // Reset badge when user visits support
    useEffect(() => {
        if (location.pathname.startsWith('/cliente/support')) resetCount();
    }, [location.pathname]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-light flex flex-col">
            {/* Header */}
            <header className="hero-gradient px-4 py-3 flex items-center justify-between safe-top">
                <DynamicLogo type="principal" className="h-8 object-contain drop-shadow-md" />
                <div className="flex items-center gap-2">
                    <ThemeToggle className="text-white/80 hover:text-white" />
                    <NotificationBell />
                    <button onClick={handleSignOut} className="text-white/80 hover:text-white transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 pb-20 overflow-y-auto">
                <Outlet />
            </main>

            {/* Footer */}
            <Footer />

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-bottom z-50">
                <div className="flex items-center justify-around py-2">
                    {navItems.map(({ path, icon: Icon, label }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors min-w-[60px] relative ${isActive ? 'text-primary' : 'text-gray-medium hover:text-primary'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <motion.div animate={{ scale: isActive ? 1.1 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} className="flex flex-col items-center gap-1">
                                    <div className="relative">
                                        <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                                        {path === '/cliente/support' && unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                                        )}
                                    </div>
                                    <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
                                </motion.div>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
};

