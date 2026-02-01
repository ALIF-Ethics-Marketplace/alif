import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // GET - Get user's notifications
    if (req.method === 'GET') {
      const unreadOnly = req.query.unread === 'true';
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data: notifications, error, count } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return res.status(400).json({ error: 'Erreur lors de la récupération des notifications' });
      }

      return res.status(200).json({
        notifications,
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // PATCH - Mark all as read
    if (req.method === 'PATCH') {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', req.user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return res.status(400).json({ error: 'Erreur lors de la mise à jour des notifications' });
      }

      return res.status(200).json({ message: 'Notifications marquées comme lues' });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Notifications endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
