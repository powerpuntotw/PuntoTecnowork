import { useState, useRef, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';
import { DynamicLogo } from './DynamicLogo';
import { supabase } from '../lib/supabase';
const CompleteProfileScreen = () => {
    const { fetchProfile, user, profile, signOut } = useAuth();
    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        phone: profile?.phone || '',
        dni: profile?.dni || ''
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error: updateError } = await supabase.from('profiles').update(form).eq('id', user.id);
            if (updateError) throw updateError;
            await fetchProfile(user.id);
            window.location.reload();
        } catch (err) {
            console.error('Error guardando perfil:', err);
            alert('Error al guardar, intentalo de nuevo');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-gray-light py-12">
            <DynamicLogo type="principal" className="h-12 object-contain mb-4" />
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold text-gray-dark text-center mb-2">Completá tu Perfil</h2>
                <p className="text-gray-medium text-sm text-center mb-6">Para continuar utilizando la aplicación, necesitamos algunos datos básicos adicionales.</p>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-dark mb-1">Nombre y Apellido</label>
                        <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary" placeholder="Ej. Juan Pérez" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-dark mb-1">Teléfono</label>
                        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required type="tel" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary" placeholder="Ej. 11 1234 5678" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-dark mb-1">DNI</label>
                        <input value={form.dni} onChange={e => setForm({ ...form, dni: e.target.value })} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary" placeholder="Ingresá tu número de DNI" />
                    </div>
                    <button type="submit" disabled={saving || !form.full_name || !form.phone || !form.dni} className="w-full mt-2 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all">
                        {saving ? 'Guardando...' : 'Comenzar'}
                    </button>
                </form>
            </div>
            <button onClick={signOut} className="mt-4 text-xs text-gray-medium underline">
                Cerrar sesión
            </button>
        </div>
    );
};

const ProfileErrorScreen = () => {
    const { fetchProfile, user, signOut } = useAuth();
    const [retrying, setRetrying] = useState(false);
    const retriesRef = useRef(0);

    // Auto-retry: profile might not be created yet (new user race condition)
    useEffect(() => {
        const interval = setInterval(async () => {
            if (retriesRef.current >= 5) {
                clearInterval(interval);
                return;
            }
            retriesRef.current += 1;
            const result = await fetchProfile(user.id);
            if (result) {
                clearInterval(interval);
                // Profile found, fetchProfile already called setProfile
                // Force a re-render by reloading
                window.location.reload();
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [fetchProfile, user.id]);

    const handleRetry = async () => {
        setRetrying(true);
        const result = await fetchProfile(user.id);
        if (result) {
            window.location.reload();
        }
        setRetrying(false);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-gray-light">
            <DynamicLogo type="principal" className="h-12 object-contain mb-4" />
            <p className="text-gray-dark font-semibold text-center">Cargando tu perfil...</p>
            <p className="text-gray-medium text-sm text-center max-w-xs">
                Estamos preparando tu cuenta. Si tarda demasiado, probá recargar la página.
            </p>
            <div className="flex gap-3 mt-2">
                <button onClick={handleRetry} disabled={retrying}
                    className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50">
                    {retrying ? 'Reintentando...' : 'Reintentar'}
                </button>
                <button onClick={() => window.location.reload()}
                    className="px-5 py-2 border border-gray-light rounded-xl text-sm text-gray-medium">
                    Recargar página
                </button>
            </div>
            <button onClick={signOut} className="mt-4 text-xs text-gray-medium underline">
                Cerrar sesión
            </button>
        </div>
    );
};

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    if (!profile) return <ProfileErrorScreen />;

    // Require profile completion for everyone
    const isProfileComplete = Boolean(profile.full_name && profile.phone && profile.dni);
    if (!isProfileComplete) return <CompleteProfileScreen />;

    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.user_type)) {
        const ROLE_DASHBOARDS = {
            admin: '/admin/dashboard',
            local: '/local/dashboard',
            client: '/cliente/dashboard'
        };
        return <Navigate to={ROLE_DASHBOARDS[profile.user_type] ?? '/login'} replace />;
    }

    return children;
};
