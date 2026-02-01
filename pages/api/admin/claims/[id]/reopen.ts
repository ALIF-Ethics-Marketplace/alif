import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const { error } = await supabaseAdmin
      .from('claims')
      .update({
        claim_state: 'En instruction',
        assigned_to: req.admin.id,
      })
      .eq('id', id);

    if (error) {
      console.error('Error reopening claim:', error);
      return res.status(400).json({ error: 'Erreur lors de la réouverture' });
    }

    await logAdminActivity(
      req.admin.id,
      'reopen_claim',
      'Réouverture d\'un litige',
      'claims',
      id
    );

    return res.status(200).json({ message: 'Litige réouvert' });
  } catch (error) {
    console.error('Reopen claim error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAdminAuth(handler);
