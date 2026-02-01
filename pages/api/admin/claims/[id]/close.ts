import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const closeClaimSchema = z.object({
  closure_decision: z.string().min(10, 'Décision requise (min 10 caractères)'),
});

async function handler(req: AuthenticatedAdminRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const validation = validateBody(closeClaimSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { closure_decision } = validation.data;

    const { error } = await supabaseAdmin
      .from('claims')
      .update({
        claim_state: 'Cloturé',
        closure_decision,
        closed_by: req.admin.id,
        closed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error closing claim:', error);
      return res.status(400).json({ error: 'Erreur lors de la clôture' });
    }

    await logAdminActivity(
      req.admin.id,
      'close_claim',
      `Clôture d'un litige - ${closure_decision}`,
      'claims',
      id
    );

    return res.status(200).json({ message: 'Litige clôturé' });
  } catch (error) {
    console.error('Close claim error:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAdminAuth(handler);
