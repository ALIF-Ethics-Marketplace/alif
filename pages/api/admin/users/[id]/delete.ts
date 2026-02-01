import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, withAdminRole, combineAdminMiddleware, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Soft delete
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: req.admin.id,
      })
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return res.status(400).json({ error: 'Erreur lors de la suppression' });
    }

    await logAdminActivity(
      req.admin.id,
      'delete_user',
      'Suppression d\'un utilisateur',
      'users',
      id
    );

    return res.status(200).json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default combineAdminMiddleware(withAdminAuth, withAdminRole(['Executif']))(handler);
