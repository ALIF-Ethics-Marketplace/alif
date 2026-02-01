import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID notification invalide' });
    }

    // PATCH - Mark notification as read
    if (req.method === 'PATCH') {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('user_id', req.user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        return res.status(400).json({ error: 'Erreur lors de la mise à jour de la notification' });
      }

      return res.status(200).json({ message: 'Notification marquée comme lue' });
    }

    // DELETE - Delete notification
    if (req.method === 'DELETE') {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);

      if (error) {
        console.error('Error deleting notification:', error);
        return res.status(400).json({ error: 'Erreur lors de la suppression de la notification' });
      }

      return res.status(200).json({ message: 'Notification supprimée' });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Notification endpoint error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
