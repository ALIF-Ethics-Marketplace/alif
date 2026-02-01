import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Delete favorite (by ad_id for convenience)
    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('ad_id', id);

    if (error) {
      console.error('Error removing favorite:', error);
      return res.status(400).json({ error: 'Erreur lors de la suppression du favori' });
    }

    return res.status(200).json({ message: 'Retiré des favoris' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAuth(handler);
