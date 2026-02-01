import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // GET - Get user details
    if (req.method === 'GET') {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          validated_by_admin:admin_users!users_user_validated_by_fkey(id, email, role),
          suspended_by_admin:admin_users!users_suspended_by_fkey(id, email, role),
          deleted_by_admin:admin_users!users_deleted_by_fkey(id, email, role)
        `)
        .eq('id', id)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      return res.status(200).json({ user });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAdminAuth(handler);
