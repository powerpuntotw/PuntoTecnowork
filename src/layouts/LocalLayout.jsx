import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Package, Users, Gift, LogOut, User, DollarSign, LifeBuoy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DynamicLogo } from '../components/DynamicLogo';
import { Footer } from '../components/Footer';
import { ThemeToggle } from '../components/ThemeToggle';
import { useSupportBadge } from '../hooks/useSupportBadge';

const navItems = [
    { path: '/local/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/local/orders', icon: Package, label: 'Órdenes' },
    { path: '/local/clients', icon: Users, label: 'Clientes' },
    { path: '/local/prices', icon: DollarSign, label: 'Precios' },
    { path: '/local/redemptions', icon: Gift, label: 'Canjes' },
    { path: '/local/support', icon: LifeBuoy, label: 'Soporte' },
    { path: '/local/profile', icon: User, label: 'Perfil' },
];

export const LocalLayout = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount, resetCount } = useSupportBadge();

    useEffect(() => {
        if (location.pathname.startsWith('/local/support')) resetCount();
    }, [location.pathname]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-light flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-secondary to-cyan-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <DynamicLogo type="principal" className="h-8 object-contain drop-shadow-md" />
                    <span className="text-white font-semibold text-sm hidden sm:inline">|</span>
                    <span className="text-white/90 text-sm hidden sm:inline">{profile?.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle className="text-white/80 hover:text-white" />
                    <button onClick={handleSignOut} className="text-white/80 hover:text-white transition-colors">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <nav className="bg-white border-b border-gray-200 px-4">
                <div className="flex items-center gap-1 overflow-x-auto">
                    {navItems.map(({ path, icon: Icon, label }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors text-sm font-medium relative ${isActive
                                    ? 'border-secondary text-secondary'
                                    : 'border-transparent text-gray-medium hover:text-secondary hover:border-secondary/30'
                                }`
                            }
                        >
                            <motion.div animate={{ scale: isActive ? 1.05 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} className="flex items-center gap-2">
                                <div className="relative">
                                    <Icon className="w-4 h-4" />
                                    {path === '/local/support' && unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                                    )}
                                </div>
                                {label}
                            </motion.div>
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Main */}
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};
