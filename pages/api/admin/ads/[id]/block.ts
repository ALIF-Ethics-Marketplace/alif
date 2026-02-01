import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedAdminRequest, logAdminActivity } from '@/lib/api/admin-middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validation';

const blockAdSchema = z.object({
  is_blocked: z.boolean(),
  reason: z.string().optional(),
  permanent_delete: z.boolean().optional(),
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

    const validation = validateBody(blockAdSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { is_blocked, reason, permanent_delete } = validation.data;

    if (permanent_delete) {
      // Permanent delete
      const { error } = await supabaseAdmin
        .from('ads')
        .delete()
        .eq('id', id);

      if (error) {
        return res.status(400).json({ error: 'Erreur lors de la suppression' });
      }

      await logAdminActivity(
        req.admin.id,
        'delete_ad_permanent',
        `Suppression définitive d'une annonce - ${reason || 'Aucune raison'}`,
        'ads',
        id as string
      );

      return res.status(200).json({ message: 'Annonce supprimée définitivement' });
    }

    // Block/unblock
    const updateData: any = {
      is_blocked,
      block_reason: reason,
    };

    if (is_blocked) {
      updateData.blocked_at = new Date().toISOString();
      updateData.blocked_by = req.admin.id;
      updateData.is_active = false;
    }

    const { error } = await supabaseAdmin
      .from('ads')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: 'Erreur' });
    }

    await logAdminActivity(
      req.admin.id,
      is_blocked ? 'block_ad' : 'unblock_ad',
      `${is_blocked ? 'Blocage' : 'Déblocage'} d'une annonce - ${reason || ''}`,
      'ads',
      id as string
    );

    return res.status(200).json({ message: is_blocked ? 'Annonce bloquée' : 'Annonce débloquée' });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

export default withAdminAuth(handler);
