import { format, formatDistanceToNow, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Safe date formatter – never throws on null/undefined/invalid dates.
 * Drop-in replacement for date-fns format().
 */
export const safeFormat = (dateInput, pattern, options = {}) => {
    if (!dateInput) return '—';
    try {
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (!isValid(d)) return '—';
        return format(d, pattern, { locale: es, ...options });
    } catch {
        return '—';
    }
};

/**
 * Safe formatDistanceToNow – never throws on null/undefined/invalid dates.
 */
export const safeDistanceToNow = (dateInput, options = {}) => {
    if (!dateInput) return '—';
    try {
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
        if (!isValid(d)) return '—';
        return formatDistanceToNow(d, { locale: es, addSuffix: true, ...options });
    } catch {
        return '—';
    }
};
