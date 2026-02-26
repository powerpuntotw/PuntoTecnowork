import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useBranding = () => {
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

    return { branding, loading };
};
