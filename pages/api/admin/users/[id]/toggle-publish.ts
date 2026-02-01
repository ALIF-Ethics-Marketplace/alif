import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { id } = req.query;
    const { can_publish_ads } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ can_publish_ads })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: 'Erreur' });
    }

    await logAdminActivity(
      req.admin.id,
      'toggle_publish_permission',
      `${can_publish_ads ? 'Activation' : 'Désactivation'} de la publication d'annonces`,
      'users',
      id as string
    );

    return res.status(200).json({ message: 'Permissions mises à jour' });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAdminAuth(handler);
