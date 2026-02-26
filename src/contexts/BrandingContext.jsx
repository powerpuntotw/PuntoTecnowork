import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const BrandingContext = createContext(null);

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const { data } = await supabase
                    .from('app_branding')
                    .select('*')
                    .single();
                setBranding(data);
            } catch {
                setBranding(null);
            } finally {
                setLoading(false);
            }
        };
        fetchBranding();
    }, []);

    return (
        <BrandingContext.Provider value={{ branding, loading }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBrandingCtx = () => useContext(BrandingContext);
