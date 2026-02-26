import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook that returns the number of unread support messages for the current user.
 * "Unread" = messages in open tickets that were NOT sent by the current user.
 * The count resets when the user visits the support page (via resetCount).
 */
export const useSupportBadge = () => {
    const { user, profile } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user?.id) return;

        const fetchUnread = async () => {
            let ticketQuery = supabase
                .from('support_tickets')
                .select('id')
                .eq('status', 'open');

            // Scope tickets based on user role
            if (profile?.user_type === 'admin') {
                // Admin sees all open tickets
                // no additional filter
            } else if (profile?.user_type === 'local') {
                // Local sees tickets from their location
                ticketQuery = ticketQuery.eq('location_id', profile.location_id);
            } else {
                // Client sees only their own tickets
                ticketQuery = ticketQuery.eq('creator_id', user.id);
            }

            const { data: tickets } = await ticketQuery;
            if (!tickets || tickets.length === 0) {
                setUnreadCount(0);
                return;
            }

            const ticketIds = tickets.map(t => t.id);

            // Count messages NOT sent by the current user
            const { count, error } = await supabase
                .from('ticket_messages')
                .select('id', { count: 'exact', head: true })
                .in('ticket_id', ticketIds)
                .neq('sender_id', user.id);

            if (!error) {
                setUnreadCount(count || 0);
            }
        };

        fetchUnread();

        // Subscribe to new messages in ticket_messages
        const channel = supabase
            .channel('support-badge-' + user.id)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'ticket_messages'
            }, (payload) => {
                // Only bump if the message was NOT sent by us
                if (payload.new.sender_id !== user.id) {
                    setUnreadCount(prev => prev + 1);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id, profile?.user_type, profile?.location_id]);

    const resetCount = () => setUnreadCount(0);

    return { unreadCount, resetCount };
};
